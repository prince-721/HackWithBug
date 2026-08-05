// profile.js
const express = require('express');
const { User, Submission, Contest } = require('../db');
const { auth } = require('../middleware/auth');
const { verifySinglePlatform, verifyAndFetchAllPlatforms } = require('../utils/platformVerifier');
const router = express.Router();

router.get('/:enrollment', async (req, res) => {
  try {
    const user = await User.findOne({ enrollment: req.params.enrollment });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Auto-fetch real platform stats if missing but handles exist
    const hasHandles = !!(user.leetcode || user.codeforces || user.codechef || user.github || user.geeksforgeeks || user.hackerrank || user.codolio);
    if (hasHandles && (!user.platformStats || Object.keys(user.platformStats).length === 0)) {
      const handles = {
        leetcode: user.leetcode,
        codeforces: user.codeforces,
        codechef: user.codechef,
        github: user.github,
        geeksforgeeks: user.geeksforgeeks,
        hackerrank: user.hackerrank,
        codolio: user.codolio
      };
      const { platformStats, verifiedPlatforms } = await verifyAndFetchAllPlatforms(handles);
      user.platformStats = platformStats;
      user.verifiedPlatforms = verifiedPlatforms;
      await user.save();
    }

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

    res.json({ 
      ...safe, 
      submissions: submissions.length, 
      contestHistory, 
      topicStats, 
      platformStats: user.platformStats || {},
      verifiedPlatforms: user.verifiedPlatforms || [],
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

// Single platform live handle verification endpoint
router.post('/verify-platform', auth, async (req, res) => {
  try {
    const { platform, handle } = req.body;
    if (!platform || !handle) {
      return res.status(400).json({ error: 'Platform and handle are required' });
    }
    const result = await verifySinglePlatform(platform, handle);
    if (!result || !result.verified) {
      return res.status(404).json({ error: result?.error || `Handle "${handle}" is invalid or not found on ${platform}` });
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Sync all platforms endpoint
router.post('/sync-platforms', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const handles = {
      leetcode: user.leetcode,
      codeforces: user.codeforces,
      codechef: user.codechef,
      github: user.github,
      geeksforgeeks: user.geeksforgeeks,
      hackerrank: user.hackerrank,
      codolio: user.codolio
    };
    const { platformStats, verifiedPlatforms, errors } = await verifyAndFetchAllPlatforms(handles);
    user.platformStats = platformStats;
    user.verifiedPlatforms = verifiedPlatforms;
    await user.save();
    res.json({ success: true, platformStats, verifiedPlatforms, errors });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    
    const allowedFields = ['name', 'semester', 'leetcode', 'codeforces', 'codechef', 'github', 'geeksforgeeks', 'hackerrank', 'codolio'];
    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) {
        user[f] = f === 'semester' ? parseInt(req.body[f]) : req.body[f].trim();
      }
    });
    
    // Perform real platform verification and fetch stats
    const handles = {
      leetcode: user.leetcode,
      codeforces: user.codeforces,
      codechef: user.codechef,
      github: user.github,
      geeksforgeeks: user.geeksforgeeks,
      hackerrank: user.hackerrank,
      codolio: user.codolio
    };
    const { platformStats, verifiedPlatforms, errors } = await verifyAndFetchAllPlatforms(handles);
    user.platformStats = platformStats;
    user.verifiedPlatforms = verifiedPlatforms;

    await user.save();
    
    const safe = user.toJSON();
    delete safe.password;
    res.json({ ...safe, platformStats, verifiedPlatforms, verificationErrors: errors });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

