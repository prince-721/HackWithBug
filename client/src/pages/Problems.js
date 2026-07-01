import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import useLeetCodeSync from '../hooks/useLeetCodeSync';
import toast from 'react-hot-toast';
import { RefreshCw, ExternalLink } from 'lucide-react';

const DIFFS = ['all','easy','medium','hard'];
const TAGS = ['all','Arrays','DP','Graphs','Trees','Binary Search','Greedy','Math','Strings','Segment Tree','Hashing'];

export default function Problems() {
  const { user } = useAuth();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [diff, setDiff] = useState('all');
  const [tag, setTag] = useState('all');
  const [search, setSearch] = useState('');
  const [mySubmissions, setMySubmissions] = useState([]);
  const navigate = useNavigate();

  // LeetCode sync hook
  const { solvedSlugs, syncing, lastSync, sync: lcSync, isSolved: isLcSolved } = useLeetCodeSync(user?.id, 0);

  useEffect(() => {
    api.get('/problems').then(r => setProblems(r.data)).finally(() => setLoading(false));
    if (user?.id) {
      api.get('/submissions?userId=' + user.id).then(r => setMySubmissions(r.data)).catch(() => {});
    }
  }, [user?.id]);

  const filtered = problems.filter(p => {
    if (diff !== 'all' && p.difficulty !== diff) return false;
    if (tag !== 'all' && !p.tags.includes(tag)) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Determine solve status for a problem
  const getStatus = (p) => {
    // Check hackwithbug AC
    const hwbSolved = mySubmissions.some(s => (s.problemId === p.id || s.problemId?.id === p.id) && s.verdict === 'AC');
    if (hwbSolved) return 'hwb-solved';

    // Check LeetCode solved
    if (p.source === 'leetcode' && p.leetcodeSlug && isLcSolved(p.leetcodeSlug)) return 'lc-solved';

    // Check attempted on HWB
    const attempted = mySubmissions.some(s => s.problemId === p.id || s.problemId?.id === p.id);
    if (attempted) return 'attempted';

    return 'none';
  };

  const statusIcons = {
    'hwb-solved': { icon: '✅', title: 'Solved on hackwithbug' },
    'lc-solved': { icon: '🟡', title: 'Solved on LeetCode' },
    'attempted': { icon: '🔶', title: 'Attempted' },
    'none': { icon: '⬜', title: 'Not started' }
  };

  const handleRowClick = (p) => {
    if (p.source === 'leetcode' && p.leetcodeUrl) {
      window.open(p.leetcodeUrl, '_blank');
    } else {
      navigate(`/practice?problem=${p.id}`);
    }
  };

  const handleManualSync = async () => {
    if (!user?.leetcode) {
      return toast.error('Connect your LeetCode account in Profile settings first');
    }
    const result = await lcSync();
    if (result) {
      toast.success(`Synced ${result.solvedCount} solved LC problems`);
    }
  };

  const liveContest = { id: 1 };

  return (
    <div className="page">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
        <h1 className="section-title" style={{margin:0}}>Problem Bank</h1>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <span style={{fontSize:'13px',color:'var(--text-3)'}}>{filtered.length} problems</span>
          {user?.leetcode && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleManualSync}
              disabled={syncing}
              style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'12px'}}
            >
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing…' : '🔄 Sync LeetCode'}
              {lastSync && <span style={{fontSize:'10px',color:'var(--text-3)',marginLeft:'4px'}}>({Math.round((Date.now() - lastSync.getTime()) / 60000)}m ago)</span>}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:'8px',marginBottom:'1rem',flexWrap:'wrap'}}>
        <input className="inp" style={{width:'220px'}} placeholder="Search problems…" value={search} onChange={e=>setSearch(e.target.value)} />
        <div style={{display:'flex',gap:'4px'}}>
          {DIFFS.map(d => <button key={d} className={`btn btn-sm ${diff===d?'btn-primary':'btn-ghost'}`} onClick={()=>setDiff(d)}>{d==='all'?'All':d.charAt(0).toUpperCase()+d.slice(1)}</button>)}
        </div>
        <select className="select" style={{width:'160px'}} value={tag} onChange={e=>setTag(e.target.value)}>
          {TAGS.map(t => <option key={t} value={t}>{t==='all'?'All topics':t}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? <div style={{padding:'3rem',textAlign:'center'}}><div className="spinner" style={{margin:'0 auto'}}/></div> : (
          <table className="table">
            <thead>
              <tr>
                <th style={{width:'40px'}}>Status</th>
                <th>#</th>
                <th>Title</th>
                <th>Difficulty</th>
                <th>Source</th>
                <th>Tags</th>
                <th>Acceptance</th>
                <th>Points</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const status = getStatus(p);
                const isLC = p.source === 'leetcode';
                return (
                  <tr key={p.id} style={{cursor:'pointer'}} onClick={() => handleRowClick(p)}>
                    <td style={{textAlign:'center',fontSize:'16px'}} title={statusIcons[status].title}>
                      {statusIcons[status].icon}
                    </td>
                    <td style={{color:'var(--text-3)',fontFamily:'var(--mono)',fontSize:'12px'}}>#{String(p.id).padStart(4,'0')}</td>
                    <td style={{fontWeight:600}}>
                      {p.title}
                      {isLC && <span style={{marginLeft:'6px',fontSize:'10px',color:'#FFA116',verticalAlign:'middle'}}>🔗</span>}
                    </td>
                    <td><span className={`diff-chip ${p.difficulty}`}>{p.difficulty}</span></td>
                    <td>
                      {isLC ? (
                        <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',background:'#FFA11615',color:'#FFA116',fontWeight:600,border:'0.5px solid #FFA11630'}}>🔗 LC</span>
                      ) : (
                        <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',background:'var(--bg-2)',color:'var(--text-3)',border:'0.5px solid var(--border)'}}>Custom</span>
                      )}
                    </td>
                    <td>{p.tags.map(t=><span key={t} style={{fontSize:'11px',padding:'2px 7px',borderRadius:'20px',background:'var(--bg-2)',color:'var(--text-3)',marginRight:'4px',border:'0.5px solid var(--border)'}}>{t}</span>)}</td>
                    <td style={{color:p.acceptance>70?'var(--teal-dark)':p.acceptance>40?'var(--amber)':'var(--red)',fontWeight:600}}>{p.acceptance}%</td>
                    <td style={{fontWeight:600,color:'var(--purple)'}}>{p.points}</td>
                    <td>
                      {isLC ? (
                        <button className="btn btn-ghost btn-sm" onClick={e=>{e.stopPropagation();window.open(p.leetcodeUrl,'_blank');}} style={{display:'flex',alignItems:'center',gap:'4px'}}>
                          <ExternalLink size={12} /> Open LC
                        </button>
                      ) : (
                        <button className="btn btn-ghost btn-sm" onClick={e=>{e.stopPropagation();navigate(`/contest/${liveContest.id}?problem=${p.id}`);}}>Solve →</button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={9} style={{textAlign:'center',padding:'3rem',color:'var(--text-3)'}}>No problems match your filters</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
