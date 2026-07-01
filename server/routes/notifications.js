const express = require('express');
const { Notification } = require('../db');
const { auth } = require('../middleware/auth');
const router = express.Router();

// GET /api/notifications — get my notifications (paginated)
router.get('/', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ userId: req.user.id, read: false })
    ]);

    res.json({ notifications, unreadCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/notifications/:id/read — mark one as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true },
      { new: true }
    );
    if (!n) return res.status(404).json({ error: 'Not found' });
    res.json(n);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, read: false }, { read: true });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/notifications/:id — delete one
router.delete('/:id', auth, async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Internal helper — create notification (not exposed directly, imported by other routes)
const createNotification = async ({ userId, type, title, message, link, meta }) => {
  try {
    return await Notification.create({ userId, type, title, message, link, meta });
  } catch (e) {
    console.error('Notification create failed:', e.message);
  }
};

module.exports = router;
module.exports.createNotification = createNotification;
