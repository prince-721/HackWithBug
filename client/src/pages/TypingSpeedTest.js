import React, { useState, useEffect, useRef } from 'react';
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
  'development', 'design', 'interface', 'user', 'experience', 'visual', 'speedometer', 'leaderboard', 'challenge', 'daily', 'contest', 'problem', 'solve'
];

const TEST_DURATION = 30; // seconds

export default function TypingSpeedTest() {
  const { user } = useAuth();
  const [words, setWords] = useState([]);
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [currentInput, setCurrentInput] = useState('');
  const [typedWords, setTypedWords] = useState([]); // tracks typed words for historical evaluation

  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION);

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

  const timerRef = useRef(null);
  const wpmHistoryRef = useRef([]);
  const inputRef = useRef(null);

  useEffect(() => {
    generateWords();
    fetchHistory();
    fetchLeaderboard();
    return () => clearInterval(timerRef.current);
  }, []);

  const generateWords = () => {
    const list = [];
    for (let i = 0; i < 80; i++) {
      const rand = WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)];
      list.push(rand);
    }
    setWords(list);
  };

  const fetchHistory = () => {
    api.get('/typing-practice/history')
      .then(r => setHistory(r.data))
      .catch(() => {});
  };

  const fetchLeaderboard = () => {
    api.get('/typing-practice/leaderboard')
      .then(r => setLeaderboard(r.data))
      .catch(() => {});
  };

  const resetTest = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    generateWords();
    setCurrentWordIdx(0);
    setCurrentInput('');
    setTypedWords([]);
    setStarted(false);
    setFinished(false);
    setTimeLeft(TEST_DURATION);
    setLiveWpm(0);
    setAvgWpm(0);
    setPeakWpm(0);
    setAccuracy(100);
    setKeystrokes(0);
    setBackspaces(0);
    wpmHistoryRef.current = [];
    if (inputRef.current) inputRef.current.focus();
  };

  const startTimer = () => {
    setStarted(true);
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = TEST_DURATION - elapsed;
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        setTimeLeft(0);
        setFinished(true);
        toast.success('Time is up! Typing session complete.');
      } else {
        setTimeLeft(remaining);
        calculateStats(elapsed);
      }
    }, 1000);
  };

  const calculateStats = (elapsedSeconds) => {
    if (elapsedSeconds <= 0) return;
    // Calculate WPM: (correct characters / 5) / (elapsed minutes)
    let correctChars = 0;
    typedWords.forEach((typed, idx) => {
      const target = words[idx];
      if (typed === target) {
        correctChars += target.length + 1; // +1 for the space
      }
    });

    // Add characters matching in the current input
    const targetWord = words[currentWordIdx] || '';
    for (let i = 0; i < currentInput.length; i++) {
      if (currentInput[i] === targetWord[i]) {
        correctChars++;
      }
    }

    const currentWpm = Math.round((correctChars / 5) / (elapsedSeconds / 60));
    setLiveWpm(currentWpm);
    setAvgWpm(currentWpm);
    setPeakWpm(prev => Math.max(prev, currentWpm));
    wpmHistoryRef.current.push({ time: elapsedSeconds, wpm: currentWpm });
  };

  const handleInputChange = (e) => {
    if (finished) return;
    if (!started) {
      startTimer();
    }

    const val = e.target.value;
    setKeystrokes(prev => prev + 1);

    // If space pressed, submit word
    if (val.endsWith(' ')) {
      const wordTyped = val.trim();
      const newTyped = [...typedWords, wordTyped];
      setTypedWords(newTyped);
      setCurrentWordIdx(prev => prev + 1);
      setCurrentInput('');
      
      // Calculate overall accuracy
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
      const currentAcc = totalTypedLength > 0 ? Math.round((matches / totalTypedLength) * 100) : 100;
      setAccuracy(currentAcc);
    } else {
      setCurrentInput(val);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace') {
      setBackspaces(prev => prev + 1);
    }
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
        duration: TEST_DURATION
      });
      toast.success('Typing session logged successfully!');
      fetchHistory();
      fetchLeaderboard();
      resetTest();
    } catch {
      toast.error('Failed to log typing session.');
    } finally {
      setSubmitting(false);
    }
  };

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

  return (
    <div className="dash-layout">
      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div className="ds-profile">
          <div className="ds-avatar">{user.avatar}</div>
          <div className="ds-name">{user.name}</div>
          <div className="ds-rating" style={{color:'var(--purple)'}}>Rating: {user.rating}</div>
          <div className="ds-meta">{user.enrollment}</div>
        </div>
        <nav className="ds-nav">
          <Link to="/dashboard" className="ds-nav-item">📊 Dashboard</Link>
          <Link to="/problems" className="ds-nav-item">📝 Problems</Link>
          <Link to="/practice" className="ds-nav-item">🧩 Practice</Link>
          <Link to="/typing" className="ds-nav-item active">⌨ Typing Speed Test</Link>
          <Link to="/leaderboard" className="ds-nav-item">🏆 Leaderboard</Link>
        </nav>
      </aside>

      {/* Main Grid */}
      <main className="dash-main typing-main-grid">
        <div className="typing-left-panel">
          <div className="card monkey-type-container">
            <div className="monkey-type-header">
              <h2>⌨ Standalone Typing Practice</h2>
              <div className="timer-badge">⏳ {timeLeft}s</div>
            </div>
            
            {/* Monkeytype words viewer */}
            <div className="words-wrapper" onClick={() => inputRef.current?.focus()}>
              {words.map((word, wIdx) => {
                const isCurrent = wIdx === currentWordIdx;
                const isPast = wIdx < currentWordIdx;
                const typedVal = typedWords[wIdx] || '';
                
                // Styles classes
                let wordClass = 'word';
                if (isCurrent) wordClass += ' active';
                if (isPast) {
                  wordClass += (typedVal === word) ? ' correct' : ' incorrect';
                }

                return (
                  <span key={wIdx} className={wordClass}>
                    {word.split('').map((char, cIdx) => {
                      let charClass = '';
                      if (isPast) {
                        // All chars corrected/incorrected based on overall word comparison
                      } else if (isCurrent) {
                        if (cIdx < currentInput.length) {
                          charClass = (currentInput[cIdx] === char) ? 'char-correct' : 'char-incorrect';
                        }
                      }
                      return <span key={cIdx} className={charClass}>{char}</span>;
                    })}
                    {isCurrent && currentInput.length > word.length && (
                      <span className="char-incorrect extra-char">
                        {currentInput.substring(word.length)}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>

            {/* Input field */}
            <div className="typing-input-bar">
              <input
                ref={inputRef}
                className="inp typing-transparent-input"
                type="text"
                placeholder={started ? '' : 'Start typing here to trigger practice test...'}
                value={currentInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={finished}
                autoFocus
              />
              <button className="btn btn-ghost" onClick={resetTest}>Reset</button>
            </div>
          </div>

          {finished && (
            <div className="card session-finish-card">
              <h3>🎉 Practice Complete!</h3>
              <p>Verify your stats below. Click Submit to save this typing session to the global highscores.</p>
              <button className="btn btn-primary" onClick={handleSubmitScore} disabled={submitting}>
                {submitting ? 'Submitting Score…' : 'Submit Score to Leaderboard →'}
              </button>
            </div>
          )}
        </div>

        <div className="typing-right-panel">
          {/* Live speed dial */}
          <div className="card typing-dashboard-card">
            <h3>Speed Dashboard</h3>
            <div className="live-speedometer">
              <svg viewBox="0 0 100 60" width="100%">
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--border)" strokeWidth="6" strokeLinecap="round" />
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="var(--purple)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={Math.PI * 40}
                  strokeDashoffset={(Math.PI * 40) - ((Math.min(liveWpm, 150) / 150) * (Math.PI * 40))}
                />
                <text x="50" y="42" textAnchor="middle" fontWeight="800" fontSize="16" fill="var(--text)">{liveWpm}</text>
                <text x="50" y="52" textAnchor="middle" fontSize="7" fill="var(--text-3)">Current WPM</text>
              </svg>
            </div>

            <div className="stats-list">
              <div className="stat-line"><span>Average WPM:</span> <strong>{avgWpm}</strong></div>
              <div className="stat-line"><span>Peak WPM:</span> <strong>{peakWpm}</strong></div>
              <div className="stat-line"><span>Keystrokes:</span> <strong>{keystrokes}</strong></div>
              <div className="stat-line"><span>Accuracy:</span> <strong>{accuracy}%</strong></div>
              <div className="stat-line"><span>Backspaces:</span> <strong>{backspaces}</strong></div>
            </div>

            {wpmPoints.length > 1 && (
              <div className="stats-graph-container">
                <span className="graph-label">Speed trend curve:</span>
                <svg width="100%" height={graphHeight} viewBox={`0 0 ${graphWidth} ${graphHeight}`}>
                  <path d={svgPath} fill="none" stroke="var(--teal)" strokeWidth="2.5" />
                </svg>
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div className="card typing-leaderboard-card">
            <h3>🏆 Standalone Typing Leaderboard</h3>
            <div className="tlb-list">
              {leaderboard.map((item) => (
                <div key={item.id} className="tlb-row">
                  <span className="tlb-rank">{item.rank}</span>
                  <div className="tlb-info">
                    <div className="tlb-name">{item.name}</div>
                    <div className="tlb-meta">{item.department}</div>
                  </div>
                  <div className="tlb-speed">{item.avgWpm} WPM</div>
                </div>
              ))}
              {leaderboard.length === 0 && <div className="empty-state">No highscores yet. Be the first!</div>}
            </div>
          </div>

          {/* History */}
          <div className="card typing-history-card">
            <h3>Recent Attempts</h3>
            <div className="tlb-list">
              {history.map((h, i) => (
                <div key={h._id || i} className="tlb-row">
                  <div className="tlb-info">
                    <div className="tlb-name">English Common Words</div>
                    <div className="tlb-meta">{new Date(h.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="tlb-speed">{h.avgWpm} WPM</div>
                </div>
              ))}
              {history.length === 0 && <div className="empty-state">Your history is empty.</div>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
