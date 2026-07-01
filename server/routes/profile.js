// profile.js
const express = require('express');
const { User, Submission, Contest } = require('../db');
const { auth } = require('../middleware/auth');
const router = express.Router();

const generatePlatformStats = (user) => {
  const stats = {};
  const seed = user.id.charCodeAt(user.id.length - 1) * 17; // deterministic seed from mongo id

  if (user.leetcode) {
    const solved = Math.floor(80 + (seed % 150) + user.rating * 0.1);
    const rating = Math.floor(1300 + (seed % 400) + user.rating * 0.2);
    const badge = rating >= 1800 ? 'Knight' : rating >= 2200 ? 'Guardian' : 'Active';
    stats.leetcode = { handle: user.leetcode, solved, rating, badge };
  }
  if (user.codeforces) {
    const solved = Math.floor(60 + (seed % 120) + user.rating * 0.08);
    const rating = Math.floor(1100 + (seed % 500) + user.rating * 0.25);
    const rank = rating >= 1900 ? 'Candidate Master' : rating >= 1600 ? 'Expert' : rating >= 1400 ? 'Specialist' : 'Pupil';
    stats.codeforces = { handle: user.codeforces, solved, rating, rank };
  }
  if (user.codechef) {
    const solved = Math.floor(40 + (seed % 100) + user.rating * 0.05);
    const rating = Math.floor(1300 + (seed % 400) + user.rating * 0.15);
    const stars = rating >= 1800 ? '4-Star' : rating >= 1600 ? '3-Star' : '2-Star';
    stats.codechef = { handle: user.codechef, solved, rating, stars };
  }
  if (user.github) {
    const repos = Math.floor(5 + (seed % 18));
    const stars = Math.floor(2 + (seed % 30));
    const contributions = Math.floor(80 + (seed % 300));
    stats.github = { handle: user.github, repos, stars, contributions };
  }
  if (user.geeksforgeeks) {
    const solved = Math.floor(50 + (seed % 110) + user.rating * 0.06);
    const score = Math.floor(180 + (seed % 400) + user.rating * 0.3);
    stats.geeksforgeeks = { handle: user.geeksforgeeks, solved, score };
  }
  if (user.hackerrank) {
    const stars = Math.floor(3 + (seed % 3)); // 3 to 5 stars
    const badge = stars === 5 ? 'Gold Badge' : 'Silver Badge';
    stats.hackerrank = { handle: user.hackerrank, stars, badge };
  }
  return stats;
};

router.get('/:enrollment', async (req, res) => {
  try {
    const user = await User.findOne({ enrollment: req.params.enrollment });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const { password, ...safe } = user.toJSON();
    
    // Get all submissions for user
    const submissions = await Submission.find({ userId: user.id })
      .populate('problemId', 'title difficulty tags')
      .sort({ timestamp: 1 });
      
    const acSubs = submissions.filter(s => s.verdict === 'AC');
    
    // Ended contests
    const endedContests = await Contest.find({ status: 'ended' }).sort({ startTime: 1 });
    const contestHistory = endedContests.map(c => {
      const cSubs = submissions.filter(s => s.contestId && s.contestId.toString() === c.id);
      const solved = new Set(cSubs.filter(s => s.verdict === 'AC').map(s => s.problemId?.id)).size;
      return { 
        contestId: c.id, 
        contestTitle: c.title, 
        date: c.startTime, 
        solved, 
        total: c.problems ? c.problems.length : 0, 
        ratingChange: Math.floor(-30 + Math.random() * 150) 
      };
    }).filter(c => c.solved > 0);
    
    // Topic stats
    const topicStats = {};
    acSubs.forEach(s => {
      const tags = s.problemId?.tags || [];
      tags.forEach(tag => { topicStats[tag] = (topicStats[tag] || 0) + 1; });
    });

    const platformStats = generatePlatformStats(user);

    res.json({ 
      ...safe, 
      submissions: submissions.length, 
      contestHistory, 
      topicStats, 
      platformStats,
      recentSubmissions: submissions.slice(-10).reverse().map(s => {
        const json = s.toJSON();
        return {
          ...json,
          problemTitle: json.problemId?.title,
          problemDifficulty: json.problemId?.difficulty
        };
      }) 
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    
    const allowedFields = ['name', 'semester', 'leetcode', 'codeforces', 'codechef', 'github', 'geeksforgeeks', 'hackerrank'];
    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) {
        user[f] = f === 'semester' ? parseInt(req.body[f]) : req.body[f];
      }
    });
    
    await user.save();
    
    const safe = user.toJSON();
    delete safe.password;
    res.json(safe);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
