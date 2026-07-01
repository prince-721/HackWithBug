// routes/typing.js
const express = require('express');
const { TypingPracticeSession, User } = require('../db');
const { auth } = require('../middleware/auth');
const router = express.Router();

// POST /api/typing-practice/sessions
router.post('/sessions', auth, async (req, res) => {
  try {
    const { language, snippetName, avgWpm, peakWpm, accuracy, keystrokes, backspaces, duration } = req.body;
    if (!language || !snippetName || avgWpm === undefined) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const session = await TypingPracticeSession.create({
      userId: req.user.id,
      language,
      snippetName,
      avgWpm,
      peakWpm: peakWpm || 0,
      accuracy: accuracy || 100,
      keystrokes: keystrokes || 0,
      backspaces: backspaces || 0,
      duration: duration || 0
    });

    res.json(session);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/typing-practice/history
router.get('/history', auth, async (req, res) => {
  try {
    const sessions = await TypingPracticeSession.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(sessions);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/typing-practice/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const sessions = await TypingPracticeSession.find()
      .populate('userId', 'name enrollment department avatar')
      .sort({ avgWpm: -1 })
      .limit(20);

    const formatted = sessions.map((s, idx) => {
      const userObj = s.userId || {};
      return {
        id: s._id,
        rank: idx + 1,
        name: userObj.name || 'Anonymous',
        enrollment: userObj.enrollment || '—',
        department: userObj.department || '—',
        avatar: userObj.avatar || '💻',
        avgWpm: s.avgWpm,
        accuracy: s.accuracy,
        language: s.language,
        createdAt: s.createdAt
      };
    });

    res.json(formatted);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
