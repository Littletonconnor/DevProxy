// Common HTTP status codes for simulation
export const STATUS_CODE_PRESETS = [
  { code: 400, label: '400 Bad Request' },
  { code: 401, label: '401 Unauthorized' },
  { code: 403, label: '403 Forbidden' },
  { code: 404, label: '404 Not Found' },
  { code: 405, label: '405 Method Not Allowed' },
  { code: 408, label: '408 Request Timeout' },
  { code: 429, label: '429 Too Many Requests' },
  { code: 500, label: '500 Internal Server Error' },
  { code: 501, label: '501 Not Implemented' },
  { code: 502, label: '502 Bad Gateway' },
  { code: 503, label: '503 Service Unavailable' },
  { code: 504, label: '504 Gateway Timeout' },
] as const;

// Delay presets
export const DELAY_PRESETS = [
  { ms: 0, label: 'None' },
  { ms: 500, label: 'Fast 3G (~500ms)' },
  { ms: 2000, label: 'Slow 3G (~2s)' },
  { ms: 5000, label: 'Very Slow (~5s)' },
  { ms: 10000, label: 'Timeout Test (~10s)' },
] as const;

// Match type options
export const MATCH_TYPES = [
  {
    value: 'contains',
    label: 'Contains',
    description: 'URL includes this text',
  },
  { value: 'exact', label: 'Exact', description: 'URL exactly matches' },
  {
    value: 'wildcard',
    label: 'Wildcard',
    description: 'Use * as wildcard (e.g., */api/*)',
  },
  { value: 'regex', label: 'Regex', description: 'Regular expression' },
] as const;
