import type { HeaderMod } from '@/shared/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Plus, X } from 'lucide-react';

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
        <Label className="text-xs">{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addHeader}
          className="text-xs h-7"
        >
          <Plus className="size-3 mr-1" />
          Add Header
        </Button>
      </div>

      {headers.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          No headers configured
        </p>
      ) : (
        <div className="space-y-2">
          {headers.map((header, index) => (
            <div key={index} className="flex items-center gap-2">
              <Select
                value={header.operation}
                onValueChange={(value) =>
                  updateHeader(index, {
                    operation: value as HeaderMod['operation'],
                  })
                }
              >
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add</SelectItem>
                  <SelectItem value="modify">Modify</SelectItem>
                  <SelectItem value="remove">Remove</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="text"
                value={header.name}
                onChange={(e) => updateHeader(index, { name: e.target.value })}
                placeholder="Header name"
                className="flex-1 h-8 text-xs"
              />

              {header.operation !== 'remove' && (
                <Input
                  type="text"
                  value={header.value || ''}
                  onChange={(e) =>
                    updateHeader(index, { value: e.target.value })
                  }
                  placeholder="Value"
                  className="flex-1 h-8 text-xs"
                />
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeHeader(index)}
                className="hover:text-destructive"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
