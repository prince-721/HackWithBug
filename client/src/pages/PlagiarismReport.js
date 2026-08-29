import React, { useEffect, useState, useCallback } from 'react';
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
  const [analyzingContest, setAnalyzingContest] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [detailTab, setDetailTab] = useState('diff');
  const [filter, setFilter] = useState('all');
  const [aiAnalyzing, setAiAnalyzing] = useState(null);

  const fetchPairs = useCallback(() => {
    setLoading(true);
    const url = contestId ? `/plagiarism?contestId=${contestId}` : '/plagiarism';
    api.get(url)
      .then(r => setPairs(r.data))
      .catch(() => toast.error('Failed to load plagiarism pairs'))
      .finally(() => setLoading(false));
  }, [contestId]);

  useEffect(() => {
    fetchPairs();
  }, [fetchPairs]);

  const runContestAnalysis = async () => {
    if (!contestId && pairs.length === 0) {
      return toast.error('Please select a contest to run analysis');
    }
    const cId = contestId || (pairs[0]?.contestId?._id || pairs[0]?.contestId);
    if (!cId) return;

    setAnalyzingContest(true);
    toast.loading('Running deep multi-stage AI plagiarism audit…', { id: 'audit' });
    try {
      const res = await api.post('/plagiarism/analyze', { contestId: cId });
      toast.success(`Audit complete: ${res.data.newPairs} new, ${res.data.updatedPairs || 0} updated flags`, { id: 'audit' });
      fetchPairs();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Analysis failed', { id: 'audit' });
    } finally {
      setAnalyzingContest(false);
    }
  };

  const setVerdict = async (id, verdict) => {
    try {
      await api.patch(`/plagiarism/${id}/verdict`, { verdict });
      setPairs(prev => prev.map(p => p.id === id ? { ...p, verdict } : p));
      toast.success(`Marked as ${verdict}`);
    } catch {
      toast.error('Failed to update verdict');
    }
  };

  const deletePair = async (id) => {
    if (!window.confirm('Delete this plagiarism flag record?')) return;
    try {
      await api.delete(`/plagiarism/${id}`);
      setPairs(prev => prev.filter(p => p.id !== id));
      toast.success('Record deleted');
    } catch {
      toast.error('Failed to delete record');
    }
  };

  const clearAllPairs = async () => {
    if (!window.confirm('Are you sure you want to clear all plagiarism flag records? This cannot be undone.')) return;
    try {
      const url = contestId ? `/plagiarism/clear-all?contestId=${contestId}` : '/plagiarism/clear-all';
      await api.delete(url);
      setPairs([]);
      toast.success('All plagiarism records cleared');
    } catch {
      toast.error('Failed to clear records');
    }
  };

  const runAI = async (pair) => {
    setAiAnalyzing(pair.id);
    toast.loading('Running live AI forensics comparison…', { id: 'ai-run' });
    try {
      const r = await api.post(`/plagiarism/${pair.id}/re-analyze`);
      const updated = r.data;
      setPairs(prev => prev.map(p => p.id === pair.id ? {
        ...p,
        ...updated,
        aiAnalysis: updated.aiAnalysis,
        semanticScore: updated.semanticScore,
        tokenScore: updated.tokenScore,
        astScore: updated.astScore,
        combinedScore: updated.combinedScore,
        recommendation: updated.recommendation,
        matchedPatterns: updated.matchedPatterns,
        matchedLines: updated.matchedLines
      } : p));
      toast.success('Live AI Forensics complete!', { id: 'ai-run' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'AI analysis failed', { id: 'ai-run' });
    } finally {
      setAiAnalyzing(null);
    }
  };

  const filtered = pairs.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'high') return p.combinedScore >= 70;
    if (filter === 'med') return p.combinedScore >= 40 && p.combinedScore < 70;
    if (filter === 'low') return p.combinedScore < 40;
    if (filter === 'pending') return p.verdict === 'pending';
    return true;
  });

  const stats = {
    high: pairs.filter(p => p.combinedScore >= 70).length,
    med: pairs.filter(p => p.combinedScore >= 40 && p.combinedScore < 70).length,
    low: pairs.filter(p => p.combinedScore < 40).length
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page" style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* HEADER */}
      <div className="card card-body" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🛡 Live Plagiarism & Honor Code AI Forensics
            </h1>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '3px' }}>
              Multi-layer analysis (Identifier-Invariant Token + AST Structural + Winnowing K-Gram + Groq Semantic AI) · {pairs.length} pairs flagged · {contestId ? `Contest #${contestId}` : 'All Contests'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '12px', textAlign: 'center' }}>
              {[['high', 'High Risk', stats.high, 'var(--red)'], ['med', 'Medium', stats.med, 'var(--amber)'], ['low', 'Low Risk', stats.low, 'var(--teal)']].map(([k, l, v, c]) => (
                <div key={k}>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: c }}>{v}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {contestId && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={runContestAnalysis}
                  disabled={analyzingContest}
                >
                  {analyzingContest ? 'Analyzing Contest…' : '⚡ Re-scan Contest'}
                </button>
              )}
              {pairs.length > 0 && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={clearAllPairs}
                  title="Purge old records"
                >
                  🗑 Clear All Records
                </button>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-3)', flexWrap: 'wrap' }}>
          {['Submission Harvest', 'Identifier Normalization ($v0..$vn)', 'Winnowing K-Grams', 'AST & CFG Profiling', 'Groq Semantic Reasoning', 'Real-time Live Alerting'].map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 && <span>→</span>}
              <span style={{ background: 'var(--teal-light)', color: 'var(--teal-dark)', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}>
                ✓ {s}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* FILTERS */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[['all', `All (${pairs.length})`], ['high', `🔴 High (${stats.high})`], ['med', `🟡 Med (${stats.med})`], ['low', `🟢 Low (${stats.low})`], ['pending', '⏳ Pending']].map(([k, l]) => (
            <button key={k} className={`btn btn-sm ${filter === k ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
          Tip: Click any student pair to open full side-by-side code diff and AI reasoning
        </div>
      </div>

      {/* PAIRS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.length === 0 && (
          <div className="card card-body" style={{ textAlign: 'center', color: 'var(--text-3)', padding: '3rem' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛡</div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>No suspicious code pairs match this filter</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>All submitted solutions appear independent or cleanly structured.</div>
          </div>
        )}

        {filtered.map(pair => {
          const risk = RISK(pair.combinedScore);
          const isExp = expanded === pair.id;
          return (
            <div key={pair.id} className="pair-card" style={{ borderLeft: `4px solid ${RISK_COLOR[risk]}` }}>
              <div className="pair-header" onClick={() => setExpanded(isExp ? null : pair.id)}>
                <div className="pair-users">
                  <div className="pair-av">{pair.user1?.avatar || pair.user1?.name?.slice(0, 2)?.toUpperCase() || 'U1'}</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>{pair.user1?.name || 'Candidate 1'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{pair.user1?.enrollment || 'N/A'}</div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-3)', padding: '0 8px' }}>VS</div>
                  <div className="pair-av">{pair.user2?.avatar || pair.user2?.name?.slice(0, 2)?.toUpperCase() || 'U2'}</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>{pair.user2?.name || 'Candidate 2'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{pair.user2?.enrollment || 'N/A'}</div>
                  </div>
                </div>

                <div style={{ marginLeft: '1rem' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{pair.problemTitle}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{pair.contestTitle}</div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', alignItems: 'center' }}>
                  {[['Token', pair.tokenScore], ['AST', pair.astScore || 0], ['AI Logic', pair.semanticScore || 0]].map(([l, v]) => {
                    const r2 = typeof v === 'number' ? RISK(v) : 'low';
                    return (
                      <span key={l} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: RISK_BG[r2], color: RISK_COLOR[r2], fontWeight: 700 }}>
                        {l} {v}%
                      </span>
                    );
                  })}
                  <div style={{ fontSize: '22px', fontWeight: 800, color: RISK_COLOR[risk], minWidth: '54px', textAlign: 'right' }}>
                    {pair.combinedScore}%
                  </div>
                  <span className={`badge ${pair.verdict === 'cleared' ? 'badge-teal' : pair.verdict === 'flagged' ? 'badge-red' : pair.verdict === 'warned' ? 'badge-amber' : 'badge-gray'}`}>
                    {pair.verdict === 'cleared' ? '✓ Cleared' : pair.verdict === 'flagged' ? '🚩 Flagged' : pair.verdict === 'warned' ? '⚠ Warned' : '⏳ Pending'}
                  </span>
                  {pair.recommendation && (
                    <span style={{
                      fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px',
                      background: pair.recommendation === 'Flag' ? 'rgba(239,68,68,0.15)' : pair.recommendation === 'Warn' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                      color: pair.recommendation === 'Flag' ? '#ef4444' : pair.recommendation === 'Warn' ? '#f59e0b' : '#10b981'
                    }}>
                      AI: {pair.recommendation}
                    </span>
                  )}
                  <span style={{ color: 'var(--text-3)', fontSize: '14px', transform: isExp ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>›</span>
                </div>
              </div>

              {isExp && (
                <div style={{ borderTop: '0.5px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-2)', padding: '3px', margin: '12px 14px 0' }}>
                    {['diff', 'signals', 'patterns'].map(t => (
                      <button
                        key={t}
                        style={{
                          flex: 1, padding: '6px', borderRadius: '6px', border: 'none',
                          background: detailTab === t ? 'var(--bg)' : 'transparent',
                          color: detailTab === t ? 'var(--text)' : 'var(--text-3)',
                          fontWeight: 600, fontSize: '12px', cursor: 'pointer'
                        }}
                        onClick={() => setDetailTab(t)}
                      >
                        {t === 'diff' ? '📝 Side-by-Side Code Diff' : t === 'signals' ? '📊 Multi-Layer Signals' : '🔍 Matched Patterns & Lines'}
                      </button>
                    ))}
                  </div>

                  <div style={{ padding: '14px' }}>
                    {/* TAB 1: Real Side-by-side Code Diff */}
                    {detailTab === 'diff' && (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                          {[
                            [pair.user1, pair.code1 || '// No source code recorded', pair.lang1 || 'cpp17'],
                            [pair.user2, pair.code2 || '// No source code recorded', pair.lang2 || 'cpp17']
                          ].map(([u, code, lang], i) => (
                            <div key={i} style={{ background: '#1e1e2e', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                              <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,.08)', fontSize: '11px', color: '#cdd6f4', fontFamily: 'var(--mono)', display: 'flex', justifyContent: 'space-between', background: '#181825' }}>
                                <span>{u?.enrollment} — {u?.name}</span>
                                <span style={{ color: '#89b4fa', fontWeight: 700 }}>{lang}</span>
                              </div>
                              <pre style={{
                                padding: '12px', fontFamily: 'var(--mono)', fontSize: '12px', color: '#cdd6f4',
                                overflowX: 'auto', maxHeight: '360px', overflowY: 'auto', margin: 0,
                                whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.5
                              }}>
                                {code}
                              </pre>
                            </div>
                          ))}
                        </div>

                        {/* AI Semantic Forensics Card */}
                        <div style={{ background: 'linear-gradient(135deg, rgba(127,119,221,0.12), rgba(29,158,117,0.12))', borderRadius: '9px', padding: '14px', border: '0.5px solid var(--purple)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--purple)' }}>
                              ✨ Groq AI Plagiarism & Logic Forensics
                            </div>
                            <span style={{
                              fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px',
                              background: pair.combinedScore >= 70 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                              color: pair.combinedScore >= 70 ? 'var(--red)' : 'var(--amber)'
                            }}>
                              Verdict: {pair.verdict || 'Suspicious'}
                            </span>
                          </div>

                          <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: '1.6', marginTop: '4px' }}>
                            {pair.aiAnalysis || 'Automated AI structural & logic comparison completed.'}
                          </div>

                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => runAI(pair)}
                              disabled={aiAnalyzing === pair.id}
                            >
                              {aiAnalyzing === pair.id ? 'Analyzing Logic…' : '🔄 Re-run Deep AI Forensics'}
                            </button>
                            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                              Compares logic paths, canonical variables ($v0..$vn), and algorithmic choice
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: Multi-Layer Mathematical Signals */}
                    {detailTab === 'signals' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                          ['Token Similarity (Winnowing / Identifier-Invariant Hashing)', pair.tokenScore, '35% weight'],
                          ['AST & Control Flow Graph Structural Profiling', pair.astScore || 0, '35% weight'],
                          ['Groq AI Semantic & Logic Similarity', pair.semanticScore || 0, '30% weight'],
                          ['Overall Combined Forensics Score', pair.combinedScore, '100% Total']
                        ].map(([label, val, weight]) => (
                          <div key={label}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                              <span style={{ color: 'var(--text)', fontWeight: 600 }}>{label} <span style={{ color: 'var(--text-3)', fontSize: '11px' }}>({weight})</span></span>
                              <span style={{ fontWeight: 800, color: RISK_COLOR[RISK(val)] }}>{val}%</span>
                            </div>
                            <div style={{ height: '8px', background: 'var(--bg-3)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${val}%`, background: RISK_COLOR[RISK(val)], borderRadius: '4px', transition: 'width .5s' }} />
                            </div>
                          </div>
                        ))}
                        <div style={{ fontSize: '12px', color: 'var(--text-3)', background: 'var(--bg-2)', borderRadius: '7px', padding: '10px 14px' }}>
                          <strong>Weighted Plagiarism Formula:</strong> Score = (Token × 0.35) + (AST × 0.35) + (AI Semantic × 0.30)
                        </div>
                      </div>
                    )}

                    {/* TAB 3: Matched Patterns & Line Sequences */}
                    {detailTab === 'patterns' && (
                      <div>
                        {pair.matchedPatterns && pair.matchedPatterns.length > 0 && (
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Identified Matching Patterns</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {pair.matchedPatterns.map((pat, idx) => (
                                <div key={idx} style={{ fontSize: '12px', padding: '6px 10px', borderRadius: '6px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--text)' }}>
                                  ⚠️ {pat}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Identical & Near-Identical Code Slices</div>
                        <table className="table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Matching Code Slice</th>
                              <th>Risk Level</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(pair.matchedLines || []).map((line, i) => (
                              <tr key={i} style={{ background: i < 3 ? 'rgba(226,75,74,.06)' : '' }}>
                                <td style={{ fontSize: '11px', color: 'var(--text-3)' }}>{i + 1}</td>
                                <td style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text)' }}>{line}</td>
                                <td style={{ fontSize: '11px', fontWeight: 700, color: i < 3 ? 'var(--red)' : 'var(--amber)' }}>
                                  {i < 3 ? 'High Overlap' : 'Common Pattern'}
                                </td>
                              </tr>
                            ))}
                            {(!pair.matchedLines || pair.matchedLines.length === 0) && (
                              <tr>
                                <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '1.5rem' }}>
                                  No contiguous raw line blocks matched directly (structural obfuscation or identifier renaming was detected).
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* VERDICT ACTION BUTTONS */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', borderTop: '0.5px solid var(--border)', background: 'var(--bg-2)', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, flex: 1 }}>Set Faculty Honor Code Verdict:</span>
                    <button className="btn btn-sm" style={{ background: 'var(--teal-light)', color: 'var(--teal-dark)', border: '0.5px solid #9FE1CB' }} onClick={() => setVerdict(pair.id, 'cleared')}>
                      ✓ Clear Solution
                    </button>
                    <button className="btn btn-sm" style={{ background: 'var(--amber-light)', color: 'var(--amber)', border: '0.5px solid #FAC775' }} onClick={() => setVerdict(pair.id, 'warned')}>
                      ⚠ Issue Academic Warning
                    </button>
                    <button className="btn btn-sm" style={{ background: 'var(--red-light)', color: '#A32D2D', border: '0.5px solid #F09595' }} onClick={() => setVerdict(pair.id, 'flagged')}>
                      🚩 Flag for Disqualification
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-3)' }} onClick={() => deletePair(pair.id)} title="Delete record">
                      🗑 Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
