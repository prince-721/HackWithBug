import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } from 'chart.js';
import api from '../utils/api';
import toast from 'react-hot-toast';
import './Dashboard.css';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

const VERDICTS = { AC: 'verdict-ac', WA: 'verdict-wa', TLE: 'verdict-tle', CE: 'verdict-ce' };

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contests, setContests] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'faculty') { navigate('/dev'); return; }
    Promise.all([
      api.get('/contests'),
      api.get(`/submissions?userId=${user.id}`),
      api.get('/leaderboard')
    ]).then(([c, s, l]) => {
      setContests(c.data);
      setSubmissions(s.data.slice(0, 8));
      setLeaderboard(l.data.slice(0, 5));
    }).finally(() => setLoading(false));
    // Daily challenge
    api.get('/contests/daily/challenge').then(r => setDailyChallenge(r.data)).catch(() => {});
  }, [user, navigate]);

  const registerForContest = async (c) => {
    let password = '';
    if (c.contestType === 'private') {
      password = window.prompt('This contest is private. Enter password:');
      if (password === null) return;
    }
    toast.loading('Registering…', { id: 'reg' });
    try {
      const res = await api.post(`/contests/${c.id}/register`, { password });
      toast.success('Successfully registered for contest!', { id: 'reg' });
      setContests(prev => prev.map(item => item.id === c.id ? { ...item, isRegistered: true, participantCount: res.data.participantCount } : item));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed', { id: 'reg' });
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>;

  const liveContest = contests.find(c => c.status === 'live');
  const upcoming = contests.filter(c => c.status === 'scheduled').slice(0, 3);
  const ratingData = { labels: ['Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'], datasets: [{ data: [1200,1280,1350,1310,1420,1480,1550,1620,1700,1780,user.rating], borderColor: '#7F77DD', backgroundColor: 'rgba(127,119,221,.1)', fill: true, tension: 0.4, pointBackgroundColor: '#7F77DD', pointRadius: 4 }] };
  const chartOpts = { responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(0,0,0,.05)' } } } };

  return (
    <div className="dash-layout">
      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div className="ds-profile">
          <div className="ds-avatar">{user.avatar}</div>
          <div className="ds-name">{user.name}</div>
          <div className="ds-rating" style={{color:'var(--purple)'}}>Rating: {user.rating}</div>
          <div className="ds-meta">CE · Sem {user.semester} · #{user.rank}</div>
          <Link to={`/profile/${user.enrollment}`}><button className="btn btn-ghost btn-sm" style={{width:'100%',marginTop:'10px',justifyContent:'center'}}>View profile</button></Link>
        </div>
        <div className="ds-streak">
          <span style={{fontSize:'22px'}}>🔥</span>
          <div><div style={{fontWeight:700,fontSize:'18px'}}>{user.streak} days</div><div style={{fontSize:'11px',color:'var(--text-3)'}}>streak</div></div>
        </div>
        <nav className="ds-nav">
          <Link to="/dashboard" className="ds-nav-item active">📊 Dashboard</Link>
          <Link to="/problems" className="ds-nav-item">📝 Problems</Link>
          <Link to="/practice" className="ds-nav-item">🧩 Practice</Link>
          <Link to="/typing" className="ds-nav-item">⌨ Typing Test</Link>
          <Link to="/leaderboard" className="ds-nav-item">🏆 Leaderboard</Link>
          <Link to={`/profile/${user.enrollment}`} className="ds-nav-item">👤 My Profile</Link>
        </nav>

        {/* Daily Challenge Widget */}
        {dailyChallenge?.problemId && (
          <div style={{margin:'12px',padding:'12px',background:'linear-gradient(135deg, rgba(127,119,221,.15), rgba(29,158,117,.1))',borderRadius:'10px',border:'0.5px solid rgba(127,119,221,.3)'}}>
            <div style={{fontSize:'10px',fontWeight:700,color:'var(--purple)',letterSpacing:'0.5px',marginBottom:'4px'}}>⚡ DAILY CHALLENGE</div>
            <div style={{fontSize:'13px',fontWeight:700,color:'var(--text)'}}>{dailyChallenge.problemId.title}</div>
            <div style={{fontSize:'11px',color:'var(--text-3)',marginTop:'2px',marginBottom:'8px'}}>{dailyChallenge.problemId.difficulty} · {dailyChallenge.solvers?.length||0} solved today</div>
            <Link to="/practice"><button className="btn btn-primary btn-sm" style={{width:'100%',justifyContent:'center',fontSize:'11px'}}>Solve Now →</button></Link>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="dash-main">
        {liveContest && (
          <div className="live-banner">
            <div className="live-dot-wrap"><span className="live-dot"/> <span className="live-label">Live now</span></div>
            <div className="live-info">
              <div className="live-title">{liveContest.title}</div>
              <div className="live-meta">{liveContest.problemDetails?.length || 6} problems · {liveContest.participants} students</div>
            </div>
            <button className="btn btn-primary" onClick={() => navigate(`/contest/${liveContest.id}`)}>Enter contest →</button>
          </div>
        )}

        {/* Stats */}
        <div className="stats-row">
          {[['Rating', user.rating, '▲ +124', 'var(--purple)'],['Solved', user.solved, 'problems','var(--text)'],['Rank', `#${user.rank}`, 'college','var(--teal)'],['Contests', user.contests, 'entered','var(--text)'],['Streak', user.streak+'d', 'days','var(--amber)']].map(([l,v,s,c]) => (
            <div className="stat-card" key={l}><div className="stat-val" style={{color:c}}>{v}</div><div className="stat-label">{l}</div><div className="stat-sub">{s}</div></div>
          ))}
        </div>

        <div className="dash-grid">
          {/* Rating chart */}
          <div className="card">
            <div className="card-head"><div className="card-title">Rating history</div></div>
            <div className="card-body"><Line data={ratingData} options={chartOpts} height={80}/></div>
          </div>

          {/* Leaderboard */}
          <div className="card">
            <div className="card-head"><div className="card-title">🏆 Leaderboard</div><Link to="/leaderboard" style={{fontSize:'12px',color:'var(--purple)'}}>Full →</Link></div>
            <div className="card-body" style={{padding:0}}>
              {leaderboard.map((s, i) => (
                <div key={s.id} className={`lb-row ${s.enrollment === user.enrollment ? 'lb-me' : ''}`}>
                  <div className="lb-rank">{['🥇','🥈','🥉'][i] || i+1}</div>
                  <div className="lb-av">{s.avatar}</div>
                  <div className="lb-name">{s.name}</div>
                  <div className="lb-pts" style={{color:'var(--purple)',fontWeight:700}}>{s.rating}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="dash-grid-2">
          {/* Recent submissions */}
          <div className="card">
            <div className="card-head"><div className="card-title">Recent submissions</div></div>
            <div style={{overflowX:'auto'}}>
              <table className="table">
                <thead><tr><th>Verdict</th><th>Problem</th><th>Lang</th><th>Time</th><th>When</th></tr></thead>
                <tbody>
                  {submissions.length === 0 && <tr><td colSpan={5} style={{textAlign:'center',color:'var(--text-3)',padding:'2rem'}}>No submissions yet</td></tr>}
                  {submissions.map(s => (
                    <tr key={s.id}>
                      <td><span className={VERDICTS[s.verdict] || ''}>{s.verdict}</span></td>
                      <td style={{fontWeight:500}}>{s.problemTitle}</td>
                      <td className="mono" style={{fontSize:'12px'}}>{s.language}</td>
                      <td className="mono" style={{fontSize:'12px'}}>{s.time ? `${s.time}ms` : '—'}</td>
                      <td style={{color:'var(--text-3)',fontSize:'12px'}}>{new Date(s.timestamp).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upcoming contests */}
          <div className="card">
            <div className="card-head"><div className="card-title">Upcoming contests</div></div>
            <div className="card-body" style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              {upcoming.length === 0 && <div style={{color:'var(--text-3)',textAlign:'center',padding:'1rem'}}>No upcoming contests</div>}
              {upcoming.map(c => (
                <div key={c.id} className="upcoming-card">
                  <div style={{fontWeight:600,fontSize:'13px'}}>{c.title}</div>
                  <div style={{fontSize:'12px',color:'var(--text-3)',marginTop:'2px'}}>{new Date(c.startTime).toLocaleString()} · {c.duration} min</div>
                  {c.isRegistered ? (
                    <button className="btn btn-ghost btn-sm" style={{marginTop:'8px',cursor:'default'}} disabled>Registered ✓</button>
                  ) : (
                    <button className="btn btn-primary btn-sm" style={{marginTop:'8px'}} onClick={() => registerForContest(c)}>Register</button>
                  )}
                </div>
              ))}
              {upcoming.length === 0 && <div style={{textAlign:'center'}}><Link to="/problems"><button className="btn btn-ghost btn-sm">Practice problems →</button></Link></div>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
