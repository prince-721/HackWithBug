// submissions.js
const express = require('express');
const { Submission, Problem, User, Contest } = require('../db');
const { auth } = require('../middleware/auth');
const { createNotification } = require('./notifications');
const { judgeAllTestCases, executeTestCase } = require('../utils/judge');
const router = express.Router();

// All code execution (practice + contest) uses the unified Wandbox-based judge

// GET /api/submissions
router.get('/', auth, async (req, res) => {
  try {
    const { userId, contestId, problemId, page = 1 } = req.query;
    const limit = 50;
    const filter = {};
    if (userId) filter.userId = userId;
    if (contestId) filter.contestId = contestId;
    if (problemId) filter.problemId = problemId;

    const subs = await Submission.find(filter)
      .populate('userId', 'name avatar enrollment')
      .populate('problemId', 'title difficulty')
      .sort({ timestamp: -1 })
      .skip((parseInt(page) - 1) * limit)
      .limit(limit);

    const enriched = subs.map(s => {
      const json = s.toJSON();
      return {
        ...json,
        userName: json.userId?.name,
        userAvatar: json.userId?.avatar,
        problemTitle: json.problemId?.title,
        problemDifficulty: json.problemId?.difficulty
      };
    });

    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/submissions/run — Quick Run Code against sample or custom input
router.post('/run', auth, async (req, res) => {
  try {
    const { code, language, problemId, customInput } = req.body;
    if (!code || !language) return res.status(400).json({ error: 'code and language required' });

    let problem = null;
    if (problemId) {
      problem = await Problem.findById(problemId);
    }

    if (customInput !== undefined && customInput !== null && String(customInput).trim() !== '') {
      // Execute against custom input — show raw output, compare against sample expected if available
      const sampleExpected = problem?.sampleOutput || '';
      const result = await executeTestCase(code, language, customInput, sampleExpected, problem?.timeLimit || 2.0);
      return res.json({
        verdict: result.verdict,
        stdout: result.stdout,
        stderr: result.stderr,
        timeMs: result.timeMs,
        memoryKb: result.memoryKb,
        passed: result.passed,
        isCustom: true,
        testsPassed: result.passed ? 1 : 0,
        totalTests: 1,
        testResults: [{
          testCaseIndex: 1,
          type: 'custom',
          input: customInput,
          expectedOutput: sampleExpected || '(no expected output — custom run)',
          actualOutput: result.stdout,
          stderr: result.stderr,
          verdict: result.verdict,
          passed: result.passed
        }]
      });
    }

    // Otherwise run against sample testcases with proper expected outputs
    let sampleCases = [];
    if (problem?.testCases && problem.testCases.length > 0) {
      sampleCases = problem.testCases.filter(t => t.type === 'sample');
    }
    if (sampleCases.length === 0 && problem?.sampleInput) {
      sampleCases = [{ input: problem.sampleInput, output: problem.sampleOutput || '' }];
    }
    if (sampleCases.length === 0) {
      // No problem or no test cases — run code and show output only
      const result = await executeTestCase(code, language, '', '', problem?.timeLimit || 2.0);
      return res.json({
        verdict: result.stderr ? 'CE' : 'AC',
        stdout: result.stdout,
        stderr: result.stderr,
        timeMs: result.timeMs,
        testsPassed: 0,
        totalTests: 0,
        testResults: []
      });
    }

    const judgeResult = await judgeAllTestCases(code, language, sampleCases, problem?.timeLimit || 2.0);
    res.json(judgeResult);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/submissions — Final Submit Code (evaluates all testcases)
router.post('/', auth, async (req, res) => {
  try {
    const { code, language, problemId, contestId, typingAnalytics } = req.body;
    if (!code || !language || !problemId) return res.status(400).json({ error: 'code, language, problemId required' });

    const problem = await Problem.findById(problemId);
    if (!problem) return res.status(404).json({ error: 'Problem not found' });

    // Check AI settings and disqualification if in a contest
    let contest = null;
    if (contestId) {
      contest = await Contest.findById(contestId).select('aiEnabled status');
      const { ProctoringLog } = require('../db');
      const pLog = await ProctoringLog.findOne({ userId: req.user.id, contestId });
      if (pLog && pLog.disqualified) {
        return res.status(403).json({ error: 'You have been disqualified from this contest and cannot submit solutions.' });
      }
    }

    // Gather all testcases (samples + hidden)
    let allTestCases = [];
    if (problem.testCases && problem.testCases.length > 0) {
      allTestCases = [...problem.testCases];
    }
    if (problem.hiddenTestCases && problem.hiddenTestCases.length > 0) {
      const formattedHidden = problem.hiddenTestCases.map(h => ({
        type: 'hidden',
        input: h.input || '',
        output: h.output || ''
      }));
      allTestCases = [...allTestCases, ...formattedHidden];
    }
    if (allTestCases.length === 0 && problem.sampleInput) {
      allTestCases = [{ type: 'sample', input: problem.sampleInput, output: problem.sampleOutput || '' }];
    }
    if (allTestCases.length === 0) {
      allTestCases = [{ type: 'sample', input: '', output: '' }];
    }

    // Run deterministic judge
    const judgeResult = await judgeAllTestCases(code, language, allTestCases, problem.timeLimit || 2.0);
    const { verdict, testsPassed, totalTests, timeMs, memoryKb, failingCase } = judgeResult;

    let aiFeedback = null;
    if (verdict !== 'AC') {
      if (failingCase?.stderr) {
        aiFeedback = failingCase.stderr;
      } else if (failingCase) {
        aiFeedback = `Test Case #${failingCase.testCaseIndex} Mismatch:\nInput: ${failingCase.input}\nExpected: ${failingCase.expectedOutput}\nActual: ${failingCase.actualOutput}`;
      }
    }

    const partialScore = totalTests > 0 ? Math.round((testsPassed / totalTests) * 100) : (verdict === 'AC' ? 100 : 0);


    // Build typing analytics object
    const analytics = typingAnalytics ? {
      wpm: typingAnalytics.wpm || 0,
      avgWpm: typingAnalytics.avgWpm || 0,
      peakWpm: typingAnalytics.peakWpm || 0,
      keystrokes: typingAnalytics.keystrokes || 0,
      totalCharacters: typingAnalytics.totalCharacters || 0,
      pasteCount: typingAnalytics.pasteCount || 0,
      copyCount: typingAnalytics.copyCount || 0,
      backspaceCount: typingAnalytics.backspaceCount || 0,
      deleteCount: typingAnalytics.deleteCount || 0,
      activeTime: typingAnalytics.activeTime || 0,
      idleTime: typingAnalytics.idleTime || 0,
      codingDuration: typingAnalytics.codingDuration || 0,
      wpmHistory: typingAnalytics.wpmHistory || []
    } : {};

    const sub = await Submission.create({
      userId: req.user.id,
      problemId,
      contestId: contestId || null,
      verdict,
      language,
      time: timeMs || 0,
      memory: Math.round((memoryKb || 0) / 1024),
      testsPassed: testsPassed || 0,
      totalTests: totalTests || 1,
      code,
      aiFeedback,
      partialScore,
      typingAnalytics: analytics
    });

    // Update user stats
    const ratingChange = verdict === 'AC' ? Math.floor(10 + Math.random() * 30) : -5;
    const user = await User.findById(req.user.id);
    if (user) {
      if (verdict === 'AC') {
        user.solved = Math.min(user.solved + 1, 9999);
        // Update daily streak
        const today = new Date().toDateString();
        const lastDate = user.lastSolvedDate ? new Date(user.lastSolvedDate).toDateString() : null;
        if (lastDate !== today) {
          const yesterday = new Date(Date.now() - 86400000).toDateString();
          if (lastDate === yesterday) user.streak += 1;
          else if (lastDate !== today) user.streak = 1;
        }
        user.lastSolvedDate = new Date();
      }
      user.rating = Math.max(0, user.rating + ratingChange);
      user.lastActive = new Date();
      await user.save();
    }

    // Send notification
    await createNotification({
      userId: req.user.id,
      type: 'verdict',
      title: `${verdict} on ${problem.title}`,
      message: verdict === 'AC'
        ? `Your solution was accepted! +${ratingChange} rating.`
        : `Your solution got ${verdict}. Check the AI feedback for hints.`,
      link: contestId ? `/contest/${contestId}` : '/problems'
    });

    // Emit Socket.io leaderboard update if in a contest
    if (contestId) {
      const io = req.app.get('io');
      if (io) {
        io.to(`contest-${contestId}`).emit('leaderboard-updated');
        console.log(`🔌 Broadcasted leaderboard-updated to room: contest-${contestId}`);
      }

      // Asynchronous real-time plagiarism check during contest
      if (code && code.trim().length > 30) {
        (async () => {
          try {
            const { PlagiarismPair, User } = require('../db');
            const { compareTwoCodes, canonicalizeCode, computeTokenSimilarity } = require('../utils/plagiarismEngine');
            const otherSubs = await Submission.find({
              contestId,
              problemId,
              userId: { $ne: req.user.id }
            }).populate('userId', 'name enrollment');

            const userSubMap = new Map();
            for (const os of otherSubs) {
              const ouId = os.userId?._id?.toString() || os.userId?.toString();
              if (ouId && os.code && os.code.trim().length > 30 && !userSubMap.has(ouId)) {
                userSubMap.set(ouId, os);
              }
            }

            const myCanon = canonicalizeCode(code);

            for (const [ouId, otherSub] of userSubMap.entries()) {
              const otherCanon = canonicalizeCode(otherSub.code);
              const tokenPrelim = computeTokenSimilarity(myCanon.tokens, otherCanon.tokens);

              if (tokenPrelim >= 20) {
                const analysis = await compareTwoCodes(
                  code, otherSub.code,
                  user?.name || 'Student',
                  otherSub.userId?.name || 'Peer',
                  problem.title,
                  language, otherSub.language
                );

                if (analysis.combinedScore >= 30) {
                  const existing = await PlagiarismPair.findOne({
                    contestId,
                    problemId,
                    $or: [
                      { userId1: req.user.id, userId2: ouId },
                      { userId1: ouId, userId2: req.user.id }
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
                    existing.code1 = code;
                    existing.code2 = otherSub.code;
                    await existing.save();
                  } else {
                    await PlagiarismPair.create({
                      contestId,
                      problemId,
                      userId1: req.user.id,
                      userId2: ouId,
                      submissionId1: sub._id,
                      submissionId2: otherSub._id,
                      code1: code,
                      code2: otherSub.code,
                      lang1: language,
                      lang2: otherSub.language || 'cpp17',
                      tokenScore: analysis.tokenScore,
                      astScore: analysis.astScore,
                      semanticScore: analysis.semanticScore,
                      combinedScore: analysis.combinedScore,
                      verdict: analysis.combinedScore >= 70 ? 'flagged' : analysis.combinedScore >= 45 ? 'warned' : 'cleared',
                      aiAnalysis: analysis.aiAnalysis,
                      matchedPatterns: analysis.matchedPatterns,
                      matchedLines: analysis.matchedLines,
                      recommendation: analysis.recommendation
                    });

                    // Notify faculty members if high similarity
                    if (analysis.combinedScore >= 60) {
                      const facultyMembers = await User.find({ role: 'faculty' }).select('_id');
                      for (const f of facultyMembers) {
                        await createNotification({
                          userId: f._id,
                          type: 'plagiarism',
                          title: `🛡 Plagiarism Alert: ${user?.name} & ${otherSub.userId?.name}`,
                          message: `${analysis.combinedScore}% code similarity detected on "${problem.title}".`,
                          link: `/dev/plagiarism/${contestId}`
                        });
                      }
                    }
                  }

                  if (io) {
                    io.to(`contest-${contestId}`).emit('plagiarism-detected', {
                      problemId,
                      student1: user?.name,
                      student2: otherSub.userId?.name,
                      score: analysis.combinedScore,
                      verdict: analysis.verdict
                    });
                  }
                }
              }
            }
          } catch (plagErr) {
            console.warn('[PlagiarismLiveCheck] Async check error:', plagErr.message);
          }
        })();
      }
    }

    const responseData = {
      ...sub.toJSON(),
      userName: user?.name, userAvatar: user?.avatar,
      problemTitle: problem.title, problemDifficulty: problem.difficulty,
      testResults: judgeResult.testResults || []
    };

    res.json(responseData);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/submissions/:id/ai-feedback
router.patch('/:id/ai-feedback', auth, async (req, res) => {
  try {
    const { feedback, partialScore } = req.body;
    const sub = await Submission.findByIdAndUpdate(req.params.id, { aiFeedback: feedback, partialScore }, { new: true });
    if (!sub) return res.status(404).json({ error: 'Not found' });
    res.json(sub);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/submissions/:id/typing-analytics
router.get('/:id/typing-analytics', auth, async (req, res) => {
  try {
    const sub = await Submission.findById(req.params.id).select('typingAnalytics userId');
    if (!sub) return res.status(404).json({ error: 'Not found' });
    if (sub.userId.toString() !== req.user.id && req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
    res.json(sub.typingAnalytics || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
