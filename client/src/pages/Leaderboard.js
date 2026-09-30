import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Trophy, Search, Award, ChevronRight } from 'lucide-react';


ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

export default function Leaderboard() {
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { user } = useAuth();

  useEffect(() => { 
    api.get('/leaderboard')
      .then(r => setBoard(r.data || []))
      .finally(() => setLoading(false)); 
  }, []);

  const filtered = board.filter(s => 
    !search || 
    s.name?.toLowerCase().includes(search.toLowerCase()) || 
    s.enrollment?.toLowerCase().includes(search.toLowerCase())
  );

  const top3 = board.slice(0, 3);

  const chartData = {
    labels: board.slice(0, 10).map(s => s.name.split(' ')[0]),
    datasets: [
      {
        label: 'Rating',
        data: board.slice(0, 10).map(s => s.rating),
        backgroundColor: board.slice(0, 10).map((_, i) => {
          if (i === 0) return '#ffd700';
          if (i === 1) return '#c0c0c0';
          if (i === 2) return '#cd7f32';
          return 'rgba(99, 102, 241, 0.6)';
        }),
        borderRadius: 8,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#111827',
        titleColor: '#fff',
        bodyColor: '#a5b4fc',
        padding: 8,
        cornerRadius: 6
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
      y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#9ca3af' } }
    }
  };

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trophy size={24} color="#ffd700" />
            <span>Competitive Leaderboard</span>
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '13px', marginTop: '2px' }}>
            Top student competitive programmers across the platform
          </p>
        </div>

        <div style={{ position: 'relative', width: '240px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input 
            className="inp" 
            style={{ paddingLeft: '34px' }} 
            placeholder="Search student or roll no…" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
      </div>

      {/* Top 3 Podium Showcase */}
      {top3.length >= 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '1.5rem' }}>
          {/* 2nd Place */}
          <div className="card" style={{ padding: '1.25rem', textAlign: 'center', borderTop: '3px solid #c0c0c0', background: 'rgba(192, 192, 192, 0.05)' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🥈</div>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #9ca3af, #d1d5db)', color: '#111827', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800 }}>
              {top3[1]?.avatar || top3[1]?.name[0]}
            </div>
            <div style={{ fontWeight: 800, fontSize: '15px' }}>{top3[1]?.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{top3[1]?.enrollment}</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#c0c0c0', marginTop: '6px' }}>{top3[1]?.rating} pts</div>
            <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '4px' }}>{top3[1]?.solved || 0} Solved · {top3[1]?.streak || 0}🔥 streak</div>
          </div>

          {/* 1st Place (Gold Crown) */}
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '3px solid #ffd700', background: 'linear-gradient(180deg, rgba(255, 215, 0, 0.1), rgba(17, 24, 39, 0.8))', transform: 'scale(1.03)', boxShadow: '0 0 24px rgba(255, 215, 0, 0.15)' }}>
            <div style={{ fontSize: '28px', marginBottom: '4px' }}>👑</div>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #ffd700)', color: '#111827', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800, boxShadow: '0 0 16px rgba(255, 215, 0, 0.4)' }}>
              {top3[0]?.avatar || top3[0]?.name[0]}
            </div>
            <div style={{ fontWeight: 800, fontSize: '16px', color: '#ffd700' }}>{top3[0]?.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{top3[0]?.enrollment}</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffd700', marginTop: '6px' }}>{top3[0]?.rating} pts</div>
            <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '4px', fontWeight: 600 }}>{top3[0]?.solved || 0} Solved · {top3[0]?.streak || 0}🔥 streak</div>
          </div>

          {/* 3rd Place */}
          <div className="card" style={{ padding: '1.25rem', textAlign: 'center', borderTop: '3px solid #cd7f32', background: 'rgba(205, 127, 50, 0.05)' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🥉</div>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #b45309, #cd7f32)', color: '#ffffff', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800 }}>
              {top3[2]?.avatar || top3[2]?.name[0]}
            </div>
            <div style={{ fontWeight: 800, fontSize: '15px' }}>{top3[2]?.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{top3[2]?.enrollment}</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#cd7f32', marginTop: '6px' }}>{top3[2]?.rating} pts</div>
            <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '4px' }}>{top3[2]?.solved || 0} Solved · {top3[2]?.streak || 0}🔥 streak</div>
          </div>
        </div>
      )}

      {/* Top 10 Rating Bar Chart */}
      {board.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="card-head">
            <div className="card-title">
              <Award size={16} color="#6366f1" />
              <span>Top 10 Rating Distribution</span>
            </div>
          </div>
          <div className="card-body" style={{ height: '180px' }}>
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="card">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '60px', textAlign: 'center' }}>Rank</th>
                  <th>Student</th>
                  <th>Enrollment</th>
                  <th>Rating</th>
                  <th>Solved</th>
                  <th>Contests</th>
                  <th>Streak</th>
                  <th style={{ textAlign: 'right' }}>Profile</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const isMe = s.enrollment === user?.enrollment;
                  return (
                    <tr 
                      key={s.id || s._id} 
                      style={{
                        background: s.academicStatus === 'flagged' ? 'rgba(239, 68, 68, 0.06)' : isMe ? 'rgba(99, 102, 241, 0.1)' : undefined,
                        borderLeft: s.academicStatus === 'flagged' ? '3px solid #ef4444' : s.academicStatus === 'warning' ? '3px solid #f59e0b' : undefined
                      }}
                    >
                      <td style={{ fontWeight: 800, fontSize: '14px', textAlign: 'center' }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${s.rank || i + 1}`}
                      </td>
                      <td>
                        <Link to={`/profile/${s.enrollment}`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: s.academicStatus === 'flagged' ? '#ef4444' : 'var(--primary-gradient)',
                            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800,
                            boxShadow: s.academicStatus === 'flagged' ? '0 0 8px rgba(239, 68, 68, 0.5)' : undefined
                          }}>
                            {s.avatar || s.name[0]}
                          </div>
                          <div>
                            <span style={{ fontWeight: 700, color: s.academicStatus === 'flagged' ? '#ef4444' : 'var(--text)' }}>
                              {s.name}
                            </span>
                            {s.academicStatus === 'flagged' && (
                              <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '0.5px solid #ef4444', padding: '1px 6px', borderRadius: '10px', marginLeft: '6px', fontWeight: 800 }}>
                                🚩 Flagged (Red)
                              </span>
                            )}
                            {s.academicStatus === 'warning' && (
                              <span style={{ fontSize: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '0.5px solid #f59e0b', padding: '1px 6px', borderRadius: '10px', marginLeft: '6px', fontWeight: 800 }}>
                                ⚠️ Warning
                              </span>
                            )}
                            {isMe && (
                              <span style={{ fontSize: '10px', background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', padding: '1px 6px', borderRadius: '10px', marginLeft: '6px', fontWeight: 700 }}>
                                You
                              </span>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="mono" style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                        {s.enrollment}
                      </td>
                      <td style={{ fontWeight: 800, color: '#a5b4fc', fontFamily: 'var(--mono)' }}>
                        {s.rating || 1200}
                      </td>
                      <td style={{ fontWeight: 600 }}>{s.solved || 0}</td>
                      <td>{s.contests || 0}</td>
                      <td style={{ color: '#fb923c', fontWeight: 700 }}>
                        {s.streak > 0 ? `🔥 ${s.streak}d` : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link to={`/profile/${s.enrollment}`}>
                          <button className="btn btn-ghost btn-sm" style={{ padding: '4px 10px' }}>
                            <span>View</span>
                            <ChevronRight size={12} />
                          </button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>
                      No students found matching your search.
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

