// leetcode.js — LeetCode integration routes
const express = require('express');
const { User, Problem, Submission, Contest } = require('../db');
const { auth, facultyOnly } = require('../middleware/auth');
const router = express.Router();

const LC_GRAPHQL = 'https://leetcode.com/graphql';
const LC_HEADERS = {
  'Content-Type': 'application/json',
  'Referer': 'https://leetcode.com',
  'Origin': 'https://leetcode.com'
};

// Helper: call LeetCode GraphQL API
async function lcQuery(query, variables = {}) {
  const res = await fetch(LC_GRAPHQL, {
    method: 'POST',
    headers: LC_HEADERS,
    body: JSON.stringify({ query, variables })
  });
  if (!res.ok) {
    throw new Error(`LeetCode API returned ${res.status}`);
  }
  return res.json();
}

// ─── POST /connect ─────────────────────────────────────────────────────────
// Verify LeetCode username exists and save to user profile
router.post('/connect', auth, async (req, res) => {
  try {
    const { leetcodeUsername } = req.body;
    if (!leetcodeUsername || !leetcodeUsername.trim()) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const username = leetcodeUsername.trim();

    // Verify username exists on LeetCode
    const query = `
      query matchedUser($username: String!) {
        matchedUser(username: $username) {
          username
          submitStats {
            acSubmissionNum {
              difficulty
              count
            }
          }
        }
      }
    `;

    let lcData;
    try {
      lcData = await lcQuery(query, { username });
    } catch (err) {
      return res.status(502).json({ error: 'Could not reach LeetCode API. Try again later.' });
    }

    if (!lcData.data?.matchedUser) {
      return res.status(404).json({ error: `LeetCode username "${username}" not found` });
    }

    // Save to user profile
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.leetcode = username;
    await user.save();

    const stats = lcData.data.matchedUser.submitStats?.acSubmissionNum || [];
    const totalSolved = stats.reduce((sum, s) => sum + (s.count || 0), 0);

    res.json({
      success: true,
      leetcodeUsername: username,
      totalSolved,
      stats
    });
  } catch (e) {
    console.error('LeetCode connect error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /sync/:userId ─────────────────────────────────────────────────────
// Fetch all recent AC submissions from LeetCode and update solved slugs
router.get('/sync/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.leetcode) {
      return res.status(400).json({ error: 'LeetCode account not connected' });
    }

    const query = `
      query recentAcSubmissions($username: String!, $limit: Int!) {
        recentAcSubmissionList(username: $username, limit: $limit) {
          id
          title
          titleSlug
          timestamp
          lang
        }
      }
    `;

    let lcData;
    try {
      lcData = await lcQuery(query, { username: user.leetcode, limit: 20 });
    } catch (err) {
      return res.status(502).json({ error: 'Could not reach LeetCode API' });
    }

    const recentAcList = lcData.data?.recentAcSubmissionList || [];
    const recentSlugs = recentAcList.map(s => s.titleSlug);
    const existingSolved = user.leetcodeSolved || [];
    const merged = [...new Set([...existingSolved, ...recentSlugs])];

    user.leetcodeSolved = merged;
    user.leetcodeSyncedAt = new Date();
    await user.save();

    // Map LeetCode programming languages to platform languages
    const mapLanguage = (lcLang) => {
      const lower = (lcLang || '').toLowerCase();
      if (lower.includes('cpp') || lower.includes('c++')) return 'cpp17';
      if (lower.includes('python')) return 'python3';
      if (lower.includes('java')) return 'java17';
      return 'c';
    };

    // Auto-create local submissions for active/past contests and practice
    for (const sub of recentAcList) {
      const problem = await Problem.findOne({ source: 'leetcode', leetcodeSlug: sub.titleSlug });
      if (!problem) continue;

      const subTime = new Date(parseInt(sub.timestamp) * 1000);

      // Check contest context
      const contests = await Contest.find({ problems: problem._id });
      for (const contest of contests) {
        const startTime = new Date(contest.startTime).getTime();
        const endTime = startTime + (contest.duration * 60000);
        const subTimeMs = subTime.getTime();

        // Check if LeetCode solve timestamp falls inside the contest duration
        if (subTimeMs >= startTime && subTimeMs <= endTime) {
          // Check if AC submission already recorded
          const existing = await Submission.findOne({
            userId: user._id,
            problemId: problem._id,
            contestId: contest._id,
            verdict: 'AC'
          });
          if (!existing) {
            await Submission.create({
              userId: user._id,
              problemId: problem._id,
              contestId: contest._id,
              verdict: 'AC',
              language: mapLanguage(sub.lang),
              code: `// Solved on LeetCode. Title: ${sub.title}, Lang: ${sub.lang}`,
              timestamp: subTime
            });
            // Update user solved count
            user.solved += 1;
            await user.save();
          }
        }
      }

      // Also create a submission for practice mode (contestId = null)
      const existingPractice = await Submission.findOne({
        userId: user._id,
        problemId: problem._id,
        contestId: null,
        verdict: 'AC'
      });
      if (!existingPractice) {
        await Submission.create({
          userId: user._id,
          problemId: problem._id,
          contestId: null,
          verdict: 'AC',
          language: mapLanguage(sub.lang),
          code: `// Solved on LeetCode. Title: ${sub.title}, Lang: ${sub.lang}`,
          timestamp: subTime
        });
        // Update user solved count if not already counted
        user.solved += 1;
        await user.save();
      }
    }

    // Refresh solved problem IDs list
    const lcProblems = await Problem.find({ source: 'leetcode', leetcodeSlug: { $in: merged } });
    const solvedProblemIds = lcProblems.map(p => p.id);

    res.json({
      solvedCount: merged.length,
      solvedSlugs: merged,
      solvedProblemIds,
      recentSubmissions: recentAcList,
      syncedAt: user.leetcodeSyncedAt.toISOString()
    });
  } catch (e) {
    console.error('LeetCode sync error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /check ────────────────────────────────────────────────────────────
// Check if a specific problem slug is in user's solved list
// Query: ?slug=sort-list
router.get('/check', auth, async (req, res) => {
  try {
    const { slug } = req.query;
    if (!slug) return res.status(400).json({ error: 'slug query param required' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const solved = (user.leetcodeSolved || []).includes(slug);

    res.json({
      slug,
      solved,
      leetcodeUsername: user.leetcode || null,
      leetcodeSyncedAt: user.leetcodeSyncedAt || null
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /fetch-problem ───────────────────────────────────────────────────
// Faculty: fetch problem metadata from LeetCode by slug (for problem import)
router.post('/fetch-problem', auth, facultyOnly, async (req, res) => {
  try {
    const { slug } = req.body;
    if (!slug || !slug.trim()) {
      return res.status(400).json({ error: 'Problem slug is required' });
    }

    const cleanSlug = slug.trim().toLowerCase();

    const query = `
      query questionData($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          questionId
          title
          titleSlug
          difficulty
          topicTags {
            name
          }
          stats
          content
        }
      }
    `;

    let lcData;
    try {
      lcData = await lcQuery(query, { titleSlug: cleanSlug });
    } catch (err) {
      return res.status(502).json({ error: 'Could not reach LeetCode API' });
    }

    const question = lcData.data?.question;
    if (!question) {
      return res.status(404).json({ error: `Problem "${cleanSlug}" not found on LeetCode` });
    }

    // Parse stats JSON if available
    let statsObj = {};
    try {
      statsObj = JSON.parse(question.stats || '{}');
    } catch {}

    res.json({
      questionId: question.questionId,
      title: question.title,
      slug: question.titleSlug,
      difficulty: question.difficulty?.toLowerCase() || 'medium',
      tags: (question.topicTags || []).map(t => t.name),
      acceptance: statsObj.acRate ? parseFloat(statsObj.acRate) : 0,
      url: `https://leetcode.com/problems/${question.titleSlug}/`
    });
  } catch (e) {
    console.error('LeetCode fetch-problem error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /sync-all ────────────────────────────────────────────────────────
// Faculty: bulk sync all students who have LC connected
router.post('/sync-all', auth, facultyOnly, async (req, res) => {
  try {
    const students = await User.find({ leetcode: { $ne: '' }, role: 'student' });
    const results = [];

    const query = `
      query recentAcSubmissions($username: String!, $limit: Int!) {
        recentAcSubmissionList(username: $username, limit: $limit) {
          titleSlug
        }
      }
    `;

    for (const student of students) {
      try {
        const lcData = await lcQuery(query, { username: student.leetcode, limit: 20 });
        const recentSlugs = (lcData.data?.recentAcSubmissionList || []).map(s => s.titleSlug);
        const merged = [...new Set([...(student.leetcodeSolved || []), ...recentSlugs])];
        student.leetcodeSolved = merged;
        student.leetcodeSyncedAt = new Date();
        await student.save();
        results.push({ userId: student.id, name: student.name, synced: true, solvedCount: merged.length });
      } catch (err) {
        results.push({ userId: student.id, name: student.name, synced: false, error: err.message });
      }
    }

    res.json({ totalStudents: students.length, synced: results.filter(r => r.synced).length, results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
