import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { ExternalLink, Link2, CheckCircle2 } from 'lucide-react';

const DIFFS = ['easy','medium','hard'];
const TAGS_LIST = ['Arrays','DP','Graphs','Trees','Binary Search','Greedy','Math','Strings','Segment Tree','Hashing','Bit Manipulation','Geometry'];

export default function ProblemEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState({ title:'', difficulty:'medium', points:300, tags:[], statement:'', inputFormat:'', outputFormat:'', constraints:'', sampleInput:'', sampleOutput:'', timeLimit:1, memoryLimit:256, editorial:'' });
  const [testCases, setTestCases] = useState([{ type:'sample', input:'', output:'' }, { type:'hidden', input:'', output:'' }]);
  const [tab, setTab] = useState('preview');
  const [aiPrompt, setAiPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [saving, setSaving] = useState(false);

  // LeetCode linking state
  const [problemSource, setProblemSource] = useState('custom'); // 'custom' | 'leetcode'
  const [lcUrl, setLcUrl] = useState('');
  const [lcFetching, setLcFetching] = useState(false);
  const [lcFetched, setLcFetched] = useState(null); // { title, slug, difficulty, tags, url }

  const set = (k, v) => setForm(f => ({...f, [k]: v}));
  const toggleTag = (tag) => setForm(f => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter(t=>t!==tag) : [...f.tags, tag] }));

  const generateAI = async () => {
    if (!aiPrompt.trim()) return toast.error('Describe a problem idea');
    setGenerating(true);
    try {
      const r = await api.post('/ai/generate-problem', { prompt: aiPrompt, difficulty: form.difficulty, tags: form.tags.join(', ') });
      setAiResult(r.data);
      toast.success('Problem generated!');
    } catch (e) { toast.error('AI generation failed'); }
    finally { setGenerating(false); }
  };

  const applyAI = () => {
    if (!aiResult) return;
    setForm(f => ({ ...f, ...aiResult }));
    setAiResult(null);
    setTab('preview');
    toast.success('Applied to editor!');
  };

  // Extract slug from LeetCode URL
  const extractSlug = (url) => {
    const match = url.match(/leetcode\.com\/problems\/([a-z0-9-]+)/i);
    return match ? match[1].toLowerCase() : null;
  };

  // Fetch LeetCode problem metadata
  const handleFetchLC = async () => {
    const slug = extractSlug(lcUrl);
    if (!slug) return toast.error('Paste a valid LeetCode problem URL (e.g. https://leetcode.com/problems/two-sum/)');
    setLcFetching(true);
    try {
      const r = await api.post('/leetcode/fetch-problem', { slug });
      setLcFetched(r.data);
      // Auto-fill form
      setForm(f => ({
        ...f,
        title: r.data.title || f.title,
        difficulty: r.data.difficulty || f.difficulty,
        points: r.data.difficulty === 'easy' ? 100 : r.data.difficulty === 'hard' ? 500 : 300,
        tags: r.data.tags?.length ? r.data.tags : f.tags,
        statement: `Solve this problem on LeetCode: ${r.data.title}. Students will solve on LeetCode and progress is tracked automatically via the LeetCode integration.`,
        acceptance: r.data.acceptance || 0
      }));
      toast.success(`Fetched: "${r.data.title}" · ${r.data.difficulty}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to fetch from LeetCode');
    } finally {
      setLcFetching(false);
    }
  };

  const publish = async () => {
    if (problemSource === 'leetcode') {
      if (!lcFetched) return toast.error('Fetch LeetCode problem details first');
      setSaving(true);
      try {
        await api.post('/problems', {
          ...form,
          source: 'leetcode',
          leetcodeSlug: lcFetched.slug,
          leetcodeUrl: lcFetched.url,
          testCases
        });
        toast.success('LeetCode problem linked and published!');
        navigate('/dev');
      } catch (e) { toast.error(e.response?.data?.error || 'Failed to publish'); }
      finally { setSaving(false); }
    } else {
      if (!form.title || !form.statement) return toast.error('Title and statement required');
      setSaving(true);
      try {
        await api.post('/problems', { ...form, source: 'custom', testCases });
        toast.success('Problem published to bank!');
        navigate('/dev');
      } catch (e) { toast.error(e.response?.data?.error || 'Failed to publish'); }
      finally { setSaving(false); }
    }
  };

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 400px',height:'calc(100vh - var(--nav-h))'}}>
      {/* LEFT FORM */}
      <div style={{overflowY:'auto',padding:'1.5rem',background:'var(--bg-3)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
          <h1 style={{fontSize:'18px',fontWeight:800}}>{isNew?'New problem':'Edit problem'}</h1>
          <div style={{display:'flex',gap:'8px'}}>
            <button className="btn btn-ghost" onClick={()=>navigate('/dev')}>Cancel</button>
            <button className="btn btn-primary" onClick={publish} disabled={saving}>{saving?'Publishing…':'Publish to bank →'}</button>
          </div>
        </div>

        {/* PROBLEM SOURCE TOGGLE */}
        <div className="card card-body" style={{marginBottom:'1rem'}}>
          <div style={{fontSize:'13px',fontWeight:700,marginBottom:'1rem'}}>📌 Problem Source</div>
          <div style={{display:'flex',gap:'8px',marginBottom:'12px'}}>
            <button
              className={`btn btn-sm ${problemSource==='custom'?'btn-primary':'btn-ghost'}`}
              onClick={()=>{setProblemSource('custom');setLcFetched(null);}}
            >
              ✏️ Custom (write your own)
            </button>
            <button
              className={`btn btn-sm ${problemSource==='leetcode'?'btn-primary':'btn-ghost'}`}
              onClick={()=>setProblemSource('leetcode')}
              style={problemSource==='leetcode'?{background:'#FFA116',borderColor:'#FFA116'}:{}}
            >
              🔗 Link from LeetCode
            </button>
          </div>

          {problemSource === 'leetcode' && (
            <div>
              <label style={{fontSize:'12px',fontWeight:600,color:'var(--text-2)',display:'block',marginBottom:'4px'}}>LeetCode Problem URL</label>
              <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                <input
                  className="inp"
                  style={{flex:1}}
                  placeholder="https://leetcode.com/problems/sort-list/"
                  value={lcUrl}
                  onChange={e=>setLcUrl(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&handleFetchLC()}
                />
                <button className="btn btn-primary btn-sm" onClick={handleFetchLC} disabled={lcFetching} style={{display:'flex',alignItems:'center',gap:'4px',whiteSpace:'nowrap'}}>
                  <Link2 size={13} />
                  {lcFetching ? 'Fetching…' : 'Fetch Details ↗'}
                </button>
              </div>
              {lcFetched && (
                <div style={{marginTop:'10px',padding:'10px 14px',borderRadius:'8px',background:'rgba(44,187,93,0.08)',border:'0.5px solid rgba(44,187,93,0.2)',display:'flex',alignItems:'center',gap:'10px'}}>
                  <CheckCircle2 size={18} color="#2cbb5d" />
                  <div>
                    <div style={{fontSize:'13px',fontWeight:700}}>Fetched: "{lcFetched.title}" · <span style={{textTransform:'capitalize'}}>{lcFetched.difficulty}</span> · #{lcFetched.questionId}</div>
                    <div style={{fontSize:'11px',color:'var(--text-3)',marginTop:'2px'}}>Students will solve this on LeetCode and your platform will track their progress.</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BASIC */}
        <div className="card card-body" style={{marginBottom:'1rem'}}>
          <div style={{fontSize:'13px',fontWeight:700,marginBottom:'1rem'}}>📋 Basic info</div>
          <div style={{marginBottom:'10px'}}><label style={{fontSize:'12px',fontWeight:600,color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Title *</label><input className="inp" value={form.title} onChange={e=>set('title',e.target.value)} placeholder="e.g. Climb the Leaderboard"/></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
            <div><label style={{fontSize:'12px',fontWeight:600,color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Difficulty</label>
              <div style={{display:'flex',gap:'6px'}}>
                {DIFFS.map(d=><button key={d} className={`btn btn-sm ${form.difficulty===d?'btn-primary':'btn-ghost'}`} onClick={()=>set('difficulty',d)}>{d.charAt(0).toUpperCase()+d.slice(1)}</button>)}
              </div>
            </div>
            <div><label style={{fontSize:'12px',fontWeight:600,color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Points</label><input className="inp" type="number" value={form.points} onChange={e=>set('points',parseInt(e.target.value))}/></div>
          </div>
          <div><label style={{fontSize:'12px',fontWeight:600,color:'var(--text-2)',display:'block',marginBottom:'6px'}}>Tags</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
              {TAGS_LIST.map(t=><button key={t} className={`btn btn-sm ${form.tags.includes(t)?'btn-primary':'btn-ghost'}`} onClick={()=>toggleTag(t)}>{t}</button>)}
            </div>
          </div>
        </div>

        {/* STATEMENT */}
        <div className="card card-body" style={{marginBottom:'1rem'}}>
          <div style={{fontSize:'13px',fontWeight:700,marginBottom:'1rem'}}>📝 Statement</div>
          <div style={{marginBottom:'10px'}}><label style={{fontSize:'12px',fontWeight:600,color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Problem statement *</label><textarea className="inp" rows={5} value={form.statement} onChange={e=>set('statement',e.target.value)} placeholder="Describe the problem…" style={{resize:'vertical'}}/></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
            <div><label style={{fontSize:'12px',fontWeight:600,color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Input format</label><textarea className="inp" rows={3} value={form.inputFormat} onChange={e=>set('inputFormat',e.target.value)} style={{resize:'vertical'}}/></div>
            <div><label style={{fontSize:'12px',fontWeight:600,color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Output format</label><textarea className="inp" rows={3} value={form.outputFormat} onChange={e=>set('outputFormat',e.target.value)} style={{resize:'vertical'}}/></div>
          </div>
          <div><label style={{fontSize:'12px',fontWeight:600,color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Constraints</label><textarea className="inp" rows={2} value={form.constraints} onChange={e=>set('constraints',e.target.value)} placeholder="1 ≤ n ≤ 10⁵" style={{fontFamily:'var(--mono)',fontSize:'12px',resize:'vertical'}}/></div>
        </div>

        {/* LIMITS */}
        <div className="card card-body" style={{marginBottom:'1rem'}}>
          <div style={{fontSize:'13px',fontWeight:700,marginBottom:'1rem'}}>⚡ Limits</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
            <div><label style={{fontSize:'12px',fontWeight:600,color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Time limit (s)</label><input className="inp" type="number" step="0.5" value={form.timeLimit} onChange={e=>set('timeLimit',parseFloat(e.target.value))}/></div>
            <div><label style={{fontSize:'12px',fontWeight:600,color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Memory (MB)</label><input className="inp" type="number" value={form.memoryLimit} onChange={e=>set('memoryLimit',parseInt(e.target.value))}/></div>
          </div>
        </div>

        {/* TEST CASES */}
        <div className="card card-body" style={{marginBottom:'1rem'}}>
          <div style={{fontSize:'13px',fontWeight:700,marginBottom:'1rem'}}>🧪 Test cases</div>
          {testCases.map((tc, i) => (
            <div key={i} style={{border:'0.5px solid var(--border)',borderRadius:'9px',marginBottom:'8px',overflow:'hidden'}}>
              <div style={{display:'flex',alignItems:'center',padding:'8px 12px',background:'var(--bg-2)',gap:'8px'}}>
                <span style={{fontSize:'12px',fontWeight:700,color:'var(--text-2)'}}>TC {i+1}</span>
                <span className={`badge ${tc.type==='sample'?'badge-purple':'badge-amber'}`}>{tc.type}</span>
                <select className="select" style={{width:'120px',fontSize:'11px',padding:'3px 8px'}} value={tc.type} onChange={e=>{const t=[...testCases];t[i].type=e.target.value;setTestCases(t);}}>
                  <option value="sample">Sample</option><option value="hidden">Hidden</option>
                </select>
                <button className="btn btn-danger btn-sm" style={{marginLeft:'auto'}} onClick={()=>setTestCases(testCases.filter((_,j)=>j!==i))}>✕</button>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0'}}>
                <div style={{padding:'10px',borderRight:'0.5px solid var(--border)'}}>
                  <div style={{fontSize:'11px',fontWeight:700,color:'var(--text-3)',marginBottom:'4px'}}>INPUT</div>
                  <textarea className="inp" rows={3} value={tc.input} onChange={e=>{const t=[...testCases];t[i].input=e.target.value;setTestCases(t);}} style={{fontFamily:'var(--mono)',fontSize:'12px',resize:'vertical'}}/>
                </div>
                <div style={{padding:'10px'}}>
                  <div style={{fontSize:'11px',fontWeight:700,color:'var(--text-3)',marginBottom:'4px'}}>OUTPUT</div>
                  <textarea className="inp" rows={3} value={tc.output} onChange={e=>{const t=[...testCases];t[i].output=e.target.value;setTestCases(t);}} style={{fontFamily:'var(--mono)',fontSize:'12px',resize:'vertical'}}/>
                </div>
              </div>
            </div>
          ))}
          <button className="btn btn-ghost" style={{width:'100%',justifyContent:'center',border:'0.5px dashed var(--border-2)'}} onClick={()=>setTestCases([...testCases,{type:'hidden',input:'',output:''}])}>+ Add test case</button>
        </div>

        {/* EDITORIAL */}
        <div className="card card-body">
          <div style={{fontSize:'13px',fontWeight:700,marginBottom:'10px'}}>📖 Editorial hint</div>
          <textarea className="inp" rows={4} value={form.editorial} onChange={e=>set('editorial',e.target.value)} placeholder="Explain the approach without full solution code…" style={{resize:'vertical'}}/>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{background:'var(--bg)',borderLeft:'0.5px solid var(--border)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{display:'flex',borderBottom:'0.5px solid var(--border)'}}>
          {['preview','ai'].map(t=>(
            <button key={t} style={{flex:1,padding:'12px',border:'none',background:'transparent',fontSize:'12px',fontWeight:600,color:tab===t?'var(--purple)':'var(--text-3)',borderBottom:tab===t?'2px solid var(--purple)':'2px solid transparent',cursor:'pointer'}} onClick={()=>setTab(t)}>
              {t==='preview'?'Preview':'✨ AI Generate'}
            </button>
          ))}
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'1rem'}}>
          {tab==='preview' ? (
            <div>
              <div style={{display:'flex',gap:'6px',marginBottom:'12px',flexWrap:'wrap'}}>
                <span className={`diff-chip ${form.difficulty}`}>{form.difficulty}</span>
                <span className="badge badge-purple">{form.points} pts</span>
                <span className="badge badge-gray">⏱ {form.timeLimit}s</span>
                <span className="badge badge-gray">💾 {form.memoryLimit}MB</span>
              </div>
              <h2 style={{fontSize:'18px',fontWeight:800,marginBottom:'10px'}}>{form.title||'Problem title'}</h2>
              <div style={{fontSize:'13px',color:'var(--text-2)',lineHeight:'1.7',marginBottom:'12px'}}>{form.statement||'Statement will appear here…'}</div>
              {form.sampleInput && <>
                <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',color:'var(--text-3)',marginBottom:'4px'}}>Sample input</div>
                <div style={{background:'#1a1b26',borderRadius:'7px',padding:'10px 12px',fontFamily:'var(--mono)',fontSize:'12px',color:'#a9b1d6',marginBottom:'8px',whiteSpace:'pre'}}>{form.sampleInput}</div>
                <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',color:'var(--text-3)',marginBottom:'4px'}}>Sample output</div>
                <div style={{background:'#1a1b26',borderRadius:'7px',padding:'10px 12px',fontFamily:'var(--mono)',fontSize:'12px',color:'#a9b1d6',whiteSpace:'pre'}}>{form.sampleOutput}</div>
              </>}
              {form.constraints && <div style={{marginTop:'10px',fontSize:'12px',color:'var(--text-2)',fontFamily:'var(--mono)'}}>{form.constraints}</div>}
            </div>
          ) : (
            <div>
              <div style={{background:'linear-gradient(135deg,var(--purple-light),var(--teal-light))',border:'0.5px solid var(--purple-border)',borderRadius:'10px',padding:'1rem',marginBottom:'1rem'}}>
                <div style={{fontSize:'13px',fontWeight:700,color:'var(--purple-dark)',marginBottom:'6px'}}>✨ AI Problem Generator (Groq)</div>
                <div style={{fontSize:'12px',color:'var(--text-2)',marginBottom:'10px'}}>Describe your idea and Groq LLaMA 70B will generate the full problem.</div>
                <textarea className="inp" rows={3} value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} placeholder="e.g. A DP problem on subsets, medium difficulty for 3rd year…" style={{marginBottom:'8px',resize:'vertical'}}/>
                <button className="btn btn-primary" style={{width:'100%',justifyContent:'center'}} onClick={generateAI} disabled={generating}>{generating?'Generating…':'Generate with Groq →'}</button>
              </div>
              {aiResult && (
                <div style={{border:'0.5px solid var(--border)',borderRadius:'10px',padding:'1rem'}}>
                  <div style={{fontSize:'12px',fontWeight:700,marginBottom:'8px'}}>Generated: {aiResult.title}</div>
                  <div style={{fontSize:'12px',color:'var(--text-2)',lineHeight:'1.6',maxHeight:'200px',overflowY:'auto'}}>{aiResult.statement}</div>
                  <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginTop:'10px'}} onClick={applyAI}>Apply to editor →</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
