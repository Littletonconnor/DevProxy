/**
 * Hook for managing activity logs.
 * Polls the background service worker for intercepted request logs.
 */
import { useState, useEffect, useCallback } from 'react';
import type { LogEntry } from '@/shared/types';

const POLL_INTERVAL = 1000;

export function useLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'GET_LOGS' }, (response) => {
      if (response) setLogs(response);
      setLoading(false);
    });
  }, []);

  const clearLogs = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'CLEAR_LOGS' });
    setLogs([]);
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  return { logs, loading, clearLogs, refreshLogs: fetchLogs };
}
