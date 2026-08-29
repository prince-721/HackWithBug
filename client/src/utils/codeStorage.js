// client/src/utils/codeStorage.js

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Generates consistent cache key
 */
function getStorageKey(userId, problemId, language, contestId = null) {
  const u = userId || 'anon';
  const c = contestId ? `contest_${contestId}_` : '';
  return `hwb_draft_${u}_${c}${problemId}_${language}`;
}

/**
 * Saves code draft to localStorage with 7-day TTL timestamp
 */
export function saveCodeDraft(userId, problemId, language, code, contestId = null) {
  if (!problemId || !language) return;
  try {
    const key = getStorageKey(userId, problemId, language, contestId);
    const data = {
      code,
      updatedAt: Date.now(),
      language,
      problemId,
      contestId: contestId || null
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save draft to localStorage', e);
  }
}

/**
 * Loads code draft if within 7-day retention period
 */
export function loadCodeDraft(userId, problemId, language, contestId = null) {
  if (!problemId || !language) return null;
  try {
    const key = getStorageKey(userId, problemId, language, contestId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const data = JSON.parse(raw);
    const age = Date.now() - (data.updatedAt || 0);

    // If older than 7 days, discard
    if (age > SEVEN_DAYS_MS) {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Formats relative time (e.g. "5m ago", "Yesterday", "3d ago")
 */
export function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Just now';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  return `${diffDay}d ago`;
}
