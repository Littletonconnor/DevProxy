import { useState, useMemo } from 'react';
import type { LogEntry } from '@/shared/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Trash2, Clock, Zap, AlertTriangle, FileEdit } from 'lucide-react';

interface ActivityLogProps {
  logs: LogEntry[];
  onClear: () => void;
}

const ACTION_CONFIG: Record<
  LogEntry['action'],
  { label: string; color: string; icon: React.ReactNode }
> = {
  delayed: {
    label: 'Delayed',
    color: 'text-amber-500 border-amber-500/50',
    icon: <Clock className="size-3" />,
  },
  status_changed: {
    label: 'Status',
    color: 'text-red-500 border-red-500/50',
    icon: <AlertTriangle className="size-3" />,
  },
  headers_modified: {
    label: 'Headers',
    color: 'text-blue-500 border-blue-500/50',
    icon: <FileEdit className="size-3" />,
  },
  network_error: {
    label: 'Error',
    color: 'text-red-600 border-red-600/50',
    icon: <Zap className="size-3" />,
  },
};

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function truncateUrl(url: string, maxLength = 60): string {
  if (url.length <= maxLength) return url;
  const start = url.slice(0, maxLength - 20);
  const end = url.slice(-17);
  return `${start}...${end}`;
}

export function ActivityLog({ logs, onClear }: ActivityLogProps) {
  const [filter, setFilter] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesText =
        !filter ||
        log.url.toLowerCase().includes(filter.toLowerCase()) ||
        log.ruleName.toLowerCase().includes(filter.toLowerCase());
      const matchesAction =
        actionFilter === 'all' || log.action === actionFilter;
      return matchesText && matchesAction;
    });
  }, [logs, filter, actionFilter]);

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="size-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No intercepted requests yet</p>
        <p className="text-xs mt-1">
          Requests matching your rules will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Filter by URL or rule..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 h-8 text-xs"
        />
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="delayed">Delayed</SelectItem>
            <SelectItem value="status_changed">Status changed</SelectItem>
            <SelectItem value="headers_modified">Headers modified</SelectItem>
            <SelectItem value="network_error">Network error</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-8 text-xs"
        >
          <Trash2 className="size-3 mr-1" />
          Clear
        </Button>
      </div>

      <div className="border rounded-md overflow-hidden">
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Time</th>
                <th className="text-left px-3 py-2 font-medium">URL</th>
                <th className="text-left px-3 py-2 font-medium">Rule</th>
                <th className="text-left px-3 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredLogs.map((log) => {
                const config = ACTION_CONFIG[log.action];
                return (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {formatTime(log.timestamp)}
                    </td>
                    <td className="px-3 py-2 font-mono" title={log.url}>
                      {truncateUrl(log.url)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {log.ruleName}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${config.color}`}
                      >
                        <span className="mr-1">{config.icon}</span>
                        {config.label}
                        {log.details?.delayMs && ` ${log.details.delayMs}ms`}
                        {log.details?.statusCode &&
                          ` ${log.details.statusCode}`}
                        {log.details?.headersModified &&
                          ` (${log.details.headersModified})`}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-right">
        Showing {filteredLogs.length} of {logs.length} entries
      </p>
    </div>
  );
}
