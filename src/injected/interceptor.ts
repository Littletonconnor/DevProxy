// This script runs in the PAGE context (not extension context)
// It monkey-patches fetch and XHR to intercept network requests

import type { Rule } from '@/shared/types';

// Store original implementations IMMEDIATELY before any page code can modify them
const originalFetch = window.fetch.bind(window);
const OriginalXHR = window.XMLHttpRequest;

// State managed by content script messages
let extensionEnabled = true;
let rules: Rule[] = [];

// Listen for rules updates from content script
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.source !== 'devproxy-content') return;

  if (event.data.type === 'RULES_UPDATE') {
    extensionEnabled = event.data.payload.enabled;
    rules = event.data.payload.rules;
    console.log('[devProxy Interceptor] Rules updated:', rules.length, 'rules, enabled:', extensionEnabled);
  }
});

// Notify content script when a request is intercepted
function notifyIntercepted(url: string, rule: Rule) {
  window.postMessage(
    {
      source: 'devproxy-interceptor',
      type: 'REQUEST_INTERCEPTED',
      payload: { url, ruleId: rule.id, ruleName: rule.name },
    },
    '*'
  );
}

// Convert wildcard/glob pattern to regex
function wildcardToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars (except *)
    .replace(/\*/g, '.*'); // Convert * to .*
  return new RegExp(`^${escaped}$`, 'i');
}

function matchesRule(url: string, rule: Rule): boolean {
  if (!rule.enabled) return false;

  const pattern = rule.urlPattern;

  switch (rule.matchType) {
    case 'contains':
      return url.toLowerCase().includes(pattern.toLowerCase());

    case 'exact':
      return url === pattern;

    case 'regex':
      try {
        return new RegExp(pattern, 'i').test(url);
      } catch {
        return false;
      }

    case 'wildcard':
      try {
        return wildcardToRegex(pattern).test(url);
      } catch {
        return false;
      }

    default:
      return false;
  }
}

// Find the first matching rule for a URL
function findMatchingRule(url: string): Rule | undefined {
  if (!extensionEnabled) return undefined;
  return rules.find((rule) => matchesRule(url, rule));
}

// ============================================================
// FETCH INTERCEPTOR
// ============================================================

window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // Complete pass-through when disabled - no logging, no processing
  if (!extensionEnabled) {
    return originalFetch(input, init);
  }

  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const matchingRule = findMatchingRule(url);

  if (!matchingRule) {
    return originalFetch(input, init);
  }

  console.log('[devProxy] MATCHED rule:', matchingRule.name, '| Status:', matchingRule.statusCode);

  notifyIntercepted(url, matchingRule);

  // Apply delay if specified
  if (matchingRule.delayMs) {
    await new Promise((resolve) => setTimeout(resolve, matchingRule.delayMs));
  }

  // If simulating a network error, reject with TypeError (same as real network failure)
  if (matchingRule.simulateNetworkError) {
    console.log('[devProxy] Simulating network error (fetch will reject)');
    throw new TypeError('Failed to fetch');
  }

  // If simulating an error status code, return a fake error response WITHOUT making the real request
  // This makes it behave like a real server error
  if (matchingRule.statusCode && matchingRule.statusCode >= 400) {
    const errorBody = JSON.stringify({
      error: getStatusText(matchingRule.statusCode),
      status: matchingRule.statusCode,
      message: `Simulated by devProxy rule: ${matchingRule.name}`,
    });

    const headers = new Headers({
      'Content-Type': 'application/json',
    });

    // Apply response header modifications if any
    if (matchingRule.responseHeaders?.length) {
      for (const mod of matchingRule.responseHeaders) {
        if (mod.operation === 'remove') {
          headers.delete(mod.name);
        } else if (mod.value !== undefined) {
          headers.set(mod.name, mod.value);
        }
      }
    }

    console.log('[devProxy] Returning simulated error response:', matchingRule.statusCode);

    return new Response(errorBody, {
      status: matchingRule.statusCode,
      statusText: getStatusText(matchingRule.statusCode),
      headers,
    });
  }

  // Apply request header modifications
  if (matchingRule.requestHeaders?.length) {
    init = init || {};
    const headers = new Headers(init.headers);
    for (const mod of matchingRule.requestHeaders) {
      if (mod.operation === 'remove') {
        headers.delete(mod.name);
      } else if (mod.value !== undefined) {
        headers.set(mod.name, mod.value);
      }
    }
    init.headers = headers;
  }

  // Make the actual request (only for non-error status codes or header-only modifications)
  const response = await originalFetch(input, init);

  // If we need to modify response headers only (no error status), create a new Response
  if (matchingRule.responseHeaders?.length) {
    const headers = new Headers(response.headers);

    for (const mod of matchingRule.responseHeaders) {
      if (mod.operation === 'remove') {
        headers.delete(mod.name);
      } else if (mod.value !== undefined) {
        headers.set(mod.name, mod.value);
      }
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return response;
};

// ============================================================
// XHR INTERCEPTOR
// ============================================================

class InterceptedXHR extends OriginalXHR {
  private _url: string = '';
  private _matchingRule: Rule | undefined;

  open(method: string, url: string | URL, async: boolean = true, username?: string | null, password?: string | null): void {
    this._url = typeof url === 'string' ? url : url.href;

    // Only check for matching rules when enabled
    if (extensionEnabled) {
      this._matchingRule = findMatchingRule(this._url);
      if (this._matchingRule) {
        notifyIntercepted(this._url, this._matchingRule);
      }
    }

    super.open(method, url, async, username ?? undefined, password ?? undefined);
  }

  send(body?: Document | XMLHttpRequestBodyInit | null): void {
    if (!this._matchingRule) {
      super.send(body);
      return;
    }

    const rule = this._matchingRule;

    // Apply request header modifications before send
    if (rule.requestHeaders?.length) {
      for (const mod of rule.requestHeaders) {
        if (mod.operation !== 'remove' && mod.value !== undefined) {
          this.setRequestHeader(mod.name, mod.value);
        }
      }
    }

    // Apply delay if specified
    if (rule.delayMs) {
      setTimeout(() => super.send(body), rule.delayMs);
    } else {
      super.send(body);
    }

    // Override status code if specified
    if (rule.statusCode) {
      Object.defineProperty(this, 'status', {
        get: () => rule.statusCode,
      });
      Object.defineProperty(this, 'statusText', {
        get: () => getStatusText(rule.statusCode!),
      });
    }
  }
}

window.XMLHttpRequest = InterceptedXHR as unknown as typeof XMLHttpRequest;

// ============================================================
// HELPERS
// ============================================================

function getStatusText(code: number): string {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    408: 'Request Timeout',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };
  return statusTexts[code] || 'Unknown';
}

console.log('[devProxy] Interceptor loaded');
