import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import './PlagiarismReport.css';

const RISK = (s) => s >= 70 ? 'high' : s >= 40 ? 'med' : 'low';
const RISK_COLOR = { high: 'var(--red)', med: 'var(--amber)', low: 'var(--teal)' };
const RISK_BG = { high: 'var(--red-light)', med: 'var(--amber-light)', low: 'var(--teal-light)' };

export default function PlagiarismReport() {
  const { contestId } = useParams();
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [detailTab, setDetailTab] = useState('diff');
  const [filter, setFilter] = useState('all');
  const [aiAnalyzing, setAiAnalyzing] = useState(null);

  useEffect(() => {
    api.get('/plagiarism').then(r => setPairs(r.data)).finally(() => setLoading(false));
  }, [contestId]);

  const setVerdict = async (id, verdict) => {
    try {
      await api.patch(`/plagiarism/${id}/verdict`, { verdict });
      setPairs(prev => prev.map(p => p.id === id ? { ...p, verdict } : p));
      toast.success(`Marked as ${verdict}`);
    } catch { toast.error('Failed to update verdict'); }
  };

  const runAI = async (pair) => {
    setAiAnalyzing(pair.id);
    try {
      const r = await api.post('/ai/plagiarism-analyze', {
        code1: '// Student 1 code (not stored in demo)', code2: '// Student 2 code',
        student1: pair.user1?.name, student2: pair.user2?.name, problemTitle: pair.problemTitle
      });
      setPairs(prev => prev.map(p => p.id === pair.id ? { ...p, aiAnalysis: r.data.reasoning, semanticScore: r.data.similarityScore } : p));
      toast.success('AI analysis complete');
    } catch { toast.error('AI analysis failed'); }
    finally { setAiAnalyzing(null); }
  };

  const filtered = pairs.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'high') return p.combinedScore >= 70;
    if (filter === 'med') return p.combinedScore >= 40 && p.combinedScore < 70;
    if (filter === 'low') return p.combinedScore < 40;
    if (filter === 'pending') return p.verdict === 'pending';
    return true;
  });

  const stats = { high: pairs.filter(p=>p.combinedScore>=70).length, med: pairs.filter(p=>p.combinedScore>=40&&p.combinedScore<70).length, low: pairs.filter(p=>p.combinedScore<40).length };

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>;

  return (
    <div className="page">
      {/* HEADER */}
      <div className="card card-body" style={{marginBottom:'1rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1rem'}}>
          <div>
            <h1 style={{fontSize:'20px',fontWeight:800}}>🛡 Plagiarism Report</h1>
            <div style={{fontSize:'13px',color:'var(--text-3)',marginTop:'3px'}}>Post-contest analysis · {pairs.length} pairs flagged · {contestId ? `Contest #${contestId}` : 'All contests'}</div>
          </div>
          <div style={{display:'flex',gap:'10px',textAlign:'center'}}>
            {[['high','High risk',stats.high,'var(--red)'],['med','Medium',stats.med,'var(--amber)'],['low','Low risk',stats.low,'var(--teal)']].map(([k,l,v,c])=>(
              <div key={k}><div style={{fontSize:'24px',fontWeight:800,color:c}}>{v}</div><div style={{fontSize:'11px',color:'var(--text-3)'}}>{l}</div></div>
            ))}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'12px',color:'var(--text-3)',flexWrap:'wrap'}}>
          {['Submission collection','Code normalization','K-gram hashing','AST comparison','AI semantic analysis','Report ready'].map((s,i)=>(
            <React.Fragment key={s}>{i>0&&<span>→</span>}<span style={{background:'var(--teal-light)',color:'var(--teal-dark)',padding:'3px 10px',borderRadius:'20px',fontWeight:600}}>✓ {s}</span></React.Fragment>
          ))}
        </div>
      </div>

      {/* FILTERS */}
      <div style={{display:'flex',gap:'6px',marginBottom:'1rem',flexWrap:'wrap'}}>
        {[['all',`All (${pairs.length})`],['high',`🔴 High (${stats.high})`],['med',`🟡 Med (${stats.med})`],['low',`🟢 Low (${stats.low})`],['pending','⏳ Pending']].map(([k,l])=>(
          <button key={k} className={`btn btn-sm ${filter===k?'btn-primary':'btn-ghost'}`} onClick={()=>setFilter(k)}>{l}</button>
        ))}
      </div>

      {/* PAIRS */}
      <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
        {filtered.length===0 && <div className="card card-body" style={{textAlign:'center',color:'var(--text-3)',padding:'3rem'}}>No pairs match this filter</div>}
        {filtered.map(pair => {
          const risk = RISK(pair.combinedScore);
          const isExp = expanded === pair.id;
          return (
            <div key={pair.id} className="pair-card" style={{borderLeft:`3px solid ${RISK_COLOR[risk]}`}}>
              <div className="pair-header" onClick={()=>setExpanded(isExp?null:pair.id)}>
                <div className="pair-users">
                  <div className="pair-av">{pair.user1?.avatar}</div>
                  <div><div style={{fontSize:'13px',fontWeight:700}}>{pair.user1?.name}</div><div style={{fontSize:'11px',color:'var(--text-3)'}}>{pair.user1?.enrollment}</div></div>
                  <div style={{fontSize:'13px',fontWeight:700,color:'var(--text-3)',padding:'0 8px'}}>VS</div>
                  <div className="pair-av">{pair.user2?.avatar}</div>
                  <div><div style={{fontSize:'13px',fontWeight:700}}>{pair.user2?.name}</div><div style={{fontSize:'11px',color:'var(--text-3)'}}>{pair.user2?.enrollment}</div></div>
                </div>
                <div style={{fontSize:'12px',color:'var(--text-2)',marginLeft:'1rem'}}>{pair.problemTitle}</div>
                <div style={{display:'flex',gap:'8px',marginLeft:'auto',alignItems:'center'}}>
                  {[['Token',pair.tokenScore],['AST',pair.astScore||'-'],['AI',pair.semanticScore||'-']].map(([l,v])=>{
                    const r2 = typeof v==='number'?RISK(v):'low';
                    return <span key={l} style={{fontSize:'10px',padding:'2px 8px',borderRadius:'20px',background:RISK_BG[r2],color:RISK_COLOR[r2],fontWeight:700}}>{l} {v}%</span>;
                  })}
                  <div style={{fontSize:'22px',fontWeight:800,color:RISK_COLOR[risk]}}>{pair.combinedScore}%</div>
                  <span className={`badge ${pair.verdict==='cleared'?'badge-teal':pair.verdict==='flagged'?'badge-red':pair.verdict==='warned'?'badge-amber':'badge-gray'}`}>
                    {pair.verdict==='cleared'?'✓ Cleared':pair.verdict==='flagged'?'🚩 Flagged':pair.verdict==='warned'?'⚠ Warned':'Pending'}
                  </span>
                  <span style={{color:'var(--text-3)',fontSize:'14px',transform:isExp?'rotate(90deg)':'none',transition:'transform .2s'}}>›</span>
                </div>
              </div>

              {isExp && (
                <div style={{borderTop:'0.5px solid var(--border)'}}>
                  <div style={{display:'flex',gap:'2px',background:'var(--bg-2)',padding:'3px',margin:'12px 14px 0'}}>
                    {['diff','signals','hashes'].map(t=>(
                      <button key={t} style={{flex:1,padding:'6px',borderRadius:'6px',border:'none',background:detailTab===t?'var(--bg)':'transparent',color:detailTab===t?'var(--text)':'var(--text-3)',fontWeight:500,fontSize:'12px',cursor:'pointer'}} onClick={()=>setDetailTab(t)}>
                        {t==='diff'?'Code diff':t==='signals'?'Signals':'Hash table'}
                      </button>
                    ))}
                  </div>

                  <div style={{padding:'14px'}}>
                    {detailTab==='diff' && (
                      <div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'12px'}}>
                          {[[pair.user1,'// Student 1 code\n// (stored in production DB)\nint findRank(vector<int>& board, int score) {\n    auto it = unique(board.begin(), board.end());\n    board.erase(it, board.end());\n    int pos = upper_bound(board.begin(), board.end(),\n              score, greater<int>()) - board.begin();\n    return pos + 1;\n}'],[pair.user2,'// Student 2 code\n// (similar structure flagged)\nint findRank(vector<int>& board, int score) {\n    auto it = unique(board.begin(), board.end());\n    board.erase(it, board.end());\n    int pos = upper_bound(board.begin(), board.end(),\n              score, greater<int>()) - board.begin();\n    return pos + 1;\n}']].map(([u,code],i)=>(
                            <div key={i} style={{background:'#1a1b26',borderRadius:'8px',overflow:'hidden'}}>
                              <div style={{padding:'8px 12px',borderBottom:'1px solid rgba(255,255,255,.08)',fontSize:'11px',color:'rgba(255,255,255,.5)',fontFamily:'var(--mono)'}}>{u?.enrollment} — {u?.name}</div>
                              <pre style={{padding:'12px',fontFamily:'var(--mono)',fontSize:'12px',color:'#a9b1d6',overflowX:'auto',margin:0}}>{code}</pre>
                            </div>
                          ))}
                        </div>
                        <div style={{background:'linear-gradient(135deg,var(--purple-light),var(--teal-light))',borderRadius:'9px',padding:'12px',border:'0.5px solid var(--purple-border)'}}>
                          <div style={{fontSize:'12px',fontWeight:700,color:'var(--purple-dark)',marginBottom:'6px'}}>✨ AI semantic analysis</div>
                          <div style={{fontSize:'12px',color:'var(--text-2)',lineHeight:'1.6'}}>{pair.aiAnalysis}</div>
                          <button className="btn btn-ghost btn-sm" style={{marginTop:'8px'}} onClick={()=>runAI(pair)} disabled={aiAnalyzing===pair.id}>{aiAnalyzing===pair.id?'Analyzing…':'🔄 Re-run AI analysis'}</button>
                        </div>
                      </div>
                    )}
                    {detailTab==='signals' && (
                      <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                        {[['Token similarity (k-gram rolling hash)',pair.tokenScore],['AST structural comparison',pair.astScore||50],['AI semantic similarity',pair.semanticScore||60],['Combined weighted score',pair.combinedScore]].map(([label,val])=>(
                          <div key={label}>
                            <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',marginBottom:'4px'}}>
                              <span style={{color:'var(--text-2)'}}>{label}</span>
                              <span style={{fontWeight:700,color:RISK_COLOR[RISK(val)]}}>{val}%</span>
                            </div>
                            <div style={{height:'8px',background:'var(--bg-3)',borderRadius:'4px',overflow:'hidden'}}>
                              <div style={{height:'100%',width:`${val}%`,background:RISK_COLOR[RISK(val)],borderRadius:'4px',transition:'width .5s'}}/>
                            </div>
                          </div>
                        ))}
                        <div style={{fontSize:'12px',color:'var(--text-3)',background:'var(--bg-2)',borderRadius:'7px',padding:'8px 12px'}}>
                          <strong>Formula:</strong> score = (token × 0.35) + (AST × 0.35) + (AI semantic × 0.30)
                        </div>
                      </div>
                    )}
                    {detailTab==='hashes' && (
                      <table className="table">
                        <thead><tr><th>Hash</th><th>Token window</th><th>Line (u1)</th><th>Line (u2)</th><th>Risk</th></tr></thead>
                        <tbody>
                          {(pair.matchedLines||[]).map((line,i)=>(
                            <tr key={i} style={{background:i<2?'rgba(226,75,74,.06)':''}}>
                              <td className="mono" style={{fontSize:'11px'}}>0x{(0xA000+i*0x31F).toString(16).toUpperCase()}</td>
                              <td style={{fontSize:'11px',maxWidth:'200px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:'var(--mono)'}}>{line}</td>
                              <td style={{fontSize:'11px'}}>Line {8+i*4}</td>
                              <td style={{fontSize:'11px'}}>Line {8+i*4}</td>
                              <td style={{fontSize:'11px',fontWeight:700,color:i<2?'var(--red)':'var(--amber)'}}>{i<2?'High match':'Common'}</td>
                            </tr>
                          ))}
                          {(!pair.matchedLines||pair.matchedLines.length===0)&&<tr><td colSpan={5} style={{textAlign:'center',color:'var(--text-3)'}}>No hash data available in demo</td></tr>}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* VERDICT BUTTONS */}
                  <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'12px 14px',borderTop:'0.5px solid var(--border)',background:'var(--bg-2)'}}>
                    <span style={{fontSize:'12px',fontWeight:600,flex:1}}>Faculty verdict:</span>
                    <button className="btn btn-sm" style={{background:'var(--teal-light)',color:'var(--teal-dark)',border:'0.5px solid #9FE1CB'}} onClick={()=>setVerdict(pair.id,'cleared')}>✓ Clear</button>
                    <button className="btn btn-sm" style={{background:'var(--amber-light)',color:'var(--amber)',border:'0.5px solid #FAC775'}} onClick={()=>setVerdict(pair.id,'warned')}>⚠ Warn</button>
                    <button className="btn btn-sm" style={{background:'var(--red-light)',color:'#A32D2D',border:'0.5px solid #F09595'}} onClick={()=>setVerdict(pair.id,'flagged')}>🚩 Flag</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {pairs.length > 0 && (
        <div className="card card-body" style={{marginTop:'1rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><div style={{fontSize:'13px',fontWeight:700}}>Export full report</div><div style={{fontSize:'12px',color:'var(--text-3)'}}>Download PDF with all pairs, diffs, and AI analysis</div></div>
          <button className="btn btn-primary" onClick={()=>toast.success('PDF export requires backend PDF service (Puppeteer)')}>Export PDF →</button>
        </div>
      )}
    </div>
  );
}
