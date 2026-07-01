import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

export default function Leaderboard() {
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { user } = useAuth();

  useEffect(() => { api.get('/leaderboard').then(r => setBoard(r.data)).finally(() => setLoading(false)); }, []);

  const filtered = board.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.enrollment.includes(search));

  const chartData = {
    labels: board.slice(0,10).map(s => s.name.split(' ')[0]),
    datasets: [{ data: board.slice(0,10).map(s => s.rating), backgroundColor: board.slice(0,10).map((_, i) => i < 3 ? '#7F77DD' : '#AFA9EC'), borderRadius: 6 }]
  };

  return (
    <div className="page">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
        <h1 className="section-title" style={{margin:0}}>🏆 Leaderboard</h1>
        <input className="inp" style={{width:'200px'}} placeholder="Search student…" value={search} onChange={e=>setSearch(e.target.value)} />
      </div>

      {board.length > 0 && (
        <div className="card" style={{marginBottom:'1rem'}}>
          <div className="card-head"><div className="card-title">Top 10 rating</div></div>
          <div className="card-body"><Bar data={chartData} options={{responsive:true,plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{grid:{color:'rgba(0,0,0,.05)'}}}}}/></div>
        </div>
      )}

      <div className="card">
        {loading ? <div style={{padding:'3rem',textAlign:'center'}}><div className="spinner" style={{margin:'0 auto'}}/></div> : (
          <table className="table">
            <thead><tr><th>Rank</th><th>Student</th><th>Enrollment</th><th>Rating</th><th>Solved</th><th>Contests</th><th>Streak</th></tr></thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} style={{background: s.enrollment === user?.enrollment ? 'rgba(127,119,221,.06)' : ''}}>
                  <td style={{fontWeight:700,fontSize:'15px'}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':s.rank}</td>
                  <td>
                    <Link to={`/profile/${s.enrollment}`} style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      <div style={{width:28,height:28,borderRadius:'50%',background:'var(--purple-light)',color:'var(--purple-dark)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:700}}>{s.avatar}</div>
                      <span style={{fontWeight:600}}>{s.name}{s.enrollment===user?.enrollment && <span style={{fontSize:'10px',background:'var(--purple-light)',color:'var(--purple-dark)',padding:'1px 7px',borderRadius:'20px',marginLeft:'6px'}}>You</span>}</span>
                    </Link>
                  </td>
                  <td className="mono" style={{fontSize:'12px',color:'var(--text-3)'}}>{s.enrollment}</td>
                  <td style={{fontWeight:700,color:'var(--purple)'}}>{s.rating}</td>
                  <td>{s.solved}</td>
                  <td>{s.contests}</td>
                  <td>{s.streak > 0 ? `🔥 ${s.streak}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
