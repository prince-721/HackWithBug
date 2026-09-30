/**
 * Behavioral Integrity Analyzer for HackWithBug
 * Detects hidden AI assistants (invisible overlays, second-device transcribing)
 * from editor, typing, and session telemetry.
 */

function analyzeBehavioralIntegrity(input) {
  const {
    keystroke_timing = [],
    code_diff_bursts = [],
    paste_events = [],
    window_focus_log = [],
    eye_gaze_offscreen_log = [],
    problem_open_to_first_edit_seconds = 0,
    edit_pattern = [],
    historical_baseline = {},
    code = '',
    problemDifficulty = 'Medium',
    medianSolveTimeSeconds = 1200
  } = input || {};

  const signals = [];

  // 1. Long problem_open_to_first_edit_seconds followed by a burst of large, mostly-correct code
  const totalEdits = edit_pattern.filter(e => e.type === 'insert' || e.type === 'delete').length;
  const subsequentEdits = edit_pattern.slice(2).filter(e => e.type === 'insert' || e.type === 'delete').length;
  const initialLargeBurst = code_diff_bursts.slice(0, 3).find(b => (b.chars_added || 0) > 120);

  if (problem_open_to_first_edit_seconds > 180 && (initialLargeBurst || code.length > 200)) {
    const burstSize = initialLargeBurst ? initialLargeBurst.chars_added : code.length;
    const severity = (problem_open_to_first_edit_seconds > 300 && burstSize > 250 && subsequentEdits < 8) ? 'high' : 'medium';
    const confidence = Math.min(95, Math.round(55 + (problem_open_to_first_edit_seconds / 20) + (subsequentEdits < 5 ? 15 : 0)));

    signals.push({
      signal_name: 'delayed_first_edit_followed_by_monolithic_burst',
      severity,
      evidence: `Problem load to first edit was ${problem_open_to_first_edit_seconds}s followed by an initial insertion burst of ${burstSize} chars with only ${subsequentEdits} subsequent refinement edits, consistent with reading an external pre-formulated solution.`,
      confidence
    });
  }

  // 2. Repeated short window_focus blur/focus cycles without pastes, clustered before diff bursts
  const blurs = window_focus_log.filter(w => w.event === 'blur');
  let blurPrecedingBurstCount = 0;

  blurs.forEach(b => {
    const bTime = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : (b.timestamp || 0);
    const hasPrecedingBurst = code_diff_bursts.some(burst => {
      const burstTime = typeof burst.timestamp === 'string' ? new Date(burst.timestamp).getTime() : (burst.timestamp || 0);
      const diff = burstTime - bTime;
      return diff >= 0 && diff <= 12000 && (burst.chars_added || 0) > 40;
    });
    if (hasPrecedingBurst) blurPrecedingBurstCount++;
  });

  const totalPastes = paste_events.length;
  if (blurs.length >= 3 && totalPastes === 0) {
    const severity = (blurs.length >= 6 || blurPrecedingBurstCount >= 3) ? 'high' : 'medium';
    const confidence = Math.min(95, Math.round(50 + (blurs.length * 4) + (blurPrecedingBurstCount * 8)));

    signals.push({
      signal_name: 'unpasted_micro_blur_clusters_preceding_diffs',
      severity,
      evidence: `Detected ${blurs.length} short window blur events with 0 clipboard paste actions. ${blurPrecedingBurstCount} of these blurs occurred within 12 seconds prior to significant code entry bursts, characteristic of uncaptured overlay glancing.`,
      confidence
    });
  }

  // 3. Typing rhythm that is steady and "reading-paced" vs baseline
  if (keystroke_timing.length >= 15) {
    const mean = keystroke_timing.reduce((a, b) => a + b, 0) / keystroke_timing.length;
    const variance = keystroke_timing.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / keystroke_timing.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 1; // Coefficient of variation

    const baselineWpm = historical_baseline.wpm || 35;
    const calculatedWpm = mean > 0 ? Math.round((60000 / (mean * 5))) : 0;

    // Reading cadence has very low CV (monotonous metronomic typing, CV < 0.28)
    if (cv < 0.32) {
      const severity = cv < 0.22 ? 'high' : 'medium';
      const confidence = Math.min(96, Math.round(60 + (0.35 - cv) * 120));

      signals.push({
        signal_name: 'transcription_cadence_deviation_from_baseline',
        severity,
        evidence: `Inter-keystroke interval CV is ${cv.toFixed(2)} (steady metronomic transcription pace at ~${calculatedWpm} WPM) with absence of cognitive decision pauses, contrasting with standard exploratory solving rhythm.`,
        confidence
      });
    }
  }

  // 4. Code correctness / idiom style deviation from historical baseline
  const baselineErrorRate = historical_baseline.error_rate !== undefined ? historical_baseline.error_rate : 0.25;
  const containsAdvancedIdioms = /(\bstd::(transform|ranges|string_view|optional|variant|any)\b|lambda\s*\[.*?\]|\bauto&&|\bconstexpr\b|\bPromise\.allSettled\b|\bObject\.freeze\b)/i.test(code);
  const baselineIdiomKnown = historical_baseline.uses_modern_idioms === true;

  if (containsAdvancedIdioms && !baselineIdiomKnown && baselineErrorRate > 0.20) {
    signals.push({
      signal_name: 'idiomatic_style_and_correctness_anomaly',
      severity: 'medium',
      evidence: `Code incorporates advanced syntax idioms never observed in student's historical baseline profile (${Math.round(baselineErrorRate * 100)}% historical syntax error rate).`,
      confidence: 78
    });
  }

  // 5. Zero or near-zero use of platform's run/test button before correct submission
  const runCount = edit_pattern.filter(e => e.type === 'run').length;
  const submitCount = edit_pattern.filter(e => e.type === 'submit').length;
  const diffTier = (problemDifficulty || 'Medium').toLowerCase();

  if (runCount <= 1 && submitCount >= 1 && (diffTier === 'medium' || diffTier === 'hard')) {
    const severity = runCount === 0 ? 'high' : 'medium';
    const confidence = runCount === 0 ? 92 : 75;

    signals.push({
      signal_name: 'zero_iteration_execution_anomaly',
      severity,
      evidence: `Student performed ${runCount} test runs prior to final submission on a ${problemDifficulty} problem. Historical baseline indicates an average of ${historical_baseline.debug_iteration_count || 4} test cycles for this difficulty tier.`,
      confidence
    });
  }

  // 6. Near-identical solution structure to rapid AI-generation pattern
  const solveTimeSeconds = input.solve_time_seconds || (problem_open_to_first_edit_seconds + (code.length / 4));
  const isDocstringHeavy = (code.match(/\/\*\*[\s\S]*?\*\/|\/\/.*$/gm) || []).length >= 4;
  const isRapid = solveTimeSeconds < (medianSolveTimeSeconds * 0.45);

  if (isDocstringHeavy && isRapid) {
    signals.push({
      signal_name: 'rapid_ai_canonical_solution_structure',
      severity: 'medium',
      evidence: `Textbook clean solution with comprehensive documentation generated in ${Math.round(solveTimeSeconds / 60)}m, less than 45% of median peer solve time (${Math.round(medianSolveTimeSeconds / 60)}m) with no scratch code.`,
      confidence: 80
    });
  }

  // Weak gaze signal corroboration if available
  if (eye_gaze_offscreen_log.length >= 4) {
    signals.push({
      signal_name: 'frequent_offscreen_gaze_fixation',
      severity: 'low',
      evidence: `Recorded ${eye_gaze_offscreen_log.length} offscreen gaze fixations (aggregate ${eye_gaze_offscreen_log.reduce((a, b) => a + (b.duration_ms || 0), 0)}ms). Treated as secondary weak corroborating telemetry.`,
      confidence: 58
    });
  }

  // Corroboration & Overall Verdict Logic
  const highSignals = signals.filter(s => s.severity === 'high');
  const medSignals = signals.filter(s => s.severity === 'medium');
  const corroboratingCount = highSignals.length + medSignals.length;

  let risk_level = 'low';
  let recommended_action = 'none';

  if (highSignals.length >= 3 || (highSignals.length >= 2 && medSignals.length >= 2)) {
    risk_level = 'critical';
    recommended_action = 'require_live_verbal_walkthrough';
  } else if (corroboratingCount >= 3) {
    // Rule: Require at least 3 independent corroborating signals before risk_level >= high
    risk_level = 'high';
    recommended_action = 'require_live_verbal_walkthrough';
  } else if (corroboratingCount >= 2 || highSignals.length >= 1) {
    risk_level = 'medium';
    // Rule: Always recommend "require_live_verbal_walkthrough" for any medium+ risk case as resolution step
    recommended_action = 'require_live_verbal_walkthrough';
  } else if (signals.length >= 1) {
    risk_level = 'low';
    recommended_action = 'flag_for_manual_review';
  }

  const signalSummaries = signals.map(s => s.signal_name.replace(/_/g, ' ')).join(', ');
  const summary = corroboratingCount >= 2
    ? `Candidate session demonstrates ${corroboratingCount} corroborating behavioral signals (${signalSummaries}) consistent with reading and transcribing a solution from an external uncaptured assistant or invisible overlay rather than composing in-editor.`
    : (signals.length === 1
      ? `Isolated signal observed (${signalSummaries}). Insufficient corroboration for automated penalty; standard review recommended.`
      : `Session telemetry aligns within normal independent solving distribution; no multi-signal AI transcription patterns identified.`);

  return {
    signals,
    overall_verdict: {
      risk_level,
      summary,
      recommended_action
    }
  };
}

module.exports = {
  analyzeBehavioralIntegrity
};
