// server/utils/judge.js
// Uses Wandbox API (https://wandbox.org/api/compile.json) — free, no API key needed

const WANDBOX_URL = 'https://wandbox.org/api/compile.json';

// Map our language keys to Wandbox compiler names
const WANDBOX_COMPILER_MAP = {
  'cpp17':     { compiler: 'gcc-head', options: '-std=c++17 -O2' },
  'cpp':       { compiler: 'gcc-head', options: '-std=c++17 -O2' },
  'c':         { compiler: 'gcc-head-c', options: '-std=c11 -O2' },
  'python3':   { compiler: 'cpython-3.12.3', options: '' },
  'python':    { compiler: 'cpython-3.12.3', options: '' },
  'java17':    { compiler: 'openjdk-head', options: '' },
  'java':      { compiler: 'openjdk-head', options: '' },
  'javascript':{ compiler: 'nodejs-head', options: '' },
  'js':        { compiler: 'nodejs-head', options: '' }
};

/**
 * Normalizes output string for deterministic comparison
 */
function normalizeOutput(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim();
}

/**
 * Wraps/fixes code so it can compile and run correctly
 */
function prepareSourceCode(code, language) {
  const lang = (language || '').toLowerCase();

  // C++: auto-add headers if user forgot them
  if (lang === 'cpp17' || lang === 'cpp') {
    if (!code.includes('#include')) {
      code = `#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n#include <map>\n#include <set>\n#include <queue>\n#include <stack>\n#include <cmath>\n#include <cstring>\nusing namespace std;\n\n${code}`;
    }
    // If there's a Solution class but no main, add a stub main
    if (code.includes('class Solution') && !code.includes('int main')) {
      code += `\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    return 0;\n}`;
    }
  }

  // Java: wrap in public class Main if needed (Wandbox expects class Main for Java)
  if (lang === 'java17' || lang === 'java') {
    if (!code.includes('public class Main') && !code.includes('class Main')) {
      code = `import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        Scanner sc = new Scanner(System.in);\n${code}\n    }\n}`;
    }
  }

  return code;
}

/**
 * Executes a single test case using Wandbox
 */
async function executeTestCase(code, language, stdin = '', expectedOutput = '', timeLimitSec = 2.0) {
  const lang = (language || '').toLowerCase();
  const target = WANDBOX_COMPILER_MAP[lang] || { compiler: 'gcc-head', options: '-std=c++17' };
  const preparedCode = prepareSourceCode(code, language);

  const payload = {
    compiler: target.compiler,
    code: preparedCode,
    stdin: stdin || '',
    ...(target.options ? { options: target.options } : {})
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(WANDBOX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Wandbox] HTTP Error:', response.status, errText.substring(0, 200));
      return {
        verdict: 'RE',
        stdout: '',
        stderr: `Wandbox API error: HTTP ${response.status}`,
        timeMs: 0,
        memoryKb: 0,
        passed: false
      };
    }

    const data = await response.json();
    console.log('[Wandbox] status:', data.status, 'stdout_len:', (data.program_output || '').length);

    const compilerError = data.compiler_error || '';
    const runtimeError  = data.program_error  || '';
    const stdout        = data.program_output  || '';
    const exitCode      = parseInt(data.status, 10);

    // Compilation error
    if (compilerError.trim() && exitCode !== 0) {
      return {
        verdict: 'CE',
        stdout: '',
        stderr: compilerError.trim(),
        timeMs: 0,
        memoryKb: 0,
        passed: false
      };
    }

    // Runtime error (non-zero exit, but no compiler error)
    if (exitCode !== 0) {
      return {
        verdict: 'RE',
        stdout,
        stderr: (runtimeError || `Runtime Error (exit code ${exitCode})`).trim(),
        timeMs: 0,
        memoryKb: 0,
        passed: false
      };
    }

    // Compare output
    const actualNorm   = normalizeOutput(stdout);
    const expectedNorm = normalizeOutput(expectedOutput);
    const passed = expectedOutput === '' ? true : (actualNorm === expectedNorm);

    return {
      verdict: passed ? 'AC' : 'WA',
      stdout,
      stderr: runtimeError || '',
      timeMs: 0,
      memoryKb: 0,
      passed
    };

  } catch (err) {
    clearTimeout(timer);
    console.error('[Wandbox] Network Exception:', err.message);
    return {
      verdict: 'TLE',
      stdout: '',
      stderr: 'Execution timed out or Wandbox service unavailable. Please try again.',
      timeMs: 0,
      memoryKb: 0,
      passed: false
    };
  }
}

/**
 * Runs code against an array of test cases
 */
async function judgeAllTestCases(code, language, testCases = [], timeLimit = 2.0) {
  if (!testCases || testCases.length === 0) {
    testCases = [{ input: '', output: '' }];
  }

  const results = [];
  let overallVerdict = 'AC';
  let totalTime = 0;
  let maxMemory = 0;
  let passedCount = 0;
  let firstFailingDetails = null;

  for (let i = 0; i < testCases.length; i++) {
    const tc       = testCases[i];
    const input    = tc.input  !== undefined ? tc.input  : (tc.sampleInput  || '');
    const expected = tc.output !== undefined ? tc.output : (tc.sampleOutput || '');

    const res = await executeTestCase(code, language, input, expected, timeLimit);

    totalTime += res.timeMs;
    maxMemory  = Math.max(maxMemory, res.memoryKb);

    const testCaseResult = {
      testCaseIndex: i + 1,
      type: tc.type || (i === 0 ? 'sample' : 'hidden'),
      input,
      expectedOutput: expected,
      actualOutput: res.stdout,
      stderr: res.stderr,
      verdict: res.verdict,
      timeMs: res.timeMs,
      passed: res.passed
    };

    results.push(testCaseResult);

    if (res.passed) {
      passedCount++;
    } else if (overallVerdict === 'AC') {
      overallVerdict = res.verdict;
      firstFailingDetails = testCaseResult;
    }
  }

  const avgTime = testCases.length > 0 ? Math.round(totalTime / testCases.length) : 0;

  return {
    verdict: overallVerdict,
    testsPassed: passedCount,
    totalTests: testCases.length,
    timeMs: avgTime,
    memoryKb: maxMemory,
    testResults: results,
    failingCase: firstFailingDetails
  };
}

module.exports = {
  executeTestCase,
  judgeAllTestCases,
  normalizeOutput
};
