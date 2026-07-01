import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

/**
 * useLeetCodeSync — React hook for syncing LeetCode solved status
 * 
 * @param {string} userId - The hackwithbug user ID
 * @param {number} intervalMinutes - Auto-poll interval in minutes (0 = disabled)
 * @returns {{ solvedSlugs, syncing, lastSync, sync, isSolved, solvedProblemIds }}
 */
export default function useLeetCodeSync(userId, intervalMinutes = 0) {
  const [solvedSlugs, setSolvedSlugs] = useState([]);
  const [solvedProblemIds, setSolvedProblemIds] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [error, setError] = useState(null);

  const sync = useCallback(async () => {
    if (!userId || syncing) return null;
    setSyncing(true);
    setError(null);
    try {
      const r = await api.get(`/leetcode/sync/${userId}`);
      setSolvedSlugs(r.data.solvedSlugs || []);
      setSolvedProblemIds(r.data.solvedProblemIds || []);
      setLastSync(new Date(r.data.syncedAt));
      return r.data;
    } catch (err) {
      const msg = err.response?.data?.error || 'Sync failed';
      setError(msg);
      return null;
    } finally {
      setSyncing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Auto-poll at specified interval
  useEffect(() => {
    if (!userId || intervalMinutes <= 0) return;

    // Initial sync
    sync();

    const interval = setInterval(sync, intervalMinutes * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId, intervalMinutes, sync]);

  const isSolved = useCallback(
    (slug) => solvedSlugs.includes(slug),
    [solvedSlugs]
  );

  const isProblemSolved = useCallback(
    (problemId) => solvedProblemIds.includes(problemId),
    [solvedProblemIds]
  );

  return {
    solvedSlugs,
    solvedProblemIds,
    syncing,
    lastSync,
    error,
    sync,
    isSolved,
    isProblemSolved
  };
}
