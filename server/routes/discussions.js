const express = require('express');
const { Discussion, Contest } = require('../db');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Determine if discussion should be hidden (contest is live)
const isHidden = async (contestId) => {
  if (!contestId) return false;
  const contest = await Contest.findById(contestId).select('status');
  return contest?.status === 'live';
};

// GET /api/discussions?contestId=&problemId=&page=
router.get('/', auth, async (req, res) => {
  try {
    const { contestId, problemId, page = 1 } = req.query;
    const limit = 20;
    const skip = (parseInt(page) - 1) * limit;

    const filter = {};
    if (contestId) filter.contestId = contestId;
    if (problemId) filter.problemId = problemId;

    // Only faculty/admin can see hidden discussions
    if (req.user.role === 'student') {
      filter.hidden = false;
    }

    const [threads, total] = await Promise.all([
      Discussion.find(filter)
        .populate('userId', 'name avatar enrollment')
        .populate('contestId', 'title status')
        .populate('problemId', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Discussion.countDocuments(filter)
    ]);

    res.json({ threads, total, pages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/discussions/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const d = await Discussion.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate('userId', 'name avatar enrollment')
      .populate('answers.userId', 'name avatar enrollment')
      .populate('contestId', 'title status')
      .populate('problemId', 'title');

    if (!d) return res.status(404).json({ error: 'Not found' });
    if (d.hidden && req.user.role === 'student') return res.status(403).json({ error: 'Discussion hidden during live contest' });
    res.json(d);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/discussions — create thread
router.post('/', auth, async (req, res) => {
  try {
    const { title, body, contestId, problemId, tags } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'title and body required' });

    const hidden = await isHidden(contestId);
    const d = await Discussion.create({
      title, body,
      contestId: contestId || null,
      problemId: problemId || null,
      userId: req.user.id,
      tags: tags || [],
      hidden
    });
    await d.populate('userId', 'name avatar enrollment');
    res.json(d);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/discussions/:id/answer
router.post('/:id/answer', auth, async (req, res) => {
  try {
    const { body } = req.body;
    if (!body) return res.status(400).json({ error: 'body required' });

    const d = await Discussion.findById(req.params.id);
    if (!d) return res.status(404).json({ error: 'Thread not found' });
    if (d.hidden && req.user.role === 'student') return res.status(403).json({ error: 'Discussion hidden during live contest' });

    d.answers.push({ userId: req.user.id, body, likes: [], accepted: false, createdAt: new Date() });
    d.updatedAt = new Date();
    await d.save();
    await d.populate('answers.userId', 'name avatar enrollment');
    res.json(d);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/discussions/:id/like — toggle like
router.post('/:id/like', auth, async (req, res) => {
  try {
    const d = await Discussion.findById(req.params.id);
    if (!d) return res.status(404).json({ error: 'Not found' });
    const idx = d.likes.findIndex(l => l.toString() === req.user.id);
    if (idx >= 0) d.likes.splice(idx, 1);
    else d.likes.push(req.user.id);
    await d.save();
    res.json({ likes: d.likes.length, liked: idx < 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/discussions/:id/answers/:answerId/accept
router.post('/:id/answers/:answerId/accept', auth, async (req, res) => {
  try {
    const d = await Discussion.findById(req.params.id);
    if (!d) return res.status(404).json({ error: 'Not found' });
    if (d.userId.toString() !== req.user.id) return res.status(403).json({ error: 'Only thread author can accept' });
    d.answers.forEach(a => { a.accepted = a.id === req.params.answerId; });
    await d.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/discussions/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const d = await Discussion.findById(req.params.id);
    if (!d) return res.status(404).json({ error: 'Not found' });
    if (d.userId.toString() !== req.user.id && req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
    await d.deleteOne();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
