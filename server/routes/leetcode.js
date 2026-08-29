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

// Helper: strip HTML tags and decode basic entities
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<pre>[\s\S]*?<\/pre>/gi, (match) => match.replace(/<[^>]+>/g, ''))
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── POST /fetch-problem ───────────────────────────────────────────────────
// Faculty: fetch problem metadata and exact test cases from LeetCode by slug (with AI extraction)
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
          exampleTestcaseList
          sampleTestCase
        }
      }
    `;

    let lcData;
    try {
      lcData = await lcQuery(query, { titleSlug: cleanSlug });
    } catch (err) {
      return res.status(502).json({ error: 'Could not reach LeetCode API: ' + err.message });
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

    const tags = (question.topicTags || []).map(t => t.name);
    const difficulty = (question.difficulty || 'medium').toLowerCase();
    const rawContent = question.content || '';
    const cleanText = stripHtml(rawContent);

    let parsedResult = {
      questionId: question.questionId,
      title: question.title,
      slug: question.titleSlug,
      difficulty,
      tags,
      acceptance: statsObj.acRate ? parseFloat(statsObj.acRate) : 60,
      url: `https://leetcode.com/problems/${question.titleSlug}/`,
      statement: cleanText,
      inputFormat: 'Read from standard input.',
      outputFormat: 'Print result to standard output.',
      constraints: 'See problem statement.',
      sampleInput: question.sampleTestCase || '',
      sampleOutput: '',
      editorial: '',
      testCases: []
    };

    // AI-Powered Extraction with Groq
    if (process.env.GROQ_API_KEY) {
      try {
        const { Groq } = require('groq-sdk');
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        const system = `You are an expert competitive programming problem setter and test case extractor.
Analyze the LeetCode problem description and extract the exact problem statement, mathematical constraints, input/output formats, and exact test cases.
Always respond in strictly valid JSON format only without markdown fences.`;

        const userPrompt = `Convert this LeetCode problem into a complete competitive programming problem with exact test cases:
Title: ${question.title}
Difficulty: ${difficulty}
Tags: ${tags.join(', ')}

Problem Content / HTML:
${rawContent.slice(0, 3500)}

Sample Testcase Hint:
${question.sampleTestCase || ''}

Respond with this exact JSON format:
{
  "statement": "Clear markdown problem description (without Examples or Constraints headers)",
  "inputFormat": "Exact description of standard input structure",
  "outputFormat": "Exact description of expected standard output",
  "constraints": "Exact formatted constraints (e.g. 1 <= nums.length <= 10^5)",
  "sampleInput": "Raw exact sample input 1",
  "sampleOutput": "Raw exact sample output 1",
  "editorial": "Short approach hint / algorithmic explanation",
  "optimalAlgorithm": "Time & space complexity (e.g. O(N) time, O(1) space)",
  "testCases": [
    { "type": "sample", "input": "sample input 1", "output": "sample output 1" },
    { "type": "sample", "input": "sample input 2", "output": "sample output 2" },
    { "type": "hidden", "input": "hidden input 1", "output": "hidden output 1" },
    { "type": "hidden", "input": "hidden input 2", "output": "hidden output 2" }
  ],
  "cppSolution": "C++ solution code",
  "pythonSolution": "Python solution code",
  "javaSolution": "Java solution code"
}`;

        const candidateModels = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b', 'groq/compound'];
        let completion = null;
        for (const m of candidateModels) {
          try {
            completion = await groq.chat.completions.create({
              messages: [
                { role: 'system', content: system },
                { role: 'user', content: userPrompt }
              ],
              model: m,
              max_tokens: 2500,
              temperature: 0.2
            });
            if (completion?.choices[0]?.message?.content) break;
          } catch (mErr) {
            console.warn(`Leetcode import model ${m} failed, trying next...`);
          }
        }


        const rawJson = completion.choices[0]?.message?.content || '';
        const cleanedJson = rawJson.replace(/```json|```/g, '').trim();
        const aiParsed = JSON.parse(cleanedJson);

        parsedResult = {
          ...parsedResult,
          ...aiParsed,
          // Preserve core LeetCode metadata
          questionId: question.questionId,
          title: question.title,
          slug: question.titleSlug,
          difficulty,
          tags: aiParsed.tags?.length ? aiParsed.tags : tags,
          url: `https://leetcode.com/problems/${question.titleSlug}/`
        };
      } catch (aiErr) {
        console.warn('Groq AI parsing error in fetch-problem, using fallback:', aiErr.message);
      }
    }

    // Fallback testcase creation if none were generated
    if (!parsedResult.testCases || parsedResult.testCases.length === 0) {
      parsedResult.testCases = [
        { type: 'sample', input: parsedResult.sampleInput || '1 2 3', output: parsedResult.sampleOutput || '3 2 1' },
        { type: 'hidden', input: '4 5 6', output: '6 5 4' }
      ];
    }

    res.json(parsedResult);
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
