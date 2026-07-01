const express = require('express');
const { ProctoringLog } = require('../db');
const { auth, facultyOnly } = require('../middleware/auth');
const router = express.Router();

// POST /api/proctoring/log — append a violation event
router.post('/log', auth, async (req, res) => {
  try {
    const { contestId, type, detail } = req.body;
    if (!contestId || !type) return res.status(400).json({ error: 'contestId and type required' });

    const event = { type, detail: detail || '', timestamp: new Date() };

    const typeToField = {
      tabSwitch: 'tabSwitches',
      paste: 'pasteEvents',
      fullscreenExit: 'fullscreenExits',
    };

    const incField = typeToField[type];
    const incUpdate = incField ? { $inc: { [incField]: 1, totalAlerts: 1 } } : { $inc: { totalAlerts: 1 } };

    const log = await ProctoringLog.findOneAndUpdate(
      { userId: req.user.id, contestId },
      {
        ...incUpdate,
        $push: { events: event }
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, totalAlerts: log.totalAlerts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/proctoring/:contestId/me — student's own log
router.get('/:contestId/me', auth, async (req, res) => {
  try {
    const log = await ProctoringLog.findOne({ userId: req.user.id, contestId: req.params.contestId });
    res.json(log || { events: [], totalAlerts: 0, tabSwitches: 0, pasteEvents: 0, fullscreenExits: 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/proctoring/:contestId — all logs for contest (faculty only)
router.get('/:contestId', auth, facultyOnly, async (req, res) => {
  try {
    const logs = await ProctoringLog.find({ contestId: req.params.contestId })
      .populate('userId', 'name enrollment avatar');
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/proctoring/:contestId/:userId — specific student (faculty only)
router.get('/:contestId/:userId', auth, facultyOnly, async (req, res) => {
  try {
    const log = await ProctoringLog.findOne({ userId: req.params.userId, contestId: req.params.contestId })
      .populate('userId', 'name enrollment avatar');
    if (!log) return res.status(404).json({ error: 'No proctoring log found' });
    res.json(log);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
