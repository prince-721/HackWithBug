import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Line, Radar } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, RadialLinearScale } from 'chart.js';
import { ExternalLink, Settings, Code2, Trophy, Award, Activity, X, RefreshCw, Link2, CheckCircle2 } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Profile.css';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, RadialLinearScale);

const Github = ({ size = 18, color = 'currentColor' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const BADGES = [
  { emoji:'🥇', name:'Top 10', desc:'All-time' },
  { emoji:'🔥', name:'Streak 30', desc:'30-day streak' },
  { emoji:'⚡', name:'Speed', desc:'Sub 1-min AC' },
  { emoji:'🧠', name:'Hard×20', desc:'20 hard solved' },
  { emoji:'🏆', name:'Expert', desc:'Rating 1800+' },
  { emoji:'📚', name:'100+', desc:'Problems' },
  { emoji:'🎯', name:'Ace', desc:'5 AC in row' },
  { emoji:'🌟', name:'Rising', desc:'Star' },
];

export default function Profile() {
  const { enrollment } = useParams();
  const { user: me } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [handles, setHandles] = useState({
    leetcode: '',
    codeforces: '',
    codechef: '',
    github: '',
    geeksforgeeks: '',
    hackerrank: ''
  });

  // LeetCode Connect states
  const [lcInput, setLcInput] = useState('');
  const [lcVerifying, setLcVerifying] = useState(false);
  const [lcSyncing, setLcSyncing] = useState(false);
  const [lcSolvedCount, setLcSolvedCount] = useState(0);
  const [lcSyncedAt, setLcSyncedAt] = useState(null);

  useEffect(() => {
    api.get(`/profile/${enrollment}`)
      .then(r => {
        setProfile(r.data);
        setHandles({
          leetcode: r.data.leetcode || '',
          codeforces: r.data.codeforces || '',
          codechef: r.data.codechef || '',
          github: r.data.github || '',
          geeksforgeeks: r.data.geeksforgeeks || '',
          hackerrank: r.data.hackerrank || ''
        });
        setLcInput(r.data.leetcode || '');
        setLcSolvedCount((r.data.leetcodeSolved || []).length);
        setLcSyncedAt(r.data.leetcodeSyncedAt ? new Date(r.data.leetcodeSyncedAt) : null);
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [enrollment]);

  // LeetCode connect handler
  const handleLcConnect = async () => {
    if (!lcInput.trim()) return toast.error('Enter a LeetCode username');
    setLcVerifying(true);
    try {
      const r = await api.post('/leetcode/connect', { leetcodeUsername: lcInput.trim() });
      toast.success(`✅ Connected as ${r.data.leetcodeUsername} (${r.data.totalSolved} solved)`);
      setLcSolvedCount(r.data.totalSolved);
      // Refresh profile
      const updated = await api.get(`/profile/${enrollment}`);
      setProfile(updated.data);
      setHandles(h => ({ ...h, leetcode: r.data.leetcodeUsername }));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Connection failed');
    } finally {
      setLcVerifying(false);
    }
  };

  // LeetCode sync handler
  const handleLcSync = async () => {
    if (!profile?.leetcode) return toast.error('Connect LeetCode first');
    setLcSyncing(true);
    try {
      const r = await api.get(`/leetcode/sync/${profile.id}`);
      toast.success(`🔄 Synced ${r.data.solvedCount} solved problems`);
      setLcSolvedCount(r.data.solvedCount);
      setLcSyncedAt(new Date(r.data.syncedAt));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Sync failed');
    } finally {
      setLcSyncing(false);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>;
  if (!profile) return <div className="page"><h2>User not found</h2></div>;

  const saveHandles = async (e) => {
    e.preventDefault();
    try {
      await api.put('/profile/me', handles);
      setIsEditModalOpen(false);
      const updated = await api.get(`/profile/${enrollment}`);
      setProfile(updated.data);
    } catch (err) {
      console.error(err);
    }
  };

  const heatmap = Array.from({length:364}, (_,i) => {
    const r = Math.random();
    return r < 0.4 ? 0 : r < 0.65 ? 1 : r < 0.8 ? 2 : r < 0.92 ? 3 : 4;
  });

  const ratingHistory = { 
    labels:['Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'], 
    datasets:[{ 
      data:[1200,1280,1350,1310,1420,1480,1550,1620,1700,1780,profile.rating], 
      borderColor:'#7F77DD', 
      backgroundColor:'rgba(127,119,221,.1)', 
      fill:true, 
      tension:0.4, 
      pointBackgroundColor:'#7F77DD', 
      pointRadius:4 
    }]
  };

  const topics = Object.entries(profile.topicStats || {}).slice(0, 8);
  const radarData = { 
    labels: topics.length > 0 ? topics.map(([k]) => k) : ['Graphs','DP','Trees','Math','Strings','Greedy'], 
    datasets:[{ 
      data: topics.length > 0 ? topics.map(([,v]) => v) : [20,15,10,12,8,18], 
      backgroundColor:'rgba(127,119,221,.2)', 
      borderColor:'#7F77DD', 
      pointBackgroundColor:'#7F77DD' 
    }]
  };

  const HMAP_COLORS = ['var(--bg-3)','#CECBF6','#AFA9EC','#7F77DD','#534AB7'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const isMe = me?.enrollment === enrollment;

  // Calculate Aggregated Coding Stats
  const getAggregateStats = () => {
    let totalSolved = profile.solved || 0;
    if (profile.platformStats) {
      const p = profile.platformStats;
      if (p.leetcode?.solved) totalSolved += p.leetcode.solved;
      if (p.codeforces?.solved) totalSolved += p.codeforces.solved;
      if (p.codechef?.solved) totalSolved += p.codechef.solved;
      if (p.geeksforgeeks?.solved) totalSolved += p.geeksforgeeks.solved;
    }
    return { totalSolved };
  };
  const { totalSolved } = getAggregateStats();

  const renderPlatformCards = () => {
    const platforms = [
      { id: 'leetcode', name: 'LeetCode', color: '#FFA116', url: (h) => `https://leetcode.com/${h}`, stats: profile.platformStats?.leetcode, icon: <Award size={18} color="#FFA116" /> },
      { id: 'codeforces', name: 'Codeforces', color: '#3182CE', url: (h) => `https://codeforces.com/profile/${h}`, stats: profile.platformStats?.codeforces, icon: <Activity size={18} color="#3182CE" /> },
      { id: 'codechef', name: 'CodeChef', color: '#9B6B43', url: (h) => `https://www.codechef.com/users/${h}`, stats: profile.platformStats?.codechef, icon: <Trophy size={18} color="#9B6B43" /> },
      { id: 'github', name: 'GitHub', color: '#2D3748', url: (h) => `https://github.com/${h}`, stats: profile.platformStats?.github, icon: <Github size={18} color="var(--text)" /> },
      { id: 'geeksforgeeks', name: 'GeeksforGeeks', color: '#008A45', url: (h) => `https://auth.geeksforgeeks.org/user/${h}/profile`, stats: profile.platformStats?.geeksforgeeks, icon: <Code2 size={18} color="#008A45" /> },
      { id: 'hackerrank', name: 'HackerRank', color: '#1BA94C', url: (h) => `https://www.hackerrank.com/${h}`, stats: profile.platformStats?.hackerrank, icon: <Award size={18} color="#1BA94C" /> }
    ];

    return (
      <div className="platforms-grid">
        {platforms.map(p => {
          const isLinked = !!p.stats;
          return (
            <div key={p.id} className={`platform-card ${isLinked ? 'linked' : 'unlinked'}`}>
              <div className="platform-card-header">
                <div className="platform-icon-wrap">{p.icon}</div>
                <span className="platform-name">{p.name}</span>
                {isLinked && <a href={p.url(p.stats.handle)} target="_blank" rel="noopener noreferrer"><ExternalLink size={12} /></a>}
              </div>
              <div className="platform-card-body">
                {isLinked ? (
                  <div className="platform-info-list">
                    <div className="platform-handle-display">@{p.stats.handle}</div>
                    <div className="platform-stat-row"><span className="stat-name">Solved:</span><span className="stat-value">{p.stats.solved || '—'}</span></div>
                    <div className="platform-stat-row"><span className="stat-name">Rating:</span><span className="stat-value">{p.stats.rating || '—'}</span></div>
                  </div>
                ) : <div className="platform-not-linked">Not Linked</div>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="page">
      {/* HERO */}
      <div className="prof-hero">
        <div className="prof-avatar-wrap">
          <div className="prof-avatar">{profile.avatar}</div>
          {isMe && <div className="prof-online"/>}
        </div>
        <div className="prof-info">
          <div className="prof-name">{profile.name} {isMe && <span className="badge badge-gray">You</span>}</div>
          <div className="prof-handle">hackwithbug.parul.ac.in/u/{profile.enrollment} · CE Sem {profile.semester}</div>
          <div className="prof-badges-row">
            <span className="badge badge-purple">⭐ Expert</span>
            <span className="badge badge-teal">🏆 Top {profile.rank || '—'}</span>
            <span className="badge badge-gray">📅 Joined {new Date(profile.joinedAt).toLocaleDateString('en',{month:'short',year:'numeric'})}</span>
            {profile.streak > 0 && <span className="badge badge-amber">🔥 {profile.streak}-day streak</span>}
          </div>
        </div>
        <div className="prof-rating-box">
          <div className="prof-rating">{profile.rating}</div>
          <div style={{fontSize:'11px',color:'var(--text-3)'}}>Rating</div>
          {isMe && <button className="btn btn-ghost btn-sm" style={{marginTop:'8px'}} onClick={()=>navigator.clipboard?.writeText(window.location.href)}>📋 Copy link</button>}
        </div>
      </div>

      {/* STREAK */}
      {profile.streak > 0 && (
        <div className="streak-bar">
          <span style={{fontSize:'28px'}}>🔥</span>
          <div style={{fontSize:'32px',fontWeight:800,color:'var(--purple-dark)'}}>{profile.streak}</div>
          <div><div style={{fontWeight:700}}>Day streak — keep it going!</div><div style={{fontSize:'12px',color:'var(--text-2)'}}>Last solved: today</div></div>
          <div style={{marginLeft:'auto',display:'flex',gap:'6px'}}>
            {['S','M','T','W','T','F','S'].map((d,i)=>(
              <div key={i} style={{width:26,height:26,borderRadius:'50%',background:i<6?'var(--purple)':'var(--bg-3)',color:i<6?'#fff':'var(--text-3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:700}}>{d}</div>
            ))}
          </div>
        </div>
      )}

      {/* STATS */}
      <div className="prof-stats-row">
        {[[profile.rating,'Rating','▲ +124 this month','var(--purple)'],[totalSolved,'Total Solved','Across platforms','var(--text)'],[`#${profile.rank||'—'}`,'College rank',`Top ${profile.rank ? Math.round(profile.rank/12)+0.1+'%' : '—'}`,'var(--teal)'],[profile.contests,'Contests','entered','var(--text)'],[profile.submissions,'Submissions','total','var(--text-3)']].map(([v,l,s,c])=>(
          <div key={l} className="stat-card"><div className="stat-val" style={{color:c}}>{v}</div><div className="stat-label">{l}</div><div className="stat-sub">{s}</div></div>
        ))}
      </div>

      {/* CODOLIO TRACKER */}
      <div className="card codolio-card" style={{marginBottom:'1.25rem'}}>
        <div className="card-head">
          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
            <span style={{fontSize:'22px'}}>📊</span>
            <div>
              <div className="card-title" style={{fontSize:'15px', fontWeight:800}}>Codolio Portfolio Tracker</div>
              <div style={{fontSize:'11px', color:'var(--text-3)'}}>Unified profile stats across coding platforms</div>
            </div>
          </div>
          {isMe && <button className="btn btn-ghost btn-sm" onClick={() => setIsEditModalOpen(true)}><Settings size={14} /> Manage Platforms</button>}
        </div>
        <div className="card-body">
          {renderPlatformCards()}
        </div>
      </div>

      {/* LEETCODE CONNECT CARD */}
      {isMe && (
        <div className="card" style={{marginBottom:'1.25rem',overflow:'hidden'}}>
          <div className="card-head" style={{borderBottom:'0.5px solid var(--border)'}}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <div style={{width:36,height:36,borderRadius:'8px',background:'linear-gradient(135deg,#FFA116,#FF8C00)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',flexShrink:0}}>⚡</div>
              <div>
                <div className="card-title" style={{fontSize:'15px', fontWeight:800}}>LeetCode Integration</div>
                <div style={{fontSize:'11px', color:'var(--text-3)'}}>Solve on LeetCode → progress tracked here automatically</div>
              </div>
            </div>
          </div>
          <div className="card-body" style={{padding:'16px'}}>
            {profile.leetcode ? (
              /* Connected State */
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'12px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <CheckCircle2 size={20} color="#2cbb5d" />
                  <div>
                    <div style={{fontSize:'13px',fontWeight:700,color:'var(--text)'}}>Connected as <span style={{color:'#FFA116'}}>@{profile.leetcode}</span></div>
                    <div style={{fontSize:'11px',color:'var(--text-3)',marginTop:'2px'}}>
                      {lcSolvedCount > 0 ? `${lcSolvedCount} LC problems synced` : 'Click Sync to fetch solved list'}
                      {lcSyncedAt && ` · Last sync: ${Math.round((Date.now() - lcSyncedAt.getTime()) / 60000)}m ago`}
                    </div>
                  </div>
                </div>
                <div style={{display:'flex',gap:'8px'}}>
                  <button className="btn btn-ghost btn-sm" onClick={handleLcSync} disabled={lcSyncing} style={{display:'flex',alignItems:'center',gap:'4px'}}>
                    <RefreshCw size={13} className={lcSyncing ? 'animate-spin' : ''} />
                    {lcSyncing ? 'Syncing…' : 'Sync Now'}
                  </button>
                  <a href={`https://leetcode.com/u/${profile.leetcode}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{display:'flex',alignItems:'center',gap:'4px'}}>
                    <ExternalLink size={13} /> View Profile
                  </a>
                </div>
              </div>
            ) : (
              /* Not Connected State */
              <div>
                <div style={{fontSize:'12px',color:'var(--text-2)',marginBottom:'10px'}}>Enter your LeetCode username to link your account. We'll verify it exists and start tracking your progress.</div>
                <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                  <div style={{display:'flex',alignItems:'center',gap:0,flex:1,maxWidth:'360px'}}>
                    <span style={{fontSize:'12px',color:'var(--text-3)',background:'var(--bg-3)',padding:'6px 10px',borderRadius:'6px 0 0 6px',border:'0.5px solid var(--border)',borderRight:'none',whiteSpace:'nowrap'}}>leetcode.com/u/</span>
                    <input
                      className="inp"
                      style={{borderRadius:'0 6px 6px 0',flex:1}}
                      placeholder="your_username"
                      value={lcInput}
                      onChange={e => setLcInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleLcConnect()}
                    />
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={handleLcConnect} disabled={lcVerifying} style={{display:'flex',alignItems:'center',gap:'4px',whiteSpace:'nowrap'}}>
                    <Link2 size={13} />
                    {lcVerifying ? 'Verifying…' : 'Connect'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="prof-grid">
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          {/* HEATMAP */}
          <div className="card card-body">
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
              <div style={{fontSize:'13px',fontWeight:700}}>Activity — {profile.solved} problems this year</div>
            </div>
            <div style={{display:'flex',gap:'0',marginBottom:'4px'}}>
              {months.map(m=><div key={m} style={{flex:1,fontSize:'9px',color:'var(--text-3)'}}>{m}</div>)}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(52,1fr)',gap:'3px'}}>
              {heatmap.map((v,i)=><div key={i} style={{width:'100%',aspectRatio:'1',borderRadius:'2px',background:HMAP_COLORS[v],cursor:'pointer'}} title={`${v} solved`}/>)}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'6px',marginTop:'8px',fontSize:'11px',color:'var(--text-3)'}}>
              Less {HMAP_COLORS.map((c,i)=><div key={i} style={{width:12,height:12,borderRadius:2,background:c}}/>)} More
            </div>
          </div>

          {/* RATING GRAPH */}
          <div className="card card-body">
            <div style={{fontSize:'13px',fontWeight:700,marginBottom:'12px'}}>Rating history</div>
            <Line data={ratingHistory} options={{responsive:true,plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{grid:{color:'rgba(0,0,0,.05)'}}}}} />
          </div>

          {/* CONTEST HISTORY */}
          <div className="card">
            <div className="card-head"><div className="card-title">Contest history</div></div>
            <table className="table">
              <thead><tr><th>Contest</th><th>Date</th><th>Solved</th><th>Δ Rating</th></tr></thead>
              <tbody>
                {(profile.contestHistory||[]).slice(0,6).map(c=>(
                  <tr key={c.contestId}>
                    <td style={{fontWeight:600}}>{c.contestTitle}</td>
                    <td style={{color:'var(--text-3)',fontSize:'12px'}}>{new Date(c.date).toLocaleDateString()}</td>
                    <td>{c.solved}/{c.total}</td>
                    <td style={{color:c.ratingChange>=0?'var(--teal-dark)':'#A32D2D',fontWeight:700}}>{c.ratingChange>=0?'+':''}{c.ratingChange}</td>
                  </tr>
                ))}
                {(!profile.contestHistory||profile.contestHistory.length===0)&&<tr><td colSpan={4} style={{textAlign:'center',color:'var(--text-3)',padding:'1rem'}}>No contests yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          {/* RADAR */}
          <div className="card card-body">
            <div style={{fontSize:'13px',fontWeight:700,marginBottom:'8px'}}>Topic mastery</div>
            {topics.length > 2 ? <Radar data={radarData} options={{responsive:true,plugins:{legend:{display:false}},scales:{r:{beginAtZero:true,grid:{color:'rgba(0,0,0,.07)'}}}}} /> : <div style={{color:'var(--text-3)',fontSize:'13px'}}>Solve more problems to unlock</div>}
          </div>

          {/* RECENT SUBS */}
          <div className="card card-body">
            <div style={{fontSize:'13px',fontWeight:700,marginBottom:'10px'}}>Recent submissions</div>
            {(profile.recentSubmissions||[]).map(s=>(
              <div key={s.id} style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 0',borderBottom:'0.5px solid var(--border)'}}>
                <span className={`verdict-${s.verdict.toLowerCase()}`} style={{fontSize:'11px',fontWeight:700,width:'30px'}}>{s.verdict}</span>
                <span style={{flex:1,fontSize:'12px',fontWeight:500}}>{s.problemTitle}</span>
                <span className={`diff-chip ${s.problemDifficulty}`} style={{fontSize:'10px'}}>{s.problemDifficulty}</span>
              </div>
            ))}
            {(!profile.recentSubmissions||profile.recentSubmissions.length===0)&&<div style={{color:'var(--text-3)',fontSize:'13px'}}>No submissions yet</div>}
          </div>

          {/* BADGES */}
          <div className="card card-body">
            <div style={{fontSize:'13px',fontWeight:700,marginBottom:'12px'}}>Achievements</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px'}}>
              {BADGES.map(b=>(
                <div key={b.name} style={{textAlign:'center'}}>
                  <div style={{fontSize:'22px'}}>{b.emoji}</div>
                  <div style={{fontSize:'11px',fontWeight:700,marginTop:'4px'}}>{b.name}</div>
                  <div style={{fontSize:'10px',color:'var(--text-3)'}}>{b.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* EDIT HANDLES MODAL */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{fontWeight:800, fontSize:'16px'}}>Manage Coding Profiles</h3>
              <button className="btn-close" onClick={() => setIsEditModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={saveHandles}>
              <div className="modal-body">
                <p style={{fontSize:'12px', color:'var(--text-3)', marginBottom:'12px'}}>
                  Enter your handles to sync stats directly into your Hackwithbug dashboard.
                </p>
                {Object.keys(handles).map(k => (
                  <div key={k} className="form-group" style={{marginBottom:'10px'}}>
                    <label style={{display:'block', marginBottom:'4px', fontSize:'12px', fontWeight:600}}>{k.charAt(0).toUpperCase() + k.slice(1)} Handle</label>
                    <input className="inp" value={handles[k]} onChange={e => setHandles({...handles, [k]: e.target.value})} placeholder="Username" />
                  </div>
                ))}
              </div>
              <div className="modal-footer" style={{display:'flex', gap:'8px', justifyContent:'flex-end', marginTop:'12px'}}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Profiles</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
