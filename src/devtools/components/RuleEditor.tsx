import { useState, useEffect } from 'react';
import type { Rule, HeaderMod } from '@/shared/types';
import {
  STATUS_CODE_PRESETS,
  DELAY_PRESETS,
  MATCH_TYPES,
} from '@/shared/constants';
import { HeaderEditor } from './HeaderEditor';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Separator } from './ui/separator';

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

  useEffect(() => {
    setForm(rule || defaultRule);
  }, [rule]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.urlPattern.trim()) return;
    onSave(form);
  };

  const updateForm = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col p-0 overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
          <DialogHeader className="px-4 py-3 border-b shrink-0">
            <DialogTitle className="text-sm">
              {rule ? 'Edit Rule' : 'New Rule'}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic" className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full justify-start rounded-none bg-muted/50 h-auto p-1 gap-1 shrink-0">
              <TabsTrigger
                value="basic"
                className="rounded-sm data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-1.5 text-xs"
              >
                Basic
              </TabsTrigger>
              <TabsTrigger
                value="headers"
                className="rounded-sm data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-1.5 text-xs"
              >
                Headers
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              <TabsContent value="basic" className="mt-0 space-y-4">
                {/* Rule Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs">
                    Rule Name
                  </Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    placeholder="e.g., Simulate 500 on /api/users"
                    required
                  />
                </div>

                {/* URL Pattern */}
                <div className="space-y-1.5">
                  <Label htmlFor="urlPattern" className="text-xs">
                    URL Pattern
                  </Label>
                  <Input
                    id="urlPattern"
                    value={form.urlPattern}
                    onChange={(e) => updateForm('urlPattern', e.target.value)}
                    placeholder="e.g., /api/users or https://*/api/*"
                    required
                  />
                </div>

                {/* Match Type */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Match Type</Label>
                  <Select
                    value={form.matchType}
                    onValueChange={(value) =>
                      updateForm('matchType', value as Rule['matchType'])
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MATCH_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label} - {type.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Code */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Response Status Code</Label>
                  <Select
                    value={form.statusCode?.toString() || 'none'}
                    onValueChange={(value) =>
                      updateForm(
                        'statusCode',
                        value === 'none' ? undefined : Number(value)
                      )
                    }
                    disabled={form.simulateNetworkError}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="No override" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        No override (use actual response)
                      </SelectItem>
                      {STATUS_CODE_PRESETS.map((preset) => (
                        <SelectItem
                          key={preset.code}
                          value={preset.code.toString()}
                        >
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Network Error Simulation */}
                <div className="flex items-center justify-between p-3 rounded-md border">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="simulateNetworkError"
                      className="text-xs font-medium"
                    >
                      Simulate Network Error
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      Rejects fetch with TypeError (like connection refused)
                    </p>
                  </div>
                  <Switch
                    id="simulateNetworkError"
                    checked={form.simulateNetworkError || false}
                    onCheckedChange={(checked) => {
                      updateForm('simulateNetworkError', checked);
                      if (checked) {
                        updateForm('statusCode', undefined);
                      }
                    }}
                  />
                </div>

                {/* Delay */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Response Delay</Label>
                  <div className="flex gap-2">
                    <Select
                      value={
                        DELAY_PRESETS.find(
                          (p) => p.ms === form.delayMs
                        )?.ms?.toString() ?? 'custom'
                      }
                      onValueChange={(value) => {
                        if (value === 'custom') return;
                        updateForm('delayMs', Number(value) || undefined);
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DELAY_PRESETS.map((preset) => (
                          <SelectItem
                            key={preset.ms}
                            value={preset.ms.toString()}
                          >
                            {preset.label}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Custom...</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={form.delayMs || ''}
                      onChange={(e) =>
                        updateForm(
                          'delayMs',
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                      placeholder="ms"
                      min="0"
                      max="30000"
                      className="w-20"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="headers" className="mt-0 space-y-4">
                <HeaderEditor
                  label="Request Headers"
                  headers={form.requestHeaders || []}
                  onChange={(headers: HeaderMod[]) =>
                    updateForm('requestHeaders', headers)
                  }
                />
                <Separator />
                <HeaderEditor
                  label="Response Headers"
                  headers={form.responseHeaders || []}
                  onChange={(headers: HeaderMod[]) =>
                    updateForm('responseHeaders', headers)
                  }
                />
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="px-4 py-3 border-t">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              {rule ? 'Save Changes' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
