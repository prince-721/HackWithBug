import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import './DevDashboard.css';

ChartJS.register(BarElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function DevDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contests, setContests] = useState([]);
  const [problems, setProblems] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContest, setSelectedContest] = useState(null);
  const [aiSettings, setAiSettings] = useState({});
  const [announcement, setAnnouncement] = useState('');
  const [importantAnn, setImportantAnn] = useState(false);
  const [sendingAnn, setSendingAnn] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [contestFilter, setContestFilter] = useState('all');

  useEffect(() => {
    Promise.all([api.get('/contests'), api.get('/problems'), api.get('/leaderboard')])
      .then(([c,p,l]) => { setContests(c.data); setProblems(p.data); setLeaderboard(l.data); })
      .finally(() => setLoading(false));
  }, []);

  const duplicateContest = async (contestId) => {
    toast.loading('Duplicating contest & problems…', { id: 'dup' });
    try {
      await api.post(`/contests/${contestId}/duplicate`);
      const r = await api.get('/contests');
      setContests(r.data);
      toast.success('Contest duplicated as Draft!', { id: 'dup' });
    } catch {
      toast.error('Duplication failed.', { id: 'dup' });
    }
  };

  const deleteContest = async (id) => {
    if (!window.confirm('Delete this contest?')) return;
    try {
      await api.delete(`/contests/${id}`);
      setContests(prev => prev.filter(c => c.id !== id));
      toast.success('Deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const runPlagiarism = async (contestId) => {
    toast.loading('Running plagiarism analysis…', { id: 'plag' });
    try {
      const r = await api.post('/plagiarism/analyze', { contestId });
      toast.success(`Found ${r.data.newPairs} new suspicious pairs`, { id: 'plag' });
      navigate(`/dev/plagiarism/${contestId}`);
    } catch {
      toast.error('Analysis failed', { id: 'plag' });
    }
  };

  const openAIPanel = (contest) => {
    setSelectedContest(contest);
    setAiSettings({
      aiEnabled: contest.aiEnabled ?? true,
      aiChat: contest.aiChat ?? true,
      aiHints: contest.aiHints ?? true,
      aiReview: contest.aiReview ?? true,
      aiExplain: contest.aiExplain ?? true,
    });
    setShowAIPanel(true);
  };

  const saveAISettings = async () => {
    try {
      await api.patch(`/contests/${selectedContest.id}/ai-settings`, aiSettings);
      setContests(prev => prev.map(c => c.id === selectedContest.id ? { ...c, ...aiSettings } : c));
      toast.success('AI settings saved!');
      setShowAIPanel(false);
    } catch {
      toast.error('Failed to save AI settings');
    }
  };

  const sendAnnouncement = async () => {
    if (!announcement.trim() || !selectedContest) return;
    setSendingAnn(true);
    try {
      await api.post(`/contests/${selectedContest.id}/announce`, { text: announcement, important: importantAnn });
      toast.success('Announcement sent!');
      setAnnouncement('');
      setImportantAnn(false);
    } catch {
      toast.error('Failed to send announcement');
    } finally {
      setSendingAnn(false);
    }
  };

  const barData = {
    labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    datasets: [
      { label: 'AC', data: [120,95,180,140,230,200,45], backgroundColor: '#1D9E75', borderRadius: 4 },
      { label: 'WA', data: [60,45,80,65,95,88,20], backgroundColor: '#E24B4A', borderRadius: 4 },
      { label: 'TLE', data: [20,15,30,22,35,28,8], backgroundColor: '#BA7517', borderRadius: 4 },
    ]
  };

  const doughnutData = {
    labels: ['Active','Occasional','Inactive'],
    datasets: [{ data: [720,360,120], backgroundColor: ['#7F77DD','#1D9E75','#BA7517'], borderWidth: 0 }]
  };

  const liveContests = contests.filter(c => c.status === 'live');
  const scheduledContests = contests.filter(c => c.status === 'scheduled');
  const filteredContests = contestFilter === 'all' ? contests : contests.filter(c => c.status === contestFilter);

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>;

  // Sidebar navigation structure — each item has a real handler
  const sidebarSections = [
    {
      label: 'Overview',
      items: [
        { icon: '📊', label: 'Dashboard', handler: () => setActiveSection('dashboard') },
        { icon: '📈', label: 'Analytics', handler: () => setActiveSection('analytics') },
        { icon: '⚡', label: 'Live Activity', handler: () => { setActiveSection('contests'); setContestFilter('live'); } },
      ]
    },
    {
      label: 'Contests',
      items: [
        { icon: '🏆', label: 'All Contests', handler: () => { setActiveSection('contests'); setContestFilter('all'); } },
        { icon: '🔴', label: 'Live Now', handler: () => { setActiveSection('contests'); setContestFilter('live'); } },
        { icon: '📅', label: 'Scheduled', handler: () => { setActiveSection('contests'); setContestFilter('scheduled'); } },
      ]
    },
    {
      label: 'Problems',
      items: [
        { icon: '✏️', label: 'Problem Editor', handler: () => navigate('/dev/problem/new') },
        { icon: '🗃', label: 'Problem Bank', handler: () => setActiveSection('problems') },
        { icon: '🧪', label: 'Test Cases', handler: () => setActiveSection('problems') },
      ]
    },
    {
      label: 'Reports',
      items: [
        { icon: '🛡', label: 'Plagiarism', handler: () => navigate('/dev/plagiarism') },
        { icon: '📋', label: 'Leaderboard', handler: () => setActiveSection('leaderboard') },
        { icon: '📹', label: 'Proctor Logs', handler: () => setActiveSection('proctoring') },
      ]
    },
  ];

  return (
    <div className="dev-layout">
      {/* SIDEBAR */}
      <aside className="dev-sidebar">
        <div style={{ padding: '12px', fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', borderBottom: '0.5px solid var(--border)' }}>
          DEVELOPER CONSOLE
        </div>
        {sidebarSections.map(({ label, items }) => (
          <div key={label} style={{ padding: '8px 0' }}>
            <div style={{ padding: '4px 14px', fontSize: '10px', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              {label}
            </div>
            {items.map(({ icon, label: itemLabel, handler }) => (
              <button
                key={itemLabel}
                className="dev-nav-item"
                onClick={handler}
                style={{
                  width: '100%', textAlign: 'left', border: 'none',
                  background: 'transparent', cursor: 'pointer',
                  font: 'inherit', padding: 0,
                }}
              >
                {icon} {itemLabel}
              </button>
            ))}
          </div>
        ))}
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ padding: '1.5rem', background: 'var(--bg-3)', overflowY: 'auto' }}>
        {/* Page header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800 }}>Good morning, {user.name} 👋</h1>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>
              VGEC CE Department · {contests.length} contests · {leaderboard.length} students
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/dev/plagiarism"><button className="btn btn-ghost btn-sm">🛡 Plagiarism</button></Link>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/dev/contest/new')}>+ New Contest</button>
          </div>
        </div>

        {/* ─── DASHBOARD ─── */}
        {activeSection === 'dashboard' && (
          <>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '1rem' }}>
              {[
                [contests.length, 'Contests', '↑ 2 this sem', 'var(--purple)', '🏆'],
                [leaderboard.length, 'Students', '↑ 120 this month', 'var(--teal)', '👥'],
                [problems.length, 'Problems', '↑ 18 this week', 'var(--amber)', '📝'],
                [liveContests.length || 0, 'Live Now', `${scheduledContests.length} scheduled`, 'var(--red)', '🔴'],
              ].map(([v,l,s,c,icon]) => (
                <div key={l} className="card card-body" style={{ borderLeft: `3px solid ${c}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '22px' }}>{icon}</div>
                    <div style={{ fontSize: '11px', padding: '2px 8px', border: `0.5px solid ${c}`, borderRadius: '20px', color: c }}>{s}</div>
                  </div>
                  <div style={{ fontSize: '30px', fontWeight: 800, color: c }}>{v}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{l}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              {/* Contests table */}
              <div className="card">
                <div className="card-head">
                  <div className="card-title">Contests</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dev/contest/new')}>+ New</button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead><tr><th>Name</th><th>Date</th><th>Students</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {contests.slice(0, 6).map(c => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 600, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</td>
                          <td style={{ fontSize: '12px', color: 'var(--text-3)' }}>{new Date(c.startTime).toLocaleDateString()}</td>
                          <td>{c.participants || 0}</td>
                          <td><span className={`badge ${c.status === 'live' ? 'badge-teal' : c.status === 'scheduled' ? 'badge-purple' : 'badge-gray'}`}>{c.status === 'live' ? '🔴 ' : ''}{c.status}</span></td>
                          <td style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/dev/contest/${c.id}`)}>Edit</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => duplicateContest(c.id)}>Copy</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/contest/${c.id}`)}>Preview</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => runPlagiarism(c.id)}>🛡</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => openAIPanel(c)} title="AI Settings">✨</button>
                            {c.status !== 'live' && <button className="btn btn-danger btn-sm" onClick={() => deleteContest(c.id)}>Del</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {contests.length > 6 && (
                    <div style={{ textAlign: 'center', padding: '8px' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setActiveSection('contests'); setContestFilter('all'); }}>
                        View all {contests.length} contests →
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick actions + participation */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="card card-body">
                  <div className="card-title" style={{ marginBottom: '10px' }}>Quick actions</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      { label: 'Add problem', sub: 'Problem bank', icon: '✏️', onClick: () => navigate('/dev/problem/new') },
                      { label: 'View flags', sub: '3 pending', icon: '🛡', onClick: () => navigate('/dev/plagiarism') },
                      { label: 'Leaderboard', sub: 'Full rankings', icon: '📊', onClick: () => setActiveSection('leaderboard') },
                      { label: 'Proctor logs', sub: 'Recent sessions', icon: '📹', onClick: () => setActiveSection('proctoring') },
                    ].map(({ label, sub, icon, onClick }) => (
                      <div
                        key={label}
                        className="qa-btn"
                        style={{ padding: '12px', borderRadius: '9px', border: '0.5px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={onClick}
                      >
                        <div style={{ fontSize: '20px', width: 34, height: 34, borderRadius: '8px', background: 'var(--purple-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
                        <div><div style={{ fontSize: '12px', fontWeight: 700 }}>{label}</div><div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{sub}</div></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card card-body">
                  <div className="card-title" style={{ marginBottom: '10px' }}>Participation</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Doughnut data={doughnutData} options={{ responsive: false, plugins: { legend: { display: false } } }} width={80} height={80}/>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {['Active 60%', 'Occasional 30%', 'Inactive 10%'].map((l, i) => (
                        <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                          <div style={{ width: 10, height: 10, borderRadius: '2px', background: ['#7F77DD','#1D9E75','#BA7517'][i] }}/>
                          {l}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submissions chart */}
            <div className="card card-body" style={{ marginBottom: '1rem' }}>
              <div className="card-title" style={{ marginBottom: '12px' }}>Submissions this week</div>
              <Bar data={barData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { x: { grid: { display: false }, stacked: true }, y: { grid: { color: 'rgba(0,0,0,.05)' }, stacked: true } } }} height={60}/>
            </div>

            {/* Cohort heatmap */}
            <div className="card card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div className="card-title">Cohort skill heatmap — CE Sem 5</div>
                <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Darker = more students strong in this topic</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ fontSize: '11px', borderCollapse: 'collapse', minWidth: '500px' }}>
                  <thead><tr><th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text-3)' }}>Topic</th>{['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6'].map(s => <th key={s} style={{ padding: '6px 10px', color: 'var(--text-3)' }}>{s}</th>)}</tr></thead>
                  <tbody>
                    {['Arrays','DP','Graphs','Trees','Math','Strings','Greedy','Binary Search'].map(topic => (
                      <tr key={topic}>
                        <td style={{ padding: '5px 10px', color: 'var(--text-2)' }}>{topic}</td>
                        {[0,1,2,3,4,5].map(i => {
                          const v = Math.floor(25 + Math.random() * 70);
                          return (
                            <td key={i} style={{ padding: '4px' }}>
                              <div style={{ width: 48, height: 26, borderRadius: 5, background: `rgba(127,119,221,${(v/100).toFixed(2)})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: v > 50 ? '#534AB7' : 'var(--text-3)' }}>{v}%</div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ─── ANALYTICS ─── */}
        {activeSection === 'analytics' && (
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '1rem' }}>📈 Analytics Overview</h2>
            <div className="card card-body" style={{ marginBottom: '1rem' }}>
              <div className="card-title" style={{ marginBottom: '12px' }}>Submission trends this week</div>
              <Bar data={barData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { x: { grid: { display: false }, stacked: true }, y: { grid: { color: 'rgba(0,0,0,.05)' }, stacked: true } } }} height={80}/>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="card card-body">
                <div className="card-title" style={{ marginBottom: '10px' }}>Student participation</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', justifyContent: 'center' }}>
                  <Doughnut data={doughnutData} options={{ responsive: false, plugins: { legend: { display: false } } }} width={120} height={120}/>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[['Active', '60%', '#7F77DD'], ['Occasional', '30%', '#1D9E75'], ['Inactive', '10%', '#BA7517']].map(([l,p,c]) => (
                      <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                        <div style={{ width: 12, height: 12, borderRadius: '3px', background: c }}/>
                        <span style={{ color: 'var(--text-2)' }}>{l}</span>
                        <span style={{ fontWeight: 700, color: c, marginLeft: 'auto' }}>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="card card-body">
                <div className="card-title" style={{ marginBottom: '10px' }}>Cohort summary</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    ['Total students enrolled', leaderboard.length],
                    ['Active contests', liveContests.length],
                    ['Total problems', problems.length],
                    ['Scheduled contests', scheduledContests.length],
                  ].map(([l,v]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '0.5px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-3)' }}>{l}</span>
                      <span style={{ fontWeight: 700, color: 'var(--text)' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── CONTESTS ─── */}
        {activeSection === 'contests' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800 }}>🏆 Contests</h2>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[['all', 'All'], ['live', '🔴 Live'], ['scheduled', '📅 Scheduled'], ['ended', '✅ Ended']].map(([val, label]) => (
                  <button key={val} className={`btn btn-sm ${contestFilter === val ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setContestFilter(val)}>{label}</button>
                ))}
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/dev/contest/new')}>+ New Contest</button>
              </div>
            </div>
            <div className="card">
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead><tr><th>Name</th><th>Start Date</th><th>Duration</th><th>Students</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredContests.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.title}</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-3)' }}>{new Date(c.startTime).toLocaleString()}</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-3)' }}>{c.duration} min</td>
                        <td>{c.participants || 0}</td>
                        <td><span className={`badge ${c.status === 'live' ? 'badge-teal' : c.status === 'scheduled' ? 'badge-purple' : 'badge-gray'}`}>{c.status === 'live' ? '🔴 ' : ''}{c.status}</span></td>
                        <td style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/dev/contest/${c.id}`)}>Edit</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => duplicateContest(c.id)}>Copy</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/contest/${c.id}`)}>Preview</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => runPlagiarism(c.id)}>🛡</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => openAIPanel(c)}>✨</button>
                          {c.status !== 'live' && <button className="btn btn-danger btn-sm" onClick={() => deleteContest(c.id)}>Del</button>}
                        </td>
                      </tr>
                    ))}
                    {filteredContests.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '2rem' }}>No {contestFilter === 'all' ? '' : contestFilter} contests found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── PROBLEMS ─── */}
        {activeSection === 'problems' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800 }}>📝 Problem Bank</h2>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/dev/problem/new')}>+ Add Problem</button>
            </div>
            <div className="card">
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead><tr><th>#</th><th>Title</th><th>Difficulty</th><th>Tags</th><th>Points</th><th>Actions</th></tr></thead>
                  <tbody>
                    {problems.map((p, i) => (
                      <tr key={p.id || p._id}>
                        <td style={{ color: 'var(--text-3)', fontSize: '12px' }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{p.title}</td>
                        <td><span className={`badge ${p.difficulty === 'easy' ? 'badge-teal' : p.difficulty === 'hard' ? 'badge-red' : 'badge-purple'}`}>{p.difficulty}</span></td>
                        <td style={{ fontSize: '11px', color: 'var(--text-3)' }}>{(p.tags || []).slice(0, 2).join(', ')}</td>
                        <td style={{ fontWeight: 700, color: 'var(--amber)' }}>{p.points}</td>
                        <td><button className="btn btn-ghost btn-sm" onClick={() => navigate(`/dev/problem/${p.id || p._id}`)}>Edit</button></td>
                      </tr>
                    ))}
                    {problems.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '2rem' }}>No problems yet. <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dev/problem/new')}>Add one →</button></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── LEADERBOARD ─── */}
        {activeSection === 'leaderboard' && (
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '1rem' }}>📋 Student Leaderboard</h2>
            <div className="card">
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead><tr><th>Rank</th><th>Student</th><th>Rating</th><th>Solved</th><th>Contests</th><th>Streak</th></tr></thead>
                  <tbody>
                    {leaderboard.map((s, i) => (
                      <tr key={s.id || s._id}>
                        <td style={{ fontWeight: 700, fontSize: '14px' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{s.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{s.enrollment}</div>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--purple)' }}>{s.rating || 0}</td>
                        <td>{s.solved || 0}</td>
                        <td>{s.contests || 0}</td>
                        <td style={{ color: 'var(--amber)', fontWeight: 600 }}>{s.streak || 0}🔥</td>
                      </tr>
                    ))}
                    {leaderboard.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '2rem' }}>No student data yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── PROCTORING ─── */}
        {activeSection === 'proctoring' && (
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '1rem' }}>📹 Proctoring Logs</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '1rem' }}>
              {[['Tab Switches', '23', '⚠️', 'var(--amber)'], ['Paste Events', '8', '📋', 'var(--purple)'], ['Fullscreen Exits', '5', '🔲', 'var(--red)']].map(([l,v,icon,c]) => (
                <div key={l} className="card card-body" style={{ borderLeft: `3px solid ${c}` }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>{icon}</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: c }}>{v}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{l}</div>
                </div>
              ))}
            </div>
            <div className="card card-body">
              <div className="card-title" style={{ marginBottom: '12px' }}>Recent Violation Events</div>
              {[
                { type: 'tabSwitch', student: 'Sample Student', time: '2 mins ago', detail: 'Switched to another tab' },
                { type: 'paste', student: 'Another Student', time: '5 mins ago', detail: 'Pasted code block' },
                { type: 'fullscreenExit', student: 'Third Student', time: '8 mins ago', detail: 'Exited fullscreen mode' },
              ].map((log, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '0.5px solid var(--border)' }}>
                  <div style={{ fontSize: '20px' }}>{log.type === 'tabSwitch' ? '⚠️' : log.type === 'paste' ? '📋' : '🔲'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{log.student}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{log.detail}</div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{log.time}</div>
                </div>
              ))}
              <div style={{ textAlign: 'center', padding: '8px', color: 'var(--text-3)', fontSize: '12px' }}>
                For full logs, use the Plagiarism & Proctoring Report →
                <Link to="/dev/plagiarism"><button className="btn btn-ghost btn-sm" style={{ marginLeft: '8px' }}>Open Report →</button></Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* AI SETTINGS MODAL */}
      {showAIPanel && selectedContest && (
        <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) setShowAIPanel(false); }}>
          <div className="modal" style={{ maxWidth: '480px' }}>
            <div style={{ padding: '1.25rem', borderBottom: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 800 }}>✨ AI Settings — {selectedContest.title}</div>
              <button style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-3)' }} onClick={() => setShowAIPanel(false)}>×</button>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-3)', border: '0.5px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ fontWeight: 700 }}>AI Features Master Switch</div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={aiSettings.aiEnabled || false} onChange={e => setAiSettings({ ...aiSettings, aiEnabled: e.target.checked })} style={{ width: 16, height: 16 }}/>
                    <span style={{ fontSize: '12px', color: aiSettings.aiEnabled ? 'var(--teal)' : 'var(--red)', fontWeight: 700 }}>{aiSettings.aiEnabled ? 'Enabled' : 'Disabled'}</span>
                  </label>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>When disabled, all AI features are hidden from students</div>
              </div>
              {[['aiChat','💬 AI Chat','Students can chat with AI assistant'], ['aiHints','💡 AI Hints','Students can request problem hints'], ['aiReview','🔍 AI Code Review','Auto-review on wrong submissions'], ['aiExplain','📖 AI Explanations','Students can get editorial explanations']].map(([key, label, desc]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid var(--border)', opacity: aiSettings.aiEnabled ? 1 : 0.4 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{desc}</div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={aiSettings[key] || false} disabled={!aiSettings.aiEnabled} onChange={e => setAiSettings({ ...aiSettings, [key]: e.target.checked })} style={{ width: 16, height: 16 }}/>
                    <span style={{ fontSize: '11px', color: aiSettings[key] ? 'var(--teal)' : 'var(--text-3)', fontWeight: 600 }}>{aiSettings[key] ? 'On' : 'Off'}</span>
                  </label>
                </div>
              ))}
              <div style={{ background: 'var(--bg-3)', borderRadius: '10px', border: '0.5px solid var(--border)', padding: '12px' }}>
                <div style={{ fontWeight: 700, marginBottom: '8px' }}>📢 Send Announcement</div>
                <textarea className="inp" rows={3} placeholder="Announcement text to broadcast to all students…" value={announcement} onChange={e => setAnnouncement(e.target.value)} style={{ width: '100%', resize: 'none', boxSizing: 'border-box', fontSize: '13px' }}/>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={importantAnn} onChange={e => setImportantAnn(e.target.checked)}/> Mark as important
                  </label>
                  <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={sendAnnouncement} disabled={sendingAnn || !announcement.trim()}>
                    {sendingAnn ? 'Sending…' : '📢 Broadcast'}
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setShowAIPanel(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveAISettings}>Save AI Settings →</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
