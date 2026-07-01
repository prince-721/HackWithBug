
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import useLeetCodeSync from '../hooks/useLeetCodeSync';
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Bug,
  Play,
  Upload,
  Terminal,
  Sparkles,
  LayoutGrid,
  Settings,
  Pause,
  RotateCw,
  UserPlus,
  Star,
  Share2,
  HelpCircle,
  Maximize2,
  Minimize2,
  Lock,
  Flame,
  ChevronUp,
  ChevronDown,
  Video,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import './ContestArena.css';

// Language Mappers
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

// Hardcoded starter code template generator
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

  if (language === 'java17') {
    return `class Solution {\n    public void ${funcName || 'solve'}() {\n        \n    }\n}`;
  } else if (language === 'cpp17') {
    return `class Solution {\npublic:\n    void ${funcName || 'solve'}() {\n        \n    }\n};`;
  } else if (language === 'python3') {
    return `class Solution:\n    def ${funcName || 'solve'}(self) -> None:\n        pass`;
  } else {
    return `void ${funcName || 'solve'}() {\n\n}`;
  }
};

export default function ContestArena() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Registration states
  const [authPassword, setAuthPassword] = useState('');
  const [registering, setRegistering] = useState(false);

  // Contest states
  const [contest, setContest] = useState(null);
  const [selectedProb, setSelectedProb] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [discussions, setDiscussions] = useState([]);
  
  // Q&A creation states
  const [newDiscTitle, setNewDiscTitle] = useState('');
  const [newDiscBody, setNewDiscBody] = useState('');
  const [postingDisc, setPostingDisc] = useState(false);
  const [expandedThreadId, setExpandedThreadId] = useState(null);

  // Layout split and toggle drawer
  const [splitWidth, setSplitWidth] = useState(45);
  const [isDragging, setIsDragging] = useState(false);
  const [isLeftFullscreen, setIsLeftFullscreen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Left Panel tabs
  const [activeLeftTab, setActiveLeftTab] = useState('description');
  const [bookmarked, setBookmarked] = useState(false);

  // Editor states
  const [selectedLang, setSelectedLang] = useState('cpp17');
  const [code, setCode] = useState('');
  const [cursorPos, setCursorPos] = useState({ line: 1, ch: 1 });
  const [saveStatus, setSaveStatus] = useState('Saved');
  const editorRef = useRef(null);

  // Console Panel states
  const [consoleHeight, setConsoleHeight] = useState(40);
  const [activeConsoleTab, setActiveConsoleTab] = useState('testcase');
  const [customInput, setCustomInput] = useState('');
  const [runResult, setRunResult] = useState(null); // null, 'running', { status, outputs: [] }
  const [confetti, setConfetti] = useState([]);

  // Timer states
  const [timeLeft, setTimeLeft] = useState(7200); // default 2 hours
  const [isTimerPaused, setIsTimerPaused] = useState(false);

  // AI Assistant states
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiChatMsgs, setAiChatMsgs] = useState([
    { role: 'assistant', text: 'Hello! I can explain the problem, suggest complexity optimizations, or give a hint. How can I help you today?' }
  ]);
  const [aiInput, setAiInput] = useState('');

  // Proctoring states
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [tabAlerts, setTabAlerts] = useState(0);
  const [faceOk, setFaceOk] = useState(true);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [pasteEvents, setPasteEvents] = useState(0);
  const videoRef = useRef(null);

  // Typing analytics refs
  const startTimeRef = useRef(Date.now());
  const keystrokesRef = useRef(0);
  const pasteCountRef = useRef(0);
  const copyCountRef = useRef(0);
  const backspaceCountRef = useRef(0);
  const deleteCountRef = useRef(0);
  const lastTypeTimeRef = useRef(Date.now());
  const activeTimeRef = useRef(0);
  const idleTimeRef = useRef(0);
  const wpmHistoryRef = useRef([]);
  const [liveWpm, setLiveWpm] = useState(0);

  // Socket
  const socketRef = useRef(null);

  // Proctoring Log Helper
  const logViolation = useCallback(async (type, detail = '') => {
    try {
      await api.post('/proctoring/log', { contestId: id, type, detail });
    } catch (e) {}
  }, [id]);

  // 1. Draggable divider
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

  // 2. Visibility / Copy / Keyboard Proctoring Event Listeners
  useEffect(() => {
    if (!contest || (user.role === 'student' && !contest.isRegistered)) return;

    const handleVisibility = () => {
      if (document.hidden) {
        setTabAlerts(a => a + 1);
        toast.error('⚠ Tab switch detected!', { duration: 3000 });
        logViolation('tabSwitch', 'Student left the contest viewport');
      }
    };

    const handleFullscreen = () => {
      if (!document.fullscreenElement && isLeftFullscreen) {
        setFullscreenExits(n => n + 1);
        toast.error('⚠ Fullscreen mode exited!', { duration: 3000 });
        logViolation('fullscreenExit', 'Student left the editor fullscreen view');
        setIsLeftFullscreen(false);
      }
    };

    // DevTools detection
    let last = Date.now();
    const devToolsTimer = setInterval(() => {
      const now = Date.now();
      if (now - last > 200) {
        logViolation('devtools', 'DevTools panel opened');
        toast.error('🚨 DevTools interface query logged!', { duration: 4000 });
      }
      last = Date.now();
    }, 100);

    // Copy event
    const handleCopy = () => {
      copyCountRef.current++;
      logViolation('copy', 'Source code copied to clipboard');
      toast.error('⚠ Copy event logged!', { duration: 2000 });
    };

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('fullscreenchange', handleFullscreen);
    document.addEventListener('copy', handleCopy);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('fullscreenchange', handleFullscreen);
      document.removeEventListener('copy', handleCopy);
      clearInterval(devToolsTimer);
    };
  }, [contest, isLeftFullscreen, logViolation, user.role]);

  // 3. Typing speed analytics tracker
  useEffect(() => {
    if (!contest || (user.role === 'student' && !contest.isRegistered)) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSec = Math.floor((now - startTimeRef.current) / 1000);

      const timeSinceLastType = now - lastTypeTimeRef.current;
      if (timeSinceLastType > 3000) {
        idleTimeRef.current += 1;
      } else {
        activeTimeRef.current += 1;
      }

      const activeMin = Math.max(elapsedSec / 60, 0.05);
      const calculatedWpm = Math.round((keystrokesRef.current / 5) / activeMin);
      
      setLiveWpm(calculatedWpm);

      if (wpmHistoryRef.current.length === 0 || elapsedSec - wpmHistoryRef.current[wpmHistoryRef.current.length - 1].time >= 5) {
        wpmHistoryRef.current.push({ time: elapsedSec, wpm: calculatedWpm });
        if (wpmHistoryRef.current.length > 15) {
          wpmHistoryRef.current.shift();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [contest, user.role]);

  // Keyboard editor bindings
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
    setPasteEvents(p => p + 1);
    logViolation('paste', `Pasted code block inside Monaco (Paste #${pasteCountRef.current})`);
    toast.error('⚠ Paste event intercepted and logged!', { duration: 2500 });
  };

  // Editor changes
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

  // Monaco mount helper
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

  // 4. Timer Logic
  useEffect(() => {
    if (isTimerPaused || !contest || (user.role === 'student' && !contest.isRegistered)) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          toast.error('Contest arena session ended.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerPaused, contest, user.role]);

  const formatTimer = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // 5. Connect Socket.IO & Listen
  useEffect(() => {
    const socketHost = process.env.REACT_APP_SOCKET_URL || (window.location.hostname === 'localhost' ? `${window.location.protocol}//${window.location.hostname}:5000` : window.location.origin);
    const socket = io(socketHost, { withCredentials: true });
    socketRef.current = socket;
    socket.emit('join-contest', id);

    socket.on('leaderboard-updated', () => {
      api.get(`/leaderboard/contest/${id}`).then(r => {
        if (!r.data.hidden) setLeaderboard(r.data);
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  // 6. API Database Data Fetching
  const loadData = useCallback(() => {
    api.get(`/contests/${id}`).then(r => {
      setContest(r.data);
      
      // Auto-select first problem if none selected
      if (r.data.problemDetails && r.data.problemDetails.length > 0) {
        setSelectedProb(prev => {
          if (prev) return r.data.problemDetails.find(p => p.id === prev.id || p._id === prev.id) || r.data.problemDetails[0];
          return r.data.problemDetails[0];
        });
      }

      // Compute timer
      const end = new Date(r.data.startTime).getTime() + r.data.duration * 60000;
      setTimeLeft(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    }).catch(() => {
      toast.error('Error fetching contest details');
    });

    api.get(`/submissions?userId=${user.id}&contestId=${id}`).then(r => {
      setSubmissions(r.data);
    }).catch(() => {});

    api.get(`/leaderboard/contest/${id}`).then(r => {
      if (!r.data.hidden) setLeaderboard(r.data);
    }).catch(() => {});

    api.get(`/contests/${id}/announcements`).then(r => {
      setAnnouncements(r.data);
    }).catch(() => {});

    api.get(`/discussions?contestId=${id}`).then(r => {
      setDiscussions(r.data.threads || []);
    }).catch(() => {});
  }, [id, user.id]);

  // LeetCode Sync Integration (poll every 5 minutes if they have linked LeetCode)
  const { solvedSlugs, syncing: lcSyncing, sync: lcSync } = useLeetCodeSync(user?.id, user?.leetcode ? 5 : 0);

  // When solvedSlugs changes, reload submissions/leaderboard and alert on newly solved LC problems
  const prevSolvedCountRef = useRef(0);
  useEffect(() => {
    if (solvedSlugs.length > 0 && contest?.problemDetails) {
      const lcProblems = contest.problemDetails.filter(p => p.source === 'leetcode' && p.leetcodeSlug);
      const currentSolved = lcProblems.filter(p => solvedSlugs.includes(p.leetcodeSlug));
      
      if (currentSolved.length > prevSolvedCountRef.current) {
        currentSolved.forEach(p => {
          const alreadySubmitted = submissions.some(s => (s.problemId === p.id || s.problemId?._id === p.id) && s.verdict === 'AC');
          if (!alreadySubmitted) {
            toast.success(`🎉 LeetCode sync: "${p.title}" marked as solved!`, { duration: 6000 });
            triggerConfetti();
          }
        });
      }
      prevSolvedCountRef.current = currentSolved.length;
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solvedSlugs, contest?.problemDetails]);

  const handleManualSync = async () => {
    if (!user?.leetcode) {
      return toast.error('Link your LeetCode account in your Profile settings first');
    }
    toast.loading('Syncing progress from LeetCode...', { id: 'lc-sync' });
    const result = await lcSync();
    toast.dismiss('lc-sync');
    if (result) {
      toast.success(`Synced successfully! Found ${result.solvedCount} solved problems`);
      loadData();
    } else {
      toast.error('Sync failed. Please check connection.');
    }
  };

  useEffect(() => {
    loadData();
    // Poll announcements every minute
    const interval = setInterval(() => {
      api.get(`/contests/${id}/announcements`).then(r => setAnnouncements(r.data)).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [id, loadData]);

  // Update default code when selected problem or language changes
  useEffect(() => {
    if (selectedProb) {
      setCode(getStarterCode(selectedProb, selectedLang));
    }
  }, [selectedProb, selectedLang]);

  // Handle register code gate
  const handleGateRegister = async () => {
    setRegistering(true);
    try {
      const res = await api.post(`/contests/${id}/register`, { password: authPassword });
      setContest(prev => ({ ...prev, isRegistered: true, participantCount: res.data.participantCount }));
      toast.success('Access granted! Welcome to the Arena.');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Access password rejected');
    } finally {
      setRegistering(false);
    }
  };

  // 7. Simulated/Real judge Run Execution
  const handleRunCode = async () => {
    if (!selectedProb) return;
    setConsoleHeight(280);
    setActiveConsoleTab('result');
    setRunResult('running');

    try {
      const res = await api.post('/submissions', {
        code,
        language: selectedLang,
        problemId: selectedProb.id || selectedProb._id,
        contestId: id
      });

      const sub = res.data;
      setRunResult({
        status: sub.verdict,
        outputs: [
          {
            input: customInput || selectedProb.sampleInput || '',
            output: sub.verdict === 'AC' ? (selectedProb.sampleOutput || '') : (sub.aiFeedback || 'Output error'),
            expected: selectedProb.sampleOutput || '',
            passed: sub.verdict === 'AC'
          }
        ]
      });

      if (sub.verdict === 'AC') {
        toast.success('Local run execution passed sample test!');
      } else {
        toast.error(`Local run compiled as ${sub.verdict}`);
      }
    } catch (e) {
      toast.error('Code execution failed. Please verify syntax structure.');
      setRunResult(null);
    }
  };

  // 8. Custom confetti generator
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

  // 9. Real submission poster
  const handleSubmitCode = async () => {
    if (!selectedProb || !code.trim()) return toast.error('Source code is empty');
    
    toast.loading('Submitting code to judge...', { id: 'submit-toast' });
    
    // Assemble typing speed metrics
    const elapsedSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const typingAnalytics = {
      wpm: liveWpm,
      avgWpm: liveWpm,
      peakWpm: liveWpm + 10,
      keystrokes: keystrokesRef.current,
      totalCharacters: code.length,
      backspaceCount: backspaceCountRef.current,
      deleteCount: deleteCountRef.current,
      copyCount: copyCountRef.current,
      pasteCount: pasteEvents,
      idleTime: idleTimeRef.current,
      activeTime: elapsedSec - idleTimeRef.current,
      codingDuration: elapsedSec,
      wpmHistory: wpmHistoryRef.current
    };

    try {
      const res = await api.post('/submissions', {
        code,
        language: selectedLang,
        problemId: selectedProb.id || selectedProb._id,
        contestId: id,
        typingAnalytics
      });

      toast.dismiss('submit-toast');
      const sub = res.data;

      // Append to submissions
      setSubmissions(prev => [sub, ...prev]);
      setActiveLeftTab('submissions');

      if (sub.verdict === 'AC') {
        toast.success('Accepted! All test cases passed.');
        triggerConfetti();
      } else {
        toast.error(`Incorrect solution: ${sub.verdict}`);
        
        // Trigger LLaMA feedback request if permitted
        if (contest.aiEnabled && contest.aiReview) {
          try {
            toast.loading('LLaMA compiling code review...', { id: 'ai-toast' });
            const aiRes = await api.post('/ai/feedback', {
              code,
              verdict: sub.verdict,
              problemId: selectedProb.id || selectedProb._id,
              language: selectedLang,
              contestId: id
            });
            toast.dismiss('ai-toast');
            
            // Attach AI feedback details to submission
            setSubmissions(prev => {
              return prev.map(s => {
                if (s.id === sub.id || s._id === sub.id) {
                  return { ...s, aiFeedback: aiRes.data.feedback };
                }
                return s;
              });
            });
            toast.success('AI Code Review attached to submission card');
          } catch (err) {
            toast.dismiss('ai-toast');
          }
        }
      }

      // Re-trigger rankings refresh
      api.get(`/leaderboard/contest/${id}`).then(r => {
        if (!r.data.hidden) setLeaderboard(r.data);
      });

    } catch (e) {
      toast.dismiss('submit-toast');
      toast.error('Submission failed.');
    }
  };

  // Proctoring camera toggler
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamOn(true);
      setMicOn(true);
      toast.success('Camera / audio check verified');
      setInterval(() => setFaceOk(Math.random() > 0.08), 5000);
    } catch {
      toast.error('Could not activate camera proctoring device');
    }
  };

  // Post Discussion Forum thread
  const handlePostDiscussion = async () => {
    if (!newDiscTitle.trim() || !newDiscBody.trim()) return toast.error('Fill in all thread fields');
    setPostingDisc(true);
    try {
      const r = await api.post('/discussions', {
        title: newDiscTitle,
        body: newDiscBody,
        contestId: id,
        problemId: selectedProb?.id || selectedProb?._id
      });
      setDiscussions(prev => [r.data, ...prev]);
      setNewDiscTitle('');
      setNewDiscBody('');
      toast.success('Question added to forum');
    } catch {
      toast.error('Failed to post question.');
    } finally {
      setPostingDisc(false);
    }
  };

  // AI chat messaging
  const handleSendAiMsg = () => {
    if (!aiInput.trim()) return;
    const newMsgs = [...aiChatMsgs, { role: 'user', text: aiInput }];
    setAiChatMsgs(newMsgs);
    setAiInput('');

    api.post('/ai/chat', {
      messages: newMsgs,
      problemId: selectedProb?.id || selectedProb?._id,
      contestId: id
    }).then(r => {
      setAiChatMsgs([...newMsgs, { role: 'assistant', text: r.data.message }]);
    }).catch(() => {
      setAiChatMsgs([...newMsgs, { role: 'assistant', text: 'Chat assistant offline.' }]);
    });
  };

  const getHint = () => {
    if (contest && (!contest.aiEnabled || !contest.aiHints)) {
      return toast.error('AI Hint features are disabled for this contest.');
    }
    toast.loading('LLaMA analyzing optimal approach…', { id: 'hint-toast' });
    api.post('/ai/hint', {
      problemId: selectedProb.id || selectedProb._id,
      code
    }).then(r => {
      toast.dismiss('hint-toast');
      toast.success(`AI Hint: ${r.data.hint}`, { duration: 10000 });
    }).catch(() => {
      toast.dismiss('hint-toast');
      toast.error('Hint query failed');
    });
  };

  const toggleConsole = () => {
    setConsoleHeight((prev) => (prev > 40 ? 40 : 280));
  };

  // Loading Screen
  if (!contest) {
    return (
      <div className="lc-arena-container flex items-center justify-center bg-[#1a1b26] text-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold">Loading Contest Arena...</p>
        </div>
      </div>
    );
  }

  // Registration gate block screen
  if (user.role === 'student' && !contest.isRegistered) {
    return (
      <div className="lc-arena-container flex items-center justify-center bg-[#1a1b26] p-6">
        <div className="max-w-[460px] w-full p-8 rounded-xl bg-[#1e1e2e] border border-white/10 text-center shadow-2xl">
          <Lock size={40} className="mx-auto text-indigo-400 mb-4 animate-bounce" />
          <h2 className="text-xl font-bold text-white mb-2">🔒 Registration Required</h2>
          <h3 className="text-sm font-semibold text-indigo-400 mb-4">{contest.title}</h3>
          <p className="text-xs text-gray-400 mb-6 leading-relaxed">
            {contest.description || 'You must register for this contest to view problem statements and submit solutions.'}
          </p>

          {contest.contestType === 'private' ? (
            <div className="flex flex-col gap-3 w-full mb-6">
              <label className="text-xs font-bold text-gray-300 text-left">Access Passcode</label>
              <input
                className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-center text-white outline-none focus:border-indigo-500 transition-colors"
                type="password"
                placeholder="Access Code"
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
              />
              <button
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-md text-sm transition-colors"
                onClick={handleGateRegister}
                disabled={registering || !authPassword}
              >
                {registering ? 'Validating Password…' : 'Unlock & Register →'}
              </button>
            </div>
          ) : (
            <button
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-md text-sm w-full mb-6 transition-colors"
              onClick={handleGateRegister}
              disabled={registering}
            >
              {registering ? 'Registering…' : 'Register for Contest →'}
            </button>
          )}
          <button
            className="text-gray-400 hover:text-white text-xs block mx-auto underline transition-colors"
            onClick={() => navigate('/dashboard')}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Find index of selected problem in contest
  const selectedProbIndex = contest.problemDetails?.findIndex(p => p.id === selectedProb?.id || p._id === selectedProb?.id) ?? 0;
  const isSortListProblem = selectedProb?.title?.toLowerCase().includes('sort list');

  return (
    <div className="lc-arena-container">
      {/* Confetti element list overlay */}
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

      {/* Floating Proctoring Camera preview */}
      {camOn && (
        <div className={`lc-proctoring-bubble ${!faceOk ? 'alert' : ''}`}>
          <video ref={videoRef} className="lc-proctoring-video" autoPlay muted playsInline />
          <div className="lc-proctoring-badge">
            <span className="lc-proctoring-badge-dot" />
            <span>PROCTORED</span>
          </div>
        </div>
      )}

      {/* Sliding Problems selector drawer */}
      <div className={`lc-problem-drawer ${isDrawerOpen ? 'open' : ''}`}>
        <div className="lc-problem-drawer-header">Problems in Contest</div>
        <div className="lc-problem-drawer-list">
          {contest.problemDetails?.map((p, idx) => {
            const isSolved = submissions.some(s => (s.problemId === p.id || s.problemId?._id === p.id) && s.verdict === 'AC');
            const isActive = selectedProb?.id === p.id || selectedProb?._id === p.id;
            return (
              <div
                key={p.id}
                className={`lc-problem-drawer-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setSelectedProb(p);
                  setIsDrawerOpen(false);
                  toast.success(`Loaded Problem: ${p.title}`);
                }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '11px', color: isSolved ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                    {isSolved ? '✓' : '•'}
                  </span>
                  <span className="lc-problem-drawer-title">{idx + 1}. {p.title}</span>
                </div>
                <span className={`text-[10px] uppercase font-bold ${
                  p.difficulty === 'easy' ? 'text-green-400' : p.difficulty === 'hard' ? 'text-red-400' : 'text-amber-400'
                }`}>
                  {p.difficulty}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* TOP NAVIGATION BAR */}
      <nav className="lc-navbar">
        <div className="lc-nav-left">
          <button className="lc-nav-btn" onClick={() => setIsDrawerOpen(!isDrawerOpen)}>
            <Menu size={18} />
          </button>
          <span className="lc-problem-list-title" onClick={() => setIsDrawerOpen(!isDrawerOpen)}>
            Problem List
          </span>
          <button className="lc-nav-btn" onClick={() => {
            if (selectedProbIndex > 0) setSelectedProb(contest.problemDetails[selectedProbIndex - 1]);
          }} disabled={selectedProbIndex === 0}>
            <ChevronLeft size={16} />
          </button>
          <button className="lc-nav-btn" onClick={() => {
            if (contest.problemDetails && selectedProbIndex < contest.problemDetails.length - 1) {
              setSelectedProb(contest.problemDetails[selectedProbIndex + 1]);
            }
          }} disabled={!contest.problemDetails || selectedProbIndex === contest.problemDetails.length - 1}>
            <ChevronRight size={16} />
          </button>
          <button className="lc-nav-btn" onClick={() => {
            if (contest.problemDetails && contest.problemDetails.length > 0) {
              const randIdx = Math.floor(Math.random() * contest.problemDetails.length);
              setSelectedProb(contest.problemDetails[randIdx]);
              toast.success('Shuffled to random problem!');
            }
          }}>
            <Shuffle size={15} />
          </button>
        </div>

        <div className="lc-nav-center">
          <button className="lc-nav-btn" title="Debug code" disabled={selectedProb?.source === 'leetcode'}>
            <Bug size={16} />
          </button>
          {selectedProb?.source === 'leetcode' ? (
            <button className="lc-btn-submit" onClick={handleManualSync} disabled={lcSyncing} style={{ background: '#FFA116', borderColor: '#FFA116', color: '#000', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <RefreshCw size={14} className={lcSyncing ? 'animate-spin' : ''} /> Sync LeetCode
            </button>
          ) : (
            <>
              <button className="lc-btn-run" onClick={handleRunCode}>
                <Play size={14} fill="currentColor" /> Run
              </button>
              <button className="lc-btn-submit" onClick={handleSubmitCode}>
                <Upload size={14} /> Submit
              </button>
            </>
          )}
          <button className="lc-nav-btn" onClick={toggleConsole} title="Toggle Console View" disabled={selectedProb?.source === 'leetcode'}>
            <Terminal size={16} />
          </button>
          {contest.aiEnabled ? (
            <button className="lc-btn-sparkle" onClick={() => setShowAiModal(true)}>
              <Sparkles size={14} /> AI Sparkle
            </button>
          ) : (
            <span className="text-[10px] text-gray-500 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">🚫 AI Blocked</span>
          )}
        </div>

        <div className="lc-nav-right">
          {tabAlerts > 0 && (
            <span className="text-[10px] text-red-400 bg-red-950/40 border border-red-500/20 px-2 py-0.5 rounded-full flex items-center" title="Tab Switch Violations">
              🚨 Tab switches: {tabAlerts}
            </span>
          )}
          {fullscreenExits > 0 && (
            <span className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center" title="Fullscreen Exit Violations">
              🚨 Fullscreen exits: {fullscreenExits}
            </span>
          )}
          <button className="lc-nav-btn" onClick={startCamera} title={camOn ? `Proctoring Cam Active (Mic: ${micOn ? 'ON' : 'OFF'})` : 'Enable Proctoring Cam'}>
            <Video size={16} className={camOn ? 'text-red-500' : 'text-gray-400'} />
          </button>
          <button className="lc-nav-btn" title="Layout Options">
            <LayoutGrid size={16} />
          </button>
          <button className="lc-nav-btn" title="Settings">
            <Settings size={16} />
          </button>
          <div className="lc-nav-divider" />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center' }}>
              <Flame size={14} fill="currentColor" style={{ marginRight: '2px' }} /> {user.rating || 0}
            </span>
          </div>

          <button
            className={`lc-timer-display lc-nav-btn ${timeLeft < 300 ? 'red' : ''}`}
            style={{ color: 'var(--accent-amber)' }}
            onClick={() => {
              setIsTimerPaused(!isTimerPaused);
              toast(isTimerPaused ? 'Timer Resumed' : 'Timer Paused', { icon: '⏱️' });
            }}
          >
            {isTimerPaused ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}
            <span style={{ marginLeft: '4px', fontSize: '12px' }}>{formatTimer(timeLeft)}</span>
          </button>

          <button className="lc-nav-btn" onClick={() => loadData()}>
            <RotateCw size={14} />
          </button>
          <button className="lc-nav-btn">
            <UserPlus size={16} />
          </button>
          <div className="lc-premium-badge">Pre</div>
          <div
            className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold border border-white/20 cursor-pointer uppercase"
            onClick={() => navigate(`/profile/${user.enrollment}`)}
          >
            {user.avatar || user.name?.substring(0,2) || 'YP'}
          </div>
        </div>
      </nav>

      {/* MAIN WORKSPACE split view */}
      <div className="lc-workspace">
        {/* LEFT PANEL */}
        <div
          className="lc-left-panel"
          style={{ width: isLeftFullscreen ? '100%' : `${splitWidth}%` }}
        >
          {/* Tabs header */}
          <div className="lc-tab-bar">
            <div className="lc-tabs-left">
              <button
                className={`lc-tab ${activeLeftTab === 'description' ? 'active' : ''}`}
                onClick={() => setActiveLeftTab('description')}
              >
                📋 Description
              </button>
              <button
                className={`lc-tab ${activeLeftTab === 'editorial' ? 'active' : ''}`}
                onClick={() => setActiveLeftTab('editorial')}
              >
                📖 Editorial
              </button>
              <button
                className={`lc-tab ${activeLeftTab === 'solutions' ? 'active' : ''}`}
                onClick={() => setActiveLeftTab('solutions')}
              >
                💬 Q&A Forum
              </button>
              <button
                className={`lc-tab ${activeLeftTab === 'submissions' ? 'active' : ''}`}
                onClick={() => setActiveLeftTab('submissions')}
              >
                📊 Submissions
              </button>
              <button
                className={`lc-tab ${activeLeftTab === 'leaderboard' ? 'active' : ''}`}
                onClick={() => setActiveLeftTab('leaderboard')}
              >
                🏆 Leaderboard
              </button>
              <button
                className={`lc-tab ${activeLeftTab === 'announcements' ? 'active' : ''}`}
                onClick={() => setActiveLeftTab('announcements')}
              >
                📢 Alerts
              </button>
            </div>
            <div className="lc-tabs-right">
              <button
                className="lc-nav-btn"
                onClick={() => setIsLeftFullscreen(!isLeftFullscreen)}
                title={isLeftFullscreen ? 'Collapse screen' : 'Expand full screen'}
              >
                {isLeftFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
            </div>
          </div>

          {/* Left panel scrollable body */}
          <div className="lc-panel-content">
            {activeLeftTab === 'description' && selectedProb && (
              <div className="lc-prose">
                <div className="lc-problem-title-row">
                  <h1 className="lc-problem-title">{selectedProbIndex + 1}. {selectedProb.title}</h1>
                  {submissions.some(s => (s.problemId === selectedProb.id || s.problemId?._id === selectedProb.id) && s.verdict === 'AC') && (
                    <span className="lc-solved-badge">Solved ✓</span>
                  )}
                </div>

                <div className="lc-meta-row">
                  <span className={`lc-diff-pill ${selectedProb.difficulty}`}>
                    {selectedProb.difficulty}
                  </span>
                  <span className="lc-meta-tag">Points: {selectedProb.points}</span>
                  <span className="lc-meta-tag">Limit: {selectedProb.timeLimit}s</span>
                  {contest.aiEnabled && contest.aiHints && (
                    <button className="lc-meta-tag text-indigo-400 hover:text-indigo-300" onClick={getHint}>
                      💡 Get Hint
                    </button>
                  )}
                </div>

                <p>{selectedProb.statement}</p>

                {/* LeetCode Open Redirect Box */}
                {selectedProb.source === 'leetcode' && selectedProb.leetcodeUrl && (
                  <div style={{ margin: '16px 0', padding: '12px 16px', borderRadius: '8px', background: 'rgba(255, 161, 22, 0.08)', border: '1px solid rgba(255, 161, 22, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>🔗</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFA116' }}>This is a LeetCode problem</div>
                        <div style={{ fontSize: '11px', color: '#a0a0a0' }}>Solve it on LeetCode directly, then sync your progress.</div>
                      </div>
                    </div>
                    <a
                      href={selectedProb.leetcodeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '6px', background: '#FFA116', color: '#000', fontWeight: 700, fontSize: '12px', textDecoration: 'none', whiteSpace: 'nowrap' }}
                    >
                      <ExternalLink size={13} /> Open on LeetCode
                    </a>
                  </div>
                )}

                {/* SVG sorting list representation only if it is Sort List */}
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

                {/* Example 1 Output Box */}
                {selectedProb.sampleInput && (
                  <div className="lc-example-box">
                    <div className="lc-example-title font-bold">Sample Example:</div>
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

                {/* Constraints */}
                {selectedProb.constraints && (
                  <div style={{ marginTop: '20px' }}>
                    <div className="lc-example-title font-bold">Constraints:</div>
                    <pre className="bg-white/5 p-4 rounded-md text-xs text-gray-300 font-mono overflow-x-auto">{selectedProb.constraints}</pre>
                  </div>
                )}
              </div>
            )}

            {activeLeftTab === 'editorial' && selectedProb && (
              <div className="lc-editorial-body lc-prose">
                <div className="lc-editorial-section">
                  <h3 className="font-bold uppercase tracking-wider text-xs text-indigo-400">Optimal Algorithm Concept</h3>
                  <p>{selectedProb.optimalAlgorithm || 'Algorithm documentation is currently being reviewed for this problem set. Standard solutions apply.'}</p>
                </div>
                {selectedProb.editorial && (
                  <div className="lc-editorial-section">
                    <h3 className="font-bold uppercase tracking-wider text-xs text-indigo-400">Editorial Details</h3>
                    <p>{selectedProb.editorial}</p>
                  </div>
                )}
                {selectedProb.explanation && (
                  <div className="lc-editorial-section">
                    <h3 className="font-bold uppercase tracking-wider text-xs text-indigo-400">Complexity & Constraints Walkthrough</h3>
                    <p>{selectedProb.explanation}</p>
                  </div>
                )}
              </div>
            )}

            {activeLeftTab === 'solutions' && (
              <div className="lc-forum-container">
                {/* Forum Create Post */}
                <div className="lc-forum-form">
                  <span className="text-xs font-semibold text-white">Ask a Question / Post Solution</span>
                  <input
                    type="text"
                    placeholder="Thread Title..."
                    className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                    value={newDiscTitle}
                    onChange={e => setNewDiscTitle(e.target.value)}
                  />
                  <textarea
                    rows={2}
                    placeholder="Provide details of your question or approach..."
                    className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                    value={newDiscBody}
                    onChange={e => setNewDiscBody(e.target.value)}
                  />
                  <button
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-1.5 rounded transition-colors self-end px-4"
                    onClick={handlePostDiscussion}
                    disabled={postingDisc}
                  >
                    {postingDisc ? 'Posting...' : 'Post Thread'}
                  </button>
                </div>

                {/* Forum list */}
                {discussions.map((d) => (
                  <div
                    key={d._id || d.id}
                    className="lc-forum-item"
                    onClick={() => setExpandedThreadId(expandedThreadId === d._id ? null : d._id)}
                  >
                    <div className="lc-forum-title">{d.title}</div>
                    <div className="lc-forum-body">{d.body}</div>
                    <div className="lc-forum-meta">
                      <span>👤 {d.userId?.name || 'Student'}</span>
                      <span>💬 {d.answers?.length || 0} replies</span>
                    </div>

                    {expandedThreadId === d._id && d.answers && d.answers.length > 0 && (
                      <div className="lc-forum-replies-list" onClick={e => e.stopPropagation()}>
                        {d.answers.map((ans, idx) => (
                          <div key={idx} className="lc-forum-reply">
                            <div className="text-[10px] text-indigo-300 font-bold mb-1">{ans.userId?.name || 'Contributor'}:</div>
                            <div>{ans.body}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {discussions.length === 0 && <div className="text-center text-xs text-gray-500 py-6">No discussions posted yet. Be the first!</div>}
              </div>
            )}

            {activeLeftTab === 'submissions' && (
              <div className="lc-submissions-list">
                {submissions.map((sub, idx) => {
                  const subId = sub._id || sub.id;
                  const isExpanded = expandedThreadId === subId;
                  return (
                    <div
                      key={subId || idx}
                      className={`lc-submission-item cursor-pointer ${isExpanded ? 'expanded' : ''}`}
                      onClick={() => setExpandedThreadId(isExpanded ? null : subId)}
                    >
                      <div className="lc-sub-header-row w-full">
                        <div>
                          <span className={`lc-sub-verdict ${sub.verdict.toLowerCase()}`}>
                            {sub.verdict === 'AC' ? 'Accepted' : sub.verdict === 'WA' ? 'Wrong Answer' : sub.verdict === 'CE' ? 'Compile Error' : sub.verdict === 'RE' ? 'Runtime Error' : sub.verdict}
                          </span>
                          <div className="lc-sub-meta mt-1">
                            <span>{LANG_LABELS[sub.language] || sub.language}</span>
                            <span>{new Date(sub.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                        <div className="text-right" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          <div>Runtime: {sub.time ? `${sub.time}ms` : 'N/A'}</div>
                          <div>Memory: {sub.memory ? `${sub.memory}MB` : 'N/A'}</div>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="w-full flex flex-col gap-2 mt-2" onClick={e => e.stopPropagation()}>
                          <div className="text-[10px] font-bold text-gray-400">SUBMITTED CODE:</div>
                          <pre className="lc-sub-detail-panel">{sub.code}</pre>
                          {sub.aiFeedback && (
                            <>
                              <div className="text-[10px] font-bold text-indigo-400">AI FEEDBACK & RECOMMENDATIONS:</div>
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
                {submissions.length === 0 && <div className="text-center text-xs text-gray-500 py-6">No submissions recorded for this problem yet.</div>}
              </div>
            )}

            {activeLeftTab === 'leaderboard' && (
              <div className="lc-board-list">
                <div style={{ display: 'flex', padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  <div style={{ width: '40px' }}>Rank</div>
                  <div style={{ flex: 1 }}>Student</div>
                  <div style={{ width: '60px', textAlign: 'center' }}>HWB ✅</div>
                  <div style={{ width: '60px', textAlign: 'center' }}>LC ✅</div>
                  <div style={{ width: '60px', textAlign: 'center' }}>Total</div>
                  <div style={{ width: '80px', textAlign: 'right' }}>Score</div>
                </div>
                {leaderboard.map((item, idx) => (
                  <div key={item.userId || idx} className={`lc-board-row ${item.enrollment === user.enrollment ? 'me' : ''}`} style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: '0.5px solid var(--border)' }}>
                    <div style={{ width: '40px', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '12px' }}>#{idx + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div className="font-semibold text-white text-xs">{item.name}</div>
                      <div className="text-[9px] text-gray-400">{item.department || 'CE'} · {item.enrollment}</div>
                    </div>
                    <div style={{ width: '60px', textAlign: 'center', fontSize: '12px', fontWeight: 'semibold', color: '#2cbb5d' }}>{item.hwbSolved ?? item.solved ?? 0}</div>
                    <div style={{ width: '60px', textAlign: 'center', fontSize: '12px', fontWeight: 'semibold', color: '#FFA116' }}>{item.lcSolved ?? 0}</div>
                    <div style={{ width: '60px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>{item.solved ?? 0}</div>
                    <div style={{ width: '80px', textAlign: 'right', fontWeight: 'bold', fontSize: '12px', color: 'var(--accent-purple)' }}>
                      {item.points || 0} pts
                    </div>
                  </div>
                ))}
                {leaderboard.length === 0 && <div className="text-center text-xs text-gray-500 py-6">Rankings calculation in progress.</div>}
              </div>
            )}

            {activeLeftTab === 'announcements' && (
              <div className="flex flex-col gap-3">
                {announcements.map((ann, idx) => (
                  <div key={idx} className="p-3 border border-white/5 rounded-lg bg-white/2 flex flex-col gap-1">
                    <p className="text-xs text-gray-200">{ann.text}</p>
                    <span className="text-[9px] text-gray-500">{new Date(ann.createdAt).toLocaleTimeString()}</span>
                  </div>
                ))}
                {announcements.length === 0 && <div className="text-center text-xs text-gray-500 py-6">No updates broadcasted by faculty yet.</div>}
              </div>
            )}
          </div>

          {/* Left panel status footer bar */}
          <div className="lc-status-bar">
            <div className="lc-status-left">
              <span className="lc-status-action">👍 13.1K</span>
              <span className="lc-status-action">👎</span>
              <span className="lc-status-action">💬 {discussions.length}</span>
              
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
              <span className="flex items-center gap-1">
                <span className="lc-online-dot" /> 59 Online
              </span>
            </div>
          </div>
        </div>

        {/* DRAGGABLE DIVIDER */}
        {!isLeftFullscreen && (
          <div
            className={`lc-divider ${isDragging ? 'dragging' : ''}`}
            onMouseDown={handleMouseDown}
          />
        )}

        {/* RIGHT PANEL */}
        {!isLeftFullscreen && selectedProb && (
          <div className="lc-right-panel">
            {selectedProb.source === 'leetcode' ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#1e1e2e] text-white">
                <div style={{width:80,height:80,borderRadius:'20px',background:'linear-gradient(135deg,#FFA116,#FF8C00)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'40px',marginBottom:'20px',boxShadow:'0 8px 24px rgba(255,161,22,0.2)'}}>
                  ⚡
                </div>
                <h3 style={{fontSize:'18px',fontWeight:800,marginBottom:'10px'}}>LeetCode Integration Workspace</h3>
                <p style={{fontSize:'13px',color:'var(--text-secondary)',maxWidth:'380px',lineHeight:'20px',marginBottom:'24px'}}>
                  This problem is hosted on LeetCode. Solve it there directly, then sync your progress. No proctoring is active while you are on LeetCode.
                </p>
                <div style={{display:'flex',gap:'12px'}}>
                  <a
                    href={selectedProb.leetcodeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{background:'#FFA116',borderColor:'#FFA116',color:'#000',fontWeight:700,display:'flex',alignItems:'center',gap:'6px',padding:'8px 20px',borderRadius:'6px',textDecoration:'none'}}
                  >
                    Open LeetCode ↗
                  </a>
                  <button
                    onClick={handleManualSync}
                    disabled={lcSyncing}
                    className="btn btn-ghost"
                    style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 20px',border:'1px solid var(--border)',borderRadius:'6px'}}
                  >
                    <RefreshCw size={14} className={lcSyncing ? 'animate-spin' : ''} />
                    {lcSyncing ? 'Syncing Progress…' : 'Sync Progress'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Editor Container */}
                <div className="lc-editor-container" style={{ height: `calc(100% - ${consoleHeight}px)` }}>
              {/* Header Bar */}
              <div className="lc-editor-header">
                <div className="lc-editor-header-left">
                  <select
                    className="lc-select-lang"
                    value={selectedLang}
                    onChange={(e) => {
                      setSelectedLang(e.target.value);
                      toast.success(`Switched environment to ${LANG_LABELS[e.target.value]}`);
                    }}
                  >
                    {contest.allowedLangs?.map((l) => (
                      <option key={l} value={l}>
                        {LANG_LABELS[l] || l}
                      </option>
                    )) || (
                      <>
                        <option value="cpp17">C++</option>
                        <option value="python3">Python3</option>
                        <option value="java17">Java</option>
                        <option value="c">C</option>
                      </>
                    )}
                  </select>
                  <span className="lc-autosave-indicator ml-2">
                    <Lock size={11} /> Auto
                  </span>
                </div>
                <div className="lc-editor-header-right">
                  <button className="lc-nav-btn" onClick={() => {
                    setCode(getStarterCode(selectedProb, selectedLang));
                    toast.success('Editor refreshed to base code template');
                  }}>
                    Reset
                  </button>
                </div>
              </div>

              {/* Monaco Editor Component wrapper */}
              <div className="lc-code-editor-area" onKeyDown={handleEditorKeyDown} onPaste={handleEditorPaste}>
                <div className="lc-monaco-mock">
                  <Editor
                    height="100%"
                    language={MONACO_LANGS[selectedLang] || 'cpp'}
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
                  
                  {/* Status overlays */}
                  <div className="lc-editor-overlay-saved">{saveStatus}</div>
                  <div className="lc-editor-overlay-cursor">
                    Ln {cursorPos.line}, Col {cursorPos.ch}
                  </div>
                </div>
              </div>
            </div>

            {/* CONSOLE DRAWER BOTTOM PANEL */}
            <div className="lc-console-drawer" style={{ height: `${consoleHeight}px` }}>
              <div className="lc-console-tabs">
                <div className="lc-console-tabs-left">
                  <button
                    className={`lc-console-tab-btn ${activeConsoleTab === 'testcase' ? 'active' : ''}`}
                    onClick={() => {
                      setConsoleHeight(280);
                      setActiveConsoleTab('testcase');
                    }}
                  >
                    ✓ Testcase
                  </button>
                  <button
                    className={`lc-console-tab-btn ${activeConsoleTab === 'result' ? 'active' : ''}`}
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
                  <button className="lc-nav-btn" onClick={toggleConsole} title="Toggle Console Drawer">
                    {consoleHeight > 40 ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </button>
                </div>
              </div>

              {/* Console body panel */}
              <div className="lc-console-body">
                {activeConsoleTab === 'testcase' ? (
                  <div>
                    <div className="lc-testcase-label">Custom Test Input</div>
                    <textarea
                      rows={4}
                      className="lc-testcase-input font-mono"
                      value={customInput || selectedProb.sampleInput || ''}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Input numbers or strings to test against..."
                    />
                  </div>
                ) : (
                  // Result content
                  <div style={{ height: '100%' }}>
                    {runResult === null ? (
                      <div className="lc-result-msg-empty">You must run your code first</div>
                    ) : runResult === 'running' ? (
                      <div className="flex flex-col items-center justify-center h-full text-indigo-400 gap-2">
                        <div className="animate-pulse font-semibold">Running Code...</div>
                        <div className="text-xs text-gray-500">Executing sandbox Piston compile</div>
                      </div>
                    ) : (
                      <div className="lc-result-box">
                        <div className="lc-result-status-row">
                          <span className={`lc-result-status-badge ${runResult.status.toLowerCase()}`}>
                            {runResult.status}
                          </span>
                          <span className="lc-result-runtime">
                            Verdict returned by judge
                          </span>
                        </div>

                        {runResult.outputs[0] && (
                          <div>
                            <div className="lc-result-data-row">
                              <div className="lc-result-data-label">Input Tested</div>
                              <div className="lc-result-data-value">
                                {runResult.outputs[0].input}
                              </div>
                            </div>

                            <div className="lc-result-data-row">
                              <div className="lc-result-data-label">Output</div>
                              <div className="lc-result-data-value">
                                {runResult.outputs[0].output}
                              </div>
                            </div>

                            <div className="lc-result-data-row">
                              <div className="lc-result-data-label">Expected Sample Output</div>
                              <div className="lc-result-data-value">
                                {runResult.outputs[0].expected}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Console footer control */}
              <div className="lc-console-footer">
                <button
                  className="lc-btn-add-tc"
                  onClick={() => {
                    setCustomInput(selectedProb.sampleInput || '');
                    toast.success('Reset inputs to default sample parameters');
                  }}
                >
                  🔄 Reset Input
                </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
        </div>

      {/* AI Sparkle Chat assistant Drawer modal overlay */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/60 flex justify-end z-[1000] animate-fade-in">
          <div className="w-[360px] h-full bg-[#1e1e2e] border-l border-white/10 flex flex-col shadow-2xl animate-slide-in">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-[#16161a] flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                <Sparkles size={16} />
                <span>AI Code Assistant</span>
              </div>
              <button
                className="text-gray-400 hover:text-white text-lg font-bold"
                onClick={() => setShowAiModal(false)}
              >
                &times;
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
              {aiChatMsgs.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg max-w-[85%] text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white self-end'
                      : 'bg-white/5 text-gray-200 self-start border border-white/5'
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            {/* Actions Quick Row */}
            <div className="p-3 border-t border-white/5 bg-[#16161a]/40 flex gap-2 overflow-x-auto">
              <button
                className="bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] px-2.5 py-1.5 rounded-full border border-white/5 shrink-0"
                onClick={() => {
                  setAiInput('Provide complexity recommendations for this question');
                  toast.success('Question template loaded');
                }}
              >
                💡 Explain complexity
              </button>
              <button
                className="bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] px-2.5 py-1.5 rounded-full border border-white/5 shrink-0"
                onClick={() => {
                  setAiInput('Explain algorithm details or provide code structure');
                  toast.success('Question template loaded');
                }}
              >
                🚀 Structural advice
              </button>
            </div>

            {/* Input Footer */}
            <div className="p-3 border-t border-white/10 bg-[#16161a] flex gap-2">
              <input
                type="text"
                className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                placeholder="Ask AI helper..."
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendAiMsg()}
              />
              <button
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md text-xs font-semibold"
                onClick={handleSendAiMsg}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
