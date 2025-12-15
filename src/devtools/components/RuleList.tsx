import type { Rule } from '@/shared/types';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Pencil, Trash2, Radio } from 'lucide-react';

interface RuleListProps {
  rules: Rule[];
  onEdit: (rule: Rule) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function RuleList({ rules, onEdit, onToggle, onDelete }: RuleListProps) {
  if (rules.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Radio className="size-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm font-medium mb-1">No rules configured</p>
        <p className="text-xs">
          Add a rule to start intercepting network requests
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {rules.map((rule) => (
        <Card
          key={rule.id}
          className={`p-3 transition-opacity ${!rule.enabled ? 'opacity-50' : ''}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={() => onToggle(rule.id)}
                  aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
                />
                <span className="text-sm font-medium truncate">
                  {rule.name}
                </span>
              </div>

              <div className="text-xs text-muted-foreground truncate mb-2">
                <Badge
                  variant="secondary"
                  className="mr-2 text-[10px] px-1.5 py-0"
                >
                  {rule.matchType}
                </Badge>
                <code className="text-foreground/80">{rule.urlPattern}</code>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {rule.simulateNetworkError && (
                  <Badge
                    variant="destructive"
                    className="text-[10px] px-1.5 py-0"
                  >
                    Network Error
                  </Badge>
                )}
                {rule.statusCode && !rule.simulateNetworkError && (
                  <Badge
                    variant="destructive"
                    className="text-[10px] px-1.5 py-0"
                  >
                    Status: {rule.statusCode}
                  </Badge>
                )}
                {rule.delayMs && rule.delayMs > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 text-amber-500 border-amber-500/50"
                  >
                    Delay: {rule.delayMs}ms
                  </Badge>
                )}
                {rule.requestHeaders && rule.requestHeaders.length > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 text-blue-500 border-blue-500/50"
                  >
                    Req Headers: {rule.requestHeaders.length}
                  </Badge>
                )}
                {rule.responseHeaders && rule.responseHeaders.length > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 text-purple-500 border-purple-500/50"
                  >
                    Res Headers: {rule.responseHeaders.length}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onEdit(rule)}
                title="Edit rule"
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onDelete(rule.id)}
                title="Delete rule"
                className="hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </ul>
  );
}
