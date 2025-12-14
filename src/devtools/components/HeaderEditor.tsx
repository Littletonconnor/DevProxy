import type { HeaderMod } from '@/shared/types';

interface HeaderEditorProps {
  headers: HeaderMod[];
  onChange: (headers: HeaderMod[]) => void;
  label: string;
}

export function HeaderEditor({ headers, onChange, label }: HeaderEditorProps) {
  const addHeader = () => {
    onChange([...headers, { operation: 'add', name: '', value: '' }]);
  };

  const updateHeader = (index: number, updates: Partial<HeaderMod>) => {
    const newHeaders = headers.map((h, i) =>
      i === index ? { ...h, ...updates } : h
    );
    onChange(newHeaders);
  };

  const removeHeader = (index: number) => {
    onChange(headers.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-300">{label}</label>
        <button
          type="button"
          onClick={addHeader}
          className="text-xs px-2 py-1 text-emerald-400 hover:text-emerald-300 hover:bg-zinc-700 rounded transition-colors"
        >
          + Add Header
        </button>
      </div>

      {headers.length === 0 ? (
        <p className="text-xs text-zinc-500 italic">No headers configured</p>
      ) : (
        <div className="space-y-2">
          {headers.map((header, index) => (
            <div key={index} className="flex items-center gap-2">
              <select
                value={header.operation}
                onChange={(e) => updateHeader(index, { operation: e.target.value as HeaderMod['operation'] })}
                className="bg-zinc-700 border border-zinc-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="add">Add</option>
                <option value="modify">Modify</option>
                <option value="remove">Remove</option>
              </select>

              <input
                type="text"
                value={header.name}
                onChange={(e) => updateHeader(index, { name: e.target.value })}
                placeholder="Header name"
                className="flex-1 bg-zinc-700 border border-zinc-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
              />

              {header.operation !== 'remove' && (
                <input
                  type="text"
                  value={header.value || ''}
                  onChange={(e) => updateHeader(index, { value: e.target.value })}
                  placeholder="Value"
                  className="flex-1 bg-zinc-700 border border-zinc-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                />
              )}

              <button
                type="button"
                onClick={() => removeHeader(index)}
                className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-600 rounded transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
