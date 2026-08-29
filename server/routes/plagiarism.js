const express = require('express');
const { PlagiarismPair, Contest, Submission, Problem, User, Notification } = require('../db');
const { auth, facultyOnly } = require('../middleware/auth');
const { compareTwoCodes, canonicalizeCode, computeTokenSimilarity, computeASTStructuralSimilarity, extractMatchedLines, analyzePlagiarismWithAI } = require('../utils/plagiarismEngine');
const router = express.Router();

// GET /api/plagiarism — fetch all plagiarism reports (optionally by contestId)
router.get('/', auth, facultyOnly, async (req, res) => {
  try {
    const { contestId, problemId } = req.query;
    const filter = {};
    if (contestId) filter.contestId = contestId;
    if (problemId) filter.problemId = problemId;

    const pairs = await PlagiarismPair.find(filter)
      .populate('userId1', 'name enrollment avatar semester department')
      .populate('userId2', 'name enrollment avatar semester department')
      .populate('problemId', 'title difficulty points')
      .populate('contestId', 'title status')
      .sort({ combinedScore: -1, createdAt: -1 });

    const enriched = pairs.map(p => {
      const json = p.toJSON();
      return {
        ...json,
        user1: json.userId1,
        user2: json.userId2,
        problemTitle: json.problemId?.title || 'Unknown Problem',
        problemDifficulty: json.problemId?.difficulty,
        contestTitle: json.contestId?.title || 'Contest'
      };
    });

    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/plagiarism/analyze — run comprehensive multi-layer plagiarism audit across contest submissions
router.post('/analyze', auth, facultyOnly, async (req, res) => {
  try {
    const { contestId, problemId } = req.body;
    if (!contestId) return res.status(400).json({ error: 'contestId is required' });

    const contest = await Contest.findById(contestId).populate('problems', 'title');
    if (!contest) return res.status(404).json({ error: 'Contest not found' });

    const targetProblemIds = problemId ? [problemId] : (contest.problems || []).map(p => p._id || p);

    let newPairsCount = 0;
    let updatedPairsCount = 0;

    for (const pId of targetProblemIds) {
      const problemDoc = await Problem.findById(pId).select('title');
      const pTitle = problemDoc?.title || 'DSA Problem';

      // Find best/latest submission per user for this problem in this contest
      const subs = await Submission.find({ contestId, problemId: pId })
        .populate('userId', 'name enrollment')
        .sort({ timestamp: -1 });

      // Group by student to take their best or latest submission
      const studentSubMap = new Map();
      for (const s of subs) {
        const uId = s.userId?._id?.toString() || s.userId?.toString();
        if (!uId || !s.code) continue;
        if (!studentSubMap.has(uId) || (s.verdict === 'AC' && studentSubMap.get(uId).verdict !== 'AC')) {
          studentSubMap.set(uId, s);
        }
      }

      const uniqueSubs = Array.from(studentSubMap.values());

      for (let i = 0; i < uniqueSubs.length; i++) {
        for (let j = i + 1; j < uniqueSubs.length; j++) {
          const s1 = uniqueSubs[i];
          const s2 = uniqueSubs[j];

          const uId1 = s1.userId?._id || s1.userId;
          const uId2 = s2.userId?._id || s2.userId;
          if (uId1.toString() === uId2.toString()) continue;

          // Run fast preliminary canonical token similarity check
          const c1 = canonicalizeCode(s1.code);
          const c2 = canonicalizeCode(s2.code);
          const tokenPrelim = computeTokenSimilarity(c1.tokens, c2.tokens);

          // If token similarity passes threshold (>= 25%), perform full multi-stage analysis with AI
          if (tokenPrelim >= 25) {
            const name1 = s1.userId?.name || 'Student 1';
            const name2 = s2.userId?.name || 'Student 2';

            const analysis = await compareTwoCodes(
              s1.code, s2.code,
              name1, name2,
              pTitle,
              s1.language, s2.language
            );

            if (analysis.combinedScore >= 30) {
              const existing = await PlagiarismPair.findOne({
                contestId,
                problemId: pId,
                $or: [
                  { userId1: uId1, userId2: uId2 },
                  { userId1: uId2, userId2: uId1 }
                ]
              });

              if (existing) {
                existing.tokenScore = analysis.tokenScore;
                existing.astScore = analysis.astScore;
                existing.semanticScore = analysis.semanticScore;
                existing.combinedScore = analysis.combinedScore;
                existing.aiAnalysis = analysis.aiAnalysis;
                existing.matchedPatterns = analysis.matchedPatterns;
                existing.matchedLines = analysis.matchedLines;
                existing.recommendation = analysis.recommendation;
                existing.code1 = s1.code;
                existing.code2 = s2.code;
                existing.lang1 = s1.language || 'cpp17';
                existing.lang2 = s2.language || 'cpp17';
                existing.submissionId1 = s1._id;
                existing.submissionId2 = s2._id;
                await existing.save();
                updatedPairsCount++;
              } else {
                await PlagiarismPair.create({
                  contestId,
                  problemId: pId,
                  userId1: uId1,
                  userId2: uId2,
                  submissionId1: s1._id,
                  submissionId2: s2._id,
                  code1: s1.code,
                  code2: s2.code,
                  lang1: s1.language || 'cpp17',
                  lang2: s2.language || 'cpp17',
                  tokenScore: analysis.tokenScore,
                  astScore: analysis.astScore,
                  semanticScore: analysis.semanticScore,
                  combinedScore: analysis.combinedScore,
                  verdict: analysis.combinedScore >= 70 ? 'pending' : 'cleared',
                  aiAnalysis: analysis.aiAnalysis,
                  matchedPatterns: analysis.matchedPatterns,
                  matchedLines: analysis.matchedLines,
                  recommendation: analysis.recommendation
                });
                newPairsCount++;
              }
            }
          }
        }
      }
    }

    const totalFlags = await PlagiarismPair.countDocuments({ contestId });
    res.json({
      analyzed: true,
      newPairs: newPairsCount,
      updatedPairs: updatedPairsCount,
      totalFlags
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/plagiarism/:id/re-analyze — run live AI re-analysis on a specific pair
router.post('/:id/re-analyze', auth, facultyOnly, async (req, res) => {
  try {
    const pair = await PlagiarismPair.findById(req.params.id)
      .populate('userId1', 'name enrollment')
      .populate('userId2', 'name enrollment')
      .populate('problemId', 'title');

    if (!pair) return res.status(404).json({ error: 'Plagiarism pair not found' });

    let code1 = pair.code1;
    let code2 = pair.code2;

    // If code wasn't saved, pull from submissions
    if (!code1 && pair.submissionId1) {
      const s1 = await Submission.findById(pair.submissionId1);
      code1 = s1?.code || '';
    }
    if (!code2 && pair.submissionId2) {
      const s2 = await Submission.findById(pair.submissionId2);
      code2 = s2?.code || '';
    }

    const analysis = await compareTwoCodes(
      code1, code2,
      pair.userId1?.name || 'Student 1',
      pair.userId2?.name || 'Student 2',
      pair.problemId?.title || 'DSA Problem',
      pair.lang1 || 'cpp17',
      pair.lang2 || 'cpp17'
    );

    pair.tokenScore = analysis.tokenScore;
    pair.astScore = analysis.astScore;
    pair.semanticScore = analysis.semanticScore;
    pair.combinedScore = analysis.combinedScore;
    pair.aiAnalysis = analysis.aiAnalysis;
    pair.matchedPatterns = analysis.matchedPatterns;
    pair.matchedLines = analysis.matchedLines;
    pair.recommendation = analysis.recommendation;
    pair.code1 = code1;
    pair.code2 = code2;
    await pair.save();

    res.json(pair);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/plagiarism/:id/verdict — faculty verdict (cleared, warned, flagged)
router.patch('/:id/verdict', auth, facultyOnly, async (req, res) => {
  try {
    const { verdict, note } = req.body;
    const { createNotification } = require('./notifications');

    const pair = await PlagiarismPair.findByIdAndUpdate(
      req.params.id,
      {
        verdict,
        facultyNote: note
      },
      { new: true }
    )
      .populate('userId1', 'name enrollment avatar')
      .populate('userId2', 'name enrollment avatar')
      .populate('problemId', 'title')
      .populate('contestId', 'title');

    if (!pair) return res.status(404).json({ error: 'Not found' });

    const studentIds = [pair.userId1?._id || pair.userId1, pair.userId2?._id || pair.userId2].filter(Boolean);
    const pTitle = pair.problemId?.title || 'Contest Problem';
    const cTitle = pair.contestId?.title || 'Contest';

    for (const sId of studentIds) {
      if (verdict === 'flagged') {
        await User.findByIdAndUpdate(sId, {
          academicStatus: 'flagged',
          flaggedReason: note ? `Plagiarism Flag: ${note}` : `Flagged for code plagiarism on "${pTitle}" (${cTitle})`,
          $inc: { academicWarningCount: 1 },
          lastAcademicActionAt: new Date()
        });

        await createNotification({
          userId: sId,
          type: 'plagiarism',
          title: '🚩 Academic Integrity: Account Flagged (Red)',
          message: note
            ? `Your submission for "${pTitle}" was flagged for code plagiarism. Reason: ${note}. Your account is now in FLAGGED status.`
            : `Your submission for "${pTitle}" in "${cTitle}" was flagged for code plagiarism. Your account has been placed in FLAGGED status.`,
          link: '/profile/' + (sId.toString() === pair.userId1?._id?.toString() ? pair.userId1?.enrollment : pair.userId2?.enrollment)
        });
      } else if (verdict === 'warned') {
        await User.findByIdAndUpdate(sId, {
          academicStatus: 'warning',
          flaggedReason: note ? `Academic Warning: ${note}` : `Academic warning issued for code similarity on "${pTitle}" (${cTitle})`,
          $inc: { academicWarningCount: 1 },
          lastAcademicActionAt: new Date()
        });

        await createNotification({
          userId: sId,
          type: 'plagiarism',
          title: '⚠️ Academic Warning Issued: Code Similarity',
          message: note
            ? `Faculty issued an academic warning on "${pTitle}". Note: ${note}. Please ensure all future contest submissions are independent.`
            : `Faculty issued an academic warning regarding code similarity on "${pTitle}" in "${cTitle}". Repeated infractions will result in account suspension.`,
          link: '/profile/' + (sId.toString() === pair.userId1?._id?.toString() ? pair.userId1?.enrollment : pair.userId2?.enrollment)
        });
      } else if (verdict === 'cleared') {
        // Check if student has other active flagged or warned pairs
        const otherFlags = await PlagiarismPair.countDocuments({
          _id: { $ne: pair._id },
          $or: [{ userId1: sId }, { userId2: sId }],
          verdict: { $in: ['flagged', 'warned'] }
        });

        if (otherFlags === 0) {
          await User.findByIdAndUpdate(sId, {
            academicStatus: 'good',
            flaggedReason: '',
            lastAcademicActionAt: new Date()
          });
        }

        await createNotification({
          userId: sId,
          type: 'plagiarism',
          title: '✓ Academic Review Cleared',
          message: `Your solution for "${pTitle}" has been reviewed by faculty and cleared of academic integrity concerns.`,
          link: '/problems'
        });
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('academic-status-updated', {
        pairId: pair._id,
        verdict,
        studentIds
      });
    }

    res.json(pair);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/plagiarism/clear-all — delete all or by contestId
router.delete('/clear-all', auth, facultyOnly, async (req, res) => {
  try {
    const { contestId } = req.query;
    const filter = contestId ? { contestId } : {};
    const result = await PlagiarismPair.deleteMany(filter);
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/plagiarism/:id — delete a specific pair
router.delete('/:id', auth, facultyOnly, async (req, res) => {
  try {
    const pair = await PlagiarismPair.findByIdAndDelete(req.params.id);
    if (!pair) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
