
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import useLeetCodeSync from '../hooks/useLeetCodeSync';
import { saveCodeDraft, loadCodeDraft, formatTimeAgo } from '../utils/codeStorage';

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
  ExternalLink,
  Camera,
  Mic,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Shield,
  Maximize,
  Check,
  LogOut,
  Clock,
  ArrowLeft,
  BookOpen
} from 'lucide-react';
import './Practice.css';
import './ContestArena.css';

// Language Mappers
const LANG_LABELS = {
  'cpp17': 'C++17',
  'java17': 'Java 17',
  'python3': 'Python 3',
  'c': 'C',
  'javascript': 'JavaScript'
};

const MONACO_LANGS = {
  'cpp17': 'cpp',
  'java17': 'java',
  'python3': 'python',
  'c': 'c',
  'javascript': 'javascript'
};

const STARTER_CODES = {
  'cpp17': `#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    // Write your contest solution here\n    \n    return 0;\n}`,
  'java17': `import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your contest solution here\n        \n    }\n}`,
  'python3': `import sys\n\ndef solve():\n    input = sys.stdin.read\n    # Write your contest solution here\n    pass\n\nif __name__ == '__main__':\n    solve()`,
  'c': `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nint main() {\n    // Write your contest solution here\n    \n    return 0;\n}`,
  'javascript': `const fs = require('fs');\n\nfunction solve() {\n    const input = fs.readFileSync(0, 'utf-8');\n    // Write your contest solution here\n}\n\nsolve();`
};

const getStarterCode = (problem, language) => {
  if (problem?.starterCode && problem.starterCode[language]) {
    return problem.starterCode[language];
  }
  return STARTER_CODES[language] || STARTER_CODES['cpp17'];
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

  // Timer states — null until contest data is loaded to avoid race condition
  const [timeLeft, setTimeLeft] = useState(null);
  const [isTimerPaused, setIsTimerPaused] = useState(false);

  // AI Assistant states
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiChatMsgs, setAiChatMsgs] = useState([
    { role: 'assistant', text: 'Hello! I can explain the problem, suggest complexity optimizations, or give a hint. How can I help you today?' }
  ]);
  const [aiInput, setAiInput] = useState('');

  // Proctoring & System Check states
  const [inArena, setInArena] = useState(user?.role === 'faculty');
  const [camVerified, setCamVerified] = useState(false);
  const [micVerified, setMicVerified] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);
  const [micVolume, setMicVolume] = useState(0);
  const [testingMedia, setTestingMedia] = useState(false);
  const checkVideoRef = useRef(null);

  // 3-Strike Violation states
  const [violationsCount, setViolationsCount] = useState(0);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [violationReason, setViolationReason] = useState('');
  const [isDisqualified, setIsDisqualified] = useState(false);

  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [tabAlerts, setTabAlerts] = useState(0);
  const [faceOk, setFaceOk] = useState(true);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [pasteEvents, setPasteEvents] = useState(0);
  const videoRef = useRef(null);

  // End Contest Modal state
  const [showEndModal, setShowEndModal] = useState(false);
  const [endingContest, setEndingContest] = useState(false);

  const handleEndContest = async () => {
    setEndingContest(true);
    try {
      if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
      }
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      toast.success('Contest examination concluded. Your results have been saved.');
      navigate('/dashboard');
    } catch (e) {
      navigate('/dashboard');
    } finally {
      setEndingContest(false);
      setShowEndModal(false);
    }
  };

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

  // Proctoring Log Helper with local throttling to prevent rate limits
  const lastViolationSentRef = useRef({});
  const logViolation = useCallback(async (type, detail = '') => {
    const now = Date.now();
    const lastSent = lastViolationSentRef.current[type] || 0;
    if (now - lastSent < 3000) return;
    lastViolationSentRef.current[type] = now;
    try {
      await api.post('/proctoring/log', { contestId: id, type, detail });
    } catch (e) {}
  }, [id]);

  // Violation Action Handler (Strict 3-Strike Limit)
  const handleViolation = useCallback(async (type, reason) => {
    if (!inArena || user.role !== 'student' || isDisqualified) return;

    setViolationsCount(prev => {
      const next = prev + 1;
      setViolationReason(reason);
      logViolation(type, `Strike #${next}: ${reason}`);

      if (next >= 3) {
        setIsDisqualified(true);
        api.post('/proctoring/disqualify', {
          contestId: id,
          reason: `Exceeded maximum 3-strike limit: ${reason}`
        }).catch(() => {});
        toast.error('❌ DISQUALIFIED: You have exceeded the 3 violation limit.');
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      } else {
        setShowViolationModal(true);
        toast.error(`⚠️ Proctoring Strike (${next}/3): ${reason}`, { duration: 5000 });
      }
      return next;
    });
  }, [inArena, user.role, isDisqualified, logViolation, id]);


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

  // 2. Fullscreen & Visibility & Security Event Listeners (Active only inside arena)
  useEffect(() => {
    if (!inArena || !contest || user.role !== 'student' || isDisqualified) return;

    const handleVisibility = () => {
      if (document.hidden) {
        setTabAlerts(a => a + 1);
        handleViolation('tabSwitch', 'Switched browser tab or minimized window');
      }
    };

    const handleWindowBlur = () => {
      handleViolation('windowBlur', 'Clicked outside the contest application window');
    };

    const handleFullscreen = () => {
      if (!document.fullscreenElement) {
        setFullscreenExits(n => n + 1);
        handleViolation('fullscreenExit', 'Exited fullscreen examination mode');
      }
    };

    // Copy event
    const handleCopy = () => {
      copyCountRef.current++;
      logViolation('copy', 'Source code copied to clipboard');
      toast.error('⚠ Copy event logged!', { duration: 2000 });
    };

    // Right-Click Context Menu Prevention
    const handleContextMenu = (e) => {
      e.preventDefault();
      logViolation('rightClick', 'Attempted to open context menu (Right-Click)');
      toast.error('🛡️ Right-click is strictly prohibited during the contest.', { duration: 2500 });
    };

    // DevTools & Inspect Element Keybinding Prevention
    const handleSecurityKeyDown = (e) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) ||
        (e.ctrlKey && ['U', 'u', 'S', 's'].includes(e.key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        handleViolation('devtools', `Prohibited key combination pressed (${e.key})`);
        toast.error('🛡️ Inspect element & DevTools shortcuts are disabled during examination.', { duration: 3000 });
      }
    };

    // Camera track monitoring
    if (mediaStream) {
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          setCamOn(false);
          handleViolation('cameraOff', 'Webcam was disconnected or turned off');
        };
        videoTrack.onmute = () => {
          setCamOn(false);
          handleViolation('cameraMuted', 'Webcam video stream was muted');
        };
        videoTrack.onunmute = () => {
          setCamOn(true);
        };
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('fullscreenchange', handleFullscreen);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleSecurityKeyDown, true);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('fullscreenchange', handleFullscreen);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleSecurityKeyDown, true);
    };
  }, [inArena, contest, user.role, isDisqualified, handleViolation, logViolation, mediaStream]);


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

  // Editor changes (auto-saved for 7 days)
  const handleEditorChange = (val) => {
    const newCode = val || '';
    setCode(newCode);
    setSaveStatus('Saving...');
    if (selectedProb) {
      const probId = selectedProb.id || selectedProb._id;
      saveCodeDraft(user?.id, probId, selectedLang, newCode, id);
      setTimeout(() => setSaveStatus('Saved (7d Cache)'), 300);
    }
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

  // 4. Timer Logic — only starts once timeLeft is initialized from API (not null)
  useEffect(() => {
    if (isTimerPaused || !contest || timeLeft === null || (user.role === 'student' && !contest.isRegistered)) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          toast.error('Contest session has ended.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerPaused, contest, timeLeft === null, user.role]); // eslint-disable-line react-hooks/exhaustive-deps

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

    // When faculty updates contest details (timing, duration), refresh and recompute timer
    socket.on('contest-updated', () => {
      api.get(`/contests/${id}`).then(r => {
        setContest(r.data);
        const end = new Date(r.data.startTime).getTime() + r.data.duration * 60000;
        const remaining = Math.max(0, Math.floor((end - Date.now()) / 1000));
        setTimeLeft(remaining);
        toast('⏱ Contest timing updated by faculty', { icon: '🔔', duration: 4000 });
      }).catch(() => {});
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  // 6. API Database Data Fetching
  const loadData = useCallback(() => {
    api.get(`/contests/${id}`).then(r => {
      setContest(r.data);
      
      // Check if student is disqualified on the server
      if (r.data.isDisqualified) {
        setIsDisqualified(true);
        setViolationReason(r.data.disqualifiedReason || 'Permanently disqualified from contest');
        setInArena(false);
      }

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

    // Fetch personal proctoring log to sync strikes and disqualification
    api.get(`/proctoring/${id}/me`).then(r => {
      if (r.data?.disqualified) {
        setIsDisqualified(true);
        setViolationReason(r.data.disqualifiedReason || 'Permanently disqualified from contest');
        setInArena(false);
      }
      if (r.data?.totalAlerts !== undefined) {
        setTabAlerts(r.data.tabSwitches || 0);
        setFullscreenExits(r.data.fullscreenExits || 0);
        setViolationsCount(Math.min(3, r.data.totalAlerts));
      }
    }).catch(() => {});


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
  const prevSolvedCountRef = useRef(-1);
  useEffect(() => {
    if (solvedSlugs.length > 0 && contest?.problemDetails) {
      const lcProblems = contest.problemDetails.filter(p => p.source === 'leetcode' && p.leetcodeSlug);
      const currentSolved = lcProblems.filter(p => solvedSlugs.includes(p.leetcodeSlug));
      
      if (prevSolvedCountRef.current === -1) {
        // Initial sync check: set the ref count but don't call loadData to avoid loop
        prevSolvedCountRef.current = currentSolved.length;
      } else if (currentSolved.length > prevSolvedCountRef.current) {
        currentSolved.forEach(p => {
          const alreadySubmitted = submissions.some(s => (s.problemId === p.id || s.problemId?._id === p.id) && s.verdict === 'AC');
          if (!alreadySubmitted) {
            toast.success(`🎉 LeetCode sync: "${p.title}" marked as solved!`, { duration: 6000 });
            triggerConfetti();
          }
        });
        prevSolvedCountRef.current = currentSolved.length;
        loadData();
      }
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

  // Restore 7-day auto-saved draft or starter code when selected problem or language changes
  useEffect(() => {
    if (selectedProb) {
      const probId = selectedProb.id || selectedProb._id;
      const draft = loadCodeDraft(user?.id, probId, selectedLang, id);
      if (draft && draft.code && draft.code.trim()) {
        setCode(draft.code);
        setSaveStatus(`Draft Restored (${formatTimeAgo(draft.updatedAt)})`);
      } else {
        setCode(getStarterCode(selectedProb, selectedLang));
        setSaveStatus('Saved');
      }
    }
  }, [selectedProb, selectedLang, id, user?.id]);




  // 7. Deterministic judge Run Execution (tests sample / custom cases without creating database submission)
  const handleRunCode = async () => {
    if (!selectedProb || !code.trim()) {
      return toast.error('Source code is empty');
    }
    // Capture tab before switching to result tab
    const wasCustomTab = activeConsoleTab === 'custom';
    setConsoleHeight(280);
    setActiveConsoleTab('result');
    setRunResult('running');

    try {
      const res = await api.post('/submissions/run', {
        code,
        language: selectedLang,
        problemId: selectedProb.id || selectedProb._id,
        customInput: wasCustomTab && customInput ? customInput : undefined
      });

      const data = res.data;
      setRunResult({
        status: data.verdict,
        testsPassed: data.testsPassed || (data.passed ? 1 : 0),
        totalTests: data.totalTests || 1,
        timeMs: data.timeMs || 0,
        memoryKb: data.memoryKb || 0,
        stderr: data.stderr || '',
        testResults: data.testResults || [],
        stdout: data.stdout || ''
      });

      if (data.verdict === 'AC') {
        toast.success('Sample testcase passed! ✓');
      } else if (data.verdict === 'CE') {
        toast.error('Compilation Error. Check stderr log.');
      } else {
        toast.error(`Test run returned ${data.verdict}`);
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Code execution failed. Please verify syntax structure.');
      setRunResult({ status: 'CE', stderr: 'Execution server connection failed' });
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

      setRunResult({
        status: sub.verdict,
        testsPassed: sub.testsPassed,
        totalTests: sub.totalTests,
        timeMs: sub.time,
        memoryKb: (sub.memory || 0) * 1024,
        stderr: sub.aiFeedback,
        testResults: sub.testResults || []
      });

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

  // Test Camera & Microphone Permissions & Stream
  const handleTestMedia = async () => {
    setTestingMedia(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setMediaStream(stream);
      setCamVerified(true);
      setMicVerified(true);
      if (checkVideoRef.current) {
        checkVideoRef.current.srcObject = stream;
      }

      // Start audio frequency volume analyser
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateVol = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;
          setMicVolume(Math.min(100, Math.round(avg * 2.8)));
          requestAnimationFrame(updateVol);
        };
        updateVol();
      } catch (aErr) {
        console.warn('Audio analyser error:', aErr);
      }

      toast.success('Camera & Microphone verified successfully!');
    } catch (err) {
      toast.error('Could not access camera/microphone. Please allow browser permissions in settings.');
    } finally {
      setTestingMedia(false);
    }
  };

  // Join Contest & Enter Fullscreen Mode
  const handleEnterArena = async () => {
    if (!camVerified || !micVerified) {
      return toast.error('Please verify Camera and Microphone permissions first.');
    }

    // Register if private or not yet registered
    if (!contest.isRegistered) {
      if (contest.contestType === 'private' && !authPassword) {
        return toast.error('Please enter the contest passcode');
      }
      setRegistering(true);
      try {
        const res = await api.post(`/contests/${id}/register`, { password: authPassword });
        setContest(prev => ({ ...prev, isRegistered: true, participantCount: res.data.participantCount }));
        toast.success('Registration completed!');
      } catch (err) {
        setRegistering(false);
        return toast.error(err.response?.data?.error || 'Registration failed');
      }
      setRegistering(false);
    }

    // Enter Fullscreen
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (fsErr) {
      console.warn('Fullscreen request bypassed:', fsErr);
    }

    // Attach stream to live proctoring video bubble
    if (mediaStream && videoRef.current) {
      videoRef.current.srcObject = mediaStream;
    }
    setCamOn(true);
    setMicOn(true);
    setInArena(true);
    toast.success('🛡️ Proctored Exam Started. Fullscreen active.');
  };

  // Disqualification Lockout Screen
  if (isDisqualified) {
    return (
      <div className="disqualified-full-overlay">
        <div className="max-w-[500px] w-full p-8 bg-[#111827] border-2 border-red-500 rounded-2xl shadow-2xl text-center">
          <ShieldAlert size={56} className="mx-auto text-red-500 mb-4 animate-bounce" />
          <h2 className="text-2xl font-black text-white mb-2">❌ CONTEST TERMINATED</h2>
          <div className="badge badge-danger text-xs px-3 py-1 mb-4 inline-block font-bold">
            Disqualified · 3 / 3 Strike Limit Exceeded
          </div>
          <p className="text-sm text-gray-300 mb-6 leading-relaxed">
            You exited fullscreen mode, switched tabs, or unfocused the contest window more than 3 times. As per examination guidelines, your session has been automatically locked and submitted.
          </p>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-left text-xs text-red-300">
            <div className="font-bold mb-1">Violation Log Summary:</div>
            <div>• Tab switches / window exits: {tabAlerts + fullscreenExits || 3}</div>
            <div>• Termination reason: {violationReason || 'Exceeded 3 permitted strikes'}</div>
            <div>• Logged to faculty proctoring console: Yes</div>
          </div>
          <button
            className="btn btn-primary w-full py-3 font-bold"
            onClick={() => navigate('/dashboard')}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Pre-Contest Lobby & Hardware System Verification Gate
  if (!inArena) {
    return (
      <div className="arena-lobby-overlay">
        <div className="arena-lobby-container">
          {/* Left Column: Contest Overview & Rules */}
          <div className="lobby-contest-meta-card">
            <div>
              <div className="lobby-badge-row">
                <span className={`badge ${contest.status === 'live' ? 'badge-primary' : 'badge-gold'}`}>
                  {contest.status === 'live' ? '🔴 LIVE CONTEST' : '📅 SCHEDULED'}
                </span>
                <span className="badge badge-teal">{contest.contestType?.toUpperCase() || 'PUBLIC'}</span>
                <span className="badge badge-danger">🛡️ PROCTORED EXAM</span>
              </div>
              <h1 className="lobby-title">{contest.title}</h1>
              <p className="lobby-desc">
                {contest.description || 'Welcome to the HackWithBug proctored examination arena. Complete the hardware verification on the right to enter.'}
              </p>

              <div className="lobby-stats-grid">
                <div className="lobby-stat-item">
                  <div className="lobby-stat-val">{contest.duration || 120} mins</div>
                  <div className="lobby-stat-lbl">Exam Duration</div>
                </div>
                <div className="lobby-stat-item">
                  <div className="lobby-stat-val">{contest.problems?.length || 4} Problems</div>
                  <div className="lobby-stat-lbl">Problem Bank</div>
                </div>
                <div className="lobby-stat-item">
                  <div className="lobby-stat-val">{contest.maxMarks || 100} Pts</div>
                  <div className="lobby-stat-lbl">Total Marks</div>
                </div>
                <div className="lobby-stat-item">
                  <div className="lobby-stat-val">3 Strikes</div>
                  <div className="lobby-stat-lbl">Exit Limit</div>
                </div>
              </div>

              {/* Private Contest Passcode */}
              {contest.contestType === 'private' && !contest.isRegistered && (
                <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-300 mb-2">Access Passcode Required</label>
                  <input
                    type="password"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                    placeholder="Enter contest passcode"
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Anti-Cheating & 3-Strike Rules Notice */}
            <div className="lobby-rules-box">
              <div className="lobby-rules-title">
                <AlertTriangle size={15} />
                <span>Strict Examination Guidelines</span>
              </div>
              <ul className="lobby-rules-list">
                <li>Fullscreen is mandatory during the entire exam.</li>
                <li><strong>3-Strike Rule:</strong> Switching tabs or exiting fullscreen 3 times will instantly terminate and disqualify your exam.</li>
                <li>Live camera & microphone feeds are monitored for academic integrity.</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Interactive Hardware System Check */}
          <div className="lobby-checks-card">
            <div className="checks-header">
              <Shield size={18} color="#818cf8" />
              <span>Pre-Exam System Readiness Check</span>
            </div>
            <div className="checks-sub">
              Grant camera & microphone permissions to unlock the examination arena.
            </div>

            {/* Camera Check Box */}
            <div className={`check-item-box ${camVerified ? 'verified' : ''}`}>
              <div className="check-item-head">
                <div className="check-item-title">
                  <Camera size={16} color={camVerified ? '#00b8a3' : '#a5b4fc'} />
                  <span>1. Webcam Video Check</span>
                </div>
                {camVerified ? (
                  <span className="badge badge-teal flex items-center gap-1">
                    <Check size={12} /> Verified
                  </span>
                ) : (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleTestMedia}
                    disabled={testingMedia}
                  >
                    {testingMedia ? 'Checking…' : 'Enable Camera'}
                  </button>
                )}
              </div>
              {camVerified ? (
                <div>
                  <video ref={checkVideoRef} className="camera-preview-mirror" autoPlay muted playsInline />
                  <div className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
                    <CheckCircle2 size={12} color="#00b8a3" /> Face clearly visible in frame
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-400">
                  Click Enable Camera to grant browser webcam permissions.
                </div>
              )}
            </div>

            {/* Microphone Check Box */}
            <div className={`check-item-box ${micVerified ? 'verified' : ''}`}>
              <div className="check-item-head">
                <div className="check-item-title">
                  <Mic size={16} color={micVerified ? '#00b8a3' : '#a5b4fc'} />
                  <span>2. Microphone Audio Check</span>
                </div>
                {micVerified ? (
                  <span className="badge badge-teal flex items-center gap-1">
                    <Check size={12} /> Active
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-500">Enabled with camera</span>
                )}
              </div>
              {micVerified ? (
                <div>
                  <div className="text-[11px] text-gray-400 flex items-center justify-between">
                    <span>Live Mic Input Level:</span>
                    <span className="font-mono text-indigo-300">{micVolume}%</span>
                  </div>
                  <div className="audio-meter-bar-track">
                    <div className="audio-meter-bar-fill" style={{ width: `${Math.max(8, micVolume)}%` }} />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-400">
                  Microphone will be activated along with webcam verification.
                </div>
              )}
            </div>

            {/* Fullscreen Acknowledgment */}
            <div className="check-item-box verified">
              <div className="check-item-head">
                <div className="check-item-title">
                  <Maximize size={16} color="#00b8a3" />
                  <span>3. Fullscreen Examination Lock</span>
                </div>
                <span className="badge badge-teal flex items-center gap-1">
                  <Check size={12} /> Enforced
                </span>
              </div>
              <div className="text-xs text-gray-400">
                Entering the contest will automatically activate full viewport mode.
              </div>
            </div>

            {/* Enter Contest CTA Button */}
            <div className="mt-auto pt-4">
              <button
                className="btn btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2"
                onClick={handleEnterArena}
                disabled={!camVerified || !micVerified || registering}
                style={{
                  opacity: (!camVerified || !micVerified) ? 0.6 : 1,
                  cursor: (!camVerified || !micVerified) ? 'not-allowed' : 'pointer'
                }}
              >
                {registering ? 'Registering & Initializing…' : (
                  <>
                    <Shield size={16} />
                    <span>Enter Exam & Enable Fullscreen →</span>
                  </>
                )}
              </button>
              <button
                className="text-gray-400 hover:text-white text-xs block mx-auto mt-3 underline"
                onClick={() => navigate('/dashboard')}
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
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

      {/* TOP PRACTICE-STYLE NAVBAR */}
      <nav className="lc-practice-navbar">
        {/* Left: Problem navigation controls */}
        <div className="lc-pnav-left">
          <button
            className="lc-pnav-btn"
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            title="Browse all contest problems"
          >
            <Menu size={16} />
            <span style={{ marginLeft: '4px', fontWeight: 600 }}>Problems ({contest.problemDetails?.length || 0})</span>
          </button>

          <button
            className="lc-pnav-btn"
            disabled={selectedProbIndex === 0}
            onClick={() => {
              if (selectedProbIndex > 0) setSelectedProb(contest.problemDetails[selectedProbIndex - 1]);
            }}
            title="Previous Problem"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            className="lc-pnav-btn"
            disabled={!contest.problemDetails || selectedProbIndex === contest.problemDetails.length - 1}
            onClick={() => {
              if (contest.problemDetails && selectedProbIndex < contest.problemDetails.length - 1) {
                setSelectedProb(contest.problemDetails[selectedProbIndex + 1]);
              }
            }}
            title="Next Problem"
          >
            <ChevronRight size={16} />
          </button>

          <div className="lc-pnav-divider" />

          {/* Active Problem Pill */}
          {selectedProb && (
            <div className="lc-pnav-active-pill">
              {submissions.some(s => (s.problemId === selectedProb.id || s.problemId?._id === selectedProb.id) && s.verdict === 'AC') && (
                <CheckCircle2 size={14} color="#10b981" />
              )}
              <span className="lc-pnav-active-title">{selectedProbIndex + 1}. {selectedProb.title}</span>
              <span className={`badge-diff ${selectedProb.difficulty || 'medium'}`}>
                {selectedProb.difficulty || 'medium'}
              </span>
              <span className="badge-meta">{selectedProb.points || 100} pts</span>
            </div>
          )}
        </div>

        {/* Center: Language & Run / Submit Controls */}
        <div className="lc-pnav-center">
          {/* Language Selector */}
          <select
            className="lc-plang-select"
            value={selectedLang}
            onChange={(e) => {
              const newLang = e.target.value;
              setSelectedLang(newLang);
              const probId = selectedProb?.id || selectedProb?._id;
              const draft = loadCodeDraft(user?.id, probId, newLang, id);
              if (draft && draft.code && draft.code.trim()) {
                setCode(draft.code);
              } else {
                setCode(getStarterCode(selectedProb, newLang));
              }
              toast.success(`Language: ${LANG_LABELS[newLang] || newLang}`);
            }}
          >
            {((contest.allowedLangs && contest.allowedLangs.length > 0) ? contest.allowedLangs : Object.keys(LANG_LABELS)).map((l) => (
              <option key={l} value={l}>
                {LANG_LABELS[l] || l}
              </option>
            ))}
          </select>

          {selectedProb?.source === 'leetcode' ? (
            <button className="btn-submit" onClick={handleManualSync} disabled={lcSyncing} style={{ background: '#FFA116', borderColor: '#FFA116', color: '#000', fontWeight: 700 }}>
              <RefreshCw size={13} className={lcSyncing ? 'animate-spin' : ''} /> Sync LeetCode
            </button>
          ) : (
            <>
              <button
                className="btn-run"
                onClick={handleRunCode}
                disabled={runResult === 'running'}
              >
                {runResult === 'running' ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} fill="currentColor" />}
                <span>Run</span>
              </button>
              <button
                className="btn-submit"
                onClick={handleSubmitCode}
                disabled={runResult === 'running'}
              >
                <Upload size={13} />
                <span>Submit</span>
              </button>
            </>
          )}

          <button className="lc-pnav-btn" onClick={toggleConsole} title="Toggle Console Output">
            <Terminal size={15} />
          </button>
        </div>

        {/* Right: Proctoring status, Timer & End Contest */}
        <div className="lc-pnav-right">
          {user.role === 'student' && (
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 border ${
              violationsCount === 0 ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20' :
              violationsCount === 1 ? 'bg-amber-950/50 text-amber-400 border-amber-500/30' :
              'bg-red-950/60 text-red-400 border-red-500/40 animate-pulse'
            }`} title={`Proctoring Strikes: ${violationsCount}/3 (3 strikes = auto-disqualification)`}>
              <ShieldAlert size={13} />
              <span>Strikes: {violationsCount}/3</span>
            </span>
          )}

          {camOn && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-red-950/40 text-red-400 border border-red-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Cam Active
            </span>
          )}

          <div
            className={`lc-timer-box flex items-center gap-1.5 px-2.5 py-1 rounded border ${timeLeft !== null && timeLeft < 300 ? 'bg-red-950/50 text-red-400 border-red-500/40 animate-pulse' : 'bg-white/5 text-amber-400 border-white/10'}`}
            style={{ fontSize: '12px', fontWeight: 700 }}
          >
            <Clock size={13} />
            <span>{timeLeft === null ? '--:--:--' : formatTimer(timeLeft)}</span>
          </div>

          <div className="lc-pnav-divider" />

          {/* End Contest Action Button */}
          <button
            onClick={() => setShowEndModal(true)}
            title="Conclude exam & submit all results"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#f87171',
              fontWeight: 700,
              fontSize: '12px',
              padding: '4px 12px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
          >
            <LogOut size={13} />
            <span>End Contest</span>
          </button>
        </div>
      </nav>

      {/* MAIN WORKSPACE split view */}
      <div className="lc-pworkspace">
        {/* LEFT PANEL */}
        <div
          className="lc-pleft-panel"
          style={{ width: isLeftFullscreen ? '100%' : `${splitWidth}%` }}
        >
          {/* Tabs header */}
          <div className="lc-ptabs-header">
            <button
              className={`lc-ptab-btn ${activeLeftTab === 'description' ? 'active' : ''}`}
              onClick={() => setActiveLeftTab('description')}
            >
              📋 Description
            </button>
            <button
              className={`lc-ptab-btn ${activeLeftTab === 'submissions' ? 'active' : ''}`}
              onClick={() => setActiveLeftTab('submissions')}
            >
              📊 My Submissions ({submissions.length})
            </button>
            <button
              className={`lc-ptab-btn ${activeLeftTab === 'leaderboard' ? 'active' : ''}`}
              onClick={() => setActiveLeftTab('leaderboard')}
            >
              🏆 Leaderboard
            </button>
            {announcements.length > 0 && (
              <button
                className={`lc-ptab-btn ${activeLeftTab === 'announcements' ? 'active' : ''}`}
                onClick={() => setActiveLeftTab('announcements')}
              >
                📢 Alerts ({announcements.length})
              </button>
            )}

            <div style={{ marginLeft: 'auto' }}>
              <button
                className="lc-pnav-btn"
                onClick={() => setIsLeftFullscreen(!isLeftFullscreen)}
                title={isLeftFullscreen ? 'Collapse screen' : 'Expand full screen'}
              >
                {isLeftFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            </div>
          </div>

          {/* Left panel scrollable body */}
          <div className="lc-ptabs-body">
            {activeLeftTab === 'description' && selectedProb && (
              <div>
                <div style={{ marginBottom: '14px' }}>
                  <h1 className="lc-pdesc-title">{selectedProbIndex + 1}. {selectedProb.title}</h1>
                  <div className="lc-pdesc-badges">
                    <span className={`badge-diff ${selectedProb.difficulty || 'medium'}`}>
                      {selectedProb.difficulty || 'medium'}
                    </span>
                    <span className="badge-meta">Points: {selectedProb.points || 100}</span>
                    <span className="badge-meta">Time Limit: {selectedProb.timeLimit || 2}s</span>
                    {submissions.some(s => (s.problemId === selectedProb.id || s.problemId?._id === selectedProb.id) && s.verdict === 'AC') && (
                      <span className="badge-meta" style={{ color: '#10b981', fontWeight: 700 }}>Solved ✓</span>
                    )}
                  </div>
                </div>

                {/* Problem Statement */}
                <div className="lc-psection">
                  <h3 className="lc-psection-title">Problem Statement</h3>
                  <div className="lc-pstatement-text" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#cbd5e1' }}>
                    {(selectedProb.statement || selectedProb.description || 'No description provided.').replace(/\\n/g, '\n')}
                  </div>
                </div>

                {/* Input Format */}
                {selectedProb.inputFormat && (
                  <div className="lc-psection">
                    <h3 className="lc-psection-title">Input Format</h3>
                    <div className="lc-pformat-box" style={{ whiteSpace: 'pre-wrap' }}>
                      {selectedProb.inputFormat.replace(/\\n/g, '\n')}
                    </div>
                  </div>
                )}

                {/* Output Format */}
                {selectedProb.outputFormat && (
                  <div className="lc-psection">
                    <h3 className="lc-psection-title">Output Format</h3>
                    <div className="lc-pformat-box" style={{ whiteSpace: 'pre-wrap' }}>
                      {selectedProb.outputFormat.replace(/\\n/g, '\n')}
                    </div>
                  </div>
                )}

                {/* Constraints */}
                {selectedProb.constraints && (
                  <div className="lc-psection">
                    <h3 className="lc-psection-title">Constraints</h3>
                    <div className="lc-pconstraints-box">
                      {selectedProb.constraints.replace(/\\n/g, '\n').split('\n').map((c, i) => (
                        <div key={i} className="lc-pconstraint-item">
                          <code>{c}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sample Testcases */}
                {((selectedProb.testCases && selectedProb.testCases.filter(t => t.type === 'sample').length > 0)
                  ? selectedProb.testCases.filter(t => t.type === 'sample')
                  : (selectedProb.sampleInput ? [{ input: selectedProb.sampleInput, output: selectedProb.sampleOutput || '' }] : [])
                ).map((tc, i) => (
                  <div key={i} className="lc-pexample-card">
                    <div className="lc-pexample-head">
                      <span>Sample Example {i + 1}</span>
                    </div>
                    <div className="lc-pexample-block">
                      <div className="lc-pexample-label">Input:</div>
                      <pre className="lc-pexample-code">{tc.input !== undefined ? tc.input.replace(/\\n/g, '\n') : '(empty)'}</pre>
                    </div>
                    <div className="lc-pexample-block">
                      <div className="lc-pexample-label">Output:</div>
                      <pre className="lc-pexample-code">{tc.output !== undefined ? tc.output.replace(/\\n/g, '\n') : '(empty)'}</pre>
                    </div>
                    {selectedProb.explanation && i === 0 && (
                      <div className="lc-pexample-explanation">
                        <strong>Explanation:</strong> {selectedProb.explanation}
                      </div>
                    )}
                  </div>
                ))}
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
                  <div style={{ width: '60px', textAlign: 'center' }}>Solved</div>
                  <div style={{ width: '80px', textAlign: 'right' }}>Score</div>
                </div>
                {leaderboard.map((item, idx) => (
                  <div key={item.userId || idx} className={`lc-board-row ${item.enrollment === user.enrollment ? 'me' : ''}`} style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: '0.5px solid var(--border)' }}>
                    <div style={{ width: '40px', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '12px' }}>#{idx + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div className="font-semibold text-white text-xs">{item.name}</div>
                      <div className="text-[9px] text-gray-400">{item.department || 'CE'} · {item.enrollment}</div>
                    </div>
                    <div style={{ width: '60px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', color: '#10b981' }}>{item.solved ?? 0}</div>
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
                  <span className="lc-autosave-indicator" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-3)' }}>
                    <Lock size={11} /> {LANG_LABELS[selectedLang] || selectedLang} · Auto-saved
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
                      <div className="lc-result-box" style={{ overflowY: 'auto', maxHeight: '240px' }}>
                        <div className="lc-result-status-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className={`lc-result-status-badge ${runResult.status.toLowerCase()}`}>
                              {runResult.status}
                            </span>
                            {runResult.testsPassed !== undefined && (
                              <span style={{ fontSize: '11px', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
                                {runResult.testsPassed} / {runResult.totalTests} Passed
                              </span>
                            )}
                          </div>
                          <span className="lc-result-runtime" style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {runResult.timeMs !== undefined ? `⏱️ ${runResult.timeMs}ms` : 'Verdict returned by judge'}
                          </span>
                        </div>

                        {/* Stderr or compiler logs */}
                        {runResult.stderr && (
                          <div style={{ marginTop: '8px', marginBottom: '8px', padding: '8px 10px', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '6px' }}>
                            <div style={{ fontWeight: 700, fontSize: '11px', color: '#f43f5e', marginBottom: '4px' }}>Compiler & Diagnostics Log:</div>
                            <pre style={{ margin: 0, fontSize: '11px', color: '#fda4af', whiteSpace: 'pre-wrap', maxHeight: '120px', overflowY: 'auto' }}>{runResult.stderr}</pre>
                          </div>
                        )}

                        {runResult.testResults && runResult.testResults.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                            {runResult.testResults.map((tr, idx) => (
                              <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.6)', border: `1px solid ${tr.passed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.4)'}`, borderRadius: '6px', padding: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: tr.passed ? '#10b981' : '#ef4444' }}>
                                    Test Case #{idx + 1} ({tr.type}) — {tr.passed ? 'PASSED ✓' : 'FAILED ✗'}
                                  </span>
                                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>{tr.timeMs}ms</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                                  <div>
                                    <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>📥 Input:</div>
                                    <pre style={{ margin: 0, padding: '4px 6px', background: '#020617', border: '1px solid rgba(129, 140, 248, 0.2)', borderRadius: '4px', fontSize: '11px', color: '#e2e8f0', whiteSpace: 'pre-wrap', maxHeight: '60px', overflowY: 'auto' }}>
                                      {tr.input || '(empty)'}
                                    </pre>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>✅ Expected Output:</div>
                                    <pre style={{ margin: 0, padding: '4px 6px', background: '#020617', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '4px', fontSize: '11px', color: '#e2e8f0', whiteSpace: 'pre-wrap', maxHeight: '60px', overflowY: 'auto' }}>
                                      {tr.expectedOutput || '(empty)'}
                                    </pre>
                                  </div>
                                  <div>
                                    <div className="text-xs font-semibold text-slate-400 mb-1">Actual Output:</div>
                                    <pre className="p-2 rounded bg-slate-900/80 border border-slate-700/60 font-mono text-xs text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
                                      {tr.actualOutput || (tr.stderr ? `[Runtime Error]\n${tr.stderr}` : '(empty)')}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : runResult.outputs && runResult.outputs[0] ? (
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
                        ) : null}
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

      {/* 🚪 End Contest Confirmation Modal */}
      {showEndModal && (
        <div className="proctor-violation-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="proctor-violation-card" style={{ maxWidth: '420px' }}>
            <LogOut size={44} className="mx-auto mb-3" style={{ color: '#f87171' }} />
            <h2 className="text-xl font-bold text-white mb-2">End Contest?</h2>
            <p className="text-xs text-gray-400 mb-5 leading-relaxed">
              Are you sure you want to end this contest early? Your current submissions are already saved.
              You will <strong style={{ color: '#f87171' }}>not</strong> be able to re-enter once you leave.
            </p>

            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '12px 14px', marginBottom: '20px', textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '11px', color: '#f87171', marginBottom: '6px' }}>Before you leave:</div>
              <ul style={{ fontSize: '11px', color: '#94a3b8', margin: 0, paddingLeft: '16px', lineHeight: '1.7' }}>
                <li>All submitted code is already saved to the database.</li>
                <li>Camera and proctoring session will be terminated.</li>
                <li>Your score will be calculated from existing submissions.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, padding: '10px', fontWeight: 700, background: 'rgba(239,68,68,0.85)', borderColor: 'rgba(239,68,68,0.6)' }}
                onClick={handleEndContest}
                disabled={endingContest}
              >
                {endingContest ? 'Ending...' : '✓ Yes, End Contest'}
              </button>
              <button
                className="btn"
                style={{ flex: 1, padding: '10px', fontWeight: 700, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0' }}
                onClick={() => setShowEndModal(false)}
                disabled={endingContest}
              >
                ✕ Stay in Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ Strike Warning Modal (Strikes 1 & 2) */}
      {showViolationModal && !isDisqualified && (
        <div className="proctor-violation-modal-overlay">
          <div className="proctor-violation-card">
            <AlertTriangle size={48} className="mx-auto text-amber-400 mb-3 animate-bounce" />
            <h2 className="text-xl font-bold text-white mb-1">⚠️ Examination Violation Detected</h2>
            <p className="text-xs text-amber-300 font-semibold mb-3">
              {violationReason || 'You left the contest window or exited fullscreen mode.'}
            </p>
            
            <div className="strike-pills-row">
              <div className={`strike-pill ${violationsCount >= 1 ? 'active' : ''}`}>1</div>
              <div className={`strike-pill ${violationsCount >= 2 ? 'active' : ''}`}>2</div>
              <div className={`strike-pill ${violationsCount >= 3 ? 'final' : ''}`}>3</div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-5 text-left text-xs text-gray-300">
              <div className="font-bold text-red-400 mb-1">
                {violationsCount === 1 ? '⚠️ Warning: 2 strikes remaining' : '🚨 FINAL WARNING: 1 strike remaining'}
              </div>
              <div>
                {violationsCount === 1 
                  ? 'Please remain inside the contest viewport. Exiting fullscreen or switching tabs 2 more times will automatically terminate your exam.'
                  : 'CRITICAL: Any further window blur, tab switch, or fullscreen exit will instantly disqualify and submit your exam.'}
              </div>
            </div>

            <button
              className="btn btn-primary w-full py-2.5 font-bold flex items-center justify-center gap-2"
              onClick={async () => {
                setShowViolationModal(false);
                try {
                  if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                  }
                } catch (e) {}
              }}
            >
              <Maximize size={15} />
              <span>Re-enter Fullscreen & Continue</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

