// problems.js
const express = require('express');
const { Problem } = require('../db');
const { auth, facultyOnly } = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { difficulty, tag, search } = req.query;
    const filter = {};
    
    if (difficulty) filter.difficulty = difficulty;
    if (tag) filter.tags = tag;
    if (search) filter.title = { $regex: search, $options: 'i' };
    
    const probs = await Problem.find(filter);
    res.json(probs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const p = await Problem.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', auth, facultyOnly, async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.testCases && Array.isArray(data.testCases)) {
      const samples = data.testCases.filter(t => t.type === 'sample');
      const hidden = data.testCases.filter(t => t.type === 'hidden');
      data.sampleInput = samples.length > 0 ? samples[0].input : (data.sampleInput || '');
      data.sampleOutput = samples.length > 0 ? samples[0].output : (data.sampleOutput || '');
      data.hiddenTestCases = hidden.map(h => ({ input: h.input || '', output: h.output || '' }));
    }
    const prob = await Problem.create({
      ...data,
      submissions: 0,
      acceptance: 0
    });
    res.json(prob);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', auth, facultyOnly, async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.testCases && Array.isArray(data.testCases)) {
      const samples = data.testCases.filter(t => t.type === 'sample');
      const hidden = data.testCases.filter(t => t.type === 'hidden');
      data.sampleInput = samples.length > 0 ? samples[0].input : '';
      data.sampleOutput = samples.length > 0 ? samples[0].output : '';
      data.hiddenTestCases = hidden.map(h => ({ input: h.input || '', output: h.output || '' }));
    }
    const prob = await Problem.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!prob) return res.status(404).json({ error: 'Not found' });
    res.json(prob);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
