import { useState } from 'react';
import type { Rule } from '@/shared/types';
import { useRules } from './hooks/useRules';
import { useLogs } from './hooks/useLogs';
import { RuleList } from './components/RuleList';
import { RuleEditor } from './components/RuleEditor';
import { ActivityLog } from './components/ActivityLog';
import { Button } from './components/ui/button';
import { Switch } from './components/ui/switch';
import { Alert, AlertDescription } from './components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select';
import { Plus, AlertTriangle } from 'lucide-react';

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

  const { logs, clearLogs } = useLogs();

  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [view, setView] = useState<'rules' | 'activity'>('rules');

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
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b border-border px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold">DevProxy</h1>
            <span className="text-xs text-muted-foreground">
              {rules.length} rule{rules.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setIsCreating(true)}>
              <Plus className="size-4" />
              Add Rule
            </Button>

            <Select
              value={view}
              onValueChange={(v) => setView(v as 'rules' | 'activity')}
            >
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rules">Rules</SelectItem>
                <SelectItem value="activity">
                  Activity {logs.length > 0 && `(${logs.length})`}
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Switch
                checked={enabled}
                onCheckedChange={toggleEnabled}
                aria-label="Toggle extension"
              />
              <span
                className={`text-xs ${enabled ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {enabled ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-3">
        {!enabled && (
          <Alert variant="destructive" className="mb-3">
            <AlertTriangle className="size-4" />
            <AlertDescription>
              DevProxy is currently disabled. Rules will not be applied.
            </AlertDescription>
          </Alert>
        )}

        {view === 'rules' ? (
          <RuleList
            rules={rules}
            onEdit={setEditingRule}
            onToggle={toggleRule}
            onDelete={handleDelete}
          />
        ) : (
          <ActivityLog logs={logs} onClear={clearLogs} />
        )}
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
