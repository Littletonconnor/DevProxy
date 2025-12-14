import { useState, useEffect } from 'react';
import type { Rule, HeaderMod } from '@/shared/types';
import { STATUS_CODE_PRESETS, DELAY_PRESETS, MATCH_TYPES } from '@/shared/constants';
import { HeaderEditor } from './HeaderEditor';

interface RuleEditorProps {
  rule?: Rule;
  onSave: (rule: Omit<Rule, 'id'> | Rule) => void;
  onCancel: () => void;
}

const defaultRule: Omit<Rule, 'id'> = {
  enabled: true,
  name: '',
  urlPattern: '',
  matchType: 'contains',
  statusCode: undefined,
  delayMs: undefined,
  requestHeaders: [],
  responseHeaders: [],
};

export function RuleEditor({ rule, onSave, onCancel }: RuleEditorProps) {
  const [form, setForm] = useState<Omit<Rule, 'id'> & { id?: string }>(
    rule || defaultRule
  );
  const [activeTab, setActiveTab] = useState<'basic' | 'headers'>('basic');

  useEffect(() => {
    setForm(rule || defaultRule);
  }, [rule]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.urlPattern.trim()) return;
    onSave(form);
  };

  const updateForm = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-zinc-800 rounded-lg w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="p-4 border-b border-zinc-700">
          <h2 className="text-lg font-semibold">
            {rule ? 'Edit Rule' : 'New Rule'}
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-700">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'basic'
                ? 'text-white border-b-2 border-emerald-500'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Basic
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('headers')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'headers'
                ? 'text-white border-b-2 border-emerald-500'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Headers
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'basic' && (
            <>
              {/* Rule Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  placeholder="e.g., Simulate 500 on /api/users"
                  className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* URL Pattern */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  URL Pattern
                </label>
                <input
                  type="text"
                  value={form.urlPattern}
                  onChange={(e) => updateForm('urlPattern', e.target.value)}
                  placeholder="e.g., /api/users or https://*/api/*"
                  className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Match Type */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Match Type
                </label>
                <select
                  value={form.matchType}
                  onChange={(e) => updateForm('matchType', e.target.value as Rule['matchType'])}
                  className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 focus:outline-none focus:border-emerald-500"
                >
                  {MATCH_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Code */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Response Status Code
                </label>
                <select
                  value={form.statusCode || ''}
                  onChange={(e) => updateForm('statusCode', e.target.value ? Number(e.target.value) : undefined)}
                  disabled={form.simulateNetworkError}
                  className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                >
                  <option value="">No override (use actual response)</option>
                  {STATUS_CODE_PRESETS.map((preset) => (
                    <option key={preset.code} value={preset.code}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Network Error Simulation */}
              <div className="flex items-center gap-3 p-3 bg-zinc-700/50 rounded-lg">
                <input
                  type="checkbox"
                  id="simulateNetworkError"
                  checked={form.simulateNetworkError || false}
                  onChange={(e) => {
                    updateForm('simulateNetworkError', e.target.checked);
                    if (e.target.checked) {
                      updateForm('statusCode', undefined);
                    }
                  }}
                  className="w-4 h-4 rounded border-zinc-500 bg-zinc-600 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="simulateNetworkError" className="flex-1">
                  <span className="block text-sm font-medium text-zinc-200">Simulate Network Error</span>
                  <span className="block text-xs text-zinc-400">
                    Rejects fetch with TypeError (like connection refused)
                  </span>
                </label>
              </div>

              {/* Delay */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Response Delay
                </label>
                <div className="flex gap-2">
                  <select
                    value={DELAY_PRESETS.find((p) => p.ms === form.delayMs)?.ms ?? 'custom'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'custom') return;
                      updateForm('delayMs', Number(val) || undefined);
                    }}
                    className="flex-1 bg-zinc-700 border border-zinc-600 rounded px-3 py-2 focus:outline-none focus:border-emerald-500"
                  >
                    {DELAY_PRESETS.map((preset) => (
                      <option key={preset.ms} value={preset.ms}>
                        {preset.label}
                      </option>
                    ))}
                    <option value="custom">Custom...</option>
                  </select>
                  <input
                    type="number"
                    value={form.delayMs || ''}
                    onChange={(e) => updateForm('delayMs', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="ms"
                    min="0"
                    max="30000"
                    className="w-24 bg-zinc-700 border border-zinc-600 rounded px-3 py-2 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'headers' && (
            <>
              <HeaderEditor
                label="Request Headers"
                headers={form.requestHeaders || []}
                onChange={(headers: HeaderMod[]) => updateForm('requestHeaders', headers)}
              />
              <div className="border-t border-zinc-700 pt-4">
                <HeaderEditor
                  label="Response Headers"
                  headers={form.responseHeaders || []}
                  onChange={(headers: HeaderMod[]) => updateForm('responseHeaders', headers)}
                />
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-zinc-700 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded font-medium transition-colors"
          >
            {rule ? 'Save Changes' : 'Create Rule'}
          </button>
        </div>
      </form>
    </div>
  );
}
