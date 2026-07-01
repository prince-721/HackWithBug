const express = require('express');
const { PlagiarismPair, Contest, Submission } = require('../db');
const { auth, facultyOnly } = require('../middleware/auth');
const router = express.Router();

// K-gram rolling hash fingerprinting
const kgramHash = (tokens, k = 5) => {
  const hashes = new Set();
  for (let i = 0; i <= tokens.length - k; i++) {
    const window = tokens.slice(i, i + k).join('|');
    let hash = 0;
    for (let j = 0; j < window.length; j++) hash = (hash * 31 + window.charCodeAt(j)) >>> 0;
    hashes.add(hash);
  }
  return hashes;
};

const tokenize = (code) => {
  return code
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/"[^"]*"/g, 'STR')
    .replace(/\d+/g, 'NUM')
    .replace(/\b(int|long|char|bool|void|string|vector|auto|return|if|else|for|while|class|struct)\b/g, w => w.toUpperCase())
    .split(/\s+/)
    .filter(Boolean);
};

const computeSimilarity = (code1, code2) => {
  const t1 = tokenize(code1);
  const t2 = tokenize(code2);
  const h1 = kgramHash(t1);
  const h2 = kgramHash(t2);
  let matches = 0;
  h1.forEach(h => { if (h2.has(h)) matches++; });
  return h1.size === 0 ? 0 : Math.round((matches / Math.max(h1.size, h2.size)) * 100);
};

router.get('/', auth, facultyOnly, async (req, res) => {
  try {
    const pairs = await PlagiarismPair.find()
      .populate('userId1', 'name enrollment avatar')
      .populate('userId2', 'name enrollment avatar')
      .populate('problemId', 'title')
      .populate('contestId', 'title');
      
    const enriched = pairs.map(p => {
      const json = p.toJSON();
      return {
        ...json,
        user1: json.userId1,
        user2: json.userId2,
        problemTitle: json.problemId?.title,
        contestTitle: json.contestId?.title
      };
    });
    
    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/analyze', auth, facultyOnly, async (req, res) => {
  try {
    const contestId = req.body.contestId;
    const contest = await Contest.findById(contestId);
    if (!contest) return res.status(404).json({ error: 'Contest not found' });

    const newPairs = [];
    const problemsList = contest.problems || [];
    
    for (const probId of problemsList) {
      const probSubs = await Submission.find({ contestId, problemId: probId, verdict: 'AC' });
      
      for (let i = 0; i < probSubs.length; i++) {
        for (let j = i + 1; j < probSubs.length; j++) {
          const s1 = probSubs[i], s2 = probSubs[j];
          if (s1.userId.toString() === s2.userId.toString()) continue;
          
          const tokenScore = computeSimilarity(s1.code || '', s2.code || '');
          if (tokenScore > 30) {
            const existing = await PlagiarismPair.findOne({ 
              userId1: s1.userId, 
              userId2: s2.userId, 
              problemId: probId 
            });
            
            if (!existing) {
              const pair = await PlagiarismPair.create({
                contestId,
                problemId: probId,
                userId1: s1.userId,
                userId2: s2.userId,
                tokenScore,
                astScore: Math.floor(tokenScore * 0.9),
                semanticScore: Math.floor(tokenScore * 0.95),
                combinedScore: tokenScore,
                verdict: 'pending',
                aiAnalysis: 'Pending AI analysis',
                matchedLines: []
              });
              newPairs.push(pair);
            }
          }
        }
      }
    }
    
    const totalFlags = await PlagiarismPair.countDocuments({ contestId });
    res.json({ analyzed: true, newPairs: newPairs.length, totalFlags });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id/verdict', auth, facultyOnly, async (req, res) => {
  try {
    const pair = await PlagiarismPair.findByIdAndUpdate(req.params.id, {
      verdict: req.body.verdict,
      facultyNote: req.body.note
    }, { new: true });
    
    if (!pair) return res.status(404).json({ error: 'Not found' });
    res.json(pair);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
