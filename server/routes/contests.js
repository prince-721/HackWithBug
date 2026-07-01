// routes/contests.js
const express = require('express');
const { Contest, DailyChallenge } = require('../db');
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
    res.json({
      ...json,
      problemDetails: json.problems,
      isRegistered,
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
