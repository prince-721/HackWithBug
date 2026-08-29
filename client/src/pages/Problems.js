import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import useLeetCodeSync from '../hooks/useLeetCodeSync';
import toast from 'react-hot-toast';
import { 
  RefreshCw, 
  ExternalLink, 
  Search, 
  CheckCircle2, 
  Code2, 
  ArrowRight, 
  PlusCircle 
} from 'lucide-react';



const DIFFS = ['all', 'easy', 'medium', 'hard'];
const TAGS = ['all', 'Arrays', 'DP', 'Graphs', 'Trees', 'Binary Search', 'Greedy', 'Math', 'Strings', 'Segment Tree', 'Hashing', 'Stack', 'Recursion'];

export default function Problems() {
  const { user } = useAuth();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [diff, setDiff] = useState('all');
  const [tag, setTag] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [mySubmissions, setMySubmissions] = useState([]);
  const navigate = useNavigate();

  // LeetCode sync hook — auto-sync every 5 minutes if user has LC connected
  const { syncing, lastSync, sync: lcSync, isSolved: isLcSolved } = useLeetCodeSync(
    user?.leetcode ? user?.id : null,
    user?.leetcode ? 5 : 0  // Auto-poll every 5 minutes if LC connected
  );


  useEffect(() => {
    api.get('/problems')
      .then(r => setProblems(r.data || []))
      .finally(() => setLoading(false));

    if (user?.id) {
      api.get('/submissions?userId=' + user.id)
        .then(r => setMySubmissions(r.data || []))
        .catch(() => {});
    }

    // Trigger an immediate LeetCode sync on page load if connected
    if (user?.leetcode && user?.id) {
      lcSync();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.leetcode]);


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
    'hwb-solved': { icon: <CheckCircle2 size={16} color="#00b8a3" />, title: 'Solved on HackWithBug' },
    'lc-solved': { icon: <CheckCircle2 size={16} color="#ffa116" />, title: 'Solved on LeetCode' },
    'attempted': { icon: <span style={{ color: '#f59e0b', fontSize: '13px', fontWeight: 800 }}>🔶</span>, title: 'Attempted' },
    'none': { icon: <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '14px' }}>—</span>, title: 'Not started' }
  };

  const filtered = problems.filter(p => {
    if (diff !== 'all' && p.difficulty !== diff) return false;
    if (tag !== 'all' && !(p.tags || []).includes(tag)) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    
    if (statusFilter !== 'all') {
      const st = getStatus(p);
      if (statusFilter === 'solved' && st !== 'hwb-solved' && st !== 'lc-solved') return false;
      if (statusFilter === 'attempted' && st !== 'attempted') return false;
      if (statusFilter === 'todo' && st !== 'none') return false;
    }
    return true;
  });

  const countsByDiff = {
    all: problems.length,
    easy: problems.filter(p => p.difficulty === 'easy').length,
    medium: problems.filter(p => p.difficulty === 'medium').length,
    hard: problems.filter(p => p.difficulty === 'hard').length,
  };

  const handleRowClick = (p) => {
    navigate(`/problem/${p.id}`);
  };


  const handleManualSync = async () => {
    if (!user?.leetcode) {
      return toast.error('Connect your LeetCode account in Profile settings first');
    }
    const result = await lcSync();
    if (result) {
      toast.success(`🎉 Synced ${result.solvedCount} solved LC problems`);
    }
  };

  return (
    <div className="page">
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Code2 size={24} color="#6366f1" />
            <span>Problem Bank</span>
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '13px', marginTop: '2px' }}>
            Practice curated Data Structures and Algorithms problems curated by faculty and LeetCode
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="badge badge-purple" style={{ padding: '5px 12px', fontSize: '12px' }}>
            {filtered.length} of {problems.length} Problems
          </span>
          {user?.role === 'faculty' ? (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/dev/problem/new')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <PlusCircle size={14} />
              <span>+ Create Problem</span>
            </button>
          ) : user?.leetcode ? (
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleManualSync}
              disabled={syncing}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
              <span>{syncing ? 'Syncing…' : 'Sync LeetCode'}</span>
              {lastSync && (
                <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                  ({Math.round((Date.now() - lastSync.getTime()) / 60000)}m ago)
                </span>
              )}
            </button>
          ) : null}
        </div>
      </div>


      {/* Difficulty Tabs Bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {DIFFS.map(d => {
          const isActive = diff === d;
          let activeColor = '#ffffff';
          if (d === 'easy') activeColor = '#00b8a3';
          if (d === 'medium') activeColor = '#ffb800';
          if (d === 'hard') activeColor = '#ef4444';

          return (
            <button
              key={d}
              className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                borderRadius: '20px',
                padding: '6px 16px',
                fontWeight: 700,
                ...(isActive && d !== 'all' ? { background: `${activeColor}20`, color: activeColor, borderColor: `${activeColor}50` } : {})
              }}
              onClick={() => setDiff(d)}
            >
              <span>{d === 'all' ? 'All Difficulties' : d.charAt(0).toUpperCase() + d.slice(1)}</span>
              <span style={{ opacity: 0.65, fontSize: '11px', marginLeft: '4px' }}>({countsByDiff[d] || 0})</span>
            </button>
          );
        })}

        {/* Status Dropdown Filter */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select 
            className="select" 
            style={{ width: '130px', padding: '6px 10px', fontSize: '12px' }} 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">Status: All</option>
            <option value="solved">✓ Solved</option>
            <option value="attempted">🔶 Attempted</option>
            <option value="todo">⬜ Todo</option>
          </select>
        </div>
      </div>

      {/* Search and Topic Tags Filter Bar */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '260px', flex: '0 1 320px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
            <input
              className="inp"
              style={{ paddingLeft: '34px', fontSize: '13px' }}
              placeholder="Search problem title or id…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Topic Pills List */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1, alignItems: 'center' }}>
            {TAGS.map(t => {
              const isSelected = tag === t;
              return (
                <button
                  key={t}
                  onClick={() => setTag(t)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '16px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid',
                    transition: 'all 0.15s ease',
                    background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                    color: isSelected ? '#ffffff' : 'var(--text-2)',
                  }}
                >
                  {t === 'all' ? 'All Topics' : t}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Problems Table Card */}
      <div className="card">
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '44px', textAlign: 'center' }}>Status</th>
                  <th style={{ width: '70px' }}>#</th>
                  <th>Title</th>
                  <th>Difficulty</th>
                  <th>Source</th>
                  <th>Tags</th>
                  <th>Acceptance</th>
                  <th>Points</th>
                  <th style={{ textAlign: 'right', width: '120px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const status = getStatus(p);
                  const isLC = p.source === 'leetcode';

                  return (
                    <tr 
                      key={p.id || p._id} 
                      style={{ cursor: 'pointer' }} 
                      onClick={() => handleRowClick(p)}
                    >
                      <td style={{ textAlign: 'center' }} title={statusIcons[status].title}>
                        {statusIcons[status].icon}
                      </td>

                      <td style={{ color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: '12px' }}>
                        #{String(p.id).padStart(4, '0')}
                      </td>

                      <td>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{p.title}</span>
                          {isLC && (
                            <span style={{ fontSize: '10px', color: '#ffa116', background: 'rgba(255, 161, 22, 0.15)', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                              LC
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span className={`diff-chip ${p.difficulty}`}>
                          {p.difficulty}
                        </span>
                      </td>

                      <td>
                        {isLC ? (
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(255, 161, 22, 0.12)', color: '#ffa116', fontWeight: 600, border: '1px solid rgba(255, 161, 22, 0.25)' }}>
                            LeetCode
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(99, 102, 241, 0.1)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                            HackWithBug
                          </span>
                        )}
                      </td>

                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {(p.tags || []).slice(0, 3).map(t => (
                            <span 
                              key={t} 
                              style={{ 
                                fontSize: '11px', 
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                background: 'rgba(255, 255, 255, 0.04)', 
                                color: 'var(--text-2)', 
                                border: '1px solid var(--border)' 
                              }}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td>
                        <span style={{ 
                          color: p.acceptance > 65 ? '#00b8a3' : p.acceptance > 40 ? '#ffb800' : '#ef4444', 
                          fontWeight: 700,
                          fontFamily: 'var(--mono)',
                          fontSize: '12px'
                        }}>
                          {p.acceptance || 65}%
                        </span>
                      </td>

                      <td>
                        <span style={{ fontWeight: 700, color: '#a5b4fc', fontFamily: 'var(--mono)' }}>
                          {p.points || 100}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        {user?.role === 'faculty' ? (
                          <button 
                            className="btn btn-ghost btn-sm" 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              navigate(p.id ? `/dev/problem/${p.id}` : '/dev/problem/new'); 
                            }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', borderColor: 'var(--primary-border)', color: '#a5b4fc' }}
                          >
                            <span>Edit</span>
                            <ArrowRight size={12} />
                          </button>
                        ) : isLC ? (
                          <button 
                            className="btn btn-ghost btn-sm" 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              window.open(p.leetcodeUrl, '_blank'); 
                            }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <ExternalLink size={12} />
                            <span>LeetCode</span>
                          </button>
                        ) : (
                          <button 
                            className="btn btn-primary btn-sm" 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              navigate(`/practice?problem=${p.id}`); 
                            }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <span>Solve</span>
                            <ArrowRight size={12} />
                          </button>
                        )}
                      </td>

                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-3)' }}>
                      No problems match your current search and filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

