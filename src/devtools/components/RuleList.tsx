import type { Rule } from '@/shared/types';

interface RuleListProps {
  rules: Rule[];
  onEdit: (rule: Rule) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function RuleList({ rules, onEdit, onToggle, onDelete }: RuleListProps) {
  if (rules.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500">
        <div className="text-4xl mb-4">📡</div>
        <p className="text-lg mb-2">No rules configured</p>
        <p className="text-sm">Add a rule to start intercepting network requests</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {rules.map((rule) => (
        <li
          key={rule.id}
          className={`bg-zinc-800 rounded-lg p-4 border transition-colors ${
            rule.enabled
              ? 'border-zinc-700 hover:border-zinc-600'
              : 'border-zinc-800 opacity-60'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <button
                  onClick={() => onToggle(rule.id)}
                  className={`w-8 h-5 rounded-full relative transition-colors ${
                    rule.enabled ? 'bg-emerald-600' : 'bg-zinc-600'
                  }`}
                  title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      rule.enabled ? 'left-3.5' : 'left-0.5'
                    }`}
                  />
                </button>
                <span className="font-medium truncate">{rule.name}</span>
              </div>

              <div className="text-sm text-zinc-400 truncate mb-2">
                <span className="inline-block px-1.5 py-0.5 bg-zinc-700 rounded text-xs mr-2">
                  {rule.matchType}
                </span>
                <code className="text-zinc-300">{rule.urlPattern}</code>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {rule.simulateNetworkError && (
                  <span className="px-2 py-1 bg-rose-900/50 text-rose-300 rounded">
                    Network Error
                  </span>
                )}
                {rule.statusCode && !rule.simulateNetworkError && (
                  <span className="px-2 py-1 bg-red-900/50 text-red-300 rounded">
                    Status: {rule.statusCode}
                  </span>
                )}
                {rule.delayMs && rule.delayMs > 0 && (
                  <span className="px-2 py-1 bg-amber-900/50 text-amber-300 rounded">
                    Delay: {rule.delayMs}ms
                  </span>
                )}
                {rule.requestHeaders && rule.requestHeaders.length > 0 && (
                  <span className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded">
                    Req Headers: {rule.requestHeaders.length}
                  </span>
                )}
                {rule.responseHeaders && rule.responseHeaders.length > 0 && (
                  <span className="px-2 py-1 bg-purple-900/50 text-purple-300 rounded">
                    Res Headers: {rule.responseHeaders.length}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit(rule)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                title="Edit rule"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(rule.id)}
                className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded transition-colors"
                title="Delete rule"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
