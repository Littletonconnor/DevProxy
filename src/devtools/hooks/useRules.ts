/**
 * Hook for managing interception rules.
 * Handles CRUD operations and persistence via the background service worker.
 */
import { useState, useEffect, useCallback } from 'react';
import type { Rule } from '@/shared/types';

export function useRules() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_EXTENSION_STATE' }, (response) => {
      if (response) {
        setRules(response.rules || []);
        setEnabled(false);
        chrome.runtime.sendMessage({ type: 'TOGGLE_EXTENSION', enabled: false });
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const handleUnload = () => {
      chrome.runtime.sendMessage({ type: 'TOGGLE_EXTENSION', enabled: false });
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('unload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, []);

  const persistRules = useCallback((newRules: Rule[]) => {
    setRules(newRules);
    chrome.runtime.sendMessage({ type: 'RULES_UPDATED', rules: newRules });
  }, []);

  const toggleEnabled = useCallback(() => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    chrome.runtime.sendMessage({ type: 'TOGGLE_EXTENSION', enabled: newEnabled });
  }, [enabled]);

  const addRule = useCallback(
    (rule: Omit<Rule, 'id'>) => {
      const newRule: Rule = { ...rule, id: crypto.randomUUID() };
      persistRules([...rules, newRule]);
      return newRule;
    },
    [rules, persistRules]
  );

  const updateRule = useCallback(
    (id: string, updates: Partial<Rule>) => {
      persistRules(rules.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    },
    [rules, persistRules]
  );

  const deleteRule = useCallback(
    (id: string) => {
      persistRules(rules.filter((r) => r.id !== id));
    },
    [rules, persistRules]
  );

  const toggleRule = useCallback(
    (id: string) => {
      const rule = rules.find((r) => r.id === id);
      if (rule) updateRule(id, { enabled: !rule.enabled });
    },
    [rules, updateRule]
  );

  const reorderRules = useCallback(
    (fromIndex: number, toIndex: number) => {
      const newRules = [...rules];
      const [moved] = newRules.splice(fromIndex, 1);
      newRules.splice(toIndex, 0, moved);
      persistRules(newRules);
    },
    [rules, persistRules]
  );

  return {
    rules,
    enabled,
    loading,
    toggleEnabled,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
    reorderRules,
  };
}
