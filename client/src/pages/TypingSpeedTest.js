import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './TypingSpeedTest.css';

const WORD_POOL = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
  'system', 'code', 'program', 'source', 'platform', 'keyboard', 'speed', 'practice', 'game', 'learn', 'input', 'accuracy', 'metric', 'chart', 'data',
  'development', 'design', 'interface', 'user', 'experience', 'visual', 'speedometer', 'leaderboard', 'challenge', 'daily', 'contest', 'problem', 'solve',
  'function', 'variable', 'return', 'string', 'integer', 'boolean', 'array', 'object', 'class', 'method', 'algorithm', 'binary', 'search', 'sort', 'tree',
];

const MODES = [15, 30, 60];

function getGrade(wpm, accuracy) {
  const score = wpm * (accuracy / 100);
  if (score >= 100) return { grade: 'S', label: 'Legendary', color: '#FFD700', bg: 'rgba(255,215,0,0.1)' };
  if (score >= 80)  return { grade: 'A', label: 'Expert', color: '#7F77DD', bg: 'rgba(127,119,221,0.1)' };
  if (score >= 60)  return { grade: 'B', label: 'Advanced', color: '#1D9E75', bg: 'rgba(29,158,117,0.1)' };
  if (score >= 40)  return { grade: 'C', label: 'Intermediate', color: '#BA7517', bg: 'rgba(186,117,23,0.1)' };
  return { grade: 'D', label: 'Beginner', color: '#E24B4A', bg: 'rgba(226,75,74,0.1)' };
}

export default function TypingSpeedTest() {
  const { user } = useAuth();

  // Mode (duration in seconds)
  const [testDuration, setTestDuration] = useState(30);

  // Words
  const [words, setWords] = useState([]);
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [currentInput, setCurrentInput] = useState('');
  const [typedWords, setTypedWords] = useState([]);

  // Test state
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  // Stats
  const [liveWpm, setLiveWpm] = useState(0);
  const [avgWpm, setAvgWpm] = useState(0);
  const [peakWpm, setPeakWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [keystrokes, setKeystrokes] = useState(0);
  const [backspaces, setBackspaces] = useState(0);

  // Lists
  const [history, setHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Refs
  const timerRef = useRef(null);
  const wpmHistoryRef = useRef([]);
  const inputRef = useRef(null);
  const wordsWrapperRef = useRef(null);
  const activeWordRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    generateWords();
    fetchHistory();
    fetchLeaderboard();
    return () => clearInterval(timerRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update timeLeft when mode changes (before test starts)
  useEffect(() => {
    if (!started) setTimeLeft(testDuration);
  }, [testDuration, started]);

  // Auto-scroll active word into view
  useEffect(() => {
    if (activeWordRef.current && wordsWrapperRef.current) {
      const wrapper = wordsWrapperRef.current;
      const el = activeWordRef.current;
      const elTop = el.offsetTop;
      const elBot = elTop + el.offsetHeight;
      const wrapperTop = wrapper.scrollTop;
      const wrapperBot = wrapperTop + wrapper.clientHeight;
      if (elTop < wrapperTop || elBot > wrapperBot) {
        wrapper.scrollTo({ top: elTop - wrapper.clientHeight / 2, behavior: 'smooth' });
      }
    }
  }, [currentWordIdx]);

  const generateWords = useCallback(() => {
    const list = [];
    for (let i = 0; i < 100; i++) {
      list.push(WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)]);
    }
    setWords(list);
  }, []);

  const fetchHistory = () => {
    api.get('/typing-practice/history').then(r => setHistory(r.data)).catch(() => {});
  };

  const fetchLeaderboard = () => {
    api.get('/typing-practice/leaderboard').then(r => setLeaderboard(r.data)).catch(() => {});
  };

  const resetTest = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    startTimeRef.current = null;
    generateWords();
    setCurrentWordIdx(0);
    setCurrentInput('');
    setTypedWords([]);
    setStarted(false);
    setFinished(false);
    setTimeLeft(testDuration);
    setLiveWpm(0);
    setAvgWpm(0);
    setPeakWpm(0);
    setAccuracy(100);
    setKeystrokes(0);
    setBackspaces(0);
    wpmHistoryRef.current = [];
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [generateWords, testDuration]);

  // Tab key to reset
  useEffect(() => {
    const handleTab = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        resetTest();
        toast('Test reset!', { icon: '🔄' });
      }
    };
    window.addEventListener('keydown', handleTab);
    return () => window.removeEventListener('keydown', handleTab);
  }, [resetTest]);

  const calculateStats = useCallback((elapsedSeconds, currentTypedWords, currentWordIdxVal, currentInputVal) => {
    if (elapsedSeconds <= 0) return;
    let correctChars = 0;
    currentTypedWords.forEach((typed, idx) => {
      const target = words[idx];
      if (typed === target) correctChars += target.length + 1;
    });
    const targetWord = words[currentWordIdxVal] || '';
    for (let i = 0; i < currentInputVal.length; i++) {
      if (currentInputVal[i] === targetWord[i]) correctChars++;
    }
    const currentWpm = Math.round((correctChars / 5) / (elapsedSeconds / 60));
    setLiveWpm(currentWpm);
    setAvgWpm(currentWpm);
    setPeakWpm(prev => Math.max(prev, currentWpm));
    wpmHistoryRef.current.push({ time: elapsedSeconds, wpm: currentWpm });
  }, [words]);

  const startTimer = useCallback(() => {
    setStarted(true);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = testDuration - elapsed;
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        setTimeLeft(0);
        setFinished(true);
        toast.success('⏱ Time is up! Great session!');
      } else {
        setTimeLeft(remaining);
        setCurrentWordIdx(wi => {
          setTypedWords(tw => {
            setCurrentInput(ci => {
              calculateStats(elapsed, tw, wi, ci);
              return ci;
            });
            return tw;
          });
          return wi;
        });
      }
    }, 1000);
  }, [testDuration, calculateStats]);

  const handleInputChange = (e) => {
    if (finished) return;
    if (!started) startTimer();

    const val = e.target.value;
    setKeystrokes(prev => prev + 1);

    if (val.endsWith(' ')) {
      const wordTyped = val.trim();
      const newTyped = [...typedWords, wordTyped];
      setTypedWords(newTyped);
      setCurrentWordIdx(prev => prev + 1);
      setCurrentInput('');

      // Recalculate accuracy
      let matches = 0;
      let totalTypedLength = 0;
      newTyped.forEach((t, idx) => {
        const target = words[idx];
        totalTypedLength += t.length;
        const limit = Math.min(t.length, target.length);
        for (let i = 0; i < limit; i++) {
          if (t[i] === target[i]) matches++;
        }
      });
      setAccuracy(totalTypedLength > 0 ? Math.round((matches / totalTypedLength) * 100) : 100);
    } else {
      setCurrentInput(val);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace') setBackspaces(prev => prev + 1);
  };

  const handleSubmitScore = async () => {
    setSubmitting(true);
    try {
      await api.post('/typing-practice/sessions', {
        language: 'text',
        snippetName: 'English Common Words',
        avgWpm,
        peakWpm,
        accuracy,
        keystrokes,
        backspaces,
        duration: testDuration
      });
      toast.success('Score submitted to leaderboard!');
      fetchHistory();
      fetchLeaderboard();
      resetTest();
    } catch {
      toast.error('Failed to submit score.');
    } finally {
      setSubmitting(false);
    }
  };

  // SVG WPM graph
  const wpmPoints = wpmHistoryRef.current;
  const maxWpmInHistory = wpmPoints.length > 0 ? Math.max(...wpmPoints.map(p => p.wpm), 60) : 60;
  const graphWidth = 240;
  const graphHeight = 60;
  const svgPath = wpmPoints.length > 1
    ? 'M ' + wpmPoints.map((pt, index) => {
        const x = (index / (wpmPoints.length - 1)) * graphWidth;
        const y = graphHeight - (pt.wpm / maxWpmInHistory) * (graphHeight - 10);
        return `${x} ${y}`;
      }).join(' L ')
    : '';

  // Timer ring progress
  const timerProgress = timeLeft / testDuration;
  const ringR = 36;
  const ringCircumference = 2 * Math.PI * ringR;
  const ringOffset = ringCircumference * (1 - timerProgress);
  const timerUrgent = timeLeft <= 5 && started && !finished;

  const grade = finished ? getGrade(avgWpm, accuracy) : null;

  return (
    <div className="dash-layout">
      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div className="ds-profile">
          <div className="ds-avatar">{user.avatar}</div>
          <div className="ds-name">{user.name}</div>
          <div className="ds-rating" style={{ color: 'var(--purple)' }}>Rating: {user.rating}</div>
          <div className="ds-meta">{user.enrollment}</div>
        </div>
        <nav className="ds-nav">
          <Link to="/dashboard" className="ds-nav-item">📊 Dashboard</Link>
          <Link to="/problems" className="ds-nav-item">📝 Problems</Link>
          <Link to="/practice" className="ds-nav-item">🧩 Practice</Link>
          <Link to="/typing" className="ds-nav-item active">⌨ Typing Speed Test</Link>
          <Link to="/leaderboard" className="ds-nav-item">🏆 Leaderboard</Link>
        </nav>

        {/* Personal best */}
        {history.length > 0 && (
          <div style={{ margin: '12px', padding: '12px', background: 'linear-gradient(135deg,rgba(127,119,221,.15),rgba(29,158,117,.1))', borderRadius: '10px', border: '0.5px solid rgba(127,119,221,.3)' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--purple)', letterSpacing: '0.5px', marginBottom: '4px' }}>⚡ PERSONAL BEST</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)' }}>{Math.max(...history.map(h => h.avgWpm))} WPM</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>Keep pushing!</div>
          </div>
        )}
      </aside>

      {/* Main Grid */}
      <main className="dash-main typing-main-grid">
        <div className="typing-left-panel">
          {/* Mode selector */}
          <div className="typing-mode-selector">
            <span className="typing-mode-label">⏱ Duration:</span>
            {MODES.map(mode => (
              <button
                key={mode}
                className={`typing-mode-btn ${testDuration === mode ? 'active' : ''}`}
                onClick={() => { if (!started) { setTestDuration(mode); setTimeLeft(mode); } }}
                disabled={started && !finished}
              >
                {mode}s
              </button>
            ))}
            <span className="typing-mode-hint">Tab to reset</span>
          </div>

          <div className="card monkey-type-container">
            <div className="monkey-type-header">
              <h2>⌨ Typing Practice</h2>
              {/* Animated timer ring */}
              <div className="typing-timer-ring-wrap">
                <svg viewBox="0 0 88 88" width="68" height="68">
                  <circle cx="44" cy="44" r={ringR} fill="none" stroke="var(--border)" strokeWidth="5"/>
                  <circle
                    cx="44" cy="44" r={ringR}
                    fill="none"
                    stroke={timerUrgent ? '#E24B4A' : 'var(--purple)'}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    transform="rotate(-90 44 44)"
                    style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease' }}
                  />
                  <text x="44" y="48" textAnchor="middle" fontSize="14" fontWeight="800" fill={timerUrgent ? '#E24B4A' : 'var(--text)'}
                    style={{ animation: timerUrgent ? 'timerPulse 0.5s ease infinite alternate' : 'none' }}
                  >{timeLeft}</text>
                </svg>
              </div>
            </div>

            {/* Words wrapper */}
            <div
              className="words-wrapper"
              ref={wordsWrapperRef}
              onClick={() => inputRef.current?.focus()}
            >
              {words.map((word, wIdx) => {
                const isCurrent = wIdx === currentWordIdx;
                const isPast = wIdx < currentWordIdx;
                const typedVal = typedWords[wIdx] || '';

                let wordClass = 'word';
                if (isCurrent) wordClass += ' active';
                if (isPast) wordClass += (typedVal === word) ? ' correct' : ' incorrect';

                return (
                  <span
                    key={wIdx}
                    className={wordClass}
                    ref={isCurrent ? activeWordRef : null}
                  >
                    {word.split('').map((char, cIdx) => {
                      let charClass = '';
                      if (isPast) {
                        charClass = (typedVal[cIdx] === char) ? 'char-correct' : 'char-incorrect';
                      } else if (isCurrent) {
                        if (cIdx < currentInput.length) {
                          charClass = (currentInput[cIdx] === char) ? 'char-correct' : 'char-incorrect';
                        }
                        // Animated caret on the next char to type
                        if (cIdx === currentInput.length) charClass = 'char-caret';
                      }
                      return <span key={cIdx} className={charClass}>{char}</span>;
                    })}
                    {/* Caret at end of word if typed past it */}
                    {isCurrent && currentInput.length >= word.length && (
                      <span className="char-caret-end"/>
                    )}
                    {/* Extra chars typed beyond word length */}
                    {isCurrent && currentInput.length > word.length && (
                      <span className="char-incorrect extra-char">
                        {currentInput.substring(word.length)}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>

            {/* Input */}
            <div className="typing-input-bar">
              <input
                ref={inputRef}
                className="inp typing-transparent-input"
                type="text"
                placeholder={started ? '' : 'Start typing to begin…'}
                value={currentInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={finished}
                autoFocus
              />
              <button className="btn btn-ghost" onClick={resetTest} title="Reset (Tab)">↺ Reset</button>
            </div>
          </div>

          {/* Results card */}
          {finished && grade && (
            <div className="typing-results-card">
              <div className="typing-grade-badge" style={{ background: grade.bg, borderColor: grade.color }}>
                <span className="typing-grade-letter" style={{ color: grade.color }}>{grade.grade}</span>
                <span className="typing-grade-label" style={{ color: grade.color }}>{grade.label}</span>
              </div>
              <div className="typing-results-stats">
                <div className="typing-result-stat">
                  <div className="typing-result-val" style={{ color: 'var(--purple)' }}>{avgWpm}</div>
                  <div className="typing-result-key">WPM</div>
                </div>
                <div className="typing-result-stat">
                  <div className="typing-result-val" style={{ color: 'var(--teal)' }}>{accuracy}%</div>
                  <div className="typing-result-key">Accuracy</div>
                </div>
                <div className="typing-result-stat">
                  <div className="typing-result-val" style={{ color: 'var(--amber)' }}>{peakWpm}</div>
                  <div className="typing-result-key">Peak WPM</div>
                </div>
                <div className="typing-result-stat">
                  <div className="typing-result-val">{keystrokes}</div>
                  <div className="typing-result-key">Keystrokes</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button className="btn btn-primary" onClick={handleSubmitScore} disabled={submitting} style={{ flex: 1 }}>
                  {submitting ? 'Submitting…' : '🏆 Submit to Leaderboard'}
                </button>
                <button className="btn btn-ghost" onClick={resetTest} style={{ flex: 1 }}>↺ Try Again</button>
              </div>
            </div>
          )}
        </div>

        <div className="typing-right-panel">
          {/* Speed dashboard */}
          <div className="card typing-dashboard-card">
            <h3>Speed Dashboard</h3>
            <div className="live-speedometer">
              <svg viewBox="0 0 100 60" width="100%">
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--border)" strokeWidth="6" strokeLinecap="round"/>
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke={liveWpm > 80 ? '#1D9E75' : liveWpm > 50 ? '#7F77DD' : '#BA7517'}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={Math.PI * 40}
                  strokeDashoffset={(Math.PI * 40) - ((Math.min(liveWpm, 150) / 150) * (Math.PI * 40))}
                  style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease' }}
                />
                <text x="50" y="42" textAnchor="middle" fontWeight="800" fontSize="16" fill="var(--text)">{liveWpm}</text>
                <text x="50" y="52" textAnchor="middle" fontSize="7" fill="var(--text-3)">Current WPM</text>
              </svg>
            </div>

            <div className="stats-list">
              <div className="stat-line"><span>Average WPM:</span> <strong style={{ color: 'var(--purple)' }}>{avgWpm}</strong></div>
              <div className="stat-line"><span>Peak WPM:</span> <strong style={{ color: 'var(--amber)' }}>{peakWpm}</strong></div>
              <div className="stat-line"><span>Accuracy:</span> <strong style={{ color: accuracy >= 95 ? 'var(--teal)' : accuracy >= 80 ? 'var(--amber)' : 'var(--red)' }}>{accuracy}%</strong></div>
              <div className="stat-line"><span>Keystrokes:</span> <strong>{keystrokes}</strong></div>
              <div className="stat-line"><span>Backspaces:</span> <strong style={{ color: backspaces > 20 ? 'var(--red)' : 'var(--text)' }}>{backspaces}</strong></div>
            </div>

            {wpmPoints.length > 1 && (
              <div className="stats-graph-container">
                <span className="graph-label">Speed trend:</span>
                <svg width="100%" height={graphHeight} viewBox={`0 0 ${graphWidth} ${graphHeight}`}>
                  {/* Fill area */}
                  <defs>
                    <linearGradient id="wpmGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--teal)" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="var(--teal)" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  {wpmPoints.length > 1 && (
                    <path
                      d={`${svgPath} L ${graphWidth} ${graphHeight} L 0 ${graphHeight} Z`}
                      fill="url(#wpmGradient)"
                    />
                  )}
                  <path d={svgPath} fill="none" stroke="var(--teal)" strokeWidth="2.5" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div className="card typing-leaderboard-card">
            <h3>🏆 Global Leaderboard</h3>
            <div className="tlb-list">
              {leaderboard.map((item, i) => (
                <div key={item.id || i} className="tlb-row">
                  <span className="tlb-rank">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  <div className="tlb-info">
                    <div className="tlb-name">{item.name}</div>
                    <div className="tlb-meta">{item.department}</div>
                  </div>
                  <div className="tlb-speed" style={{ color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--purple)' }}>
                    {item.avgWpm} <span style={{ fontSize: '9px', color: 'var(--text-3)' }}>WPM</span>
                  </div>
                </div>
              ))}
              {leaderboard.length === 0 && <div className="empty-state">No highscores yet. Be the first!</div>}
            </div>
          </div>

          {/* History */}
          <div className="card typing-history-card">
            <h3>Recent Attempts</h3>
            <div className="tlb-list">
              {history.map((h, i) => {
                const g = getGrade(h.avgWpm, h.accuracy || 100);
                return (
                  <div key={h._id || i} className="tlb-row">
                    <span className="tlb-rank" style={{ fontSize: '14px', color: g.color, fontWeight: 800 }}>{g.grade}</span>
                    <div className="tlb-info">
                      <div className="tlb-name">{h.avgWpm} WPM</div>
                      <div className="tlb-meta">{new Date(h.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="tlb-speed" style={{ color: 'var(--text-3)', fontSize: '11px' }}>
                      {h.accuracy || '—'}%
                    </div>
                  </div>
                );
              })}
              {history.length === 0 && <div className="empty-state">Your history is empty.</div>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
