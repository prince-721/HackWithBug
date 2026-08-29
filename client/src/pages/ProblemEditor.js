import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Link2, CheckCircle2, ArrowLeft, RefreshCw } from 'lucide-react';



const DIFFS = ['easy', 'medium', 'hard'];
const TAGS_LIST = ['Arrays', 'Two Pointers', 'Sliding Window', 'DP', 'Graphs', 'Trees', 'Binary Search', 'Greedy', 'Math', 'Strings', 'Segment Tree', 'Hashing', 'Bit Manipulation', 'Heaps', 'Backtracking', 'Linked Lists', 'Stacks', 'Queue'];

export default function ProblemEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState({
    title: '',
    difficulty: 'medium',
    points: 200,
    tags: [],
    statement: '',
    inputFormat: '',
    outputFormat: '',
    constraints: '',
    sampleInput: '',
    sampleOutput: '',
    timeLimit: 1.0,
    memoryLimit: 256,
    editorial: '',
    optimalAlgorithm: '',
    explanation: ''
  });

  const [testCases, setTestCases] = useState([
    { type: 'sample', input: '', output: '' },
    { type: 'hidden', input: '', output: '' }
  ]);
  const [tab, setTab] = useState('preview');
  const [aiPrompt, setAiPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingProblem, setLoadingProblem] = useState(!isNew);

  // LeetCode linking state
  const [problemSource, setProblemSource] = useState('custom'); // 'custom' | 'leetcode'
  const [lcUrl, setLcUrl] = useState('');
  const [lcFetching, setLcFetching] = useState(false);
  const [lcFetched, setLcFetched] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleTag = (tag) => setForm(f => ({
    ...f,
    tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag]
  }));

  // Fetch existing problem data on mount when editing
  useEffect(() => {
    if (!isNew && id) {
      setLoadingProblem(true);
      api.get(`/problems/${id}`)
        .then(r => {
          const p = r.data;
          if (p) {
            setForm({
              title: p.title || '',
              difficulty: p.difficulty || 'medium',
              points: p.points || (p.difficulty === 'easy' ? 100 : p.difficulty === 'hard' ? 300 : 200),
              tags: p.tags || [],
              statement: p.statement || '',
              inputFormat: p.inputFormat || '',
              outputFormat: p.outputFormat || '',
              constraints: p.constraints || '',
              sampleInput: p.sampleInput || '',
              sampleOutput: p.sampleOutput || '',
              timeLimit: p.timeLimit || 1.0,
              memoryLimit: p.memoryLimit || 256,
              editorial: p.editorial || '',
              optimalAlgorithm: p.optimalAlgorithm || '',
              explanation: p.explanation || ''
            });

            if (p.source === 'leetcode') {
              setProblemSource('leetcode');
              setLcUrl(p.leetcodeUrl || (p.leetcodeSlug ? `https://leetcode.com/problems/${p.leetcodeSlug}/` : ''));
              setLcFetched({
                title: p.title,
                slug: p.leetcodeSlug,
                url: p.leetcodeUrl || `https://leetcode.com/problems/${p.leetcodeSlug}/`,
                difficulty: p.difficulty,
                tags: p.tags
              });
            } else {
              setProblemSource('custom');
            }

            // Extract test cases (sample + hidden)
            if (p.testCases && p.testCases.length > 0) {
              setTestCases(p.testCases);
            } else {
              const tc = [];
              if (p.sampleInput) {
                tc.push({ type: 'sample', input: p.sampleInput, output: p.sampleOutput || '' });
              }
              if (p.hiddenTestCases && p.hiddenTestCases.length > 0) {
                p.hiddenTestCases.forEach(h => tc.push({ type: 'hidden', input: h.input || '', output: h.output || '' }));
              }
              if (tc.length === 0) {
                tc.push({ type: 'sample', input: '', output: '' }, { type: 'hidden', input: '', output: '' });
              }
              setTestCases(tc);
            }
          }
        })
        .catch(err => {
          console.error('Failed to fetch problem:', err);
          toast.error('Failed to load problem details for editing');
        })
        .finally(() => setLoadingProblem(false));
    }
  }, [id, isNew]);

  const generateAI = async () => {
    if (!aiPrompt.trim()) return toast.error('Describe a problem idea');
    setGenerating(true);
    try {
      const r = await api.post('/ai/generate-problem', { prompt: aiPrompt, difficulty: form.difficulty, tags: form.tags.join(', ') });
      setAiResult(r.data);
      toast.success('Problem generated!');
    } catch (e) {
      toast.error('AI generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const applyAI = () => {
    if (!aiResult) return;
    setForm(f => ({
      ...f,
      title: aiResult.title || f.title,
      difficulty: aiResult.difficulty || f.difficulty,
      points: aiResult.difficulty === 'easy' ? 100 : aiResult.difficulty === 'hard' ? 300 : 200,
      statement: aiResult.statement || f.statement,
      inputFormat: aiResult.inputFormat || f.inputFormat,
      outputFormat: aiResult.outputFormat || f.outputFormat,
      constraints: aiResult.constraints || f.constraints,
      sampleInput: aiResult.sampleInput || f.sampleInput,
      sampleOutput: aiResult.sampleOutput || f.sampleOutput,
      editorial: aiResult.editorial || f.editorial,
      optimalAlgorithm: aiResult.optimalAlgorithm || f.optimalAlgorithm,
      tags: aiResult.tags?.length ? aiResult.tags : f.tags
    }));
    if (aiResult.testCases && aiResult.testCases.length > 0) {
      setTestCases(aiResult.testCases);
    }
    setAiResult(null);
    setTab('preview');
    toast.success('🎉 Applied generated problem, solution hints, and test cases!');
  };

  // Extract slug from LeetCode URL
  const extractSlug = (url) => {
    if (!url) return null;
    const clean = url.trim();
    const match = clean.match(/leetcode\.com\/problems\/([a-z0-9-]+)/i);
    if (match) return match[1].toLowerCase();
    if (!clean.includes('/') && !clean.includes('.')) return clean.toLowerCase();
    return null;
  };

  // Fetch LeetCode problem metadata and AI testcases
  const handleFetchLC = async () => {
    const slug = extractSlug(lcUrl);
    if (!slug) return toast.error('Paste a valid LeetCode problem URL or slug (e.g. https://leetcode.com/problems/two-sum/ or two-sum)');
    setLcFetching(true);
    try {
      const r = await api.post('/leetcode/fetch-problem', { slug });
      setLcFetched(r.data);
      setForm(f => ({
        ...f,
        title: r.data.title || f.title,
        difficulty: r.data.difficulty || f.difficulty,
        points: r.data.difficulty === 'easy' ? 100 : r.data.difficulty === 'hard' ? 300 : 200,
        tags: r.data.tags?.length ? r.data.tags : f.tags,
        statement: r.data.statement || f.statement,
        inputFormat: r.data.inputFormat || f.inputFormat,
        outputFormat: r.data.outputFormat || f.outputFormat,
        constraints: r.data.constraints || f.constraints,
        sampleInput: r.data.sampleInput || f.sampleInput,
        sampleOutput: r.data.sampleOutput || f.sampleOutput,
        editorial: r.data.editorial || f.editorial,
        acceptance: r.data.acceptance || 65
      }));
      if (r.data.testCases && r.data.testCases.length > 0) {
        setTestCases(r.data.testCases);
      }
      toast.success(`⚡ AI Extracted "${r.data.title}" with ${r.data.testCases?.length || 2} test cases!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to fetch from LeetCode');
    } finally {
      setLcFetching(false);
    }
  };

  const publish = async () => {
    if (!form.title || !form.statement) return toast.error('Title and statement required');
    setSaving(true);
    try {
      const payload = {
        ...form,
        source: problemSource,
        leetcodeSlug: problemSource === 'leetcode' ? (lcFetched?.slug || extractSlug(lcUrl)) : undefined,
        leetcodeUrl: problemSource === 'leetcode' ? (lcFetched?.url || lcUrl) : undefined,
        testCases
      };

      if (!isNew && id) {
        await api.put(`/problems/${id}`, payload);
        toast.success(`✅ Problem "${form.title}" updated successfully!`);
      } else {
        await api.post('/problems', payload);
        toast.success(problemSource === 'leetcode' ? 'LeetCode problem linked and published!' : 'Problem published to bank!');
      }
      navigate('/dev');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save problem');
    } finally {
      setSaving(false);
    }
  };

  if (loadingProblem) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - var(--nav-h))', gap: '12px' }}>
        <RefreshCw size={28} className="animate-spin" color="#818cf8" />
        <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>Loading existing problem statement & test cases…</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', height: 'calc(100vh - var(--nav-h))' }}>
      {/* LEFT FORM */}
      <div style={{ overflowY: 'auto', padding: '1.5rem', background: 'var(--bg-3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dev')} title="Back to Faculty Dashboard">
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
                {isNew ? '✨ Create New Problem' : `✏️ Edit Problem: ${form.title || 'Untitled'}`}
              </h1>
              {!isNew && (
                <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>ID: {id}</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost" onClick={() => navigate('/dev')}>Cancel</button>
            <button className="btn btn-primary" onClick={publish} disabled={saving}>
              {saving ? 'Saving changes…' : isNew ? 'Publish to bank →' : 'Save Changes ✓'}
            </button>
          </div>
        </div>

        {/* PROBLEM SOURCE TOGGLE */}
        <div className="card card-body" style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '1rem' }}>📌 Problem Source</div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              className={`btn btn-sm ${problemSource === 'custom' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => { setProblemSource('custom'); setLcFetched(null); }}
            >
              ✏️ Custom (write your own)
            </button>
            <button
              className={`btn btn-sm ${problemSource === 'leetcode' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setProblemSource('leetcode')}
              style={problemSource === 'leetcode' ? { background: '#FFA116', borderColor: '#FFA116' } : {}}
            >
              🔗 Link from LeetCode
            </button>
          </div>

          {problemSource === 'leetcode' && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>LeetCode Problem URL</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  className="inp"
                  style={{ flex: 1 }}
                  placeholder="https://leetcode.com/problems/sort-list/"
                  value={lcUrl}
                  onChange={e => setLcUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleFetchLC()}
                />
                <button className="btn btn-primary btn-sm" onClick={handleFetchLC} disabled={lcFetching} style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                  <Link2 size={13} />
                  {lcFetching ? 'Fetching…' : 'Fetch Details ↗'}
                </button>
              </div>
              {lcFetched && (
                <div style={{ marginTop: '10px', padding: '12px 14px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 size={20} color="#00b8a3" />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                      Extracted: "{lcFetched.title}" · <span style={{ textTransform: 'capitalize', color: '#ffa116' }}>{lcFetched.difficulty}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
                      ✅ AI extracted exact problem statement, input/output formats, constraints, and {testCases.length} test cases!
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BASIC */}
        <div className="card card-body" style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '1rem' }}>📋 Basic Info</div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>Title *</label>
            <input className="inp" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Climb the Leaderboard" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>Difficulty</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {DIFFS.map(d => (
                  <button key={d} className={`btn btn-sm ${form.difficulty === d ? 'btn-primary' : 'btn-ghost'}`} onClick={() => set('difficulty', d)}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>Points</label>
              <input className="inp" type="number" value={form.points} onChange={e => set('points', parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Topics & Tags</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {TAGS_LIST.map(t => (
                <button key={t} className={`btn btn-sm ${form.tags.includes(t) ? 'btn-primary' : 'btn-ghost'}`} onClick={() => toggleTag(t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* STATEMENT */}
        <div className="card card-body" style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '1rem' }}>📝 Problem Statement</div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>Description *</label>
            <textarea className="inp" rows={6} value={form.statement} onChange={e => set('statement', e.target.value)} placeholder="Describe the problem…" style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>Input Format</label>
              <textarea className="inp" rows={4} value={form.inputFormat} onChange={e => set('inputFormat', e.target.value)} placeholder="e.g. First line contains N..." style={{ resize: 'vertical' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>Output Format</label>
              <textarea className="inp" rows={4} value={form.outputFormat} onChange={e => set('outputFormat', e.target.value)} placeholder="e.g. Print single integer..." style={{ resize: 'vertical' }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>Constraints</label>
            <textarea className="inp" rows={2} value={form.constraints} onChange={e => set('constraints', e.target.value)} placeholder="1 <= N <= 10^5" style={{ fontFamily: 'var(--mono)', fontSize: '12px', resize: 'vertical' }} />
          </div>
        </div>

        {/* LIMITS */}
        <div className="card card-body" style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '1rem' }}>⚡ Execution Limits</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>Time Limit (seconds)</label>
              <input className="inp" type="number" step="0.5" value={form.timeLimit} onChange={e => set('timeLimit', parseFloat(e.target.value) || 1.0)} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>Memory Limit (MB)</label>
              <input className="inp" type="number" value={form.memoryLimit} onChange={e => set('memoryLimit', parseInt(e.target.value) || 256)} />
            </div>
          </div>
        </div>

        {/* TEST CASES */}
        <div className="card card-body" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '13px', fontWeight: 700 }}>🧪 Test Cases ({testCases.length})</div>
            <button className="btn btn-secondary btn-sm" onClick={() => setTestCases([...testCases, { type: 'hidden', input: '', output: '' }])}>
              + Add Test Case
            </button>
          </div>
          {testCases.map((tc, i) => (
            <div key={i} style={{ border: '0.5px solid var(--border)', borderRadius: '9px', marginBottom: '8px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-2)', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)' }}>TC #{i + 1}</span>
                <span className={`badge ${tc.type === 'sample' ? 'badge-purple' : 'badge-amber'}`}>{tc.type}</span>
                <select
                  className="select"
                  style={{ width: '120px', fontSize: '11px', padding: '3px 8px' }}
                  value={tc.type || 'sample'}
                  onChange={e => {
                    const newType = e.target.value;
                    setTestCases(prev => prev.map((item, idx) => idx === i ? { ...item, type: newType } : item));
                  }}
                >
                  <option value="sample">Sample</option>
                  <option value="hidden">Hidden</option>
                </select>
                <button
                  className="btn btn-danger btn-sm"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => setTestCases(prev => prev.filter((_, idx) => idx !== i))}
                >
                  ✕
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
                <div style={{ padding: '10px', borderRight: '0.5px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', marginBottom: '4px' }}>INPUT</div>
                  <textarea
                    className="inp"
                    rows={3}
                    value={tc.input || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setTestCases(prev => prev.map((item, idx) => idx === i ? { ...item, input: val } : item));
                    }}
                    style={{ fontFamily: 'var(--mono)', fontSize: '12px', resize: 'vertical' }}
                  />
                </div>
                <div style={{ padding: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', marginBottom: '4px' }}>OUTPUT</div>
                  <textarea
                    className="inp"
                    rows={3}
                    value={tc.output || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setTestCases(prev => prev.map((item, idx) => idx === i ? { ...item, output: val } : item));
                    }}
                    style={{ fontFamily: 'var(--mono)', fontSize: '12px', resize: 'vertical' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* EDITORIAL */}
        <div className="card card-body">
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>📖 Editorial & Approach Hints</div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>Editorial Hint</label>
            <textarea className="inp" rows={3} value={form.editorial} onChange={e => set('editorial', e.target.value)} placeholder="Explain the high-level approach..." style={{ resize: 'vertical' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>Optimal Algorithm & Complexity</label>
            <textarea className="inp" rows={2} value={form.optimalAlgorithm} onChange={e => set('optimalAlgorithm', e.target.value)} placeholder="e.g. Time Complexity: O(N), Space: O(1)..." style={{ resize: 'vertical' }} />
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Live Preview & AI Generator */}
      <div style={{ background: 'var(--bg)', borderLeft: '0.5px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)' }}>
          {['preview', 'ai'].map(t => (
            <button
              key={t}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                background: 'transparent',
                fontSize: '12px',
                fontWeight: 600,
                color: tab === t ? 'var(--purple)' : 'var(--text-3)',
                borderBottom: tab === t ? '2px solid var(--purple)' : '2px solid transparent',
                cursor: 'pointer'
              }}
              onClick={() => setTab(t)}
            >
              {t === 'preview' ? '👁️ Live Preview' : '✨ AI Generate'}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {tab === 'preview' ? (
            <div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <span className={`diff-chip ${form.difficulty}`}>{form.difficulty}</span>
                <span className="badge badge-purple">{form.points} pts</span>
                <span className="badge badge-gray">⏱ {form.timeLimit}s</span>
                <span className="badge badge-gray">💾 {form.memoryLimit}MB</span>
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '10px', color: 'var(--text)' }}>
                {form.title || 'Problem title'}
              </h2>
              <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: '1.7', marginBottom: '12px', whiteSpace: 'pre-wrap' }}>
                {form.statement || 'Statement will appear here…'}
              </div>
              {form.inputFormat && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '4px' }}>Input Format</div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '7px', padding: '8px 10px', fontSize: '12px', color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>{form.inputFormat}</div>
                </div>
              )}
              {form.outputFormat && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '4px' }}>Output Format</div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '7px', padding: '8px 10px', fontSize: '12px', color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>{form.outputFormat}</div>
                </div>
              )}
              {testCases.filter(t => t.type === 'sample' && (t.input || t.output)).length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '4px' }}>Sample Example</div>
                  {testCases.filter(t => t.type === 'sample').map((tc, idx) => (
                    <div key={idx} style={{ background: '#0f172a', borderRadius: '7px', padding: '10px 12px', marginBottom: '6px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#818cf8', marginBottom: '2px' }}>INPUT</div>
                      <pre style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: '11.5px', color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>{tc.input}</pre>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#10b981', marginTop: '6px', marginBottom: '2px' }}>OUTPUT</div>
                      <pre style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: '11.5px', color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>{tc.output}</pre>
                    </div>
                  ))}
                </div>
              )}
              {form.constraints && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '4px' }}>Constraints</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-2)', fontFamily: 'var(--mono)', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '6px', whiteSpace: 'pre-wrap' }}>{form.constraints}</div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))', border: '1px solid rgba(129, 140, 248, 0.3)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#818cf8', marginBottom: '6px' }}>✨ AI Problem Generator (Groq LLaMA 3.3)</div>
                <div style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '10px' }}>Describe your concept and AI will auto-generate title, statement, formats, constraints, and test cases.</div>
                <textarea className="inp" rows={3} value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="e.g. A dynamic programming problem on subsets for 3rd year students…" style={{ marginBottom: '8px', resize: 'vertical' }} />
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={generateAI} disabled={generating}>
                  {generating ? 'Generating problem…' : 'Generate with Groq AI →'}
                </button>
              </div>
              {aiResult && (
                <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', background: '#0f172a' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: '#818cf8' }}>Generated: {aiResult.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: '1.6', maxHeight: '200px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>{aiResult.statement}</div>
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }} onClick={applyAI}>Apply to Editor →</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
