/** Rule for intercepting and modifying network requests */
export interface Rule {
  id: string;
  enabled: boolean;
  name: string;
  urlPattern: string;
  matchType: 'contains' | 'exact' | 'regex' | 'wildcard';
  statusCode?: number;
  delayMs?: number;
  requestHeaders?: HeaderMod[];
  responseHeaders?: HeaderMod[];
  /** Simulates network failure (fetch rejects with TypeError) */
  simulateNetworkError?: boolean;
}

/** Header modification operation */
export interface HeaderMod {
  operation: 'add' | 'modify' | 'remove';
  name: string;
  value?: string;
}

/** Activity log entry for intercepted requests */
export interface LogEntry {
  id: string;
  timestamp: number;
  url: string;
  ruleId: string;
  ruleName: string;
  action: 'delayed' | 'status_changed' | 'headers_modified' | 'network_error';
  details?: {
    delayMs?: number;
    statusCode?: number;
    headersModified?: number;
  };
}

/** Message types for extension context communication */
export type Message =
  | { type: 'RULES_UPDATED'; rules: Rule[] }
  | { type: 'GET_RULES'; response?: Rule[] }
  | {
      type: 'REQUEST_INTERCEPTED';
      url: string;
      ruleId: string;
      ruleName: string;
      action: LogEntry['action'];
      details: LogEntry['details'];
    }
  | { type: 'TOGGLE_EXTENSION'; enabled: boolean }
  | { type: 'GET_EXTENSION_STATE'; response?: { enabled: boolean; rules: Rule[] } }
  | { type: 'LOG_ENTRY'; entry: LogEntry }
  | { type: 'GET_LOGS'; response?: LogEntry[] }
  | { type: 'CLEAR_LOGS' };
