import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';

import {
  Menu,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  RotateCw,
  Copy,
  Maximize2,
  Minimize2,
  Terminal,
  Play,
  Upload,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Layers,
  HelpCircle,
  BookOpen,
  History,
  RefreshCw,
  Send,
  Zap,
  ArrowLeft
} from 'lucide-react';
import './Practice.css';

import { saveCodeDraft, loadCodeDraft, formatTimeAgo } from '../utils/codeStorage';

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
  'cpp17': `#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    // Write your solution here\n    \n    return 0;\n}`,
  'java17': `import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here\n        \n    }\n}`,
  'python3': `import sys\n\ndef solve():\n    input = sys.stdin.read\n    # Write your solution here\n    pass\n\nif __name__ == '__main__':\n    solve()`,
  'c': `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nint main() {\n    // Write your solution here\n    \n    return 0;\n}`,
  'javascript': `const fs = require('fs');\n\nfunction solve() {\n    const input = fs.readFileSync('/dev/stdin', 'utf-8');\n    // Write your solution here\n}\n\nsolve();`
};

const VERDICT_STYLES = {
  'AC': { label: 'Accepted', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', icon: CheckCircle2 },
  'WA': { label: 'Wrong Answer', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', icon: XCircle },
  'TLE': { label: 'Time Limit Exceeded', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', icon: Clock },
  'CE': { label: 'Compilation Error', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.1)', icon: AlertTriangle },
  'RE': { label: 'Runtime Error', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)', icon: Zap }
};

export default function Practice() {
  const { user } = useAuth();
  const { id, problemId: routeParamId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const activeIdFromUrl = id || routeParamId || searchParams.get('problem');

  // Data states
  const [problems, setProblems] = useState([]);
  const [filteredProblems, setFilteredProblems] = useState([]);
  const [selectedProb, setSelectedProb] = useState(null);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Drawer & Filter states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState('');
  const [drawerDiff, setDrawerDiff] = useState('All');

  // Layout states
  const [splitWidth, setSplitWidth] = useState(44);
  const [isDragging, setIsDragging] = useState(false);
  const [isLeftFullscreen, setIsLeftFullscreen] = useState(false);

  // Left Panel tabs: 'description' | 'editorial' | 'submissions' | 'ai'
  const [activeLeftTab, setActiveLeftTab] = useState('description');

  // Editor states
  const [selectedLang, setSelectedLang] = useState('cpp17');
  const [code, setCode] = useState('');
  const [fontSize, setFontSize] = useState(14);
  const [cursorPos, setCursorPos] = useState({ line: 1, ch: 1 });
  const [saveStatus, setSaveStatus] = useState('Saved');
  const [draftTimestamp, setDraftTimestamp] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const editorRef = useRef(null);

  // Console Panel states
  const [consoleHeight, setConsoleHeight] = useState(42); // 42 = collapsed pill, >100 = open
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [activeConsoleTab, setActiveConsoleTab] = useState('testcase'); // 'testcase' | 'result'
  const [activeCaseIdx, setActiveCaseIdx] = useState(0);
  const [customInput, setCustomInput] = useState('');
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [confetti, setConfetti] = useState([]);

  // AI Assistant states
  const [aiChatMsgs, setAiChatMsgs] = useState([
    { role: 'assistant', text: 'Hello! I am your AI coding mentor. Ask me for hints, concept explanations, or time complexity advice.' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiThinking, setAiThinking] = useState(false);

  // Submissions modal / preview
  const [selectedSubForView, setSelectedSubForView] = useState(null);


  // Helper to load code for a problem (checks 7-day draft, then AC submission, then starter)
  const loadProblemCode = useCallback((prob, lang, subsList = mySubmissions) => {
    if (!prob) return;
    const probId = prob.id || prob._id;
    // 1. Check local draft (valid for 7 days)
    const draft = loadCodeDraft(user?.id, probId, lang);
    if (draft && draft.code && draft.code.trim()) {
      setCode(draft.code);
      setDraftTimestamp(draft.updatedAt);
      setSaveStatus(`Draft Restored (${formatTimeAgo(draft.updatedAt)})`);
      return;
    }
    // 2. Check if user had a previous submission
    const pastSub = subsList.find(s =>
      (s.problemId === probId || s.problemId?._id === probId || s.problemId?.id === probId) &&
      s.language === lang
    );
    if (pastSub && pastSub.code) {
      setCode(pastSub.code);
      setDraftTimestamp(new Date(pastSub.timestamp).getTime());
      setSaveStatus(`Loaded Past Sub (${pastSub.verdict})`);
      return;
    }
    // 3. Fallback to starter template
    setCode(STARTER_CODES[lang] || '');
    setDraftTimestamp(null);
    setSaveStatus('Saved');
  }, [user?.id, mySubmissions]);

  // Load problem sets and submissions
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/problems'),
      user?.id ? api.get(`/submissions?userId=${user.id}`) : Promise.resolve({ data: [] })
    ]).then(([pRes, sRes]) => {
      const allProbs = pRes.data || [];
      const subs = sRes.data || [];
      setProblems(allProbs);
      setFilteredProblems(allProbs);
      setMySubmissions(subs);

      // Select target problem
      if (allProbs.length > 0) {
        let initial = null;
        if (activeIdFromUrl) {
          initial = allProbs.find(p => p.id === activeIdFromUrl || p._id === activeIdFromUrl);
        }
        if (!initial) {
          initial = allProbs[0];
        }
        setSelectedProb(initial);
        loadProblemCode(initial, selectedLang, subs);
      }
    }).catch(err => {
      console.error('Error fetching problems:', err);
      toast.error('Failed to load problems bank');
    }).finally(() => setLoading(false));
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // When activeIdFromUrl changes from outside (e.g. navigation link)
  useEffect(() => {
    if (activeIdFromUrl && problems.length > 0) {
      const found = problems.find(p => p.id === activeIdFromUrl || p._id === activeIdFromUrl);
      if (found && (!selectedProb || (selectedProb.id !== found.id && selectedProb._id !== found._id))) {
        setSelectedProb(found);
        loadProblemCode(found, selectedLang);
        setRunResult(null);
      }
    }
  }, [activeIdFromUrl, problems, selectedLang, selectedProb, loadProblemCode]);



  // Filter drawer list
  useEffect(() => {
    let list = [...problems];
    if (drawerDiff !== 'All') {
      list = list.filter(p => p.difficulty === drawerDiff.toLowerCase());
    }
    if (drawerSearch.trim()) {
      const q = drawerSearch.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || (p.tags || []).some(t => t.toLowerCase().includes(q)));
    }
    setFilteredProblems(list);
  }, [drawerDiff, drawerSearch, problems]);


  // Handle problem selection
  const handleSelectProblem = (p) => {
    setSelectedProb(p);
    setCode(STARTER_CODES[selectedLang] || '');
    setRunResult(null);
    setIsDrawerOpen(false);
    navigate(`/problem/${p.id || p._id}`, { replace: true });
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
      if (percentage >= 25 && percentage <= 75) {
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

  // Editor Mount
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monaco.editor.defineTheme('hwb-dark-obsidian', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'bb9af7', fontStyle: 'bold' },
        { token: 'type', foreground: '7dd3fc' },
        { token: 'string', foreground: 'ff9e64' },
        { token: 'number', foreground: 'ff9e64' },
        { token: 'identifier', foreground: 'e0af68' },
      ],
      colors: {
        'editor.background': '#0f172a',
        'editor.foreground': '#e2e8f0',
        'editor.lineHighlightBackground': '#1e293b55',
        'editorLineNumber.foreground': '#475569',
        'editorLineNumber.activeForeground': '#818cf8',
        'editorCursor.foreground': '#38bdf8'
      }
    });
    monaco.editor.setTheme('hwb-dark-obsidian');

    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({ line: e.position.lineNumber, ch: e.position.column });
    });
  };

  // Reset code to starter template
  const handleResetCode = () => {
    if (window.confirm('Reset code to starter template? Your current edits will be overwritten.')) {
      setCode(STARTER_CODES[selectedLang] || '');
      toast.success('Code reset to default template');
    }
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard!');
  };

  // Trigger Confetti Celebration
  const triggerConfetti = () => {
    const particles = [];
    for (let i = 0; i < 120; i++) {
      particles.push({
        id: i,
        left: `${Math.random() * 100}%`,
        color: ['#00b8a3', '#6366f1', '#f59e0b', '#38bdf8', '#ef4444', '#ec4899'][Math.floor(Math.random() * 6)],
        drift: Math.random(),
        delay: `${Math.random() * 2}s`,
        size: `${Math.random() * 8 + 6}px`
      });
    }
    setConfetti(particles);
    setTimeout(() => setConfetti([]), 3600);
  };

  // ⚡ RUN CODE (Deterministic evaluation on sample / custom inputs)
  const handleRunCode = async () => {
    if (!selectedProb || !code.trim()) {
      return toast.error('Please write some code before running');
    }
    setRunning(true);
    setIsConsoleOpen(true);
    setConsoleHeight(300);
    setActiveConsoleTab('result');
    setRunResult({ status: 'running' });

    try {
      const payload = {
        code,
        language: selectedLang,
        problemId: selectedProb.id || selectedProb._id,
        customInput: activeCaseIdx === -1 ? customInput : undefined
      };

      const res = await api.post('/submissions/run', payload);
      setRunResult({
        status: res.data.verdict,
        ...res.data
      });

      if (res.data.verdict === 'AC') {
        toast.success('Sample testcase passed! ✓');
      } else if (res.data.verdict === 'CE') {
        toast.error('Compilation Error. Check stderr log.');
      } else {
        toast.error(`Test run returned ${res.data.verdict}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Execution failed');
      setRunResult({ status: 'CE', stderr: 'Execution server connection failed' });
    } finally {
      setRunning(false);
    }
  };

  // 🚀 SUBMIT CODE (Grades against all testcases + updates score/stats)
  const handleSubmitCode = async () => {
    if (!selectedProb || !code.trim()) {
      return toast.error('Cannot submit empty code');
    }
    setSubmitting(true);
    setIsConsoleOpen(true);
    setConsoleHeight(300);
    setActiveConsoleTab('result');
    setRunResult({ status: 'running' });
    toast.loading('Judging submission against all testcases…', { id: 'submit-judge' });

    try {
      const res = await api.post('/submissions', {
        code,
        language: selectedLang,
        problemId: selectedProb.id || selectedProb._id
      });

      const sub = res.data;
      setRunResult({
        status: sub.verdict,
        timeMs: sub.time,
        memoryKb: sub.memory * 1024,
        testsPassed: sub.testsPassed,
        totalTests: sub.totalTests,
        stderr: sub.aiFeedback,
        testResults: sub.testResults || []
      });

      toast.dismiss('submit-judge');

      // Refresh submissions
      if (user?.id) {
        api.get(`/submissions?userId=${user.id}`).then(r => setMySubmissions(r.data || [])).catch(() => {});
      }

      if (sub.verdict === 'AC') {
        toast.success('🎉 Correct Solution! Accepted (AC)');
        triggerConfetti();
      } else if (sub.verdict === 'WA') {
        toast.error('❌ Wrong Answer (WA)');
      } else if (sub.verdict === 'TLE') {
        toast.error('⏱️ Time Limit Exceeded (TLE)');
      } else if (sub.verdict === 'CE') {
        toast.error('⚠️ Compilation Error (CE)');
      } else {
        toast.error(`Verdict: ${sub.verdict}`);
      }
    } catch (err) {
      toast.dismiss('submit-judge');
      toast.error(err.response?.data?.error || 'Submission failed');
      setRunResult({ status: 'CE', stderr: 'Submission service rejected' });
    } finally {
      setSubmitting(false);
    }
  };

  // AI Chat message sender
  const handleSendAiMsg = async () => {
    if (!aiInput.trim() || aiThinking) return;
    const userMsg = { role: 'user', text: aiInput.trim() };
    setAiChatMsgs(prev => [...prev, userMsg]);
    setAiInput('');
    setAiThinking(true);

    try {
      const r = await api.post('/ai/chat', {
        problemId: selectedProb?.id || selectedProb?._id,
        messages: [{ role: 'user', content: userMsg.text }]
      });
      setAiChatMsgs(prev => [...prev, { role: 'assistant', text: r.data.message || 'No response' }]);
    } catch (e) {
      setAiChatMsgs(prev => [...prev, { role: 'assistant', text: 'AI assistant unavailable right now. Try reviewing constraints and bounds.' }]);
    } finally {
      setAiThinking(false);
    }
  };

  if (loading) {
    return (
      <div className="lc-practice-loading">
        <div className="spinner" />
        <span style={{ color: 'var(--text-2)', fontSize: '13px', marginTop: '12px' }}>
          Loading Coding Workspace…
        </span>
      </div>
    );
  }

  // Get problem index and navigation helpers
  const currentIdx = problems.findIndex(p => p.id === selectedProb?.id || p._id === selectedProb?.id);
  const prevProb = currentIdx > 0 ? problems[currentIdx - 1] : null;
  const nextProb = currentIdx < problems.length - 1 ? problems[currentIdx + 1] : null;

  // Check solved status
  const isProblemSolved = mySubmissions.some(s => 
    (s.problemId === selectedProb?.id || s.problemId?._id === selectedProb?.id || s.problemId?.id === selectedProb?.id) && 
    s.verdict === 'AC'
  );

  const problemSubmissions = mySubmissions.filter(s =>
    s.problemId === selectedProb?.id || s.problemId?._id === selectedProb?.id || s.problemId?.id === selectedProb?.id
  );

  // Extract sample testcases for testcase tab
  const sampleCases = selectedProb?.testCases?.filter(t => t.type === 'sample') || [];
  if (sampleCases.length === 0 && selectedProb?.sampleInput) {
    sampleCases.push({ input: selectedProb.sampleInput, output: selectedProb.sampleOutput || '' });
  }

  return (
    <div className="lc-practice-container">
      {/* Confetti overlay */}
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
      <div className={`lc-pdrawer ${isDrawerOpen ? 'open' : ''}`}>
        <div className="lc-pdrawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="#818cf8" />
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>Problem Directory</span>
          </div>
          <button className="lc-pnav-btn" onClick={() => setIsDrawerOpen(false)}>✕</button>
        </div>

        {/* Search & Filter Bar */}
        <div className="lc-pdrawer-filters">
          <input
            type="text"
            className="lc-pdrawer-search"
            placeholder="Search problems or tags…"
            value={drawerSearch}
            onChange={e => setDrawerSearch(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            {['All', 'Easy', 'Medium', 'Hard'].map(d => (
              <button
                key={d}
                className={`lc-pfilter-pill ${drawerDiff === d ? 'active' : ''}`}
                onClick={() => setDrawerDiff(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Problem List */}
        <div className="lc-pdrawer-list">
          {filteredProblems.map((p, i) => {
            const isSolved = mySubmissions.some(s => (s.problemId === p.id || s.problemId?._id === p.id) && s.verdict === 'AC');
            const isActive = selectedProb?.id === p.id || selectedProb?._id === p.id;
            return (
              <div
                key={p.id || p._id || i}
                className={`lc-pdrawer-item ${isActive ? 'active' : ''}`}
                onClick={() => handleSelectProblem(p)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '12px', color: isSolved ? '#10b981' : 'var(--text-3)' }}>
                    {isSolved ? '✓' : '•'}
                  </span>
                  <span className="lc-pdrawer-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.title}
                  </span>
                </div>
                <span className={`badge-diff ${p.difficulty}`}>{p.difficulty}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* TOP WORKSPACE NAVIGATION BAR */}
      <nav className="lc-practice-navbar">
        {/* Left: Problem navigation controls */}
        <div className="lc-pnav-left">
          <button
            className="lc-pnav-btn"
            onClick={() => navigate('/problems')}
            title="Return to Problem Bank"
          >
            <ArrowLeft size={15} />
            <span style={{ marginLeft: '4px' }}>Bank</span>
          </button>

          <div className="lc-pnav-divider" />

          <button
            className="lc-pnav-btn"
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            title="Browse all problems"
          >
            <Menu size={16} />
            <span style={{ marginLeft: '4px', fontWeight: 600 }}>Problems</span>
          </button>

          <button
            className="lc-pnav-btn"
            disabled={!prevProb}
            onClick={() => prevProb && handleSelectProblem(prevProb)}
            title="Previous Problem"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            className="lc-pnav-btn"
            disabled={!nextProb}
            onClick={() => nextProb && handleSelectProblem(nextProb)}
            title="Next Problem"
          >
            <ChevronRight size={16} />
          </button>

          <button
            className="lc-pnav-btn"
            onClick={() => {
              if (problems.length > 0) {
                const rand = problems[Math.floor(Math.random() * problems.length)];
                handleSelectProblem(rand);
                toast.success(`Shuffled to: ${rand.title}`);
              }
            }}
            title="Pick Random Problem"
          >
            <Shuffle size={14} />
          </button>

          <div className="lc-pnav-divider" />

          {/* Active Problem Pill */}
          <div className="lc-pnav-active-pill">
            {isProblemSolved && <CheckCircle2 size={14} color="#10b981" />}
            <span className="lc-pnav-active-title">{selectedProb?.title || 'Problem'}</span>
            <span className={`badge-diff ${selectedProb?.difficulty || 'medium'}`}>
              {selectedProb?.difficulty || 'medium'}
            </span>
          </div>
        </div>

        {/* Center: Language & Run / Submit Controls */}
        <div className="lc-pnav-center">
          {/* Language Selector */}
          <select
            className="lc-plang-select"
            value={selectedLang}
            onChange={e => {
              const newLang = e.target.value;
              setSelectedLang(newLang);
              setCode(STARTER_CODES[newLang] || '');
            }}
          >
            {Object.entries(LANG_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          {/* Run Button */}
          <button
            className="btn-run"
            onClick={handleRunCode}
            disabled={running || submitting}
          >
            {running ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} fill="currentColor" />}
            <span>Run</span>
          </button>

          {/* Submit Button */}
          <button
            className="btn-submit"
            onClick={handleSubmitCode}
            disabled={running || submitting}
          >
            {submitting ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
            <span>Submit</span>
          </button>
        </div>

        {/* Right: Tools & Settings */}
        <div className="lc-pnav-right">
          {/* Code History Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              className={`lc-pnav-btn ${isHistoryModalOpen ? 'active' : ''}`}
              onClick={() => setIsHistoryModalOpen(!isHistoryModalOpen)}
              title="Code History & 7-Day Auto-Saved Drafts"
            >
              <History size={14} />
              <span style={{ marginLeft: '4px', fontSize: '11px', fontWeight: 600 }}>History</span>
            </button>

            {isHistoryModalOpen && (
              <div className="lc-phistory-dropdown">
                <div className="lc-phistory-title">
                  <span>Code Versions (7-Day Cache)</span>
                  <button className="lc-pnav-btn" onClick={() => setIsHistoryModalOpen(false)} style={{ padding: '2px 5px' }}>✕</button>
                </div>
                
                {/* Option 1: Saved Draft */}
                {draftTimestamp && (
                  <div className="lc-phistory-item" onClick={() => {
                    const probId = selectedProb?.id || selectedProb?._id;
                    const saved = loadCodeDraft(user?.id, probId, selectedLang);
                    if (saved && saved.code) {
                      setCode(saved.code);
                      toast.success(`Restored draft from ${formatTimeAgo(saved.updatedAt)}`);
                    }
                    setIsHistoryModalOpen(false);
                  }}>
                    <div className="lc-phistory-item-head">
                      <span style={{ fontWeight: 700, color: '#818cf8' }}>💾 Auto-Saved Draft</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{formatTimeAgo(draftTimestamp)}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '2px' }}>
                      Auto-saved working draft in {LANG_LABELS[selectedLang]}
                    </div>
                  </div>
                )}

                {/* Option 2: Last AC Submission */}
                {(() => {
                  const probId = selectedProb?.id || selectedProb?._id;
                  const acSub = mySubmissions.find(s => 
                    (s.problemId === probId || s.problemId?._id === probId || s.problemId?.id === probId) &&
                    s.verdict === 'AC'
                  );
                  if (!acSub) return null;
                  return (
                    <div className="lc-phistory-item" onClick={() => {
                      if (acSub.code) {
                        setCode(acSub.code);
                        if (acSub.language && acSub.language !== selectedLang) setSelectedLang(acSub.language);
                        toast.success('Loaded last Accepted (AC) solution!');
                      }
                      setIsHistoryModalOpen(false);
                    }}>
                      <div className="lc-phistory-item-head">
                        <span style={{ fontWeight: 700, color: '#10b981' }}>🏆 Last Accepted Solution</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{new Date(acSub.timestamp).toLocaleDateString()}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '2px' }}>
                        {acSub.language} · {acSub.time}ms
                      </div>
                    </div>
                  );
                })()}

                {/* Option 3: Latest Submission */}
                {(() => {
                  const probId = selectedProb?.id || selectedProb?._id;
                  const latestSub = mySubmissions.find(s => 
                    s.problemId === probId || s.problemId?._id === probId || s.problemId?.id === probId
                  );
                  if (!latestSub) return null;
                  return (
                    <div className="lc-phistory-item" onClick={() => {
                      if (latestSub.code) {
                        setCode(latestSub.code);
                        if (latestSub.language && latestSub.language !== selectedLang) setSelectedLang(latestSub.language);
                        toast.success(`Loaded latest submission (${latestSub.verdict})`);
                      }
                      setIsHistoryModalOpen(false);
                    }}>
                      <div className="lc-phistory-item-head">
                        <span style={{ fontWeight: 700, color: '#38bdf8' }}>⚡ Latest Submission</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{formatTimeAgo(new Date(latestSub.timestamp).getTime())}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '2px' }}>
                        Verdict: {latestSub.verdict} ({latestSub.language})
                      </div>
                    </div>
                  );
                })()}

                {/* Option 4: Starter Code */}
                <div className="lc-phistory-item" onClick={() => {
                  handleResetCode();
                  setIsHistoryModalOpen(false);
                }}>
                  <div className="lc-phistory-item-head">
                    <span style={{ fontWeight: 700, color: '#f59e0b' }}>🔄 Reset Starter Code</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '2px' }}>
                    Reset editor to original empty boilerplate template
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lc-pnav-divider" />

          <button className="lc-pnav-btn" onClick={handleResetCode} title="Reset starter code">
            <RotateCw size={14} />
          </button>
          <button className="lc-pnav-btn" onClick={handleCopyCode} title="Copy code">
            <Copy size={14} />
          </button>

          <div className="lc-pnav-divider" />

          <button
            className="lc-pnav-btn"
            onClick={() => setFontSize(f => f === 16 ? 12 : f + 2)}
            title={`Font size: ${fontSize}px`}
          >
            <span style={{ fontSize: '11px', fontWeight: 700 }}>A±</span>
          </button>

          <button
            className="lc-pnav-btn"
            onClick={() => setIsLeftFullscreen(!isLeftFullscreen)}
            title="Toggle Split View / Editor Fullscreen"
          >
            {isLeftFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>

      </nav>

      {/* MAIN TWO-PANE WORKSPACE */}
      <div className="lc-pworkspace">
        {/* LEFT PANEL: Problem Description, Editorial, Submissions, AI */}
        {!isLeftFullscreen && (
          <div className="lc-pleft-panel" style={{ width: `${splitWidth}%` }}>
            {/* Tab Header */}
            <div className="lc-ptabs-header">
              <button
                className={`lc-ptab-btn ${activeLeftTab === 'description' ? 'active' : ''}`}
                onClick={() => setActiveLeftTab('description')}
              >
                <BookOpen size={14} />
                <span>Description</span>
              </button>
              <button
                className={`lc-ptab-btn ${activeLeftTab === 'editorial' ? 'active' : ''}`}
                onClick={() => setActiveLeftTab('editorial')}
              >
                <HelpCircle size={14} />
                <span>Editorial & Hints</span>
              </button>
              <button
                className={`lc-ptab-btn ${activeLeftTab === 'submissions' ? 'active' : ''}`}
                onClick={() => setActiveLeftTab('submissions')}
              >
                <History size={14} />
                <span>Submissions ({problemSubmissions.length})</span>
              </button>
              <button
                className={`lc-ptab-btn ${activeLeftTab === 'ai' ? 'active' : ''}`}
                onClick={() => setActiveLeftTab('ai')}
              >
                <Sparkles size={14} color="#818cf8" />
                <span>AI Mentor</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="lc-ptabs-body">
              {/* TAB 1: DESCRIPTION */}
              {activeLeftTab === 'description' && (
                <div className="lc-pdesc-container">
                  {/* Title & Metadata */}
                  <div className="lc-pdesc-header">
                    <h1 className="lc-pdesc-title">{selectedProb?.title}</h1>
                    <div className="lc-pdesc-badges">
                      <span className={`badge-diff ${selectedProb?.difficulty || 'medium'}`}>
                        {selectedProb?.difficulty}
                      </span>
                      <span className="badge-meta">{selectedProb?.points || 100} Points</span>
                      <span className="badge-meta">Time: {selectedProb?.timeLimit || 1.0}s</span>
                      <span className="badge-meta">Memory: {selectedProb?.memoryLimit || 256}MB</span>
                    </div>

                    {/* Tags */}
                    {selectedProb?.tags && selectedProb.tags.length > 0 && (
                      <div className="lc-ptags-row">
                        {selectedProb.tags.map(t => (
                          <span key={t} className="lc-ptag">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* LeetCode sync banner if applicable */}
                  {selectedProb?.source === 'leetcode' && (
                    <div className="lc-sync-banner">
                      <span style={{ fontSize: '15px' }}>🟠</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffa116' }}>LeetCode Problem</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                          Solve directly here or solve on LeetCode. Solves auto-sync to HackWithBug.
                        </div>
                      </div>
                      {selectedProb?.leetcodeUrl && (
                        <a
                          href={selectedProb.leetcodeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="lc-pview-link"
                        >
                          LeetCode ↗
                        </a>
                      )}
                    </div>
                  )}

                  {/* Problem Statement */}
                  <div className="lc-psection">
                    <h3 className="lc-psection-title">Problem Statement</h3>
                    <div className="lc-pstatement-text">
                      {selectedProb?.statement || 'No statement provided.'}
                    </div>
                  </div>

                  {/* Input / Output Format */}
                  {selectedProb?.inputFormat && (
                    <div className="lc-psection">
                      <h3 className="lc-psection-title">Input Format</h3>
                      <div className="lc-pformat-box">{selectedProb.inputFormat}</div>
                    </div>
                  )}

                  {selectedProb?.outputFormat && (
                    <div className="lc-psection">
                      <h3 className="lc-psection-title">Output Format</h3>
                      <div className="lc-pformat-box">{selectedProb.outputFormat}</div>
                    </div>
                  )}

                  {/* Constraints */}
                  {selectedProb?.constraints && (
                    <div className="lc-psection">
                      <h3 className="lc-psection-title">Constraints</h3>
                      <div className="lc-pconstraints-box">
                        {selectedProb.constraints.split('\n').map((c, i) => (
                          <div key={i} className="lc-pconstraint-item">
                            <code>{c}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sample Testcases */}
                  {sampleCases.map((tc, i) => (
                    <div key={i} className="lc-pexample-card">
                      <div className="lc-pexample-head">
                        <span>Example {i + 1}</span>
                      </div>
                      <div className="lc-pexample-block">
                        <div className="lc-pexample-label">Input:</div>
                        <pre className="lc-pexample-code">{tc.input || '(empty)'}</pre>
                      </div>
                      <div className="lc-pexample-block">
                        <div className="lc-pexample-label">Output:</div>
                        <pre className="lc-pexample-code">{tc.output || '(empty)'}</pre>
                      </div>
                      {selectedProb?.explanation && i === 0 && (
                        <div className="lc-pexample-explanation">
                          <strong>Explanation:</strong> {selectedProb.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 2: EDITORIAL & HINTS */}
              {activeLeftTab === 'editorial' && (
                <div className="lc-peditorial-container">
                  <div className="card-title" style={{ marginBottom: '12px' }}>
                    <BookOpen size={16} color="#818cf8" />
                    <span>Algorithmic Approach & Editorial</span>
                  </div>

                  {selectedProb?.editorial ? (
                    <div className="lc-pstatement-text">
                      {selectedProb.editorial}
                    </div>
                  ) : (
                    <div className="lc-pempty-box">
                      No editorial published for this problem yet. Check back or use the AI Mentor tab for progressive hints.
                    </div>
                  )}

                  {selectedProb?.optimalAlgorithm && (
                    <div style={{ marginTop: '1.5rem' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#a5b4fc', marginBottom: '6px' }}>
                        Optimal Complexity
                      </h4>
                      <div className="lc-pformat-box">
                        {selectedProb.optimalAlgorithm}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: SUBMISSIONS HISTORY */}
              {activeLeftTab === 'submissions' && (
                <div className="lc-psubs-container">
                  <div className="card-title" style={{ marginBottom: '12px' }}>
                    <History size={16} color="#818cf8" />
                    <span>Your Submissions History</span>
                  </div>

                  {problemSubmissions.length === 0 ? (
                    <div className="lc-pempty-box">
                      No submissions made for this problem yet. Write code on the right and click Submit!
                    </div>
                  ) : (
                    <table className="table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Verdict</th>
                          <th>Language</th>
                          <th>Runtime</th>
                          <th>Memory</th>
                          <th>Date</th>
                          <th>Code</th>
                        </tr>
                      </thead>
                      <tbody>
                        {problemSubmissions.map(s => {
                          const vStyle = VERDICT_STYLES[s.verdict] || VERDICT_STYLES.WA;
                          const Icon = vStyle.icon;
                          return (
                            <tr key={s.id || s._id}>
                              <td>
                                <span className={`verdict-pill ${s.verdict}`}>
                                  <Icon size={12} />
                                  <span>{s.verdict}</span>
                                </span>
                              </td>
                              <td className="mono" style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                                {s.language}
                              </td>
                              <td className="mono" style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                                {s.time ? `${s.time}ms` : '—'}
                              </td>
                              <td className="mono" style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                                {s.memory ? `${s.memory}MB` : '—'}
                              </td>
                              <td style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                                {new Date(s.timestamp).toLocaleDateString()}
                              </td>
                              <td>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => setSelectedSubForView(s)}
                                  style={{ padding: '2px 8px', fontSize: '11px' }}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB 4: AI MENTOR */}
              {activeLeftTab === 'ai' && (
                <div className="lc-pai-chat-container">
                  <div className="lc-pai-msgs-list">
                    {aiChatMsgs.map((m, i) => (
                      <div key={i} className={`lc-pai-msg ${m.role}`}>
                        <div className="lc-pai-bubble">
                          {m.text}
                        </div>
                      </div>
                    ))}
                    {aiThinking && (
                      <div className="lc-pai-msg assistant">
                        <div className="lc-pai-bubble thinking">
                          <Sparkles size={14} className="animate-spin" />
                          <span>Thinking…</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Prompts */}
                  <div className="lc-pai-quick-prompts">
                    <button onClick={() => setAiInput('Can you give me a progressive hint for this problem?')}>
                      💡 Give me a hint
                    </button>
                    <button onClick={() => setAiInput('What is the optimal time and space complexity?')}>
                      ⏱️ Optimal complexity
                    </button>
                    <button onClick={() => setAiInput('What edge cases should I be careful of?')}>
                      ⚠️ Tricky edge cases
                    </button>
                  </div>

                  {/* Input Box */}
                  <div className="lc-pai-input-bar">
                    <input
                      type="text"
                      placeholder="Ask AI mentor a question…"
                      value={aiInput}
                      onChange={e => setAiInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendAiMsg()}
                    />
                    <button onClick={handleSendAiMsg} disabled={aiThinking || !aiInput.trim()}>
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DRAGGABLE DIVIDER */}
        {!isLeftFullscreen && (
          <div className="lc-pdivider" onMouseDown={handleMouseDown} />
        )}

        {/* RIGHT PANEL: Monaco Code Editor & Bottom Console */}
        <div className="lc-pright-panel" style={{ width: isLeftFullscreen ? '100%' : `${100 - splitWidth}%` }}>
          {/* Monaco Editor Container */}
          <div className="lc-peditor-wrapper" style={{ height: isConsoleOpen ? `calc(100% - ${consoleHeight}px)` : 'calc(100% - 42px)' }}>
            <Editor
              height="100%"
              language={MONACO_LANGS[selectedLang] || 'cpp'}
              value={code}
              onChange={val => {
                const newCode = val || '';
                setCode(newCode);
                setSaveStatus('Saving…');
                if (selectedProb) {
                  const probId = selectedProb.id || selectedProb._id;
                  saveCodeDraft(user?.id, probId, selectedLang, newCode);
                  setDraftTimestamp(Date.now());
                  setTimeout(() => setSaveStatus('Saved (7d Cache)'), 300);
                }
              }}
              onMount={handleEditorDidMount}
              options={{
                fontSize: fontSize,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                automaticLayout: true,
                tabSize: 4,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                cursorSmoothCaretAnimation: 'on',
                bracketPairColorization: { enabled: true },
                padding: { top: 12, bottom: 12 }
              }}
            />
          </div>

          {/* BOTTOM CONSOLE PANEL */}
          <div
            className={`lc-pconsole-panel ${isConsoleOpen ? 'open' : 'collapsed'}`}
            style={{ height: isConsoleOpen ? `${consoleHeight}px` : '42px' }}
          >
            {/* Console Bar / Tabs */}
            <div className="lc-pconsole-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  className="lc-pconsole-toggle-btn"
                  onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                  title="Toggle console"
                >
                  <Terminal size={14} />
                  <span>Console</span>
                  <span style={{ fontSize: '10px' }}>{isConsoleOpen ? '▼' : '▲'}</span>
                </button>

                {isConsoleOpen && (
                  <>
                    <button
                      className={`lc-pconsole-tab-btn ${activeConsoleTab === 'testcase' ? 'active' : ''}`}
                      onClick={() => setActiveConsoleTab('testcase')}
                    >
                      Testcases
                    </button>
                    <button
                      className={`lc-pconsole-tab-btn ${activeConsoleTab === 'result' ? 'active' : ''}`}
                      onClick={() => setActiveConsoleTab('result')}
                    >
                      Test Result
                    </button>
                  </>
                )}
              </div>

              {/* Cursor position & save status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-3)' }}>
                <span>Ln {cursorPos.line}, Col {cursorPos.ch}</span>
                <span className="badge-meta">{saveStatus}</span>
              </div>
            </div>

            {/* Console Content */}
            {isConsoleOpen && (
              <div className="lc-pconsole-content">
                {/* TAB 1: TESTCASE SELECTOR & CUSTOM INPUT */}
                {activeConsoleTab === 'testcase' && (
                  <div>
                    {/* Case Pills */}
                    <div className="lc-pcase-pills">
                      {sampleCases.map((tc, idx) => (
                        <button
                          key={idx}
                          className={`lc-pcase-pill ${activeCaseIdx === idx ? 'active' : ''}`}
                          onClick={() => setActiveCaseIdx(idx)}
                        >
                          Case {idx + 1}
                        </button>
                      ))}
                      <button
                        className={`lc-pcase-pill ${activeCaseIdx === -1 ? 'active' : ''}`}
                        onClick={() => setActiveCaseIdx(-1)}
                      >
                        + Custom Input
                      </button>
                    </div>

                    {/* Input Box */}
                    {activeCaseIdx >= 0 ? (
                      <div className="lc-pcase-box">
                        <div className="lc-pcase-label">Standard Input:</div>
                        <pre className="lc-pcase-val">
                          {sampleCases[activeCaseIdx]?.input || '(No input required)'}
                        </pre>
                        <div className="lc-pcase-label" style={{ marginTop: '8px' }}>Expected Output:</div>
                        <pre className="lc-pcase-val">
                          {sampleCases[activeCaseIdx]?.output || '(None)'}
                        </pre>
                      </div>
                    ) : (
                      <div className="lc-pcase-box">
                        <div className="lc-pcase-label">Custom Standard Input:</div>
                        <textarea
                          className="lc-pcustom-textarea"
                          rows={4}
                          placeholder="Type custom standard input here…"
                          value={customInput}
                          onChange={e => setCustomInput(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: TEST RESULT */}
                {activeConsoleTab === 'result' && (
                  <div>
                    {!runResult ? (
                      <div className="lc-pempty-box">
                        Click "Run" or "Submit" to see execution output and diagnostics.
                      </div>
                    ) : runResult.status === 'running' ? (
                      <div className="lc-presult-loading">
                        <RefreshCw size={18} className="animate-spin" color="#818cf8" />
                        <span>Compiling and executing against testcases…</span>
                      </div>
                    ) : (
                      <div className="lc-presult-box">
                        {/* Status Header */}
                        <div className="lc-presult-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className={`verdict-pill ${runResult.status}`}>
                              {runResult.status === 'AC' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                              <span style={{ fontSize: '13px', fontWeight: 800 }}>
                                {runResult.status === 'AC' ? 'Accepted' : runResult.status === 'WA' ? 'Wrong Answer' : runResult.status === 'TLE' ? 'Time Limit Exceeded' : runResult.status === 'CE' ? 'Compilation Error' : 'Runtime Error'}
                              </span>
                            </span>
                            {runResult.testsPassed !== undefined && (
                              <span className="badge-meta">
                                {runResult.testsPassed} / {runResult.totalTests} Testcases Passed
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-3)' }}>
                            {runResult.timeMs !== undefined && <span>⏱️ Runtime: <strong>{runResult.timeMs}ms</strong></span>}
                            {runResult.memoryKb !== undefined && <span>💾 Memory: <strong>{Math.round(runResult.memoryKb / 1024)}MB</strong></span>}
                          </div>
                        </div>

                        {/* Stderr or compiler logs */}
                        {runResult.stderr && (
                          <div className="lc-pstderr-box">
                            <div style={{ fontWeight: 700, color: '#f43f5e', marginBottom: '4px' }}>Compiler & Diagnostics Log:</div>
                            <pre>{runResult.stderr}</pre>
                          </div>
                        )}

                        {/* Testcase outputs breakdown */}
                        {runResult.testResults && runResult.testResults.length > 0 ? (
                          <div style={{ marginTop: '12px' }}>
                            {runResult.testResults.map((tr, idx) => (
                              <div key={idx} className={`lc-ptr-row ${tr.passed ? 'passed' : 'failed'}`}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                  <span style={{ fontWeight: 700, fontSize: '12px', color: tr.passed ? '#10b981' : '#ef4444' }}>
                                    Test Case #{idx + 1} ({tr.type}) — {tr.passed ? 'PASSED ✓' : 'FAILED ✗'}
                                  </span>
                                  <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{tr.timeMs}ms</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                  <div>
                                    <div className="lc-pcase-label">📥 Input:</div>
                                    <pre className="lc-pex-code" style={{ borderColor: 'rgba(129, 140, 248, 0.3)' }}>{tr.input || '(empty)'}</pre>
                                  </div>
                                  <div>
                                    <div className="lc-pcase-label">✅ Expected Output:</div>
                                    <pre className="lc-pex-code">{tr.expectedOutput || '(empty)'}</pre>
                                  </div>
                                  <div>
                                    <div className="lc-pcase-label">📤 Actual Output:</div>
                                    <pre className="lc-pex-code" style={{ borderColor: tr.passed ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.4)', color: !tr.passed && !tr.actualOutput && tr.stderr ? '#f87171' : undefined }}>
                                      {tr.actualOutput || (tr.stderr ? `[Runtime Error]\n${tr.stderr}` : '(empty)')}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : runResult.stdout !== undefined && (
                          <div style={{ marginTop: '12px' }}>
                            <div className="lc-pcase-label">Standard Output:</div>
                            <pre className="lc-pex-code">{runResult.stdout || '(No output produced)'}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Code Viewer Modal for Submissions */}
      {selectedSubForView && (
        <div className="lc-pmodal-overlay" onClick={() => setSelectedSubForView(null)}>
          <div className="lc-pmodal-card" onClick={e => e.stopPropagation()}>
            <div className="lc-pmodal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`verdict-pill ${selectedSubForView.verdict}`}>
                  {selectedSubForView.verdict}
                </span>
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>
                  Submitted Code ({selectedSubForView.language})
                </span>
              </div>
              <button className="lc-pnav-btn" onClick={() => setSelectedSubForView(null)}>✕</button>
            </div>
            <div style={{ height: '400px', marginTop: '12px' }}>
              <Editor
                height="100%"
                language={MONACO_LANGS[selectedSubForView.language] || 'cpp'}
                value={selectedSubForView.code}
                options={{
                  readOnly: true,
                  fontSize: 13,
                  minimap: { enabled: false }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
