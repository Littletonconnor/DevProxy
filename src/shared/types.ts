// Rule definition for network interception
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
  // If true, simulates a network failure (fetch rejects with TypeError)
  simulateNetworkError?: boolean;
}

export interface HeaderMod {
  operation: 'add' | 'modify' | 'remove';
  name: string;
  value?: string;
}

// Message types for communication between extension contexts
export type Message =
  | { type: 'RULES_UPDATED'; rules: Rule[] }
  | { type: 'GET_RULES'; response?: Rule[] }
  | { type: 'REQUEST_INTERCEPTED'; url: string; ruleId: string; ruleName: string }
  | { type: 'TOGGLE_EXTENSION'; enabled: boolean }
  | { type: 'GET_EXTENSION_STATE'; response?: { enabled: boolean; rules: Rule[] } };
