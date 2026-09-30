import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } from 'chart.js';
import api from '../utils/api';
import toast from 'react-hot-toast';
import useLeetCodeSync from '../hooks/useLeetCodeSync';
import { 
  Code2, 
  Trophy, 
  Zap, 
  PlaySquare, 
  Target, 
  Activity, 
  Calendar, 
  ChevronRight, 
  Award, 
  CheckCircle2, 
  Sparkles,
  ArrowUpRight,
  Clock,
  Layers
} from 'lucide-react';

import './Dashboard.css';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

const VERDICTS = { 
  AC: 'verdict-ac', 
  WA: 'verdict-wa', 
  TLE: 'verdict-tle', 
  CE: 'verdict-ce' 
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contests, setContests] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lcRecentSolves, setLcRecentSolves] = useState([]);

  // LeetCode sync — auto-sync on load if user has LC connected
  const { solvedSlugs, syncing: lcSyncing, lastSync: lcLastSync, sync: lcSync } = useLeetCodeSync(
    user?.leetcode ? user?.id : null, 0
  );

  useEffect(() => {
    if (user?.role === 'faculty') { 
      navigate('/dev'); 
      return; 
    }
    
    Promise.all([
      api.get('/contests'),
      api.get(`/submissions?userId=${user.id}`),
      api.get('/leaderboard'),
      api.get('/problems')
    ]).then(([c, s, l, p]) => {
      setContests(c.data || []);
      setSubmissions((s.data || []).slice(0, 7));
      setLeaderboard((l.data || []).slice(0, 5));
      setProblems(p.data || []);
    }).catch(err => {
      console.error('Error fetching dashboard data:', err);
    }).finally(() => setLoading(false));

    // Daily challenge
    api.get('/contests/daily/challenge').then(r => setDailyChallenge(r.data)).catch(() => {});

    // Auto-sync LeetCode on dashboard load
    if (user?.leetcode && user?.id) {
      lcSync().then(data => {
        if (data?.recentSubmissions) {
          setLcRecentSolves(data.recentSubmissions.slice(0, 5));
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const registerForContest = async (c) => {
    let password = '';
    if (c.contestType === 'private') {
      password = window.prompt('This contest is private. Enter password:');
      if (password === null) return;
    }
    toast.loading('Registering for contest…', { id: 'reg' });
    try {
      const res = await api.post(`/contests/${c.id}/register`, { password });
      toast.success('🎉 Successfully registered for contest!', { id: 'reg' });
      setContests(prev => prev.map(item => item.id === c.id ? { ...item, isRegistered: true, participantCount: res.data.participantCount } : item));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed', { id: 'reg' });
    }
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner"/></div>;
  }

  const liveContests = contests.filter(c => c.status === 'live');
  const upcoming = contests.filter(c => c.status === 'scheduled').slice(0, 3);

  // Compute Solved Breakdown
  const acSubmissions = submissions.filter(s => s.verdict === 'AC');
  const totalSolved = user.solved || acSubmissions.length || 0;
  
  // Simulated difficulty breakdown based on total solved
  const easySolved = Math.round(totalSolved * 0.45);
  const medSolved = Math.round(totalSolved * 0.40);
  const hardSolved = Math.max(0, totalSolved - easySolved - medSolved);

  const easyTotal = Math.max(1, problems.filter(p => p.difficulty === 'easy').length || 40);
  const medTotal = Math.max(1, problems.filter(p => p.difficulty === 'medium').length || 50);
  const hardTotal = Math.max(1, problems.filter(p => p.difficulty === 'hard').length || 20);

  // Rating Tier Badge
  const getRatingBadge = (rating) => {
    if (rating >= 2100) return { title: 'Grandmaster', color: '#ef4444' };
    if (rating >= 1900) return { title: 'Guardian', color: '#f59e0b' };
    if (rating >= 1700) return { title: 'Knight', color: '#8b5cf6' };
    if (rating >= 1500) return { title: 'Specialist', color: '#00b8a3' };
    return { title: 'Apprentice', color: '#9ca3af' };
  };

  const ratingTier = getRatingBadge(user.rating || 1200);

  // Rating chart data
  const ratingData = {
    labels: ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Current'],
    datasets: [
      {
        label: 'Contest Rating',
        data: [1200, 1260, 1310, 1290, 1380, 1450, 1510, 1580, 1630, 1690, 1740, user.rating || 1780],
        borderColor: '#6366f1',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 200);
          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
          gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#8b5cf6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ]
  };

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#111827',
        titleColor: '#f3f4f6',
        bodyColor: '#a5b4fc',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (ctx) => `Rating: ${ctx.parsed.y}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#6b7280', font: { size: 11 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#6b7280', font: { size: 11 } }
      }
    }
  };

  const topicTracks = [
    { name: 'Arrays & Hashing', icon: '📦', count: '45 problems', path: '/problems?tag=Arrays' },
    { name: 'Dynamic Programming', icon: '⚡', count: '38 problems', path: '/problems?tag=DP' },
    { name: 'Trees & Graphs', icon: '🌲', count: '32 problems', path: '/problems?tag=Trees' },
    { name: 'Binary Search', icon: '🔍', count: '24 problems', path: '/problems?tag=Binary Search' },
    { name: 'Greedy & Math', icon: '🎯', count: '28 problems', path: '/problems?tag=Greedy' },
    { name: 'Strings & Two Ptrs', icon: '🔤', count: '30 problems', path: '/problems?tag=Strings' },
  ];

  return (
    <div className="dash-layout">
      {/* ─── LEFT SIDEBAR ─── */}
      <aside className="dash-sidebar">
        <div className="ds-profile">
          <div className="ds-avatar-wrap">
            <div className="ds-avatar">{user.avatar || (user.name ? user.name[0] : 'U')}</div>
            <span className="ds-online-status" title="Active" />
          </div>
          <div className="ds-name">{user.name}</div>
          <div className="ds-rating-badge" style={{ borderColor: `${ratingTier.color}40`, color: ratingTier.color }}>
            ⭐ {ratingTier.title} ({user.rating || 1200})
          </div>
          <div className="ds-meta">B.Tech CE · Semester {user.semester || 6}</div>
          <Link to={`/profile/${user.enrollment}`} style={{ display: 'block', marginTop: '12px' }}>
            <button className="btn btn-ghost btn-sm" style={{ width: '100%' }}>
              View Public Portfolio ↗
            </button>
          </Link>
        </div>

        {/* Streak Widget */}
        <div className="ds-streak">
          <div className="ds-streak-icon">🔥</div>
          <div>
            <div className="ds-streak-val">{user.streak || 0} Days</div>
            <div className="ds-streak-label">Active Coding Streak</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="ds-nav">
          <Link to="/dashboard" className="ds-nav-item active">
            <Activity size={16} />
            <span>Overview</span>
          </Link>
          <Link to="/problems" className="ds-nav-item">
            <Code2 size={16} />
            <span>Problem Bank</span>
          </Link>
          <Link to="/practice" className="ds-nav-item">
            <PlaySquare size={16} />
            <span>Practice Arena</span>
          </Link>
          <Link to="/typing" className="ds-nav-item">
            <Zap size={16} />
            <span>Typing Speed</span>
          </Link>
          <Link to="/leaderboard" className="ds-nav-item">
            <Trophy size={16} />
            <span>Leaderboard</span>
          </Link>
          <Link to={`/profile/${user.enrollment}`} className="ds-nav-item">
            <Award size={16} />
            <span>Codolio Profile</span>
          </Link>
        </nav>

        {/* Daily Challenge Widget */}
        {dailyChallenge?.problemId && (
          <div className="ds-daily-card">
            <div className="ds-daily-tag">
              <Sparkles size={12} />
              <span>Daily Challenge</span>
            </div>
            <div className="ds-daily-title">{dailyChallenge.problemId.title}</div>
            <div className="ds-daily-meta">
              <span className={`diff-chip ${dailyChallenge.problemId.difficulty || 'medium'}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                {dailyChallenge.problemId.difficulty}
              </span>
              <span style={{ marginLeft: '6px' }}>{dailyChallenge.solvers?.length || 0} solved</span>
            </div>
            <Link to="/practice">
              <button className="btn btn-primary btn-sm" style={{ width: '100%', fontSize: '11px' }}>
                Solve Today →
              </button>
            </Link>
          </div>
        )}
      </aside>

      {/* ─── MAIN DASHBOARD CONTENT ─── */}
      <main className="dash-main">
        {/* Top Welcome Hero Banner */}
        <div className="dash-hero">
          <div>
            <div className="dash-hero-title">
              Ready to code, {user.name?.split(' ')[0]}? 🚀
            </div>
            <div className="dash-hero-sub">
              You are ranked <strong style={{ color: '#a5b4fc' }}>#{user.rank || 1}</strong> in your cohort with a <strong style={{ color: '#fb923c' }}>{user.streak || 0}-day</strong> streak.
            </div>
          </div>
          <div className="dash-hero-actions">
            <button className="btn btn-primary" onClick={() => navigate('/practice')}>
              <PlaySquare size={15} />
              <span>Practice Arena</span>
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/problems')}>
              <Code2 size={15} />
              <span>Browse Problems</span>
            </button>
          </div>
        </div>

        {/* Live Contest Banner Alert */}
        {liveContests.map(lc => (
          <div className="live-banner" key={lc.id}>
            <div className="live-dot-wrap">
              <span className="live-dot" />
              <span className="live-label">🔴 LIVE ARENA</span>
            </div>
            <div className="live-info">
              <div className="live-title">{lc.title}</div>
              <div className="live-meta">
                {lc.problems?.length || 6} Problems · {lc.participants || 0} students competing · Ends in {lc.duration}m
              </div>
            </div>
            <button className="btn btn-gradient btn-lg" onClick={() => navigate(`/contest/${lc.id}`)}>
              <span>Enter Arena</span>
              <ArrowUpRight size={16} />
            </button>
          </div>
        ))}

        {/* CP Statistics 4-Cards Grid */}
        <div className="stats-grid">
          {/* Rating Card */}
          <div className="stat-card">
            <div className="stat-card-head">
              <span className="stat-label">Contest Rating</span>
              <div className="stat-icon-wrap" style={{ background: 'var(--primary-light)', color: '#818cf8' }}>
                <Trophy size={18} />
              </div>
            </div>
            <div className="stat-val" style={{ color: '#a5b4fc' }}>{user.rating || 1200}</div>
            <div className="stat-sub">
              <span style={{ color: '#34d399', fontWeight: 700 }}>▲ +124 pts</span>
              <span>this month</span>
            </div>
          </div>

          {/* Solved Card */}
          <div className="stat-card">
            <div className="stat-card-head">
              <span className="stat-label">Problems Solved</span>
              <div className="stat-icon-wrap" style={{ background: 'var(--easy-bg)', color: '#00b8a3' }}>
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="stat-val" style={{ color: '#00b8a3' }}>{totalSolved}</div>
            <div className="stat-sub">
              <span>Across all platforms</span>
            </div>
          </div>

          {/* College Rank Card */}
          <div className="stat-card">
            <div className="stat-card-head">
              <span className="stat-label">College Standing</span>
              <div className="stat-icon-wrap" style={{ background: 'var(--teal-light)', color: '#10b981' }}>
                <Target size={18} />
              </div>
            </div>
            <div className="stat-val" style={{ color: '#34d399' }}>#{user.rank || 1}</div>
            <div className="stat-sub">
              <span style={{ color: '#a5b4fc', fontWeight: 700 }}>Top 2.5%</span>
              <span>of CE batch</span>
            </div>
          </div>

          {/* Contest Count Card */}
          <div className="stat-card">
            <div className="stat-card-head">
              <span className="stat-label">Contests Entered</span>
              <div className="stat-icon-wrap" style={{ background: 'var(--medium-bg)', color: '#f59e0b' }}>
                <Award size={18} />
              </div>
            </div>
            <div className="stat-val" style={{ color: '#fbbf24' }}>{user.contests || 0}</div>
            <div className="stat-sub">
              <span>Faculty & Weekly exams</span>
            </div>
          </div>
        </div>

        {/* Middle 2-Column: Rating Chart & LeetCode-style Problem Progress */}
        <div className="dash-grid-2col">
          {/* Rating Progression Graph */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                <Activity size={16} color="#6366f1" />
                <span>Rating Progression Curve</span>
              </div>
              <span className="badge badge-purple">Season 2025</span>
            </div>
            <div className="card-body" style={{ height: '220px' }}>
              <Line data={ratingData} options={chartOpts} />
            </div>
          </div>

          {/* Solved Problems Breakdown */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                <Target size={16} color="#00b8a3" />
                <span>Difficulty Mastery</span>
              </div>
              <Link to="/problems" style={{ fontSize: '12px', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span>All</span>
                <ChevronRight size={13} />
              </Link>
            </div>
            <div className="card-body">
              <div className="solved-breakdown-card">
                <div className="solved-donut-center">
                  <div className="solved-donut-num">{totalSolved}</div>
                  <div className="solved-donut-label">Solved Total</div>
                </div>

                <div className="diff-bars-list">
                  {/* Easy */}
                  <div className="diff-bar-item">
                    <div className="diff-bar-head">
                      <span style={{ color: '#00b8a3' }}>Easy</span>
                      <span>{easySolved} <span style={{ color: 'var(--text-3)' }}>/ {easyTotal}</span></span>
                    </div>
                    <div className="diff-bar-track">
                      <div className="diff-bar-fill" style={{ width: `${Math.min(100, (easySolved / easyTotal) * 100)}%`, background: '#00b8a3' }} />
                    </div>
                  </div>

                  {/* Medium */}
                  <div className="diff-bar-item">
                    <div className="diff-bar-head">
                      <span style={{ color: '#ffb800' }}>Medium</span>
                      <span>{medSolved} <span style={{ color: 'var(--text-3)' }}>/ {medTotal}</span></span>
                    </div>
                    <div className="diff-bar-track">
                      <div className="diff-bar-fill" style={{ width: `${Math.min(100, (medSolved / medTotal) * 100)}%`, background: '#ffb800' }} />
                    </div>
                  </div>

                  {/* Hard */}
                  <div className="diff-bar-item">
                    <div className="diff-bar-head">
                      <span style={{ color: '#ef4444' }}>Hard</span>
                      <span>{hardSolved} <span style={{ color: 'var(--text-3)' }}>/ {hardTotal}</span></span>
                    </div>
                    <div className="diff-bar-track">
                      <div className="diff-bar-fill" style={{ width: `${Math.min(100, (hardSolved / hardTotal) * 100)}%`, background: '#ef4444' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Curated Topic Playlists */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">
              <Layers size={16} color="#8b5cf6" />
              <span>Curated Study Playlists & Topic Tracks</span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Master DSA systematically</span>
          </div>
          <div className="card-body">
            <div className="topic-tracks-grid">
              {topicTracks.map(t => (
                <div key={t.name} className="topic-track-card" onClick={() => navigate(t.path)}>
                  <div className="topic-track-icon">{t.icon}</div>
                  <div>
                    <div className="topic-track-name">{t.name}</div>
                    <div className="topic-track-count">{t.count}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom 2-Column: Recent Activity & Upcoming Contests / Leaderboard */}
        <div className="dash-grid-2col">
          {/* Left Column: Recent Submissions & LeetCode Solves */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Recent Submissions Table */}
            <div className="card">
              <div className="card-head">
                <div className="card-title">
                  <Clock size={16} color="#a5b4fc" />
                  <span>Recent Submissions</span>
                </div>
                <Link to="/practice" style={{ fontSize: '12px', color: '#a5b4fc' }}>Open Arena →</Link>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Verdict</th>
                      <th>Problem</th>
                      <th>Lang</th>
                      <th>Time</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '2.5rem' }}>
                          No submissions yet. Start solving in Practice Arena!
                        </td>
                      </tr>
                    )}
                    {submissions.map(s => (
                      <tr key={s.id || s._id}>
                        <td>
                          <span className={VERDICTS[s.verdict] || 'verdict-wa'}>
                            {s.verdict === 'AC' ? '✓ AC' : s.verdict}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text)' }}>
                          {s.problemTitle || s.problemId?.title || 'Problem'}
                        </td>
                        <td className="mono" style={{ fontSize: '12px', color: 'var(--text-2)' }}>{s.language}</td>
                        <td className="mono" style={{ fontSize: '12px', color: 'var(--text-3)' }}>{s.time ? `${s.time}ms` : '—'}</td>
                        <td style={{ color: 'var(--text-3)', fontSize: '12px' }}>
                          {new Date(s.timestamp).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recently Solved on LeetCode */}
            {user?.leetcode && (
              <div className="card">
                <div className="card-head">
                  <div className="card-title">
                    <span style={{ fontSize: '16px' }}>🟠</span>
                    <span>Recent LeetCode Solves</span>
                    {lcSyncing && <span style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 500 }}>syncing…</span>}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                    {lcLastSync ? `Synced ${Math.round((Date.now() - lcLastSync.getTime()) / 60000)}m ago` : ''}
                  </span>
                </div>
                {lcRecentSolves.length > 0 ? (
                  <div style={{ padding: '0 1rem 1rem' }}>
                    {lcRecentSolves.map((s, i) => (
                      <div key={s.id || i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < lcRecentSolves.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <CheckCircle2 size={15} color="#ffa116" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{s.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                            {s.lang} · {new Date(parseInt(s.timestamp) * 1000).toLocaleDateString()}
                          </div>
                        </div>
                        <a href={`https://leetcode.com/problems/${s.titleSlug}/`} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#ffa116', fontWeight: 600 }}>
                          View ↗
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
                    {solvedSlugs.length > 0 ? `${solvedSlugs.length} problems solved on LeetCode ✓` : 'No recent LeetCode solves detected'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Upcoming Contests & Mini Leaderboard */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Upcoming Contests */}
            <div className="card">
              <div className="card-head">
                <div className="card-title">
                  <Calendar size={16} color="#fbbf24" />
                  <span>Scheduled Contests</span>
                </div>
              </div>
              <div className="card-body">
                <div className="upcoming-contests-list">
                  {upcoming.length === 0 && (
                    <div style={{ color: 'var(--text-3)', textAlign: 'center', padding: '1rem' }}>
                      No scheduled contests at the moment.
                    </div>
                  )}
                  {upcoming.map(c => (
                    <div key={c.id} className="upcoming-contest-card">
                      <div className="upcoming-contest-header">
                        <div>
                          <div className="upcoming-contest-title">{c.title}</div>
                          <div className="upcoming-contest-meta">
                            {new Date(c.startTime).toLocaleDateString()} · {c.duration} mins · {c.problems?.length || 4} problems
                          </div>
                        </div>
                        {c.isRegistered ? (
                          <span className="badge badge-teal">Registered ✓</span>
                        ) : (
                          <button className="btn btn-primary btn-sm" onClick={() => registerForContest(c)}>
                            Register
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Coders Leaderboard Preview */}
            <div className="card">
              <div className="card-head">
                <div className="card-title">
                  <Trophy size={16} color="#fbbf24" />
                  <span>Cohort Leaderboard</span>
                </div>
                <Link to="/leaderboard" style={{ fontSize: '12px', color: '#a5b4fc' }}>Full Rankings →</Link>
              </div>
              <div className="lb-mini-list">
                {leaderboard.map((s, i) => (
                  <div key={s.id || s._id} className={`lb-mini-item ${s.enrollment === user.enrollment ? 'is-me' : ''}`}>
                    <div className="lb-mini-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</div>
                    <div className="lb-mini-avatar">{s.avatar || s.name[0]}</div>
                    <div className="lb-mini-info">
                      <div className="lb-mini-name">{s.name} {s.enrollment === user.enrollment && '(You)'}</div>
                      <div className="lb-mini-sub">{s.solved || 0} solved · {s.streak || 0}🔥</div>
                    </div>
                    <div className="lb-mini-rating">{s.rating || 1200}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}



