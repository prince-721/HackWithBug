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
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title:'', startTime:'', duration:120, proctored:true, allowedLangs:['cpp17','python3','java17'] });
  const [selectedContest, setSelectedContest] = useState(null);
  const [aiSettings, setAiSettings] = useState({});
  const [announcement, setAnnouncement] = useState('');
  const [importantAnn, setImportantAnn] = useState(false);
  const [sendingAnn, setSendingAnn] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);

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
    try { await api.delete(`/contests/${id}`); setContests(prev => prev.filter(c => c.id !== id)); toast.success('Deleted'); }
    catch { toast.error('Delete failed'); }
  };

  const runPlagiarism = async (contestId) => {
    toast.loading('Running plagiarism analysis…', {id:'plag'});
    try {
      const r = await api.post('/plagiarism/analyze', { contestId });
      toast.success(`Found ${r.data.newPairs} new suspicious pairs`, {id:'plag'});
      navigate(`/dev/plagiarism/${contestId}`);
    } catch { toast.error('Analysis failed', {id:'plag'}); }
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
    } catch { toast.error('Failed to save AI settings'); }
  };

  const sendAnnouncement = async () => {
    if (!announcement.trim() || !selectedContest) return;
    setSendingAnn(true);
    try {
      await api.post(`/contests/${selectedContest.id}/announce`, { text: announcement, important: importantAnn });
      toast.success('Announcement sent!');
      setAnnouncement('');
      setImportantAnn(false);
    } catch { toast.error('Failed to send announcement'); }
    finally { setSendingAnn(false); }
  };

  const barData = {
    labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    datasets: [
      { label:'AC', data:[120,95,180,140,230,200,45], backgroundColor:'#1D9E75', borderRadius:4 },
      { label:'WA', data:[60,45,80,65,95,88,20], backgroundColor:'#E24B4A', borderRadius:4 },
      { label:'TLE', data:[20,15,30,22,35,28,8], backgroundColor:'#BA7517', borderRadius:4 },
    ]
  };

  const doughnutData = {
    labels:['Active','Occasional','Inactive'],
    datasets:[{ data:[720,360,120], backgroundColor:['#7F77DD','#1D9E75','#BA7517'], borderWidth:0 }]
  };

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>;

  return (
    <div className="dev-layout">
      {/* SIDEBAR */}
      <aside className="dev-sidebar">
        <div style={{padding:'12px',fontSize:'12px',fontWeight:700,color:'var(--text-3)',borderBottom:'0.5px solid var(--border)'}}>DEVELOPER CONSOLE</div>
        {[
          ['Overview', [['📊','Dashboard','/dev'],['📈','Analytics','/dev'],['⚡','Activity','/dev']]],
          ['Contests', [['🏆','All contests','/dev'],['🔴','Live now','/dev'],['📅','Scheduled','/dev']]],
          ['Problems', [['✏️','Problem editor','/dev/problem/new'],['🗃','Problem bank','/dev'],['🧪','Test cases','/dev']]],
          ['Reports', [['🛡','Plagiarism','/dev/plagiarism'],['📋','Export','/dev'],['📹','Proctor logs','/dev']]],
        ].map(([section, items]) => (
          <div key={section} style={{padding:'8px 0'}}>
            <div style={{padding:'4px 14px',fontSize:'10px',fontWeight:700,color:'var(--text-3)',letterSpacing:'1px',textTransform:'uppercase'}}>{section}</div>
            {items.map(([icon, label, href]) => (
              <Link key={label} to={href} className="dev-nav-item">{icon} {label}</Link>
            ))}
          </div>
        ))}
      </aside>

      {/* MAIN */}
      <main style={{padding:'1.5rem',background:'var(--bg-3)',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
          <div>
            <h1 style={{fontSize:'20px',fontWeight:800}}>Good morning, {user.name} 👋</h1>
            <div style={{fontSize:'13px',color:'var(--text-3)',marginTop:'2px'}}>VGEC CE Department · {contests.length} contests · {leaderboard.length} students</div>
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            <Link to="/dev/plagiarism"><button className="btn btn-ghost btn-sm">🛡 Plagiarism</button></Link>
            <button className="btn btn-primary btn-sm" onClick={()=>navigate('/dev/contest/new')}>+ New Contest</button>
          </div>
        </div>

        {/* KPI CARDS */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px',marginBottom:'1rem'}}>
          {[[contests.length,'Contests','↑ 2 this sem','var(--purple)','🏆'],[leaderboard.length,'Students','↑ 120 this month','var(--teal)','👥'],[problems.length,'Problems','↑ 18 this week','var(--amber)','📝'],['3','Alerts','plagiarism flags','var(--red)','🛡']].map(([v,l,s,c,icon])=>(
            <div key={l} className="card card-body" style={{borderLeft:`3px solid ${c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                <div style={{fontSize:'22px'}}>{icon}</div>
                <div style={{fontSize:'11px',padding:'2px 8px',border:`0.5px solid ${c}`,borderRadius:'20px',color:c}}>{s}</div>
              </div>
              <div style={{fontSize:'30px',fontWeight:800,color:c}}>{v}</div>
              <div style={{fontSize:'12px',color:'var(--text-3)'}}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
          {/* CONTESTS TABLE */}
          <div className="card">
            <div className="card-head"><div className="card-title">Contests</div><button className="btn btn-ghost btn-sm" onClick={()=>navigate('/dev/contest/new')}>+ New</button></div>
            <div style={{overflowX:'auto'}}>
              <table className="table">
                <thead><tr><th>Name</th><th>Date</th><th>Students</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {contests.map(c=>(
                    <tr key={c.id}>
                      <td style={{fontWeight:600,maxWidth:'160px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.title}</td>
                      <td style={{fontSize:'12px',color:'var(--text-3)'}}>{new Date(c.startTime).toLocaleDateString()}</td>
                      <td>{c.participants||0}</td>
                      <td><span className={`badge ${c.status==='live'?'badge-teal':c.status==='scheduled'?'badge-purple':'badge-gray'}`}>{c.status==='live'?'🔴 ':''}{c.status}</span></td>
                      <td style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
                        <button className="btn btn-ghost btn-sm" onClick={()=>navigate(`/dev/contest/${c.id}`)}>Edit</button>
                        <button className="btn btn-ghost btn-sm" onClick={()=>duplicateContest(c.id)}>Copy</button>
                        <button className="btn btn-ghost btn-sm" onClick={()=>navigate(`/contest/${c.id}`)}>Preview</button>
                        <button className="btn btn-ghost btn-sm" onClick={()=>runPlagiarism(c.id)}>🛡</button>
                        <button className="btn btn-ghost btn-sm" onClick={()=>openAIPanel(c)} title="AI Settings">✨</button>
                        {c.status!=='live'&&<button className="btn btn-danger btn-sm" onClick={()=>deleteContest(c.id)}>Del</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
            <div className="card card-body">
              <div className="card-title" style={{marginBottom:'10px'}}>Quick actions</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                {[['/dev/problem/new','✏️','Add problem','Problem bank'],['#','🛡','View flags','3 pending'],['#','📊','Export CSV','Last contest'],['#','📹','Proctor logs','Round 4']].map(([href,icon,t,s])=>(
                  <Link key={t} to={href}><div style={{padding:'12px',borderRadius:'9px',border:'0.5px solid var(--border)',cursor:'pointer',display:'flex',alignItems:'center',gap:'8px'}} className="qa-btn">
                    <div style={{fontSize:'20px',width:34,height:34,borderRadius:'8px',background:'var(--purple-light)',display:'flex',alignItems:'center',justifyContent:'center'}}>{icon}</div>
                    <div><div style={{fontSize:'12px',fontWeight:700}}>{t}</div><div style={{fontSize:'11px',color:'var(--text-3)'}}>{s}</div></div>
                  </div></Link>
                ))}
              </div>
            </div>
            <div className="card card-body">
              <div className="card-title" style={{marginBottom:'10px'}}>Participation</div>
              <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
                <Doughnut data={doughnutData} options={{responsive:false,plugins:{legend:{display:false}}}} width={80} height={80}/>
                <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                  {['Active 60%','Occasional 30%','Inactive 10%'].map((l,i)=>(
                    <div key={l} style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'12px'}}>
                      <div style={{width:10,height:10,borderRadius:'2px',background:['#7F77DD','#1D9E75','#BA7517'][i]}}/>
                      {l}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SUBMISSIONS CHART */}
        <div className="card card-body" style={{marginBottom:'1rem'}}>
          <div className="card-title" style={{marginBottom:'12px'}}>Submissions this week</div>
          <Bar data={barData} options={{responsive:true,plugins:{legend:{position:'bottom'}},scales:{x:{grid:{display:false},stacked:true},y:{grid:{color:'rgba(0,0,0,.05)'},stacked:true}}}} height={60}/>
        </div>

        {/* COHORT HEATMAP */}
        <div className="card card-body">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
            <div className="card-title">Cohort skill heatmap — CE Sem 5</div>
            <span style={{fontSize:'11px',color:'var(--text-3)'}}>Darker = more students strong in this topic</span>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{fontSize:'11px',borderCollapse:'collapse',minWidth:'500px'}}>
              <thead><tr><th style={{padding:'6px 10px',textAlign:'left',color:'var(--text-3)'}}>Topic</th>{['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6'].map(s=><th key={s} style={{padding:'6px 10px',color:'var(--text-3)'}}>{s}</th>)}</tr></thead>
              <tbody>
                {['Arrays','DP','Graphs','Trees','Math','Strings','Greedy','Binary Search'].map(topic=>(
                  <tr key={topic}>
                    <td style={{padding:'5px 10px',color:'var(--text-2)'}}>{topic}</td>
                    {[0,1,2,3,4,5].map(i=>{
                      const v=Math.floor(25+Math.random()*70);
                      return <td key={i} style={{padding:'4px'}}><div style={{width:48,height:26,borderRadius:5,background:`rgba(127,119,221,${(v/100).toFixed(2)})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:700,color:v>50?'#534AB7':'var(--text-3)'}}>{v}%</div></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* REMOVED LEGACY CONTEST MODAL */}
      {/* AI SETTINGS MODAL */}
      {showAIPanel && selectedContest && (
        <div className="modal-bg" onClick={e=>{if(e.target===e.currentTarget)setShowAIPanel(false)}}>
          <div className="modal" style={{maxWidth:'480px'}}>
            <div style={{padding:'1.25rem',borderBottom:'0.5px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontSize:'16px',fontWeight:800}}>✨ AI Settings — {selectedContest.title}</div>
              <button style={{border:'none',background:'none',fontSize:'20px',cursor:'pointer',color:'var(--text-3)'}} onClick={()=>setShowAIPanel(false)}>×</button>
            </div>
            <div style={{padding:'1.25rem',display:'flex',flexDirection:'column',gap:'1rem'}}>
              {/* Master toggle */}
              <div style={{padding:'12px',borderRadius:'10px',background:'var(--bg-3)',border:'0.5px solid var(--border)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px'}}>
                  <div style={{fontWeight:700}}>AI Features Master Switch</div>
                  <label style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer'}}>
                    <input type="checkbox" checked={aiSettings.aiEnabled||false} onChange={e=>setAiSettings({...aiSettings,aiEnabled:e.target.checked})} style={{width:16,height:16}}/>
                    <span style={{fontSize:'12px',color:aiSettings.aiEnabled?'var(--teal)':'var(--red)',fontWeight:700}}>{aiSettings.aiEnabled?'Enabled':'Disabled'}</span>
                  </label>
                </div>
                <div style={{fontSize:'12px',color:'var(--text-3)'}}>When disabled, all AI features are hidden from students</div>
              </div>
              {/* Individual toggles */}
              {[['aiChat','💬 AI Chat','Students can chat with AI assistant'],['aiHints','💡 AI Hints','Students can request problem hints'],['aiReview','🔍 AI Code Review','Auto-review on wrong submissions'],['aiExplain','📖 AI Explanations','Students can get editorial explanations']].map(([key,label,desc])=>(
                <div key={key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'0.5px solid var(--border)',opacity:aiSettings.aiEnabled?1:0.4}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:'13px'}}>{label}</div>
                    <div style={{fontSize:'11px',color:'var(--text-3)'}}>{desc}</div>
                  </div>
                  <label style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer'}}>
                    <input type="checkbox" checked={aiSettings[key]||false} disabled={!aiSettings.aiEnabled} onChange={e=>setAiSettings({...aiSettings,[key]:e.target.checked})} style={{width:16,height:16}}/>
                    <span style={{fontSize:'11px',color:aiSettings[key]?'var(--teal)':'var(--text-3)',fontWeight:600}}>{aiSettings[key]?'On':'Off'}</span>
                  </label>
                </div>
              ))}
              {/* Announcement Sender */}
              <div style={{background:'var(--bg-3)',borderRadius:'10px',border:'0.5px solid var(--border)',padding:'12px'}}>
                <div style={{fontWeight:700,marginBottom:'8px'}}>📢 Send Announcement</div>
                <textarea className="inp" rows={3} placeholder="Announcement text to broadcast to all students…" value={announcement} onChange={e=>setAnnouncement(e.target.value)} style={{width:'100%',resize:'none',boxSizing:'border-box',fontSize:'13px'}}/>
                <div style={{display:'flex',alignItems:'center',gap:'12px',marginTop:'8px'}}>
                  <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'12px',cursor:'pointer'}}>
                    <input type="checkbox" checked={importantAnn} onChange={e=>setImportantAnn(e.target.checked)}/> Mark as important
                  </label>
                  <button className="btn btn-primary btn-sm" style={{marginLeft:'auto'}} onClick={sendAnnouncement} disabled={sendingAnn||!announcement.trim()}>
                    {sendingAnn?'Sending…':'📢 Broadcast'}
                  </button>
                </div>
              </div>
              <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
                <button className="btn btn-ghost" onClick={()=>setShowAIPanel(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveAISettings}>Save AI Settings →</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
