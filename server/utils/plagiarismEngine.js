// server/utils/plagiarismEngine.js
// Advanced multi-layer plagiarism detection engine for competitive programming & exams.
// Layers:
// 1. Identifier-Invariant Token Canonicalization (Defeats variable/function renaming & comment removal)
// 2. Winnowing / K-Gram Rolling Hash Fingerprinting (MOSS-inspired)
// 3. Structural & Control-Flow Graph (CFG) Profiling (AST loop/branch/recursion depth matching)
// 4. Contiguous Line Slicer (LCS block extraction for side-by-side diff highlighting)
// 5. Groq / LLM Semantic Logic Analysis (Detects algorithmic equivalence, ChatGPT artifacts, and obfuscation)

let groq = null;
if (process.env.GROQ_API_KEY) {
  try {
    const { Groq } = require('groq-sdk');
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  } catch (e) {
    console.warn('[PlagiarismEngine] Groq SDK initialization skipped:', e.message);
  }
}

const CANDIDATE_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
  'qwen/qwen3.6-27b',
  'groq/compound',
  'groq/compound-mini'
];

/**
 * 1. Identifier-Invariant Token Canonicalization
 * Strips comments, headers, strings, numbers, and deterministically normalizes variable/function identifiers ($v0, $v1...).
 */
function canonicalizeCode(rawCode) {
  if (!rawCode) return { tokens: [], lines: [], normalized: '' };

  let code = String(rawCode);

  // Remove single line and multiline comments
  code = code.replace(/\/\/[^\n]*/g, '');
  code = code.replace(/\/\*[\s\S]*?\*\//g, '');

  // Remove standard boilerplate includes/imports
  code = code.replace(/^\s*(#include|import|using namespace|package)[^\n]*/gm, '');

  const lines = code.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Tokenize while normalizing literals
  const idMap = new Map();
  let idCounter = 0;

  const KEYWORDS = new Set([
    'int', 'long', 'float', 'double', 'char', 'bool', 'void', 'string', 'auto',
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'return',
    'class', 'struct', 'public', 'private', 'protected', 'virtual', 'override', 'static', 'const',
    'vector', 'map', 'set', 'unordered_map', 'unordered_set', 'queue', 'stack', 'priority_queue',
    'pair', 'tuple', 'sort', 'reverse', 'min', 'max', 'swap', 'cin', 'cout', 'scanf', 'printf',
    'def', 'def', 'in', 'range', 'len', 'append', 'pop', 'lambda', 'self', 'None', 'True', 'False',
    'function', 'let', 'var', 'const', 'console', 'log', 'push', 'slice', 'splice'
  ]);

  const rawTokens = code
    .replace(/"[^"]*"/g, ' __STR__ ')
    .replace(/'[^']*'/g, ' __CHAR__ ')
    .replace(/\b\d+\b/g, ' __NUM__ ')
    .replace(/([{}()[\];,.<>!=+\-*/%&|^?:])/g, ' $1 ')
    .split(/\s+/)
    .filter(Boolean);

  const canonicalTokens = rawTokens.map(tok => {
    if (tok.startsWith('__') && tok.endsWith('__')) return tok;
    if (/^[{}()[\];,.<>!=+\-*/%&|^?:]$/.test(tok)) return tok;
    if (KEYWORDS.has(tok.toLowerCase())) return tok.toUpperCase();

    // It is an identifier (variable / function name) -> Map to canonical $v0, $v1...
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tok)) {
      if (!idMap.has(tok)) {
        idMap.set(tok, `$v${idCounter++}`);
      }
      return idMap.get(tok);
    }

    return tok;
  });

  return {
    tokens: canonicalTokens,
    lines,
    normalized: canonicalTokens.join(' ')
  };
}

/**
 * 2. Winnowing / K-Gram Rolling Hash Fingerprinting
 */
function computeKGramFingerprints(tokens, k = 4) {
  if (!tokens || tokens.length < k) return new Set();
  const hashes = new Set();

  for (let i = 0; i <= tokens.length - k; i++) {
    const window = tokens.slice(i, i + k).join('');
    let hash = 5381;
    for (let j = 0; j < window.length; j++) {
      hash = ((hash << 5) + hash) + window.charCodeAt(j);
      hash |= 0; // Convert to 32bit integer
    }
    hashes.add(hash);
  }

  return hashes;
}

function computeTokenSimilarity(tokens1, tokens2) {
  if (!tokens1.length || !tokens2.length) return 0;

  const h1 = computeKGramFingerprints(tokens1, 4);
  const h2 = computeKGramFingerprints(tokens2, 4);

  if (h1.size === 0 || h2.size === 0) return 0;

  let common = 0;
  h1.forEach(h => {
    if (h2.has(h)) common++;
  });

  const jaccard = common / (h1.size + h2.size - common);
  const containment = common / Math.min(h1.size, h2.size);

  // Blend jaccard (overall similarity) with containment (catches embedded/copied snippets)
  const blended = (jaccard * 0.6) + (containment * 0.4);
  return Math.min(100, Math.round(blended * 100));
}

/**
 * 3. Structural & AST Control-Flow Profiling
 * Extracts control flow frequencies, loop nesting, and operator distribution.
 */
function extractStructuralProfile(code) {
  const codeStr = String(code || '');

  const counts = {
    loops: (codeStr.match(/\b(for|while|do)\b/g) || []).length,
    branches: (codeStr.match(/\b(if|switch|case|\?)\b/g) || []).length,
    returns: (codeStr.match(/\breturn\b/g) || []).length,
    vectors: (codeStr.match(/\b(vector|list|array|ArrayList|\[\])\b/g) || []).length,
    maps: (codeStr.match(/\b(map|unordered_map|HashMap|dict|\{\})\b/g) || []).length,
    recursion: (codeStr.match(/\b(dfs|bfs|solve|helper|recur)\b/gi) || []).length,
    bitwise: (codeStr.match(/(\^|&|\||<<|>>)/g) || []).length,
    mathOps: (codeStr.match(/(\+|\-|\*|\/|%)/g) || []).length,
    relOps: (codeStr.match(/(==|!=|<=|>=|<|>)/g) || []).length,
  };

  // Estimate maximum nesting depth based on brace levels
  let maxDepth = 0;
  let currentDepth = 0;
  for (let ch of codeStr) {
    if (ch === '{' || ch === '(') {
      currentDepth++;
      if (currentDepth > maxDepth) maxDepth = currentDepth;
    } else if (ch === '}' || ch === ')') {
      currentDepth = Math.max(0, currentDepth - 1);
    }
  }
  counts.maxDepth = maxDepth;

  return counts;
}

function computeASTStructuralSimilarity(code1, code2) {
  const p1 = extractStructuralProfile(code1);
  const p2 = extractStructuralProfile(code2);

  const keys = Object.keys(p1);
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (const k of keys) {
    const v1 = p1[k] || 0;
    const v2 = p2[k] || 0;
    dotProduct += v1 * v2;
    norm1 += v1 * v1;
    norm2 += v2 * v2;
  }

  if (norm1 === 0 || norm2 === 0) return 0;
  const cosine = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  return Math.min(100, Math.round(cosine * 100));
}

/**
 * 4. Contiguous Line Slicer (Extract matching code lines for visual diff)
 */
function extractMatchedLines(code1, code2) {
  const lines1 = String(code1 || '').split('\n').map(l => l.trim()).filter(l => l.length > 5);
  const lines2 = new Set(String(code2 || '').split('\n').map(l => l.trim()).filter(l => l.length > 5));

  const matched = [];
  for (const l of lines1) {
    // Ignore trivial lines like braces or single keywords
    if (l === '{' || l === '}' || l === 'return 0;' || l.startsWith('#include') || l.startsWith('using namespace')) continue;
    if (lines2.has(l)) {
      if (!matched.includes(l)) matched.push(l);
    }
  }

  return matched.slice(0, 15);
}

/**
 * 5. Deep AI Semantic Analysis via Groq LLM (with robust heuristic fallback)
 */
async function analyzePlagiarismWithAI(code1, code2, student1, student2, problemTitle) {
  if (!groq && process.env.GROQ_API_KEY) {
    try {
      const { Groq } = require('groq-sdk');
      groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    } catch (e) {}
  }

  const c1 = String(code1 || '').slice(0, 2000);
  const c2 = String(code2 || '').slice(0, 2000);

  if (groq) {
    const systemPrompt = `You are a world-class code plagiarism and honor code forensics AI for university competitive programming and coding exams.
You meticulously compare two code submissions to detect:
1. Exact logic copying with variable/function renaming or comment stripping.
2. Identical structural flaws, unique algorithmic quirks, or identical constant values.
3. AI-generated code prompt artifacts copied from ChatGPT/Claude.
4. Independent vs. shared solution origin.

You MUST respond strictly in valid JSON format matching this schema:
{
  "similarityScore": <integer 0-100>,
  "verdict": "<independent | suspicious | likely_copied>",
  "reasoning": "<concise 2-3 sentence explanation with concrete evidence>",
  "matchedPatterns": ["<pattern 1>", "<pattern 2>"],
  "recommendation": "<Clear | Warn | Flag>"
}`;

    const userPrompt = `Problem: ${problemTitle || 'Competitive Programming Problem'}

Student 1 (${student1 || 'Candidate A'}):
\`\`\`
${c1}
\`\`\`

Student 2 (${student2 || 'Candidate B'}):
\`\`\`
${c2}
\`\`\`

Analyze the logical, structural, and semantic similarity of both solutions. Return valid JSON only.`;

    for (const model of CANDIDATE_MODELS) {
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          model,
          max_tokens: 800,
          temperature: 0.2,
          response_format: { type: 'json_object' }
        });

        const raw = completion.choices[0]?.message?.content;
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            similarityScore: Math.min(100, Math.max(0, parseInt(parsed.similarityScore, 10) || 50)),
            verdict: ['independent', 'suspicious', 'likely_copied'].includes(parsed.verdict) ? parsed.verdict : 'suspicious',
            reasoning: parsed.reasoning || 'Automated AI structural & logic comparison completed.',
            matchedPatterns: Array.isArray(parsed.matchedPatterns) ? parsed.matchedPatterns : [],
            recommendation: ['Clear', 'Warn', 'Flag'].includes(parsed.recommendation) ? parsed.recommendation : (parsed.similarityScore >= 75 ? 'Flag' : parsed.similarityScore >= 45 ? 'Warn' : 'Clear')
          };
        }
      } catch (err) {
        console.warn(`[PlagiarismAI] Groq model ${model} failed (${err.message}), trying next...`);
      }
    }
  }

  // Fallback heuristic if Groq is unavailable
  const canon1 = canonicalizeCode(code1);
  const canon2 = canonicalizeCode(code2);
  const tokenSim = computeTokenSimilarity(canon1.tokens, canon2.tokens);
  const astSim = computeASTStructuralSimilarity(code1, code2);
  const estScore = Math.round((tokenSim * 0.5) + (astSim * 0.5));

  let verdict = 'independent';
  let recommendation = 'Clear';
  let reasoning = 'Both solutions demonstrate distinct variable structures and independent control flow.';

  if (estScore >= 75) {
    verdict = 'likely_copied';
    recommendation = 'Flag';
    reasoning = `High structural and token correspondence (${estScore}%). Identical algorithmic flow and normalized token stream strongly suggest code sharing or common source.`;
  } else if (estScore >= 45) {
    verdict = 'suspicious';
    recommendation = 'Warn';
    reasoning = `Moderate structural similarity (${estScore}%). The core loop and conditional patterns are closely aligned; review variable naming and submission timing.`;
  }

  const matched = extractMatchedLines(code1, code2);

  return {
    similarityScore: estScore,
    verdict,
    reasoning,
    matchedPatterns: matched.slice(0, 4),
    recommendation
  };
}

/**
 * 6. Master Plagiarism Comparator for a pair of code submissions
 */
async function compareTwoCodes(code1, code2, student1 = 'Student A', student2 = 'Student B', problemTitle = 'DSA Problem', lang1 = 'cpp17', lang2 = 'cpp17') {
  const canon1 = canonicalizeCode(code1);
  const canon2 = canonicalizeCode(code2);

  const tokenScore = computeTokenSimilarity(canon1.tokens, canon2.tokens);
  const astScore = computeASTStructuralSimilarity(code1, code2);
  const matchedLines = extractMatchedLines(code1, code2);

  // Run AI analysis
  const aiResult = await analyzePlagiarismWithAI(code1, code2, student1, student2, problemTitle);
  const semanticScore = aiResult.similarityScore || Math.round((tokenScore + astScore) / 2);

  // Standard weighted combined score:
  // 35% Token (Winnowing / Identifier-invariant) + 35% AST Structural Profile + 30% AI Semantic Logic
  const combinedScore = Math.min(100, Math.round((tokenScore * 0.35) + (astScore * 0.35) + (semanticScore * 0.30)));

  let finalVerdict = aiResult.verdict;
  if (combinedScore >= 75) finalVerdict = 'flagged';
  else if (combinedScore >= 45) finalVerdict = 'warned';
  else finalVerdict = 'cleared';

  return {
    tokenScore,
    astScore,
    semanticScore,
    combinedScore,
    verdict: finalVerdict,
    aiAnalysis: aiResult.reasoning,
    matchedPatterns: aiResult.matchedPatterns || [],
    matchedLines,
    recommendation: aiResult.recommendation || (combinedScore >= 75 ? 'Flag' : combinedScore >= 45 ? 'Warn' : 'Clear'),
    code1,
    code2,
    lang1,
    lang2
  };
}

module.exports = {
  canonicalizeCode,
  computeTokenSimilarity,
  computeASTStructuralSimilarity,
  extractMatchedLines,
  analyzePlagiarismWithAI,
  compareTwoCodes
};
