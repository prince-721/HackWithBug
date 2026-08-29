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
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContest, setSelectedContest] = useState(null);
  const [aiSettings, setAiSettings] = useState({});
  const [announcement, setAnnouncement] = useState('');
  const [importantAnn, setImportantAnn] = useState(false);
  const [sendingAnn, setSendingAnn] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [contestFilter, setContestFilter] = useState('all');
  const [studentSearch, setStudentSearch] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  // Contest Submissions Viewer state
  const [contestSubsData, setContestSubsData] = useState(null);
  const [contestSubsLoading, setContestSubsLoading] = useState(false);
  const [selectedContestForSubs, setSelectedContestForSubs] = useState(null);
  const [expandedSubStudentId, setExpandedSubStudentId] = useState(null);
  const [expandedSubCode, setExpandedSubCode] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/contests'),
      api.get('/problems'),
      api.get('/leaderboard'),
      api.get('/profile/all-students').catch(() => ({ data: [] }))
    ])
      .then(([c, p, l, st]) => {
        setContests(c.data);
        setProblems(p.data);
        setLeaderboard(l.data);
        setAllStudents(st.data || []);
      })
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
        { icon: '🎓', label: 'Student Tracker', handler: () => setActiveSection('students') },
        { icon: '📄', label: 'Contest Submissions', handler: () => setActiveSection('contest-submissions') },
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

        {/* ─── CONTEST SUBMISSIONS VIEWER ─── */}
        {activeSection === 'contest-submissions' && (
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '1rem' }}>📄 Contest Student Submissions</h2>
            
            {/* Contest Selector */}
            <div className="card card-body" style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>Select a Contest</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {contests.map(c => (
                  <button
                    key={c.id}
                    className={`btn btn-sm ${selectedContestForSubs === c.id ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={async () => {
                      setSelectedContestForSubs(c.id);
                      setContestSubsLoading(true);
                      setContestSubsData(null);
                      setExpandedSubStudentId(null);
                      setExpandedSubCode(null);
                      try {
                        const r = await api.get(`/contests/${c.id}/student-submissions`);
                        setContestSubsData(r.data);
                      } catch (err) {
                        toast.error('Failed to load submissions');
                      } finally {
                        setContestSubsLoading(false);
                      }
                    }}
                  >
                    <span className={`badge ${c.status === 'live' ? 'badge-teal' : c.status === 'ended' ? 'badge-gray' : 'badge-purple'}`} style={{ fontSize: '9px', marginRight: '4px' }}>{c.status}</span>
                    {c.title}
                  </button>
                ))}
              </div>
            </div>

            {contestSubsLoading && (
              <div className="card card-body" style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="spinner" style={{ margin: '0 auto 12px' }} />
                <div style={{ color: 'var(--text-3)', fontSize: '13px' }}>Loading student submissions...</div>
              </div>
            )}

            {contestSubsData && !contestSubsLoading && (
              <>
                {/* KPI Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '1rem' }}>
                  {[
                    [contestSubsData.totalStudents, 'Students', '👥', 'var(--purple)'],
                    [contestSubsData.totalSubmissions, 'Total Submissions', '📝', 'var(--teal)'],
                    [contestSubsData.contest?.problems?.length || 0, 'Problems', '📄', 'var(--amber)'],
                    [contestSubsData.students?.filter(s => s.totalAC > 0).length || 0, 'Students with AC', '✅', 'var(--green, #2cbb5d)'],
                  ].map(([v, l, icon, c]) => (
                    <div key={l} className="card card-body" style={{ borderLeft: `3px solid ${c}` }}>
                      <div style={{ fontSize: '20px', marginBottom: '4px' }}>{icon}</div>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: c }}>{v}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{l}</div>
                    </div>
                  ))}
                </div>

                {/* Students Table */}
                <div className="card">
                  <div className="card-head">
                    <div className="card-title">🎓 {contestSubsData.contest?.title} — Student Submissions</div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Student</th>
                          <th>Enrollment</th>
                          <th>Submissions</th>
                          <th>AC</th>
                          <th>Problems Solved</th>
                          <th>Proctoring</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contestSubsData.students?.map((student, idx) => {
                          const isExpanded = expandedSubStudentId === student.studentId;
                          const proc = student.proctoring;
                          return (
                            <React.Fragment key={student.studentId}>
                              <tr>
                                <td style={{ fontWeight: 700 }}>{idx + 1}</td>
                                <td>
                                  <div style={{ fontWeight: 700 }}>{student.name}</div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Sem {student.semester || '-'}</div>
                                </td>
                                <td style={{ fontFamily: 'var(--mono)', fontSize: '12px' }}>{student.enrollment}</td>
                                <td style={{ fontWeight: 600 }}>{student.totalSubmissions}</td>
                                <td>
                                  <span className="badge badge-teal" style={{ fontWeight: 700 }}>{student.totalAC}</span>
                                </td>
                                <td>
                                  {contestSubsData.contest?.problems?.map(p => {
                                    const probId = p.id?.toString();
                                    const bestScore = student.bestScores?.[probId];
                                    return (
                                      <span key={probId} style={{
                                        display: 'inline-block', width: '24px', height: '24px', lineHeight: '24px',
                                        textAlign: 'center', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                                        marginRight: '3px',
                                        background: bestScore === 100 ? '#2cbb5d20' : bestScore > 0 ? '#f0a50020' : 'var(--bg-3)',
                                        color: bestScore === 100 ? '#2cbb5d' : bestScore > 0 ? '#f0a500' : 'var(--text-3)',
                                        border: `1px solid ${bestScore === 100 ? '#2cbb5d40' : bestScore > 0 ? '#f0a50040' : 'var(--border)'}`
                                      }} title={`${p.title}: ${bestScore || 0}%`}>
                                        {bestScore === 100 ? '✓' : bestScore > 0 ? '◐' : '✗'}
                                      </span>
                                    );
                                  })}
                                </td>
                                <td>
                                  {proc ? (
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                      {proc.disqualified && <span className="badge badge-red" style={{ fontSize: '9px' }}>DQ</span>}
                                      {proc.totalAlerts > 0 ? (
                                        <span style={{ fontSize: '11px', color: proc.totalAlerts > 3 ? 'var(--red)' : 'var(--amber)', fontWeight: 600 }}>
                                          ⚠ {proc.totalAlerts} alerts
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Clean</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>N/A</span>
                                  )}
                                </td>
                                <td>
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => {
                                      setExpandedSubStudentId(isExpanded ? null : student.studentId);
                                      setExpandedSubCode(null);
                                    }}
                                  >
                                    {isExpanded ? 'Hide ▲' : 'View Code 👇'}
                                  </button>
                                </td>
                              </tr>

                              {/* Expanded student submissions detail */}
                              {isExpanded && (
                                <tr>
                                  <td colSpan={8} style={{ background: 'var(--bg-3)', padding: '16px', borderBottom: '2px solid var(--purple)' }}>
                                    {/* Proctoring Summary */}
                                    {proc && proc.totalAlerts > 0 && (
                                      <div style={{ marginBottom: '12px', padding: '10px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>🛡 Proctoring Summary</div>
                                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                                          <span>Tab Switches: <strong style={{ color: 'var(--amber)' }}>{proc.tabSwitches}</strong></span>
                                          <span>Paste Events: <strong style={{ color: 'var(--purple)' }}>{proc.pasteEvents}</strong></span>
                                          <span>Fullscreen Exits: <strong style={{ color: 'var(--red)' }}>{proc.fullscreenExits}</strong></span>
                                          {proc.disqualified && <span className="badge badge-red">Disqualified: {proc.disqualifiedReason}</span>}
                                        </div>
                                      </div>
                                    )}

                                    {/* Individual Submissions */}
                                    <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>📝 All Submissions ({student.submissions.length})</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      {student.submissions.map((sub, si) => (
                                        <div key={sub.id || si} style={{ padding: '10px', borderRadius: '8px', background: 'var(--bg)', border: '0.5px solid var(--border)' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              <span className={`badge ${sub.verdict === 'AC' ? 'badge-teal' : sub.verdict === 'CE' ? 'badge-gray' : 'badge-red'}`}>
                                                {sub.verdict}
                                              </span>
                                              <span style={{ fontWeight: 700, fontSize: '13px' }}>{sub.problemTitle}</span>
                                              <span className={`badge ${sub.problemDifficulty === 'easy' ? 'badge-teal' : sub.problemDifficulty === 'hard' ? 'badge-red' : 'badge-purple'}`} style={{ fontSize: '9px' }}>
                                                {sub.problemDifficulty}
                                              </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-3)' }}>
                                              <span>Tests: <strong style={{ color: 'var(--text)' }}>{sub.testsPassed}/{sub.totalTests}</strong></span>
                                              <span>Score: <strong style={{ color: sub.partialScore === 100 ? '#2cbb5d' : 'var(--amber)' }}>{sub.partialScore}%</strong></span>
                                              <span>{sub.language}</span>
                                              <span>{new Date(sub.timestamp).toLocaleString()}</span>
                                            </div>
                                          </div>
                                          
                                          {/* Code toggle */}
                                          <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                              className="btn btn-ghost btn-sm"
                                              style={{ fontSize: '11px' }}
                                              onClick={() => setExpandedSubCode(expandedSubCode === sub.id ? null : sub.id)}
                                            >
                                              {expandedSubCode === sub.id ? '🔼 Hide Code' : '🔽 View Code'}
                                            </button>
                                          </div>

                                          {/* Code block */}
                                          {expandedSubCode === sub.id && (
                                            <div style={{ marginTop: '8px' }}>
                                              <pre style={{
                                                background: '#1e1e2e', color: '#cdd6f4', padding: '12px',
                                                borderRadius: '8px', fontSize: '12px', fontFamily: 'var(--mono)',
                                                overflowX: 'auto', maxHeight: '400px', overflowY: 'auto',
                                                whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.5
                                              }}>
                                                {sub.code}
                                              </pre>
                                              {sub.aiFeedback && (
                                                <div style={{ marginTop: '6px', padding: '8px', borderRadius: '6px', background: '#f0a50010', border: '1px solid #f0a50030', fontSize: '12px' }}>
                                                  <strong style={{ color: 'var(--amber)' }}>AI Feedback:</strong> {sub.aiFeedback}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                        {(!contestSubsData.students || contestSubsData.students.length === 0) && (
                          <tr>
                            <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '2rem' }}>
                              No submissions found for this contest.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {!selectedContestForSubs && !contestSubsLoading && (
              <div className="card card-body" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>
                Select a contest above to view student submissions, code, and test results.
              </div>
            )}
          </div>
        )}

        {/* ─── FACULTY STUDENT TRACKER (CODOLIO TYPE) ─── */}
        {activeSection === 'students' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🎓 Faculty Student Tracker (Codolio Portfolio)
                </h2>
                <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                  Full academic, contest exam, and verified multi-platform coding performance for every student
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  className="inp"
                  style={{ minWidth: '260px' }}
                  placeholder="🔍 Search student name or enrollment..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                />
              </div>
            </div>

            {/* KPI Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '1rem' }}>
              {[
                [allStudents.length || leaderboard.length, 'Total Students', 'Enrolled cohort', 'var(--purple)', '👥'],
                [allStudents.filter(s => s.verifiedPlatforms && s.verifiedPlatforms.length > 0).length, 'Verified Coding Profiles', 'Codolio connected', 'var(--teal)', '📊'],
                [allStudents.reduce((acc, s) => acc + (s.solved || 0), 0), 'Problems Solved', 'Across platforms', 'var(--amber)', '📝'],
                [allStudents.reduce((acc, s) => acc + (s.contestsParticipated || 0), 0), 'Exam Participations', 'Faculty contests', 'var(--blue)', '🏆'],
              ].map(([v, l, sub, color, icon]) => (
                <div key={l} className="card card-body" style={{ borderLeft: `3px solid ${color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontSize: '20px' }}>{icon}</div>
                    <span style={{ fontSize: '10px', background: `${color}15`, color, padding: '2px 6px', borderRadius: '10px', fontWeight: 700 }}>{sub}</span>
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color }}>{v}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Students Table */}
            <div className="card">
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Student</th>
                      <th>Enrollment</th>
                      <th>Rating</th>
                      <th>Solved</th>
                      <th>Contests / Exams</th>
                      <th>Verified Platforms</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(allStudents.length > 0 ? allStudents : leaderboard)
                      .filter(s => 
                        !studentSearch || 
                        s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
                        s.enrollment.toLowerCase().includes(studentSearch.toLowerCase())
                      )
                      .map((student, idx) => {
                        const isExpanded = expandedStudentId === (student.id || student._id);
                        const verifiedPlats = student.verifiedPlatforms || [];
                        const hasCodolio = !!student.codolio || verifiedPlats.includes('codolio');

                        return (
                          <React.Fragment key={student.id || student._id}>
                            <tr>
                              <td style={{ fontWeight: 700, fontSize: '13px' }}>#{student.rank || idx + 1}</td>
                              <td>
                                <div style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ color: student.academicStatus === 'flagged' ? '#ef4444' : undefined }}>{student.name}</span>
                                  {student.academicStatus === 'flagged' && (
                                    <span style={{ fontSize: '10px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '0.5px solid #ef4444', padding: '1px 5px', borderRadius: '8px', fontWeight: 800 }}>
                                      🚩 Flagged (Red)
                                    </span>
                                  )}
                                  {student.academicStatus === 'warning' && (
                                    <span style={{ fontSize: '10px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '0.5px solid #f59e0b', padding: '1px 5px', borderRadius: '8px', fontWeight: 800 }}>
                                      ⚠️ Warning
                                    </span>
                                  )}
                                  {hasCodolio && (
                                    <span style={{ fontSize: '10px', background: 'rgba(16,185,129,0.15)', color: '#10B981', padding: '1px 5px', borderRadius: '8px', fontWeight: 700 }} title="Codolio Verified">
                                      Codolio ✓
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>CE Sem {student.semester || 5}</div>
                              </td>
                              <td style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text-2)' }}>{student.enrollment}</td>
                              <td style={{ fontWeight: 700, color: 'var(--purple)' }}>{student.rating || 0}</td>
                              <td style={{ fontWeight: 600 }}>{student.solved || 0}</td>
                              <td>
                                <span className="badge badge-purple">
                                  {student.contestsParticipated !== undefined ? student.contestsParticipated : (student.contests || 0)} Exams
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  {student.leetcode && <span style={{ fontSize: '10px', padding: '2px 5px', borderRadius: '4px', background: '#FFA11615', color: '#FFA116', fontWeight: 700 }}>LC</span>}
                                  {student.codeforces && <span style={{ fontSize: '10px', padding: '2px 5px', borderRadius: '4px', background: '#3182CE15', color: '#3182CE', fontWeight: 700 }}>CF</span>}
                                  {student.codechef && <span style={{ fontSize: '10px', padding: '2px 5px', borderRadius: '4px', background: '#9B6B4315', color: '#9B6B43', fontWeight: 700 }}>CC</span>}
                                  {student.github && <span style={{ fontSize: '10px', padding: '2px 5px', borderRadius: '4px', background: 'var(--bg-3)', color: 'var(--text)', fontWeight: 700 }}>GH</span>}
                                  {student.geeksforgeeks && <span style={{ fontSize: '10px', padding: '2px 5px', borderRadius: '4px', background: '#008A4515', color: '#008A45', fontWeight: 700 }}>GFG</span>}
                                  {student.hackerrank && <span style={{ fontSize: '10px', padding: '2px 5px', borderRadius: '4px', background: '#1BA94C15', color: '#1BA94C', fontWeight: 700 }}>HR</span>}
                                  {(!student.leetcode && !student.codeforces && !student.codechef && !student.github && !student.geeksforgeeks) && (
                                    <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>None</span>
                                  )}
                                </div>
                              </td>
                              <td style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => setExpandedStudentId(isExpanded ? null : (student.id || student._id))}
                                >
                                  {isExpanded ? 'Hide Details ▲' : 'Details 👇'}
                                </button>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => navigate(`/profile/${student.enrollment}`)}
                                >
                                  Full Profile ↗
                                </button>
                              </td>
                            </tr>

                            {/* Expanded Codolio Details Drawer */}
                            {isExpanded && (
                              <tr>
                                <td colSpan={8} style={{ background: 'var(--bg-3)', padding: '16px', borderBottom: '2px solid var(--purple)' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                                    
                                    {/* Column 1: Multi-platform Verified Stats */}
                                    <div className="card card-body" style={{ background: 'var(--bg)' }}>
                                      <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span>📊 Codolio Unified Platform Records</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Verified & Synced</span>
                                      </div>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px' }}>
                                        {[
                                          ['Codolio', student.codolio, student.platformStats?.codolio, '#10B981'],
                                          ['LeetCode', student.leetcode, student.platformStats?.leetcode, '#FFA116'],
                                          ['Codeforces', student.codeforces, student.platformStats?.codeforces, '#3182CE'],
                                          ['CodeChef', student.codechef, student.platformStats?.codechef, '#9B6B43'],
                                          ['GitHub', student.github, student.platformStats?.github, 'var(--text)'],
                                          ['GeeksforGeeks', student.geeksforgeeks, student.platformStats?.geeksforgeeks, '#008A45'],
                                          ['HackerRank', student.hackerrank, student.platformStats?.hackerrank, '#1BA94C'],
                                        ].map(([platName, handleVal, statsObj, platColor]) => (
                                          <div key={platName} style={{ padding: '8px', borderRadius: '6px', border: '0.5px solid var(--border)', background: 'var(--bg-3)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 700, color: platColor, display: 'flex', justifyContent: 'space-between' }}>
                                              <span>{platName}</span>
                                              {handleVal ? <span style={{ color: '#2cbb5d' }}>✓ Linked</span> : <span style={{ color: 'var(--text-3)' }}>Unlinked</span>}
                                            </div>
                                            {handleVal ? (
                                              <div style={{ fontSize: '11px', marginTop: '4px' }}>
                                                <div style={{ color: 'var(--text-2)', fontFamily: 'var(--mono)' }}>@{handleVal}</div>
                                                {statsObj?.solved !== undefined && <div style={{ color: 'var(--text-3)' }}>Solved: <strong style={{ color: 'var(--text)' }}>{statsObj.solved}</strong></div>}
                                                {statsObj?.rating !== undefined && <div style={{ color: 'var(--text-3)' }}>Rating: <strong style={{ color: platColor }}>{statsObj.rating}</strong></div>}
                                                {statsObj?.repos !== undefined && <div style={{ color: 'var(--text-3)' }}>Repos: <strong style={{ color: 'var(--text)' }}>{statsObj.repos}</strong></div>}
                                              </div>
                                            ) : (
                                              <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '4px' }}>Not configured</div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Column 2: Exam & Contest History */}
                                    <div className="card card-body" style={{ background: 'var(--bg)' }}>
                                      <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '10px' }}>
                                        🏆 Faculty Exam & Contest History
                                      </div>
                                      {student.contestHistory && student.contestHistory.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                                          {student.contestHistory.map(ch => (
                                            <div key={ch.contestId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: '6px', background: 'var(--bg-3)', fontSize: '11px' }}>
                                              <div>
                                                <div style={{ fontWeight: 700 }}>{ch.contestTitle}</div>
                                                <div style={{ color: 'var(--text-3)' }}>{new Date(ch.date).toLocaleDateString()}</div>
                                              </div>
                                              <span className="badge badge-teal" style={{ fontSize: '10px' }}>
                                                {ch.solved} / {ch.total} Solved
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div style={{ fontSize: '12px', color: 'var(--text-3)', padding: '12px 0' }}>
                                          No faculty contest exams entered yet.
                                        </div>
                                      )}

                                      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                        <span>Total Submissions: <strong>{student.totalSubmissions || student.submissions || 0}</strong></span>
                                        <span>AC Submissions: <strong style={{ color: '#2cbb5d' }}>{student.acSubmissions || 0}</strong></span>
                                      </div>
                                    </div>

                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                  </tbody>
                </table>
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
