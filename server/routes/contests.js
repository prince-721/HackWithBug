const express = require('express');
const { Contest, DailyChallenge, ProctoringLog } = require('../db');
const { auth, facultyOnly } = require('../middleware/auth');
const { createNotification } = require('./notifications');
const router = express.Router();

const jwt = require('jsonwebtoken');

// Helper to get optional user
const getOptionalUser = (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hackwithbug_super_secret_jwt_key_2025');
      return decoded;
    }
  } catch (err) {}
  return null;
};

// Helper to dynamically shift contest status based on current system time
const checkAndUpdateStatus = async (contest) => {
  if (contest.status === 'draft') return contest;

  const now = Date.now();
  const start = new Date(contest.startTime).getTime();
  const end = start + (contest.duration * 60000);

  let newStatus = contest.status;
  if (now < start) {
    newStatus = 'scheduled';
  } else if (now >= start && now < end) {
    newStatus = 'live';
  } else {
    newStatus = 'ended';
  }

  if (newStatus !== contest.status) {
    contest.status = newStatus;
    await contest.save();
  }
  return contest;
};

// GET /api/contests
router.get('/', async (req, res) => {
  try {
    const contests = await Contest.find()
      .populate({ path: 'problems', select: 'id title difficulty points tags timeLimit memoryLimit' })
      .sort({ startTime: 1 });

    const user = getOptionalUser(req);
    const enriched = [];
    for (const c of contests) {
      await checkAndUpdateStatus(c);
      const json = c.toJSON();
      const isRegistered = user ? c.registeredUsers?.some(uid => uid.toString() === user.id) : false;
      enriched.push({
        ...json,
        participantCount: c.registeredUsers?.length || json.participants || 0,
        isRegistered
      });
    }

    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/contests/daily/challenge — today's daily challenge (MUST be before /:id)
router.get('/daily/challenge', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    let challenge = await DailyChallenge.findOne({ date: today }).populate('problemId');
    if (!challenge) {
      // Auto-create today's challenge from a random easy/medium problem
      const { Problem } = require('../db');
      const problems = await Problem.find({ difficulty: { $in: ['easy', 'medium'] } });
      if (problems.length > 0) {
        const random = problems[Math.floor(Math.random() * problems.length)];
        challenge = await DailyChallenge.create({ date: today, problemId: random._id, solvers: [] });
        await challenge.populate('problemId');
      }
    }
    if (!challenge) return res.status(404).json({ error: 'No daily challenge today' });
    res.json(challenge);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/contests/:id
router.get('/:id', async (req, res) => {
  try {
    let c = await Contest.findById(req.params.id).populate('problems');
    if (!c) return res.status(404).json({ error: 'Contest not found' });
    
    await checkAndUpdateStatus(c);
    
    const user = getOptionalUser(req);
    const json = c.toJSON();
    const isRegistered = user ? c.registeredUsers?.some(uid => uid.toString() === user.id) : false;

    let isDisqualified = false;
    let disqualifiedReason = '';
    let disqualifiedAt = null;
    let logSummary = null;

    if (user) {
      const pLog = await ProctoringLog.findOne({ userId: user.id, contestId: c._id });
      if (pLog) {
        logSummary = {
          tabSwitches: pLog.tabSwitches,
          fullscreenExits: pLog.fullscreenExits,
          totalAlerts: pLog.totalAlerts
        };
        if (pLog.disqualified) {
          isDisqualified = true;
          disqualifiedReason = pLog.disqualifiedReason || 'Disqualified due to examination policy violations';
          disqualifiedAt = pLog.disqualifiedAt;
        }
      }
    }

    res.json({
      ...json,
      problemDetails: isDisqualified ? [] : json.problems,
      isRegistered,
      isDisqualified,
      disqualifiedReason,
      disqualifiedAt,
      logSummary,
      participantCount: c.registeredUsers?.length || json.participants || 0
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/contests/:id/register — Register student
router.post('/:id/register', auth, async (req, res) => {
  try {
    const { password } = req.body;
    const contest = await Contest.findById(req.params.id);
    if (!contest) return res.status(404).json({ error: 'Contest not found' });

    // Check if user is disqualified from this contest
    const pLog = await ProctoringLog.findOne({ userId: req.user.id, contestId: req.params.id });
    if (pLog && pLog.disqualified) {
      return res.status(403).json({ error: 'You have been disqualified from this contest and are permanently barred from re-entering.' });
    }

    if (contest.contestType === 'private') {
      if (contest.password !== password) {
        return res.status(403).json({ error: 'Incorrect contest password' });
      }
    }

    if (contest.registeredUsers.some(uid => uid.toString() === req.user.id)) {
      return res.status(400).json({ error: 'Already registered for this contest' });
    }

    contest.registeredUsers.push(req.user.id);
    contest.participants = contest.registeredUsers.length;
    await contest.save();

    res.json({ success: true, isRegistered: true, participantCount: contest.participants });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/contests
router.post('/', auth, facultyOnly, async (req, res) => {
  try {
    const {
      title, description, bannerUrl, contestType, password,
      startTime, endTime, duration, maxMarks, numProblems,
      proctored, allowedLangs, aiEnabled, aiChat, aiHints,
      aiReview, aiExplain, maxParticipants, freezeMinutes,
      leaderboardVisibility, status, scheduleLocked
    } = req.body;

    const contest = await Contest.create({
      title, description, bannerUrl, contestType, password,
      startTime, endTime,
      duration: duration ? parseInt(duration) : 120,
      maxMarks: maxMarks ? parseInt(maxMarks) : 100,
      numProblems: numProblems ? parseInt(numProblems) : 0,
      status: status || 'scheduled',
      problems: [],
      createdBy: req.user.id,
      participants: 0,
      proctored: proctored ?? true,
      allowedLangs: allowedLangs || ['cpp17', 'python3', 'java17', 'c'],
      maxParticipants: maxParticipants || 200,
      leaderboardVisibility: leaderboardVisibility || 'live',
      scheduleLocked: scheduleLocked ?? false,
      aiEnabled: aiEnabled ?? true,
      aiChat: aiChat ?? true,
      aiHints: aiHints ?? true,
      aiReview: aiReview ?? true,
      aiExplain: aiExplain ?? true,
      freezeMinutes: freezeMinutes || 0
    });

    res.json(contest);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/contests/:id
router.put('/:id', auth, facultyOnly, async (req, res) => {
  try {
    const contest = await Contest.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!contest) return res.status(404).json({ error: 'Not found' });
    // Notify all students in this contest room that the contest was updated (e.g. timing changes)
    const io = req.app.get('io');
    if (io) {
      io.to(`contest-${req.params.id}`).emit('contest-updated', { contestId: req.params.id });
    }
    res.json(contest);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/contests/:id/duplicate
router.post('/:id/duplicate', auth, facultyOnly, async (req, res) => {
  try {
    const orig = await Contest.findById(req.params.id).populate('problems');
    if (!orig) return res.status(404).json({ error: 'Contest not found' });
    
    // Duplicate problems first
    const { Problem } = require('../db');
    const newProblems = [];
    for (const prob of orig.problems) {
      const pJson = prob.toJSON();
      delete pJson.id;
      delete pJson._id;
      pJson.title = pJson.title + ' (Copy)';
      const newP = await Problem.create(pJson);
      newProblems.push(newP._id);
    }

    const cJson = orig.toJSON();
    delete cJson.id;
    delete cJson._id;
    cJson.title = cJson.title + ' (Copy)';
    cJson.problems = newProblems;
    cJson.participants = 0;
    cJson.status = 'draft';
    cJson.scheduleLocked = false;
    cJson.createdBy = req.user.id;

    const dup = await Contest.create(cJson);
    res.json(dup);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/contests/:id/ai-settings — update AI feature flags
router.patch('/:id/ai-settings', auth, facultyOnly, async (req, res) => {
  try {
    const { aiEnabled, aiChat, aiHints, aiReview, aiExplain, aiAutocomplete } = req.body;
    const update = {};
    if (aiEnabled !== undefined) update.aiEnabled = aiEnabled;
    if (aiChat !== undefined) update.aiChat = aiChat;
    if (aiHints !== undefined) update.aiHints = aiHints;
    if (aiReview !== undefined) update.aiReview = aiReview;
    if (aiExplain !== undefined) update.aiExplain = aiExplain;
    if (aiAutocomplete !== undefined) update.aiAutocomplete = aiAutocomplete;

    const contest = await Contest.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!contest) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, aiSettings: { aiEnabled: contest.aiEnabled, aiChat: contest.aiChat, aiHints: contest.aiHints, aiReview: contest.aiReview, aiExplain: contest.aiExplain } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/contests/:id/announce — add announcement
router.post('/:id/announce', auth, facultyOnly, async (req, res) => {
  try {
    const { text, important } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });

    const contest = await Contest.findByIdAndUpdate(req.params.id, {
      $push: { announcements: { text, createdBy: req.user.id, createdAt: new Date(), important: important ?? false } }
    }, { new: true });

    if (!contest) return res.status(404).json({ error: 'Not found' });

    // The new announcement is always last
    const announcement = contest.announcements[contest.announcements.length - 1];
    res.json(announcement);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/contests/:id/announcements
router.get('/:id/announcements', async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id).select('announcements');
    if (!contest) return res.status(404).json({ error: 'Not found' });
    // Return newest first
    res.json([...contest.announcements].reverse());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/contests/:id/student-submissions — faculty view all student submissions for a contest
router.get('/:id/student-submissions', auth, facultyOnly, async (req, res) => {
  try {
    const { Submission, User } = require('../db');
    
    // Get all submissions for this contest
    const submissions = await Submission.find({ contestId: req.params.id })
      .populate('userId', 'name enrollment avatar semester')
      .populate('problemId', 'title difficulty points')
      .sort({ timestamp: -1 });

    // Get proctoring logs for this contest
    const procLogs = await ProctoringLog.find({ contestId: req.params.id })
      .populate('userId', 'name enrollment');

    // Get the contest info
    const contest = await Contest.findById(req.params.id).populate('problems', 'title difficulty points');
    if (!contest) return res.status(404).json({ error: 'Contest not found' });

    // Group submissions by student
    const studentMap = {};
    for (const sub of submissions) {
      const studentId = sub.userId?._id?.toString() || sub.userId?.toString();
      if (!studentId) continue;
      
      if (!studentMap[studentId]) {
        studentMap[studentId] = {
          studentId,
          name: sub.userId?.name || 'Unknown',
          enrollment: sub.userId?.enrollment || '',
          avatar: sub.userId?.avatar || '',
          semester: sub.userId?.semester || 0,
          submissions: [],
          totalAC: 0,
          totalSubmissions: 0,
          bestScores: {} // problemId -> best partial score
        };
      }
      
      const entry = studentMap[studentId];
      entry.submissions.push({
        id: sub._id,
        problemId: sub.problemId?._id?.toString(),
        problemTitle: sub.problemId?.title || 'Unknown',
        problemDifficulty: sub.problemId?.difficulty || 'medium',
        problemPoints: sub.problemId?.points || 100,
        verdict: sub.verdict,
        language: sub.language,
        code: sub.code,
        testsPassed: sub.testsPassed || 0,
        totalTests: sub.totalTests || 1,
        partialScore: sub.partialScore || 0,
        time: sub.time || 0,
        memory: sub.memory || 0,
        timestamp: sub.timestamp,
        aiFeedback: sub.aiFeedback || ''
      });
      
      entry.totalSubmissions++;
      if (sub.verdict === 'AC') entry.totalAC++;
      
      const probKey = sub.problemId?._id?.toString();
      if (probKey) {
        const score = sub.partialScore || (sub.verdict === 'AC' ? 100 : 0);
        if (!entry.bestScores[probKey] || score > entry.bestScores[probKey]) {
          entry.bestScores[probKey] = score;
        }
      }
    }

    // Attach proctoring data to each student
    for (const log of procLogs) {
      const studentId = log.userId?._id?.toString() || log.userId?.toString();
      if (studentId && studentMap[studentId]) {
        studentMap[studentId].proctoring = {
          totalAlerts: log.totalAlerts || 0,
          tabSwitches: log.tabSwitches || 0,
          pasteEvents: log.pasteEvents || 0,
          fullscreenExits: log.fullscreenExits || 0,
          disqualified: log.disqualified || false,
          disqualifiedReason: log.disqualifiedReason || '',
          events: (log.events || []).slice(-20) // last 20 events
        };
      }
    }

    const students = Object.values(studentMap).sort((a, b) => b.totalAC - a.totalAC);

    res.json({
      contest: {
        id: contest._id,
        title: contest.title,
        status: contest.status,
        duration: contest.duration,
        startTime: contest.startTime,
        problems: (contest.problems || []).map(p => ({
          id: p._id,
          title: p.title,
          difficulty: p.difficulty,
          points: p.points
        }))
      },
      students,
      totalStudents: students.length,
      totalSubmissions: submissions.length
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/contests/:id
router.delete('/:id', auth, facultyOnly, async (req, res) => {
  try {
    const contest = await Contest.findByIdAndDelete(req.params.id);
    if (!contest) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

