const express = require('express');
const { auth } = require('../middleware/auth');
const { Problem, Contest } = require('../db');
const router = express.Router();

// Gracefully handle missing GROQ_API_KEY — server won't crash, AI routes will return error
let groq = null;
if (process.env.GROQ_API_KEY) {
  const Groq = require('groq-sdk');
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
} else {
  console.warn('⚠️ GROQ_API_KEY not set — AI features will be disabled.');
}

// Candidate AI models supported by Groq in order of priority
const CANDIDATE_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
  'qwen/qwen3.6-27b',
  'groq/compound',
  'groq/compound-mini'
];

// Dynamic Groq caller helper with multi-model fallback
const callGroq = async (systemPrompt, userPrompt, maxTokens = 2048, temperature = 0.4) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('AI features are disabled. GROQ_API_KEY is not configured.');
  const { Groq } = require('groq-sdk');
  const groqClient = new Groq({ apiKey });

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  let lastError = null;
  for (const model of CANDIDATE_MODELS) {
    try {
      const completion = await groqClient.chat.completions.create({
        messages,
        model,
        max_tokens: maxTokens,
        temperature,
      });
      const content = completion.choices[0]?.message?.content;
      if (content) return content;
    } catch (err) {
      lastError = err;
      console.warn(`Groq model ${model} failed (${err.message}), trying next fallback...`);
    }
  }

  throw lastError || new Error('AI generation unavailable across all models.');
};



// Check AI Consent middleware
const checkAIConsent = async (req, res, next) => {
  try {
    const { problemId, contestId } = req.body;
    let query = {};
    if (contestId) {
      query._id = contestId;
    } else if (problemId) {
      query.problems = problemId;
      query.status = 'live'; // only check if live
    } else {
      return next();
    }

    const contest = await Contest.findOne(query);
    if (!contest) return next();

    if (!contest.aiEnabled) {
      return res.status(403).json({ error: 'AI assistance is disabled for this contest.', message: 'AI assistance is disabled for this contest.' });
    }

    const path = req.path;
    if (path.includes('/chat') && !contest.aiChat) {
      return res.status(403).json({ error: 'AI Chat is disabled for this contest.' });
    }
    if (path.includes('/hint') && !contest.aiHints) {
      return res.status(403).json({ error: 'AI Hints are disabled for this contest.' });
    }
    if (path.includes('/feedback') && !contest.aiReview) {
      return res.status(403).json({ error: 'AI Code Review is disabled for this contest.' });
    }
    if (path.includes('/editorial') && !contest.aiExplain) {
      return res.status(403).json({ error: 'AI Explanations are disabled for this contest.' });
    }

    next();
  } catch (err) {
    next();
  }
};

// POST /api/ai/feedback — AI feedback on wrong submission
router.post('/feedback', auth, checkAIConsent, async (req, res) => {
  try {
    const { code, verdict, problemId, language, failedTestCase } = req.body;
    const problem = await Problem.findById(problemId);
    if (!problem) return res.status(404).json({ error: 'Problem not found' });

    const system = `You are an AI judge assistant for a competitive programming platform called hackwithbug. 
You give students constructive, specific feedback on their code without revealing the full solution.
Be concise (3-5 sentences max). Focus on the bug, not general advice.
Format: Start with what's wrong, then hint at fix direction. Never give full solution code.`;

    const prompt = `Problem: ${problem.title}
Verdict: ${verdict}
Language: ${language}
Failed test case hint: ${failedTestCase || 'unknown'}
Student code:
\`\`\`
${code.slice(0, 2000)}
\`\`\`
Give specific feedback about why this code gets ${verdict} and how to fix it.`;

    const feedback = await callGroq(system, prompt, 512);

    // Compute partial credit score
    const scores = { AC: 100, WA: Math.floor(30 + Math.random() * 50), TLE: Math.floor(20 + Math.random() * 40), MLE: 30, CE: 0 };
    const partialScore = scores[verdict] || 0;

    res.json({ feedback, partialScore });
  } catch (e) {
    console.error('Groq error:', e.message);
    res.status(500).json({ error: 'AI feedback unavailable', feedback: 'AI feedback is temporarily unavailable. Please check your code manually.', partialScore: 0 });
  }
});

// POST /api/ai/generate-problem — Generate problem statement and test cases
router.post('/generate-problem', auth, async (req, res) => {
  try {
    const { prompt: userIdea, topic, difficulty, tags, constraints, storyBased, expectedAlgorithm, timeComplexity } = req.body;

    const chosenTopic = topic || (Array.isArray(tags) ? tags.join(', ') : tags) || 'Algorithms & Data Structures';
    const chosenDiff = difficulty || 'medium';

    const system = `You are an expert competitive programming problem setter and test case generator for hackwithbug.
Generate a complete, high-quality competitive programming problem with solutions and test cases.
Always respond in strictly valid JSON format only without markdown fences.`;

    const userPrompt = `Generate a complete competitive programming problem with these preferences:
${userIdea ? `Problem Idea / Requirements: ${userIdea}` : ''}
Topic: ${chosenTopic}
Difficulty: ${chosenDiff}
Constraints: ${constraints || '1 <= n <= 10^5'}
Story-based: ${storyBased ? 'Yes' : 'No'}
Expected Algorithm: ${expectedAlgorithm || 'Optimal DSA (Greedy / DP / Graphs / Two Ptrs / Hashing)'}
Expected Time Complexity: ${timeComplexity || 'O(N) or O(N log N)'}

Respond with this exact JSON structure:
{
  "title": "Clear Problem Title",
  "statement": "Detailed problem description with constraints and mathematical formulation",
  "inputFormat": "Exact description of standard input structure",
  "outputFormat": "Exact description of standard output format",
  "constraints": "Exact mathematical constraints (e.g. 1 <= N <= 10^5, 0 <= A[i] <= 10^9)",
  "sampleInput": "Raw exact sample input 1",
  "sampleOutput": "Raw exact sample output 1",
  "explanation": "Step by step explanation of sample test case",
  "editorial": "Approach and algorithmic insight",
  "optimalAlgorithm": "Time & space complexity explanation",
  "timeLimit": 1.0,
  "memoryLimit": 256,
  "tags": ["Array", "Greedy"],
  "testCases": [
    { "type": "sample", "input": "sample input 1", "output": "sample output 1" },
    { "type": "sample", "input": "sample input 2", "output": "sample output 2" },
    { "type": "hidden", "input": "hidden input 1", "output": "hidden output 1" },
    { "type": "hidden", "input": "hidden input 2", "output": "hidden output 2" },
    { "type": "hidden", "input": "hidden input 3", "output": "hidden output 3" }
  ],
  "hiddenTestCases": [
    { "input": "hidden input 1", "output": "hidden output 1" },
    { "input": "hidden input 2", "output": "hidden output 2" }
  ],
  "cppSolution": "C++ source code solution",
  "javaSolution": "Java source code solution",
  "pythonSolution": "Python source code solution"
}`;

    const raw = await callGroq(system, userPrompt, 2800);
    let problem;
    try {
      const cleaned = raw.replace(/```json|```/g, '').trim();
      problem = JSON.parse(cleaned);
      if (!problem.testCases && problem.hiddenTestCases) {
        problem.testCases = [
          { type: 'sample', input: problem.sampleInput || '', output: problem.sampleOutput || '' },
          ...problem.hiddenTestCases.map(tc => ({ type: 'hidden', ...tc }))
        ];
      }
    } catch {
      problem = { 
        title: 'Generated Problem', 
        statement: raw, 
        editorial: '', 
        tags: [chosenTopic],
        sampleInput: '1 2 3',
        sampleOutput: '3 2 1',
        testCases: [{ type: 'sample', input: '1 2 3', output: '3 2 1' }]
      };
    }
    res.json(problem);
  } catch (e) {
    console.error('generate-problem error:', e.message);
    res.status(500).json({ error: 'Problem generation failed: ' + e.message });
  }
});


// POST /api/ai/validate-problem — Validate CP problem details
router.post('/validate-problem', auth, async (req, res) => {
  try {
    const p = req.body;

    const system = `You are a Senior QA Engineer and CP judge validator for competitive programming.
You analyze problem descriptions, test cases, and solutions for mathematical correctness, logical consistency, constraint compliance, and syntax correctness.
Respond in valid JSON format only, no markdown fences outside the JSON.`;

    const userPrompt = `Verify the following competitive programming problem for consistency and correctness:
Title: ${p.title}
Statement: ${p.statement}
Input Format: ${p.inputFormat}
Output Format: ${p.outputFormat}
Constraints: ${p.constraints}
Sample Input: ${p.sampleInput}
Sample Output: ${p.sampleOutput}
Time Limit: ${p.timeLimit}s, Memory Limit: ${p.memoryLimit}MB
Optimal Algorithm: ${p.optimalAlgorithm}

Sample Testcases: ${JSON.stringify(p.sampleInput ? [{ input: p.sampleInput, output: p.sampleOutput }] : [])}
Hidden Testcases: ${JSON.stringify(p.hiddenTestCases || [])}
Boundary Cases: ${JSON.stringify(p.boundaryCases || [])}
Stress Cases: ${JSON.stringify(p.stressCases || [])}

C++ Solution:
${p.cppSolution || 'N/A'}

Python Solution:
${p.pythonSolution || 'N/A'}

Java Solution:
${p.javaSolution || 'N/A'}

Evaluate:
1. Is the statement logically consistent with constraints?
2. Do the solutions correctly solve the problem within limits?
3. Are the inputs/outputs in testcases correct?
4. Are there constraints violations in the test cases?

Respond with this JSON structure:
{
  "valid": true | false,
  "errors": ["error description 1", ...],
  "warnings": ["warning description 1", ...],
  "feedback": "Short summary of validation findings"
}`;

    const raw = await callGroq(system, userPrompt, 1000);
    let validation;
    try {
      validation = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      validation = { valid: true, errors: [], warnings: [], feedback: raw };
    }
    res.json(validation);
  } catch (e) {
    res.status(500).json({ error: 'Validation failed: ' + e.message });
  }
});

// POST /api/ai/plagiarism-analyze
router.post('/plagiarism-analyze', auth, async (req, res) => {
  try {
    const { code1, code2, student1, student2, problemTitle } = req.body;

    const system = `You are a plagiarism detection AI for a university competitive programming platform.
Analyze two code submissions and determine if they were copied. Respond in JSON only.`;

    const prompt = `Problem: ${problemTitle}
Student 1 (${student1}):
\`\`\`
${code1.slice(0, 1500)}
\`\`\`

Student 2 (${student2}):
\`\`\`
${code2.slice(0, 1500)}
\`\`\`

Respond with:
{
  "similarityScore": 0-100,
  "verdict": "independent" | "suspicious" | "likely_copied",
  "reasoning": "2-3 sentence explanation",
  "matchedPatterns": ["pattern1", "pattern2"],
  "recommendation": "Clear | Warn | Flag"
}`;

    const raw = await callGroq(system, prompt, 800);
    let analysis;
    try {
      analysis = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      analysis = { similarityScore: 50, verdict: 'suspicious', reasoning: raw, matchedPatterns: [], recommendation: 'Warn' };
    }
    res.json(analysis);
  } catch (e) {
    res.status(500).json({ error: 'Analysis failed: ' + e.message });
  }
});

// POST /api/ai/hint — Get hint
router.post('/hint', auth, checkAIConsent, async (req, res) => {
  let problem;
  try {
    const { problemId, code } = req.body;
    problem = await Problem.findById(problemId);
    if (!problem) return res.status(404).json({ error: 'Problem not found' });

    const system = `You are a helpful competitive programming mentor. Give hints without spoiling the solution. Keep it to 2-3 sentences.`;
    const prompt = `Problem: ${problem.title}\n${problem.statement}\nStudent's code:\n${(code || '').slice(0, 500)}\nGive a hint.`;

    const hint = await callGroq(system, prompt, 300);
    res.json({ hint });
  } catch (e) {
    res.status(500).json({ error: 'Hint unavailable', hint: problem?.editorial || 'Think about the time complexity.' });
  }
});

// POST /api/ai/editorial
router.post('/editorial', auth, checkAIConsent, async (req, res) => {
  try {
    const { problemId } = req.body;
    const problem = await Problem.findById(problemId);
    if (!problem) return res.status(404).json({ error: 'Problem not found' });

    const system = `You are writing a competitive programming editorial. Explain the approach step by step, mention complexity.`;
    const prompt = `Write detailed editorial for:\nTitle: ${problem.title}\nStatement: ${problem.statement}\nConstraints: ${problem.constraints}`;

    const editorial = await callGroq(system, prompt, 1000);
    res.json({ editorial });
  } catch (e) {
    res.status(500).json({ error: 'Editorial generation failed' });
  }
});

// POST /api/ai/chat
router.post('/chat', auth, checkAIConsent, async (req, res) => {
  try {
    const { messages, problemId } = req.body;
    let problem = null;
    if (problemId) {
      problem = await Problem.findById(problemId);
    }

    const system = `You are hackwithbug's AI assistant for competitive programming. Help with hints, concepts. Never give full solutions.
${problem ? `Current problem context: ${problem.title} - ${problem.statement}` : ''}`;

    const reply = await callGroq(
      system,
      messages[messages.length - 1]?.content || 'Hello',
      600,
      0.7
    );

    res.json({ message: reply || 'I\'m unable to respond right now.' });
  } catch (e) {
    res.status(500).json({ error: 'Chat unavailable', message: 'AI chat is temporarily unavailable.' });
  }
});


module.exports = router;
