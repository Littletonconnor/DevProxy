import { useState, useEffect, useCallback } from 'react';
import type { Rule } from '@/shared/types';

export function useRules() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [enabled, setEnabled] = useState(false); // Always start disabled
  const [loading, setLoading] = useState(true);

  // Load initial state - always starts disabled for security
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_EXTENSION_STATE' }, (response) => {
      if (response) {
        setRules(response.rules || []);
        // Always start disabled - user must explicitly enable each session
        setEnabled(false);
        chrome.runtime.sendMessage({ type: 'TOGGLE_EXTENSION', enabled: false });
      }
      setLoading(false);
    });
  }, []);

  // Auto-disable when DevTools panel closes
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

  // Persist rules to background
  const persistRules = useCallback((newRules: Rule[]) => {
    setRules(newRules);
    chrome.runtime.sendMessage({ type: 'RULES_UPDATED', rules: newRules });
  }, []);

  // Toggle extension enabled state
  const toggleEnabled = useCallback(() => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    chrome.runtime.sendMessage({ type: 'TOGGLE_EXTENSION', enabled: newEnabled });
  }, [enabled]);

  // Add a new rule
  const addRule = useCallback((rule: Omit<Rule, 'id'>) => {
    const newRule: Rule = {
      ...rule,
      id: crypto.randomUUID(),
    };
    persistRules([...rules, newRule]);
    return newRule;
  }, [rules, persistRules]);

  // Update an existing rule
  const updateRule = useCallback((id: string, updates: Partial<Rule>) => {
    const newRules = rules.map((r) =>
      r.id === id ? { ...r, ...updates } : r
    );
    persistRules(newRules);
  }, [rules, persistRules]);

  // Delete a rule
  const deleteRule = useCallback((id: string) => {
    persistRules(rules.filter((r) => r.id !== id));
  }, [rules, persistRules]);

  // Toggle a rule's enabled state
  const toggleRule = useCallback((id: string) => {
    const rule = rules.find((r) => r.id === id);
    if (rule) {
      updateRule(id, { enabled: !rule.enabled });
    }
  }, [rules, updateRule]);

  // Reorder rules (for drag-and-drop later)
  const reorderRules = useCallback((fromIndex: number, toIndex: number) => {
    const newRules = [...rules];
    const [moved] = newRules.splice(fromIndex, 1);
    newRules.splice(toIndex, 0, moved);
    persistRules(newRules);
  }, [rules, persistRules]);

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
