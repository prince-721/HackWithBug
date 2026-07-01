import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';
import useLeetCodeSync from '../hooks/useLeetCodeSync';
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  RotateCw,
  Star,
  Share2,
  HelpCircle,
  Maximize2,
  Minimize2,
  Lock,
  ChevronUp,
  ChevronDown,
  Settings,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import './Practice.css';

// Mapped language configurations
const LANG_LABELS = {
  'java17': 'Java',
  'cpp17': 'C++',
  'python3': 'Python3',
  'c': 'C'
};

const MONACO_LANGS = {
  'java17': 'java',
  'cpp17': 'cpp',
  'python3': 'python',
  'c': 'c'
};

const STARTER_CODES = {
  'java17': `class Solution {\n    public void solve() {\n        \n    }\n}`,
  'cpp17': `class Solution {\npublic:\n    void solve() {\n        \n    }\n};`,
  'python3': `class Solution:\n    def solve(self) -> None:\n        pass`,
  'c': `void solve() {\n\n}`
};

// Starter code helper generator
const getStarterCode = (problem, language) => {
  if (!problem) return '';
  const title = problem.title || '';

  const templates = {
    'Reverse the Array': {
      'java17': `class Solution {\n    public void reverseArray(int[] arr) {\n        \n    }\n}`,
      'cpp17': `class Solution {\npublic:\n    void reverseArray(vector<int>& arr) {\n        \n    }\n};`,
      'python3': `class Solution:\n    def reverseArray(self, arr: List[int]) -> None:\n        pass`,
      'c': `void reverseArray(int* arr, int arrSize) {\n\n}`
    },
    'Climb the Leaderboard': {
      'java17': `class Solution {\n    public int[] climbingLeaderboard(int[] ranked, int[] player) {\n        \n    }\n}`,
      'cpp17': `class Solution {\npublic:\n    vector<int> climbingLeaderboard(vector<int>& ranked, vector<int>& player) {\n        \n    }\n};`,
      'python3': `class Solution:\n    def climbingLeaderboard(self, ranked: List[int], player: List[int]) -> List[int]:\n        pass`,
      'c': `int* climbingLeaderboard(int* ranked, int rankedSize, int* player, int playerSize, int* resultCount) {\n\n}`
    },
    'Graph Coloring': {
      'java17': `class Solution {\n    public boolean isBipartite(int[][] graph) {\n        \n    }\n}`,
      'cpp17': `class Solution {\npublic:\n    bool isBipartite(vector<vector<int>>& graph) {\n        \n    }\n};`,
      'python3': `class Solution:\n    def isBipartite(self, graph: List[List[int]]) -> bool:\n        pass`,
      'c': `bool isBipartite(int** graph, int graphSize, int* graphColSize) {\n\n}`
    },
    'Segment Tree XOR': {
      'java17': `class Solution {\n    public int[] xorQueries(int[] arr, int[][] queries) {\n        \n    }\n}`,
      'cpp17': `class Solution {\npublic:\n    vector<int> xorQueries(vector<int>& arr, vector<vector<int>>& queries) {\n        \n    }\n};`,
      'python3': `class Solution:\n    def xorQueries(self, arr: List[int], queries: List[List[int]]) -> List[int]:\n        pass`,
      'c': `int* xorQueries(int* arr, int arrSize, int** queries, int queriesSize, int* queriesColSize, int* resultCount) {\n\n}`
    },
    'Network Flow': {
      'java17': `class Solution {\n    public int maxFlow(int n, int[][] edges, int source, int sink) {\n        \n    }\n}`,
      'cpp17': `class Solution {\npublic:\n    int maxFlow(int n, vector<vector<int>>& edges, int source, int sink) {\n        \n    }\n};`,
      'python3': `class Solution:\n    def maxFlow(self, n: int, edges: List[List[int]], source: int, sink: int) -> int:\n        pass`,
      'c': `int maxFlow(int n, int** edges, int edgesSize, int* edgesColSize, int source, int sink) {\n\n}`
    },
    'DP on Trees': {
      'java17': `class Solution {\n    public int maxIndependentSet(int n, int[][] edges, int[] weights) {\n        \n    }\n}`,
      'cpp17': `class Solution {\npublic:\n    int maxIndependentSet(int n, vector<vector<int>>& edges, vector<int>& weights) {\n        \n    }\n};`,
      'python3': `class Solution:\n    def maxIndependentSet(self, n: int, edges: List[List[int]], weights: List[int]) -> int:\n        pass`,
      'c': `int maxIndependentSet(int n, int** edges, int edgesSize, int* edgesColSize, int* weights, int weightsSize) {\n\n}`
    },
    'Two Sum': {
      'java17': `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        \n    }\n}`,
      'cpp17': `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};`,
      'python3': `class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        pass`,
      'c': `int* twoSum(int* nums, int numsSize, int target, int* returnSize) {\n\n}`
    },
    'Longest Common Subsequence': {
      'java17': `class Solution {\n    public int longestCommonSubsequence(String text1, String text2) {\n        \n    }\n}`,
      'cpp17': `class Solution {\npublic:\n    int longestCommonSubsequence(string text1, string text2) {\n        \n    }\n};`,
      'python3': `class Solution:\n    def longestCommonSubsequence(self, text1: str, text2: str) -> int:\n        pass`,
      'c': `int longestCommonSubsequence(char* text1, char* text2) {\n\n}`
    }
  };

  const key = Object.keys(templates).find(k => title.toLowerCase().includes(k.toLowerCase()));
  if (key && templates[key][language]) {
    return templates[key][language];
  }

  const funcName = title.split(' ').map((word, idx) => {
    const clean = word.replace(/[^a-zA-Z0-9]/g, '');
    if (idx === 0) return clean.toLowerCase();
    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  }).join('');

  return STARTER_CODES[language].replace('solve', funcName || 'solve');
};

const DIFFICULTIES = ['All', 'easy', 'medium', 'hard'];
const ALL_TAGS = ['Arrays', 'Binary Search', 'Graphs', 'BFS', 'DP', 'Trees', 'Strings', 'Hashing', 'Segment Tree', 'Data Structures', 'Max Flow', 'Implementation'];

export default function Practice() {
  const { user } = useAuth();

  // LeetCode sync
  const { solvedSlugs, syncing: lcSyncing, sync: lcSync, isSolved: isLcSolved } = useLeetCodeSync(user?.id, 0);

  // Problems data states
  const [problems, setProblems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selectedProb, setSelectedProb] = useState(null);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [dailyChallenge, setDailyChallenge] = useState(null);

  // Filters
  const [filters, setFilters] = useState({ diff: 'All', tag: '', search: '' });

  // Layout splits
  const [splitWidth, setSplitWidth] = useState(45);
  const [isDragging, setIsDragging] = useState(false);
  const [isLeftFullscreen, setIsLeftFullscreen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Tabs states
  const [activeLeftTab, setActiveLeftTab] = useState('description'); // description, hint, editorial, submissions
  const [bookmarked, setBookmarked] = useState(false);
  const [expandedSubId, setExpandedSubId] = useState(null);

  // Editor states
  const [selectedLang, setSelectedLang] = useState('cpp17');
  const [code, setCode] = useState('');
  const [cursorPos, setCursorPos] = useState({ line: 1, ch: 1 });
  const [saveStatus, setSaveStatus] = useState('Saved');
  const editorRef = useRef(null);

  // AI loads
  const [hintText, setHintText] = useState('');
  const [editorialText, setEditorialText] = useState('');
  const [loadingHint, setLoadingHint] = useState(false);
  const [loadingEditorial, setLoadingEditorial] = useState(false);

  // Console panel states
  const [consoleHeight, setConsoleHeight] = useState(40);
  const [activeConsoleTab, setActiveConsoleTab] = useState('testcase');
  const [customInput, setCustomInput] = useState('');
  const [runResult, setRunResult] = useState(null); // null, 'running', { status, outputs: [] }
  const [confetti, setConfetti] = useState([]);

  // Timer states
  const [timeLeft, setTimeLeft] = useState(0); // seconds spent practicing
  const isTimerPaused = false;

  // Typing analytics refs
  const startTimeRef = useRef(Date.now());
  const keystrokesRef = useRef(0);
  const pasteCountRef = useRef(0);
  const backspaceCountRef = useRef(0);
  const deleteCountRef = useRef(0);
  const lastTypeTimeRef = useRef(Date.now());
  const idleTimeRef = useRef(0);

  // Fetch initial problem sets
  const loadData = useCallback(() => {
    api.get('/problems').then((r) => {
      setProblems(r.data);
      setFiltered(r.data);
    }).catch(() => {});

    api.get('/submissions?userId=' + user.id).then((r) => {
      setMySubmissions(r.data);
    }).catch(() => {});

    api.get('/contests/daily/challenge').then((r) => {
      setDailyChallenge(r.data);
    }).catch(() => {});
  }, [user.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle problem filtering
  useEffect(() => {
    let list = [...problems];
    if (filters.diff !== 'All') {
      list = list.filter((p) => p.difficulty === filters.diff);
    }
    if (filters.tag) {
      list = list.filter((p) => p.tags?.includes(filters.tag));
    }
    if (filters.search) {
      list = list.filter((p) => p.title.toLowerCase().includes(filters.search.toLowerCase()));
    }
    setFiltered(list);
  }, [filters, problems]);

  // Load starter templates when selection changes
  useEffect(() => {
    if (selectedProb) {
      setCode(getStarterCode(selectedProb, selectedLang));
    }
  }, [selectedProb, selectedLang]);

  // Select problem helper
  const selectProblem = (p) => {
    setSelectedProb(p);
    setRunResult(null);
    setHintText('');
    setEditorialText('');
    setActiveLeftTab('description');
    setIsDrawerOpen(false);
    
    // Reset typing analytics
    startTimeRef.current = Date.now();
    keystrokesRef.current = 0;
    pasteCountRef.current = 0;
    backspaceCountRef.current = 0;
    deleteCountRef.current = 0;
    idleTimeRef.current = 0;
  };

  // Draggable divider logic
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const percentage = (e.clientX / window.innerWidth) * 100;
      if (percentage >= 30 && percentage <= 70) {
        setSplitWidth(percentage);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Timer tick for practicing
  useEffect(() => {
    if (isTimerPaused || !selectedProb) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerPaused, selectedProb]);

  const formatTimer = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Typing analytics recorders
  const handleEditorKeyDown = (e) => {
    keystrokesRef.current += 1;
    lastTypeTimeRef.current = Date.now();

    if (e.code === 'Backspace') {
      backspaceCountRef.current += 1;
    }
    if (e.code === 'Delete') {
      deleteCountRef.current += 1;
    }
  };

  const handleEditorPaste = () => {
    pasteCountRef.current += 1;
  };

  const handleEditorChange = (val) => {
    setCode(val || '');
    setSaveStatus('Saving...');
  };

  useEffect(() => {
    if (saveStatus === 'Saving...') {
      const t = setTimeout(() => {
        setSaveStatus('Saved');
      }, 500);
      return () => clearTimeout(t);
    }
  }, [saveStatus]);

  // Monaco mounts
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    monaco.editor.defineTheme('leetcode-dark-custom', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'bb9af7' },
        { token: 'type', foreground: '7dd3fc' },
        { token: 'string', foreground: 'ff9e64' },
        { token: 'number', foreground: 'ff9e64' },
        { token: 'identifier', foreground: 'e0af68' },
      ],
      colors: {
        'editor.background': '#1e1e2e',
        'editor.foreground': '#c0caf5',
        'editor.lineHighlightBackground': '#252538',
        'editorLineNumber.foreground': '#5f5e5a',
        'editorLineNumber.activeForeground': '#7F77DD',
      }
    });
    monaco.editor.setTheme('leetcode-dark-custom');

    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({ line: e.position.lineNumber, ch: e.position.column });
    });
  };

  // AI Hints
  const handleGetHint = async () => {
    if (!selectedProb) return;
    setLoadingHint(true);
    setActiveLeftTab('hint');
    try {
      const r = await api.post('/ai/hint', { problemId: selectedProb.id || selectedProb._id, code });
      setHintText(r.data.hint);
    } catch {
      setHintText('Hint unavailable. Analyze standard arrays/strings bounds.');
    } finally {
      setLoadingHint(false);
    }
  };

  // AI Editorials
  const handleGetEditorial = async () => {
    if (!selectedProb) return;
    setLoadingEditorial(true);
    setActiveLeftTab('editorial');
    try {
      const r = await api.post('/ai/editorial', { problemId: selectedProb.id || selectedProb._id });
      setEditorialText(r.data.editorial);
    } catch {
      setEditorialText('Editorial unavailable. Verify standard time complexities.');
    } finally {
      setLoadingEditorial(false);
    }
  };

  // Confetti builder
  const triggerConfetti = () => {
    const particles = [];
    for (let i = 0; i < 120; i++) {
      particles.push({
        id: i,
        left: `${Math.random() * 100}%`,
        color: ['#2cbb5d', '#7F77DD', '#f0a500', '#4fc3f7', '#ff6b6b', '#ffeb3b'][Math.floor(Math.random() * 6)],
        drift: Math.random(),
        delay: `${Math.random() * 2}s`,
        size: `${Math.random() * 8 + 6}px`
      });
    }
    setConfetti(particles);
    setTimeout(() => setConfetti([]), 3600);
  };

  // Run code locally
  const handleRunCode = async () => {
    if (!selectedProb) return;
    setConsoleHeight(280);
    setActiveConsoleTab('result');
    setRunResult('running');

    try {
      const res = await api.post('/submissions', {
        code,
        language: selectedLang,
        problemId: selectedProb.id || selectedProb._id
      });
      const sub = res.data;
      setRunResult({
        status: sub.verdict,
        outputs: [
          {
            input: customInput || selectedProb.sampleInput || '',
            output: sub.verdict === 'AC' ? (selectedProb.sampleOutput || '') : (sub.aiFeedback || 'Runtime mismatch logs'),
            expected: selectedProb.sampleOutput || '',
            passed: sub.verdict === 'AC'
          }
        ]
      });
      if (sub.verdict === 'AC') toast.success('Sample run matched expected output!');
      else toast.error(`Run completed as ${sub.verdict}`);
    } catch {
      toast.error('Code compilation failed.');
      setRunResult(null);
    }
  };

  // Submit code to database
  const handleSubmitCode = async () => {
    if (!selectedProb || !code.trim()) return toast.error('Source code is empty');
    toast.loading('Submitting code to judge...', { id: 'submit-toast' });

    // Typing Analytics parameters
    const elapsedSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const duration = Math.max(elapsedSec, 1);
    const wpm = Math.floor((keystrokesRef.current / 5) / (duration / 60));
    
    const typingAnalytics = {
      wpm,
      avgWpm: wpm,
      peakWpm: wpm + 10,
      keystrokes: keystrokesRef.current,
      totalCharacters: code.length,
      pasteCount: pasteCountRef.current,
      copyCount: 0,
      backspaceCount: backspaceCountRef.current,
      deleteCount: deleteCountRef.current,
      activeTime: Math.floor(duration * 0.8),
      idleTime: Math.floor(duration * 0.2),
      codingDuration: duration
    };

    try {
      const res = await api.post('/submissions', {
        code,
        language: selectedLang,
        problemId: selectedProb.id || selectedProb._id,
        typingAnalytics
      });
      toast.dismiss('submit-toast');
      const sub = res.data;

      setMySubmissions((prev) => [sub, ...prev]);
      setActiveLeftTab('submissions');

      if (sub.verdict === 'AC') {
        toast.success('Accepted! Problem completed.');
        triggerConfetti();
      } else {
        toast.error(`Incorrect: ${sub.verdict}`);
        
        // Fetch AI analysis automatically on failure
        try {
          toast.loading('LLaMA analyzing wrong answer...', { id: 'ai-toast' });
          const ai = await api.post('/ai/feedback', {
            code,
            verdict: sub.verdict,
            problemId: selectedProb.id || selectedProb._id,
            language: selectedLang
          });
          toast.dismiss('ai-toast');
          await api.patch(`/submissions/${sub.id}/ai-feedback`, {
            feedback: ai.data.feedback,
            partialScore: ai.data.partialScore
          });
          
          setMySubmissions(prev => {
            return prev.map(s => {
              if (s.id === sub.id || s._id === sub.id) {
                return { ...s, aiFeedback: ai.data.feedback };
              }
              return s;
            });
          });
          toast.success('AI feedback attached successfully');
        } catch {}
      }
    } catch {
      toast.dismiss('submit-toast');
      toast.error('Submission failed.');
    }
  };

  const getSolvedIds = () => new Set(mySubmissions.filter((s) => s.verdict === 'AC').map((s) => s.problemId || s.problemId?.id || s.problemId?._id));

  const toggleConsole = () => {
    setConsoleHeight((prev) => (prev > 40 ? 40 : 280));
  };

  const selectedProbIndex = problems.findIndex(p => p.id === selectedProb?.id || p._id === selectedProb?.id) ?? 0;
  const isSortListProblem = selectedProb?.title?.toLowerCase().includes('sort list');

  return (
    <div className="lc-practice-container">
      {/* 1. Confetti overlay */}
      {confetti.length > 0 && (
        <div className="lc-confetti-wrapper">
          {confetti.map((p) => (
            <div
              key={p.id}
              className="lc-confetti-particle"
              style={{
                left: p.left,
                backgroundColor: p.color,
                width: p.size,
                height: p.size,
                animationDelay: p.delay,
                '--drift': p.drift
              }}
            />
          ))}
        </div>
      )}

      {/* Sliding Problem Drawer */}
      <div className={`lc-psidebar-drawer ${isDrawerOpen ? 'open' : ''}`}>
        <div className="lc-psidebar-header">
          <span>Problems Browser</span>
          <button className="text-gray-400 hover:text-white" onClick={() => setIsDrawerOpen(false)}>&times;</button>
        </div>

        {/* Filters */}
        <div className="lc-psidebar-search-box">
          <input
            type="text"
            className="lc-psidebar-input text-xs"
            placeholder="🔍 Search problems..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
          <div className="lc-psidebar-filters-row">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                className={`lc-psidebar-filter-tab ${filters.diff === d ? 'active' : ''}`}
                onClick={() => setFilters((f) => ({ ...f, diff: d }))}
              >
                {d}
              </button>
            ))}
          </div>
          <select
            className="lc-psidebar-select text-[11px]"
            value={filters.tag}
            onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value }))}
          >
            <option value="">All tags</option>
            {ALL_TAGS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Scrolling items list */}
        <div className="lc-psidebar-scroll">
          {dailyChallenge?.problemId && (
            <div
              className="m-3 p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-lg cursor-pointer"
              onClick={() => selectProblem(dailyChallenge.problemId)}
            >
              <div className="text-[10px] text-indigo-400 font-bold uppercase mb-1">⚡ Daily Challenge</div>
              <div className="text-xs font-semibold text-white">{dailyChallenge.problemId.title}</div>
            </div>
          )}

          {filtered.map((p) => {
            const solved = getSolvedIds().has(p.id);
            const lcSolved = p.source === 'leetcode' && p.leetcodeSlug && isLcSolved(p.leetcodeSlug);
            const active = selectedProb?.id === p.id;
            return (
              <div
                key={p.id}
                className={`lc-psidebar-item ${active ? 'active' : ''}`}
                onClick={() => selectProblem(p)}
              >
                <div>
                  <div className="lc-psidebar-title">
                    {solved && <span className="text-green-500 mr-1.5 font-bold">✓</span>}
                    {lcSolved && !solved && <span style={{color:'#FFA116',marginRight:'4px',fontWeight:700}}>✓</span>}
                    {p.title}
                    {p.source === 'leetcode' && <span style={{marginLeft:'6px',fontSize:'9px',color:'#FFA116'}}>🔗LC</span>}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1 flex gap-2">
                    <span className={p.difficulty === 'easy' ? 'text-green-400' : p.difficulty === 'hard' ? 'text-red-400' : 'text-amber-400'}>
                      {p.difficulty}
                    </span>
                    <span>{p.points}pts</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* User stats info panel */}
        <div className="lc-psidebar-stats">
          <div>
            <span className="lc-pstat-val">{getSolvedIds().size}</span>
            <span className="lc-pstat-lbl">Solved</span>
          </div>
          <div>
            <span className="lc-pstat-val">{user.streak || 0} 🔥</span>
            <span className="lc-pstat-lbl">Streak</span>
          </div>
          <div>
            <span className="lc-pstat-val">{user.rating || 0}</span>
            <span className="lc-pstat-lbl">Rating</span>
          </div>
        </div>
      </div>

      {/* TOP INNER TOOLBAR */}
      <div className="lc-practice-navbar">
        <div className="lc-pnav-left">
          <button className="lc-pnav-btn" onClick={() => setIsDrawerOpen(!isDrawerOpen)}>
            <Menu size={16} />
          </button>
          <span className="lc-pnav-title" onClick={() => setIsDrawerOpen(!isDrawerOpen)}>
            Problem List
          </span>
          <div className="lc-nav-divider" />
          <button
            className="lc-pnav-btn"
            onClick={() => {
              if (selectedProbIndex > 0) selectProblem(problems[selectedProbIndex - 1]);
            }}
            disabled={selectedProbIndex === 0}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="lc-pnav-btn"
            onClick={() => {
              if (selectedProbIndex < problems.length - 1) selectProblem(problems[selectedProbIndex + 1]);
            }}
            disabled={selectedProbIndex === problems.length - 1}
          >
            <ChevronRight size={16} />
          </button>
          <button
            className="lc-pnav-btn"
            onClick={() => {
              if (problems.length > 0) {
                const rand = Math.floor(Math.random() * problems.length);
                selectProblem(problems[rand]);
              }
            }}
          >
            <Shuffle size={14} />
          </button>
        </div>

        <div className="lc-pnav-right">
          {selectedProb && (
            <div className="lc-timer-display text-xs text-indigo-400 font-mono" style={{ padding: '2px 8px' }}>
              ⏱️ {formatTimer(timeLeft)}
            </div>
          )}
          <button className="lc-pnav-btn" onClick={async () => {
            if (user?.leetcode) {
              const result = await lcSync();
              if (result) toast.success(`Synced ${result.solvedCount} LC problems`);
            } else {
              toast.error('Connect LeetCode in your profile first');
            }
          }}>
            <RefreshCw size={14} className={lcSyncing ? 'animate-spin' : ''} />
          </button>
          <button className="lc-pnav-btn">
            <RotateCw size={14} onClick={() => loadData()} />
          </button>
          <button className="lc-pnav-btn">
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* MAIN CONTENT SPLIT PANELS */}
      {selectedProb ? (
        <div className="lc-pworkspace">
          {/* LEFT PANEL */}
          <div
            className="lc-pleft-panel"
            style={{ width: isLeftFullscreen ? '100%' : `${splitWidth}%` }}
          >
            <div className="pe-tabs-row">
              <div className="pe-tabs-list">
                <button
                  className={`pe-tab-btn ${activeLeftTab === 'description' ? 'active' : ''}`}
                  onClick={() => setActiveLeftTab('description')}
                >
                  📋 Description
                </button>
                <button
                  className={`pe-tab-btn ${activeLeftTab === 'hint' ? 'active' : ''}`}
                  onClick={handleGetHint}
                >
                  💡 AI Hint
                </button>
                <button
                  className={`pe-tab-btn ${activeLeftTab === 'editorial' ? 'active' : ''}`}
                  onClick={handleGetEditorial}
                >
                  📖 Editorial
                </button>
                <button
                  className={`pe-tab-btn ${activeLeftTab === 'submissions' ? 'active' : ''}`}
                  onClick={() => setActiveLeftTab('submissions')}
                >
                  📊 Submissions
                </button>
              </div>
              <div>
                <button className="lc-nav-btn" onClick={() => setIsLeftFullscreen(!isLeftFullscreen)}>
                  {isLeftFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
              </div>
            </div>

            {/* Scrollable contents */}
            <div className="pe-panel-body">
              {activeLeftTab === 'description' && (
                <div className="lc-prose">
                  <div className="lc-problem-title-row">
                    <h1 className="lc-problem-title">
                      {selectedProbIndex + 1}. {selectedProb.title}
                    </h1>
                    {getSolvedIds().has(selectedProb.id) && <span className="lc-solved-badge">Solved ✓</span>}
                  </div>

                  <div className="lc-meta-row">
                    <span className={`lc-diff-pill ${selectedProb.difficulty}`}>{selectedProb.difficulty}</span>
                    <span className="lc-meta-tag">Points: {selectedProb.points}</span>
                    <span className="lc-meta-tag">Limit: {selectedProb.timeLimit}s</span>
                    <span className="lc-meta-tag">Memory: {selectedProb.memoryLimit}MB</span>
                  </div>

                  <p>{selectedProb.statement}</p>

                  {/* LeetCode: Open on LeetCode button */}
                  {selectedProb.source === 'leetcode' && selectedProb.leetcodeUrl && (
                    <div style={{margin:'16px 0',padding:'12px 16px',borderRadius:'8px',background:'rgba(255,161,22,0.08)',border:'1px solid rgba(255,161,22,0.2)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        <span style={{fontSize:'18px'}}>🔗</span>
                        <div>
                          <div style={{fontSize:'13px',fontWeight:700,color:'#FFA116'}}>This is a LeetCode problem</div>
                          <div style={{fontSize:'11px',color:'#a0a0a0'}}>Solve it on LeetCode, then sync your progress here</div>
                        </div>
                      </div>
                      <a
                        href={selectedProb.leetcodeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{display:'flex',alignItems:'center',gap:'6px',padding:'6px 14px',borderRadius:'6px',background:'#FFA116',color:'#000',fontWeight:700,fontSize:'12px',textDecoration:'none',whiteSpace:'nowrap'}}
                      >
                        <ExternalLink size={13} /> Open on LeetCode
                      </a>
                    </div>
                  )}

                  {/* SVG linked list representations if it is sort list problem */}
                  {isSortListProblem && (
                    <div className="lc-example-box">
                      <div className="lc-example-title font-bold">Example 1:</div>
                      <div className="lc-svg-diagram">
                        <svg width="340" height="180" viewBox="0 0 340 180">
                          <defs>
                            <marker id="arrow" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 0 L 10 5 L 0 10 z" fill="#9c9a92" />
                            </marker>
                            <marker id="arrow-active" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 0 L 10 5 L 0 10 z" fill="#f0a500" />
                            </marker>
                          </defs>
                          <g>
                            <circle cx="40" cy="40" r="28" className="lc-svg-node-circle" />
                            <text x="40" y="40" className="lc-svg-node-text">4</text>
                            <line x1="68" y1="40" x2="90" y2="40" className="lc-svg-arrow" marker-end="url(#arrow)" />
                            <circle cx="120" cy="40" r="28" className="lc-svg-node-circle" />
                            <text x="120" y="40" className="lc-svg-node-text">2</text>
                            <line x1="148" y1="40" x2="170" y2="40" className="lc-svg-arrow" marker-end="url(#arrow)" />
                            <circle cx="200" cy="40" r="28" className="lc-svg-node-circle" />
                            <text x="200" y="40" className="lc-svg-node-text">1</text>
                            <line x1="228" y1="40" x2="250" y2="40" className="lc-svg-arrow" marker-end="url(#arrow)" />
                            <circle cx="280" cy="40" r="28" className="lc-svg-node-circle" />
                            <text x="280" y="40" className="lc-svg-node-text">3</text>
                          </g>
                          <line x1="160" y1="74" x2="160" y2="102" className="lc-svg-down-arrow" marker-end="url(#arrow-active)" />
                          <g>
                            <circle cx="40" cy="140" r="28" className="lc-svg-node-circle" />
                            <text x="40" y="140" className="lc-svg-node-text">1</text>
                            <line x1="68" y1="140" x2="90" y2="140" className="lc-svg-arrow" marker-end="url(#arrow)" />
                            <circle cx="120" cy="140" r="28" className="lc-svg-node-circle" />
                            <text x="120" y="140" className="lc-svg-node-text">2</text>
                            <line x1="148" y1="140" x2="170" y2="140" className="lc-svg-arrow" marker-end="url(#arrow)" />
                            <circle cx="200" cy="140" r="28" className="lc-svg-node-circle" />
                            <text x="200" y="140" className="lc-svg-node-text">3</text>
                            <line x1="228" y1="140" x2="250" y2="140" className="lc-svg-arrow" marker-end="url(#arrow)" />
                            <circle cx="280" cy="140" r="28" className="lc-svg-node-circle" />
                            <text x="280" y="140" className="lc-svg-node-text">4</text>
                          </g>
                        </svg>
                      </div>
                    </div>
                  )}

                  {selectedProb.sampleInput && (
                    <div className="lc-example-box">
                      <div className="lc-example-title font-bold">Sample Parameters:</div>
                      <div className="lc-example-body">
                        <pre className="lc-example-pre">
<strong>Input:</strong>
{selectedProb.sampleInput}

<strong>Output:</strong>
{selectedProb.sampleOutput}
                        </pre>
                      </div>
                    </div>
                  )}

                  {selectedProb.constraints && (
                    <div style={{ marginTop: '16px' }}>
                      <div className="lc-example-title font-bold">Constraints:</div>
                      <pre className="bg-white/5 p-4 rounded-md text-xs text-gray-300 font-mono overflow-x-auto">{selectedProb.constraints}</pre>
                    </div>
                  )}
                </div>
              )}

              {activeLeftTab === 'hint' && (
                <div className="lc-prose">
                  <div className="pe-hint-header font-bold text-xs uppercase text-indigo-400">💡 AI Hint Suggestion</div>
                  {loadingHint ? (
                    <div className="text-gray-400 animate-pulse py-4">Generating Hint...</div>
                  ) : (
                    <p className="leading-relaxed text-sm text-gray-200 mt-2">{hintText || 'Click AI Hint tab to trigger recommendations.'}</p>
                  )}
                </div>
              )}

              {activeLeftTab === 'editorial' && (
                <div className="lc-prose">
                  <div className="pe-hint-header font-bold text-xs uppercase text-indigo-400">📖 AI Analysis Editorial</div>
                  {loadingEditorial ? (
                    <div className="text-gray-400 animate-pulse py-4">Generating Editorial Walkthrough...</div>
                  ) : (
                    <pre className="pe-editorial-body text-xs text-gray-200 mt-2 leading-relaxed bg-[#1e1e1e]/60 p-4 rounded border border-white/5 overflow-x-auto">
                      {editorialText || 'Click Editorial tab to parse algorithm strategies.'}
                    </pre>
                  )}
                </div>
              )}

              {activeLeftTab === 'submissions' && (
                <div className="lc-submissions-list">
                  {mySubmissions
                    .filter((s) => s.problemId === selectedProb.id || s.problemId?.id === selectedProb.id || s.problemId?._id === selectedProb.id)
                    .map((sub, idx) => {
                      const subId = sub._id || sub.id;
                      const isExpanded = expandedSubId === subId;
                      return (
                        <div
                          key={subId || idx}
                          className={`lc-submission-item cursor-pointer ${isExpanded ? 'expanded' : ''}`}
                          onClick={() => setExpandedSubId(isExpanded ? null : subId)}
                        >
                          <div className="lc-sub-header-row w-full">
                            <div>
                              <span className={`lc-sub-verdict ${sub.verdict.toLowerCase()}`}>
                                {sub.verdict === 'AC' ? 'Accepted' : sub.verdict === 'WA' ? 'Wrong Answer' : sub.verdict === 'CE' ? 'Compile Error' : sub.verdict === 'RE' ? 'Runtime Error' : sub.verdict}
                              </span>
                              <div className="lc-sub-meta mt-1">
                                <span>{LANG_LABELS[sub.language] || sub.language}</span>
                                <span>{new Date(sub.timestamp).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="text-right text-[11px] text-gray-400">
                              <div>Runtime: {sub.time ? `${sub.time}ms` : 'N/A'}</div>
                              <div>Memory: {sub.memory ? `${sub.memory}MB` : 'N/A'}</div>
                            </div>
                          </div>
                          
                          {isExpanded && (
                            <div className="w-full flex flex-col gap-2 mt-2" onClick={e => e.stopPropagation()}>
                              <div className="text-[10px] font-bold text-gray-400">CODE SUBMITTED:</div>
                              <pre className="lc-sub-detail-panel">{sub.code}</pre>
                              {sub.aiFeedback && (
                                <>
                                  <div className="text-[10px] font-bold text-indigo-400">AI DETAILED REVIEW:</div>
                                  <pre className="lc-sub-detail-panel border-indigo-500/20 bg-indigo-950/20 text-indigo-200">
                                    {sub.aiFeedback}
                                  </pre>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  {mySubmissions.filter(
                    (s) => s.problemId === selectedProb.id || s.problemId?.id === selectedProb.id || s.problemId?._id === selectedProb.id
                  ).length === 0 && (
                    <div className="text-center text-xs text-gray-500 py-6">No previous attempts recorded for this problem.</div>
                  )}
                </div>
              )}
            </div>

            {/* Left panel status footer bar */}
            <div className="lc-status-bar">
              <div className="lc-status-left">
                <span className="lc-status-action">👍 13.1K</span>
                <span className="lc-status-action">👎</span>
                <span
                  className={`lc-status-action ${bookmarked ? 'active' : ''}`}
                  onClick={() => {
                    setBookmarked(!bookmarked);
                    toast.success(bookmarked ? 'Bookmark removed' : 'Problem bookmarked!');
                  }}
                >
                  <Star size={14} fill={bookmarked ? 'currentColor' : 'none'} /> {bookmarked ? 'Bookmarked' : 'Bookmark'}
                </span>
                <span className="lc-status-action" onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Link copied to clipboard!');
                }}>
                  <Share2 size={14} /> Share
                </span>
              </div>
              <div className="lc-status-right">
                <span className="lc-status-action">
                  <HelpCircle size={14} /> Help
                </span>
              </div>
            </div>
          </div>

          {/* DRAGGABLE HANDLE */}
          {!isLeftFullscreen && (
            <div
              className={`lc-pdivider ${isDragging ? 'dragging' : ''}`}
              onMouseDown={handleMouseDown}
            />
          )}

          {/* RIGHT PANEL */}
          {!isLeftFullscreen && (
            <div className="lc-pright-panel">
              {/* Editor Workspace */}
              <div className="pe-editor-container" style={{ height: `calc(100% - ${consoleHeight}px)` }}>
                {/* Header controls */}
                <div className="pe-editor-header">
                  <div className="pe-editor-header-left">
                    <select
                      className="lc-select-lang"
                      value={selectedLang}
                      onChange={(e) => setSelectedLang(e.target.value)}
                    >
                      <option value="cpp17">C++</option>
                      <option value="python3">Python3</option>
                      <option value="java17">Java</option>
                      <option value="c">C</option>
                    </select>
                    <span className="lc-autosave-indicator ml-2">
                      <Lock size={11} /> Auto
                    </span>
                  </div>
                  <div className="pe-editor-header-right">
                    <button
                      className="lc-pnav-btn"
                      onClick={() => {
                        setCode(getStarterCode(selectedProb, selectedLang));
                        toast.success('Editor templates reset');
                      }}
                    >
                      Reset
                    </button>
                    <button className="lc-btn-run" onClick={handleRunCode}>
                      Run
                    </button>
                    <button className="lc-btn-submit" onClick={handleSubmitCode}>
                      Submit ↗
                    </button>
                  </div>
                </div>

                {/* Monaco Editor frame */}
                <div className="pe-monaco-area" onKeyDown={handleEditorKeyDown} onPaste={handleEditorPaste}>
                  <div className="pe-monaco-mock">
                    <Editor
                      height="100%"
                      language={MONACO_LANGS[selectedLang]}
                      value={code}
                      onChange={handleEditorChange}
                      onMount={handleEditorDidMount}
                      loading={<div className="flex items-center justify-center h-full text-indigo-400">Loading IDE modules...</div>}
                      options={{
                        fontSize: 14,
                        minimap: { enabled: false },
                        automaticLayout: true,
                        lineHeight: 22,
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
                      }}
                    />
                    {/* overlays */}
                    <div className="lc-editor-overlay-saved">{saveStatus}</div>
                    <div className="lc-editor-overlay-cursor">
                      Ln {cursorPos.line}, Col {cursorPos.ch}
                    </div>
                  </div>
                </div>
              </div>

              {/* Collapsible Console drawer */}
              <div className="pe-console-drawer" style={{ height: `${consoleHeight}px` }}>
                <div className="pe-console-tabs">
                  <div className="flex gap-4">
                    <button
                      className={`pe-console-tab-btn ${activeConsoleTab === 'testcase' ? 'active' : ''}`}
                      onClick={() => {
                        setConsoleHeight(280);
                        setActiveConsoleTab('testcase');
                      }}
                    >
                      ✓ Testcase
                    </button>
                    <button
                      className={`pe-console-tab-btn ${activeConsoleTab === 'result' ? 'active' : ''}`}
                      onClick={() => {
                        setConsoleHeight(280);
                        setActiveConsoleTab('result');
                      }}
                    >
                      {runResult === 'running' ? (
                        <span className="flex items-center gap-1"><span className="animate-spin text-xs">⌛</span> Test Result</span>
                      ) : (
                        <span>{'>_'} Test Result</span>
                      )}
                    </button>
                  </div>
                  <div>
                    <button className="lc-pnav-btn" onClick={toggleConsole} title="Toggle Console height">
                      {consoleHeight > 40 ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                  </div>
                </div>

                {/* Console Panel drawer Body */}
                <div className="pe-console-body">
                  {activeConsoleTab === 'testcase' ? (
                    <div>
                      <div className="lc-testcase-label">Custom Test Stdin</div>
                      <textarea
                        rows={4}
                        className="lc-testcase-input font-mono"
                        value={customInput || selectedProb.sampleInput || ''}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="Provide parameters to run compiled code against..."
                      />
                    </div>
                  ) : (
                    <div style={{ height: '100%' }}>
                      {runResult === null ? (
                        <div className="pe-welcome-container" style={{ padding: 0, justifyContent: 'center' }}>
                          <span className="text-gray-500 text-xs">You must run your code first</span>
                        </div>
                      ) : runResult === 'running' ? (
                        <div className="flex flex-col items-center justify-center h-full text-indigo-400 gap-1.5">
                          <div className="animate-pulse font-semibold text-xs">Compiling & Running Code...</div>
                        </div>
                      ) : (
                        <div className="lc-result-box">
                          <div className="lc-result-status-row">
                            <span className={`lc-result-status-badge ${runResult.status.toLowerCase()}`}>
                              {runResult.status}
                            </span>
                            <span className="lc-result-runtime">
                              Local execution results
                            </span>
                          </div>

                          {runResult.outputs[0] && (
                            <div>
                              <div className="lc-result-data-row">
                                <div className="lc-result-data-label">Input Tested</div>
                                <div className="lc-result-data-value">{runResult.outputs[0].input}</div>
                              </div>
                              <div className="lc-result-data-row">
                                <div className="lc-result-data-label">Output</div>
                                <div className="lc-result-data-value">{runResult.outputs[0].output}</div>
                              </div>
                              <div className="lc-result-data-row">
                                <div className="lc-result-data-label">Expected Sample Output</div>
                                <div className="lc-result-data-value">{runResult.outputs[0].expected}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pe-console-footer">
                  <button
                    className="lc-btn-add-tc"
                    onClick={() => {
                      setCustomInput(selectedProb.sampleInput || '');
                      toast.success('Reset inputs');
                    }}
                  >
                    🔄 Reset Input
                  </button>
                  <button className="lc-btn-run" style={{ padding: '3px 10px' }} onClick={handleRunCode}>
                    Run Code
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Empty state landing select problem screen
        <div className="pe-welcome-container">
          <div className="text-6xl animate-bounce">🧩</div>
          <h2 className="pe-welcome-title">Select a Practice Problem</h2>
          <p className="pe-welcome-desc">
            Choose a coding problem from the Browser list to start practicing. View detailed statements, ask AI hints, or generate explanations.
          </p>
          <div className="flex gap-4">
            <button
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-md text-sm transition-colors"
              onClick={() => setIsDrawerOpen(true)}
            >
              Browse Problems List
            </button>

            {dailyChallenge?.problemId && (
              <div
                className="pe-welcome-daily text-left flex flex-col justify-center"
                onClick={() => selectProblem(dailyChallenge.problemId)}
              >
                <div className="text-[10px] text-indigo-400 font-bold uppercase">⚡ Daily Challenge</div>
                <div className="text-xs font-semibold text-white">{dailyChallenge.problemId.title}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
