import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import './ContestWizard.css';

const DIFFS = ['easy', 'medium', 'hard'];
const TAGS_LIST = ['Arrays', 'DP', 'Graphs', 'Trees', 'Binary Search', 'Greedy', 'Math', 'Strings', 'Segment Tree', 'Hashing', 'Bit Manipulation', 'Geometry'];

const toLocalDateTimeString = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

export default function ContestWizard() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = !id || id === 'new';

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Details
  const [details, setDetails] = useState({
    title: '',
    description: '',
    bannerUrl: '',
    contestType: 'public',
    password: '',
    startTime: '',
    endTime: '',
    duration: 120,
    maxMarks: 100,
    numProblems: 3,
    aiEnabled: true,
    aiHints: true,
    leaderboardVisibility: 'live',
    scheduleLocked: false,
    status: 'draft'
  });

  // Step 2: Problems list
  const [problems, setProblems] = useState([]);
  const [activeProblemIdx, setActiveProblemIdx] = useState(0);

  // Current problem form
  const [probForm, setProbForm] = useState({
    title: '',
    difficulty: 'medium',
    points: 100,
    tags: [],
    statement: '',
    constraints: '',
    inputFormat: '',
    outputFormat: '',
    explanation: '',
    timeLimit: 1.0,
    memoryLimit: 256,
    editorial: '',
    optimalAlgorithm: '',
    cppSolution: '',
    javaSolution: '',
    pythonSolution: '',
    jsSolution: '',
    sampleInput: '',
    sampleOutput: '',
  });

  // Test cases for active problem
  const [testCases, setTestCases] = useState([]);
  const [boundaryCases, setBoundaryCases] = useState([]);
  const [stressCases, setStressCases] = useState([]);

  // AI Gen Options
  const [aiOptions, setAiOptions] = useState({
    topic: 'Arrays',
    difficulty: 'medium',
    constraints: '1 <= N <= 10^5',
    storyBased: true,
    expectedAlgorithm: '',
    timeComplexity: 'O(N)'
  });
  const [generating, setGenerating] = useState(false);

  // AI Validation Options
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  // Load contest if editing
  useEffect(() => {
    if (!isNew) {
      setLoading(true);
      api.get(`/contests/${id}`)
        .then(r => {
          const c = r.data;
          setDetails({
            title: c.title || '',
            description: c.description || '',
            bannerUrl: c.bannerUrl || '',
            contestType: c.contestType || 'public',
            password: c.password || '',
            startTime: toLocalDateTimeString(c.startTime),
            endTime: toLocalDateTimeString(c.endTime),
            duration: c.duration || 120,
            maxMarks: c.maxMarks || 100,
            numProblems: c.numProblems || c.problems?.length || 3,
            aiEnabled: c.aiEnabled ?? true,
            aiHints: c.aiHints ?? true,
            leaderboardVisibility: c.leaderboardVisibility || 'live',
            scheduleLocked: c.scheduleLocked ?? false,
            status: c.status || 'draft'
          });
          if (c.problems && c.problems.length > 0) {
            const problemIds = c.problems.map(p => p.id || p._id || p);
            setProblems(problemIds);
            loadProblemIntoForm(c.problems[0]);
          }
        })
        .catch(() => toast.error('Failed to load contest'))
        .finally(() => setLoading(false));
    }
  }, [id, isNew]);

  const loadProblemIntoForm = (p) => {
    setProbForm({
      id: p.id || p._id,
      title: p.title || '',
      difficulty: p.difficulty || 'medium',
      points: p.points || 100,
      tags: p.tags || [],
      statement: p.statement || '',
      constraints: p.constraints || '',
      inputFormat: p.inputFormat || '',
      outputFormat: p.outputFormat || '',
      explanation: p.explanation || '',
      timeLimit: p.timeLimit || 1.0,
      memoryLimit: p.memoryLimit || 256,
      editorial: p.editorial || '',
      optimalAlgorithm: p.optimalAlgorithm || '',
      cppSolution: p.cppSolution || '',
      javaSolution: p.javaSolution || '',
      pythonSolution: p.pythonSolution || '',
      jsSolution: p.jsSolution || '',
      sampleInput: p.sampleInput || '',
      sampleOutput: p.sampleOutput || '',
    });
    setTestCases(p.hiddenTestCases || []);
    setBoundaryCases(p.boundaryCases || []);
    setStressCases(p.stressCases || []);
    setValidationResult(null);
  };

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...details,
        scheduleLocked: true // Lock the schedule on Next
      };

      let r;
      if (isNew) {
        r = await api.post('/contests', payload);
        navigate(`/dev/contest/${r.data.id || r.data._id}`);
      } else {
        r = await api.put(`/contests/${id}`, payload);
      }
      setDetails(prev => ({ ...prev, scheduleLocked: true }));
      toast.success('Contest schedule locked. Proceeding to Problem Creation.');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save contest details');
    } finally {
      setLoading(false);
    }
  };

  // Option B: AI Problem Gen
  const handleAIGenerate = async () => {
    setGenerating(true);
    setValidationResult(null);
    toast.loading('LLaMA generating complete problem payload…', { id: 'aigen' });
    try {
      const r = await api.post('/ai/generate-problem', aiOptions);
      const data = r.data;
      setProbForm({
        title: data.title || '',
        difficulty: data.difficulty || aiOptions.difficulty,
        points: probForm.points,
        tags: data.tags || [aiOptions.topic],
        statement: data.statement || '',
        constraints: data.constraints || '',
        inputFormat: data.inputFormat || '',
        outputFormat: data.outputFormat || '',
        explanation: data.explanation || '',
        timeLimit: data.timeLimit || 1.0,
        memoryLimit: data.memoryLimit || 256,
        editorial: data.editorial || '',
        optimalAlgorithm: data.optimalAlgorithm || '',
        cppSolution: data.cppSolution || '',
        javaSolution: data.javaSolution || '',
        pythonSolution: data.pythonSolution || '',
        jsSolution: data.jsSolution || '',
        sampleInput: data.sampleInput || '',
        sampleOutput: data.sampleOutput || '',
      });
      setTestCases(data.hiddenTestCases || []);
      setBoundaryCases(data.boundaryCases || []);
      setStressCases(data.stressCases || []);
      toast.success('Problem details generated and loaded!', { id: 'aigen' });
    } catch {
      toast.error('AI problem generation failed.', { id: 'aigen' });
    } finally {
      setGenerating(false);
    }
  };

  // AI Verification Check
  const handleVerifyProblem = async () => {
    setValidating(true);
    setValidationResult(null);
    toast.loading('Running AI logic verification…', { id: 'verify' });
    try {
      const payload = {
        ...probForm,
        hiddenTestCases: testCases,
        boundaryCases,
        stressCases
      };
      const r = await api.post('/ai/validate-problem', payload);
      setValidationResult(r.data);
      if (r.data.valid) {
        toast.success('AI verification passed successfully!', { id: 'verify' });
      } else {
        toast.error('AI verification failed with critical errors.', { id: 'verify' });
      }
    } catch {
      toast.error('AI verification query failed.', { id: 'verify' });
    } finally {
      setValidating(false);
    }
  };

  // Save/Upload Problem
  const handleSaveProblem = async () => {
    if (!probForm.title || !probForm.statement) {
      return toast.error('Problem Title and Statement are required!');
    }
    setLoading(true);
    try {
      const payload = {
        ...probForm,
        hiddenTestCases: testCases,
        boundaryCases,
        stressCases
      };

      let probId = probForm.id;
      if (probId) {
        // Update problem
        await api.put(`/problems/${probId}`, payload);
      } else {
        // Create new problem
        const r = await api.post('/problems', payload);
        probId = r.data.id || r.data._id;
      }

      // Link to contest
      const updatedProblemsList = [...problems];
      updatedProblemsList[activeProblemIdx] = probId;

      const contestUpdate = await api.put(`/contests/${id}`, {
        problems: updatedProblemsList.filter(Boolean)
      });

      const returnedProblems = contestUpdate.data.problems || [];
      const problemIds = returnedProblems.map(p => p.id || p._id || p);
      setProblems(problemIds);
      setProbForm(prev => ({ ...prev, id: probId }));
      toast.success(`Problem ${activeProblemIdx + 1} saved successfully!`);
    } catch (err) {
      toast.error('Failed to save problem.');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishContest = async (targetStatus) => {
    setLoading(true);
    try {
      await api.put(`/contests/${id}`, { status: targetStatus });
      toast.success(`Contest successfully saved as ${targetStatus}!`);
      navigate('/dev');
    } catch {
      toast.error('Failed to update contest status.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag) => {
    setProbForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
    }));
  };

  return (
    <div className="wizard-container">
      {/* Wizard Header */}
      <header className="wizard-header">
        <div>
          <h1>{isNew ? 'Create Contest Wizard' : `Edit Wizard — ${details.title}`}</h1>
          <p>Setup details, generate AI problems, run validations, and publish.</p>
        </div>
        <div className="wizard-header-steps">
          <div className={`step-node ${step === 1 ? 'active' : ''}`} onClick={() => setStep(1)}>
            <span>1</span> Details
          </div>
          <div className={`step-line ${step === 2 ? 'active' : ''}`} />
          <div className={`step-node ${step === 2 ? 'active' : ''}`} onClick={() => details.scheduleLocked && setStep(2)}>
            <span>2</span> Problem builder
          </div>
        </div>
      </header>

      {loading && <div className="loading-overlay"><div className="spinner" /></div>}

      {/* STEP 1: CONTEST DETAILS */}
      {step === 1 && (
        <form onSubmit={handleDetailsSubmit} className="wizard-card details-form">
          <h2>1. Contest Details</h2>
          <div className="form-grid">
            <div className="form-col">
              <label>Contest Name *</label>
              <input
                className="inp"
                required
                value={details.title}
                onChange={e => setDetails({ ...details, title: e.target.value })}
                placeholder="e.g. Parul Coding Cup 2026"
              />

              <label>Description</label>
              <textarea
                className="inp"
                rows={3}
                value={details.description}
                onChange={e => setDetails({ ...details, description: e.target.value })}
                placeholder="Details about rules, requirements, structure…"
              />

              <label>Contest Banner URL (optional)</label>
              <input
                className="inp"
                value={details.bannerUrl}
                onChange={e => setDetails({ ...details, bannerUrl: e.target.value })}
                placeholder="https://example.com/banner.png"
              />

              <div className="flex-row">
                <div style={{ flex: 1 }}>
                  <label>Contest Type</label>
                  <select
                    className="select"
                    value={details.contestType}
                    onChange={e => setDetails({ ...details, contestType: e.target.value })}
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                {details.contestType === 'private' && (
                  <div style={{ flex: 1 }}>
                    <label>Contest Password *</label>
                    <input
                      className="inp"
                      required
                      type="password"
                      value={details.password}
                      onChange={e => setDetails({ ...details, password: e.target.value })}
                      placeholder="Access Code"
                    />
                  </div>
                )}
              </div>

              <div className="flex-row">
                <div style={{ flex: 1 }}>
                  <label>Start Time *</label>
                  <input
                    className="inp"
                    type="datetime-local"
                    required
                    value={details.startTime}
                    onChange={e => setDetails({ ...details, startTime: e.target.value })}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label>End Time *</label>
                  <input
                    className="inp"
                    type="datetime-local"
                    required
                    value={details.endTime}
                    onChange={e => setDetails({ ...details, endTime: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="form-col border-left">
              <div className="flex-row">
                <div style={{ flex: 1 }}>
                  <label>Contest Duration (minutes)</label>
                  <input
                    className="inp"
                    type="number"
                    value={details.duration}
                    onChange={e => setDetails({ ...details, duration: parseInt(e.target.value) || 120 })}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Maximum Marks</label>
                  <input
                    className="inp"
                    type="number"
                    value={details.maxMarks}
                    onChange={e => setDetails({ ...details, maxMarks: parseInt(e.target.value) || 100 })}
                  />
                </div>
              </div>

              <div className="flex-row">
                <div style={{ flex: 1 }}>
                  <label>Number of Problems</label>
                  <input
                    className="inp"
                    type="number"
                    value={details.numProblems}
                    onChange={e => setDetails({ ...details, numProblems: parseInt(e.target.value) || 3 })}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Leaderboard Visibility</label>
                  <select
                    className="select"
                    value={details.leaderboardVisibility}
                    onChange={e => setDetails({ ...details, leaderboardVisibility: e.target.value })}
                  >
                    <option value="live">Live</option>
                    <option value="frozen">Frozen</option>
                    <option value="hidden">Hidden until ended</option>
                  </select>
                </div>
              </div>

              <label>Proctoring Options</label>
              <div className="options-checkboxes">
                <label><input type="checkbox" defaultChecked /> Require Camera Proctoring</label>
                <label><input type="checkbox" defaultChecked /> Tab switch tracking & locks</label>
              </div>

              <label>AI Assistant Permission</label>
              <div className="flex-row">
                <label className="switch-label">
                  <input
                    type="checkbox"
                    checked={details.aiEnabled}
                    onChange={e => setDetails({ ...details, aiEnabled: e.target.checked })}
                  />
                  AI Allowed during contest
                </label>
                <label className="switch-label">
                  <input
                    type="checkbox"
                    checked={details.aiHints}
                    disabled={!details.aiEnabled}
                    onChange={e => setDetails({ ...details, aiHints: e.target.checked })}
                  />
                  AI Hints Allowed
                </label>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/dev')}>Cancel</button>
            <button type="submit" className="btn btn-primary">Next: Lock Schedule & Set Problems →</button>
          </div>
        </form>
      )}

      {/* STEP 2: PROBLEM CREATION */}
      {step === 2 && (
        <div className="step2-split">
          {/* List of problems index tabs */}
          <aside className="problem-indexer">
            <h3>Contest Problems</h3>
            {Array.from({ length: details.numProblems }).map((_, idx) => {
              const pId = problems[idx];
              return (
                <button
                  key={idx}
                  className={`prob-index-btn ${activeProblemIdx === idx ? 'active' : ''} ${pId ? 'saved' : ''}`}
                  onClick={() => {
                    setActiveProblemIdx(idx);
                    if (pId) {
                      // Fetch full problem details if we already have ID
                      api.get(`/problems/${pId}`).then(res => loadProblemIntoForm(res.data));
                    } else {
                      // Reset form
                      setProbForm({
                        title: '',
                        difficulty: 'medium',
                        points: 100,
                        tags: [],
                        statement: '',
                        constraints: '',
                        inputFormat: '',
                        outputFormat: '',
                        explanation: '',
                        timeLimit: 1.0,
                        memoryLimit: 256,
                        editorial: '',
                        optimalAlgorithm: '',
                        cppSolution: '',
                        javaSolution: '',
                        pythonSolution: '',
                        jsSolution: '',
                        sampleInput: '',
                        sampleOutput: '',
                      });
                      setTestCases([]);
                      setBoundaryCases([]);
                      setStressCases([]);
                      setValidationResult(null);
                    }
                  }}
                >
                  <div className="prob-idx-indicator">{idx + 1}</div>
                  <div className="prob-idx-body">
                    <span>Problem {idx + 1}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{pId ? '✓ Configured' : '○ Not configured'}</span>
                  </div>
                </button>
              );
            })}

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => handlePublishContest('draft')}>
                💾 Save as Draft
              </button>
              <button className="btn btn-primary" onClick={() => handlePublishContest('scheduled')}>
                🚀 Publish Contest
              </button>
            </div>
          </aside>

          {/* Creation panel */}
          <main className="problem-editor-panel">
            <div className="editor-tab-header">
              <h2>Configuring Problem {activeProblemIdx + 1}</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-ghost" onClick={handleVerifyProblem} disabled={validating}>
                  {validating ? 'Verifying…' : '⚖ AI Verification Check'}
                </button>
                <button className="btn btn-primary" onClick={handleSaveProblem}>
                  Save Problem {activeProblemIdx + 1}
                </button>
              </div>
            </div>

            {/* Validation alert banner */}
            {validationResult && (
              <div className={`validation-alert ${validationResult.valid ? 'success' : 'error'}`}>
                <h3>{validationResult.valid ? '✓ AI Verification Passed' : '🚨 AI Verification Errors'}</h3>
                <p>{validationResult.feedback}</p>
                {validationResult.errors?.length > 0 && (
                  <ul>
                    {validationResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
                {validationResult.warnings?.length > 0 && (
                  <div className="warnings">
                    <strong>Warnings:</strong>
                    <ul>
                      {validationResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="split-workspace">
              {/* Option A: Manual Editor */}
              <div className="manual-inputs">
                <div className="section-title">Option A: Manual Problem Specs</div>
                <div className="form-card">
                  <label>Title *</label>
                  <input
                    className="inp"
                    value={probForm.title}
                    onChange={e => setProbForm({ ...probForm, title: e.target.value })}
                    placeholder="e.g. Unique Path Sum"
                  />

                  <div className="flex-row">
                    <div style={{ flex: 1 }}>
                      <label>Difficulty</label>
                      <select
                        className="select"
                        value={probForm.difficulty}
                        onChange={e => setProbForm({ ...probForm, difficulty: e.target.value })}
                      >
                        {DIFFS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label>Points</label>
                      <input
                        className="inp"
                        type="number"
                        value={probForm.points}
                        onChange={e => setProbForm({ ...probForm, points: parseInt(e.target.value) || 100 })}
                      />
                    </div>
                  </div>

                  <label>Tags</label>
                  <div className="tag-chips">
                    {TAGS_LIST.map(t => (
                      <button
                        key={t}
                        type="button"
                        className={`tag-chip ${probForm.tags.includes(t) ? 'active' : ''}`}
                        onClick={() => toggleTag(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <label>Problem Statement *</label>
                  <textarea
                    className="inp"
                    rows={4}
                    value={probForm.statement}
                    onChange={e => setProbForm({ ...probForm, statement: e.target.value })}
                    placeholder="Provide description, story, inputs, outputs, rules…"
                  />

                  <label>Constraints</label>
                  <textarea
                    className="inp"
                    rows={2}
                    value={probForm.constraints}
                    onChange={e => setProbForm({ ...probForm, constraints: e.target.value })}
                    placeholder="e.g., 1 <= N <= 10^5"
                  />

                  <div className="flex-row">
                    <div style={{ flex: 1 }}>
                      <label>Input Format</label>
                      <textarea
                        className="inp"
                        rows={2}
                        value={probForm.inputFormat}
                        onChange={e => setProbForm({ ...probForm, inputFormat: e.target.value })}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label>Output Format</label>
                      <textarea
                        className="inp"
                        rows={2}
                        value={probForm.outputFormat}
                        onChange={e => setProbForm({ ...probForm, outputFormat: e.target.value })}
                      />
                    </div>
                  </div>

                  <label>Time & Memory Limit</label>
                  <div className="flex-row">
                    <div style={{ flex: 1 }}>
                      <label>Time Limit (seconds)</label>
                      <input
                        className="inp"
                        type="number"
                        step="0.1"
                        value={probForm.timeLimit}
                        onChange={e => setProbForm({ ...probForm, timeLimit: parseFloat(e.target.value) || 1.0 })}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label>Memory Limit (MB)</label>
                      <input
                        className="inp"
                        type="number"
                        value={probForm.memoryLimit}
                        onChange={e => setProbForm({ ...probForm, memoryLimit: parseInt(e.target.value) || 256 })}
                      />
                    </div>
                  </div>

                  <label>Sample Test Cases</label>
                  <div className="flex-row">
                    <div style={{ flex: 1 }}>
                      <label>Sample Input</label>
                      <textarea
                        className="inp code-box"
                        rows={2}
                        value={probForm.sampleInput}
                        onChange={e => setProbForm({ ...probForm, sampleInput: e.target.value })}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label>Sample Output</label>
                      <textarea
                        className="inp code-box"
                        rows={2}
                        value={probForm.sampleOutput}
                        onChange={e => setProbForm({ ...probForm, sampleOutput: e.target.value })}
                      />
                    </div>
                  </div>

                  <label>Sample Case Explanation</label>
                  <textarea
                    className="inp"
                    rows={2}
                    value={probForm.explanation}
                    onChange={e => setProbForm({ ...probForm, explanation: e.target.value })}
                  />

                  <h3>Hidden Test Cases</h3>
                  {testCases.map((tc, idx) => (
                    <div key={idx} className="tc-group">
                      <div className="flex-row align-center">
                        <strong>Case {idx + 1}</strong>
                        <button className="btn btn-danger btn-sm" onClick={() => setTestCases(testCases.filter((_, i) => i !== idx))}>Remove</button>
                      </div>
                      <div className="flex-row">
                        <textarea
                          placeholder="Input"
                          className="inp code-box"
                          rows={2}
                          value={tc.input}
                          onChange={e => {
                            const newTc = [...testCases];
                            newTc[idx].input = e.target.value;
                            setTestCases(newTc);
                          }}
                        />
                        <textarea
                          placeholder="Expected Output"
                          className="inp code-box"
                          rows={2}
                          value={tc.output}
                          onChange={e => {
                            const newTc = [...testCases];
                            newTc[idx].output = e.target.value;
                            setTestCases(newTc);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-ghost" onClick={() => setTestCases([...testCases, { input: '', output: '' }])}>
                    + Add Hidden Case
                  </button>

                  <h3>Boundary Cases</h3>
                  {boundaryCases.map((bc, idx) => (
                    <div key={idx} className="tc-group">
                      <div className="flex-row align-center">
                        <strong>Boundary {idx + 1}</strong>
                        <button className="btn btn-danger btn-sm" onClick={() => setBoundaryCases(boundaryCases.filter((_, i) => i !== idx))}>Remove</button>
                      </div>
                      <div className="flex-row">
                        <textarea
                          placeholder="Boundary Input"
                          className="inp code-box"
                          rows={2}
                          value={bc.input}
                          onChange={e => {
                            const newBc = [...boundaryCases];
                            newBc[idx].input = e.target.value;
                            setBoundaryCases(newBc);
                          }}
                        />
                        <textarea
                          placeholder="Boundary Output"
                          className="inp code-box"
                          rows={2}
                          value={bc.output}
                          onChange={e => {
                            const newBc = [...boundaryCases];
                            newBc[idx].output = e.target.value;
                            setBoundaryCases(newBc);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-ghost" onClick={() => setBoundaryCases([...boundaryCases, { input: '', output: '' }])}>
                    + Add Boundary Case
                  </button>

                  <h3>Stress Cases</h3>
                  {stressCases.map((sc, idx) => (
                    <div key={idx} className="tc-group">
                      <div className="flex-row align-center">
                        <strong>Stress {idx + 1}</strong>
                        <button className="btn btn-danger btn-sm" onClick={() => setStressCases(stressCases.filter((_, i) => i !== idx))}>Remove</button>
                      </div>
                      <div className="flex-row">
                        <textarea
                          placeholder="Stress Input"
                          className="inp code-box"
                          rows={2}
                          value={sc.input}
                          onChange={e => {
                            const newSc = [...stressCases];
                            newSc[idx].input = e.target.value;
                            setStressCases(newSc);
                          }}
                        />
                        <textarea
                          placeholder="Stress Output"
                          className="inp code-box"
                          rows={2}
                          value={sc.output}
                          onChange={e => {
                            const newSc = [...stressCases];
                            newSc[idx].output = e.target.value;
                            setStressCases(newSc);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-ghost" onClick={() => setStressCases([...stressCases, { input: '', output: '' }])}>
                    + Add Stress Case
                  </button>

                  <h3>Solution Implementations</h3>
                  <label>C++ Reference Solution</label>
                  <textarea
                    className="inp code-box"
                    rows={4}
                    value={probForm.cppSolution}
                    onChange={e => setProbForm({ ...probForm, cppSolution: e.target.value })}
                  />

                  <label>Java Reference Solution</label>
                  <textarea
                    className="inp code-box"
                    rows={4}
                    value={probForm.javaSolution}
                    onChange={e => setProbForm({ ...probForm, javaSolution: e.target.value })}
                  />

                  <label>Python Reference Solution</label>
                  <textarea
                    className="inp code-box"
                    rows={4}
                    value={probForm.pythonSolution}
                    onChange={e => setProbForm({ ...probForm, pythonSolution: e.target.value })}
                  />

                  <label>JavaScript Reference Solution</label>
                  <textarea
                    className="inp code-box"
                    rows={4}
                    value={probForm.jsSolution}
                    onChange={e => setProbForm({ ...probForm, jsSolution: e.target.value })}
                  />
                </div>
              </div>

              {/* Option B: AI Generator */}
              <div className="ai-options-panel">
                <div className="section-title">Option B: Generate with AI</div>
                <div className="form-card highlight-purple">
                  <label>Topic / Concept</label>
                  <input
                    className="inp"
                    value={aiOptions.topic}
                    onChange={e => setAiOptions({ ...aiOptions, topic: e.target.value })}
                    placeholder="e.g. Dijkstra, Dynamic Programming"
                  />

                  <label>Difficulty</label>
                  <select
                    className="select"
                    value={aiOptions.difficulty}
                    onChange={e => setAiOptions({ ...aiOptions, difficulty: e.target.value })}
                  >
                    {DIFFS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>

                  <label>Constraints Preference</label>
                  <input
                    className="inp"
                    value={aiOptions.constraints}
                    onChange={e => setAiOptions({ ...aiOptions, constraints: e.target.value })}
                    placeholder="e.g. 1 <= N <= 2*10^5"
                  />

                  <label className="switch-label" style={{ margin: '10px 0' }}>
                    <input
                      type="checkbox"
                      checked={aiOptions.storyBased}
                      onChange={e => setAiOptions({ ...aiOptions, storyBased: e.target.checked })}
                    />
                    Generate Story-Based Statement
                  </label>

                  <label>Expected Algorithm</label>
                  <input
                    className="inp"
                    value={aiOptions.expectedAlgorithm}
                    onChange={e => setAiOptions({ ...aiOptions, expectedAlgorithm: e.target.value })}
                    placeholder="e.g. Kruskal's MST, Prefix Sums"
                  />

                  <label>Target Time Complexity</label>
                  <input
                    className="inp"
                    value={aiOptions.timeComplexity}
                    onChange={e => setAiOptions({ ...aiOptions, timeComplexity: e.target.value })}
                    placeholder="e.g. O(N log N)"
                  />

                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
                    onClick={handleAIGenerate}
                    disabled={generating}
                  >
                    {generating ? 'AI Generating…' : '✨ Generate with Groq LLaMA'}
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
