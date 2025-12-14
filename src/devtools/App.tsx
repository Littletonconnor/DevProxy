import { useState } from 'react';
import type { Rule } from '@/shared/types';
import { useRules } from './hooks/useRules';
import { RuleList } from './components/RuleList';
import { RuleEditor } from './components/RuleEditor';

function App() {
  const {
    rules,
    enabled,
    loading,
    toggleEnabled,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
  } = useRules();

  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleSave = (rule: Omit<Rule, 'id'> | Rule) => {
    if ('id' in rule) {
      updateRule(rule.id, rule);
    } else {
      addRule(rule);
    }
    setEditingRule(null);
    setIsCreating(false);
  };

  const handleCancel = () => {
    setEditingRule(null);
    setIsCreating(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this rule?')) {
      deleteRule(id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">devProxy</h1>
            <span className="text-xs text-zinc-500">
              {rules.length} rule{rules.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreating(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Rule
            </button>

            <button
              onClick={toggleEnabled}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
                enabled
                  ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
                  : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
              }`}
              title={enabled ? 'Click to disable all rules' : 'Click to enable all rules'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  enabled ? 'bg-emerald-400' : 'bg-zinc-500'
                }`}
              />
              {enabled ? 'Active' : 'Inactive'}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-4">
        {!enabled && (
          <div className="mb-4 px-4 py-3 bg-amber-900/30 border border-amber-700/50 rounded-lg text-amber-200 text-sm">
            devProxy is currently disabled. Rules will not be applied.
          </div>
        )}

        <RuleList
          rules={rules}
          onEdit={setEditingRule}
          onToggle={toggleRule}
          onDelete={handleDelete}
        />
      </main>

      {/* Rule Editor Modal */}
      {(isCreating || editingRule) && (
        <RuleEditor
          rule={editingRule || undefined}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

export default App;
