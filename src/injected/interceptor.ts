/**
 * Network request interceptor - runs in the page context.
 * Monkey-patches fetch and XHR to intercept and modify network requests.
 */
import type { Rule } from '@/shared/types';

const originalFetch = window.fetch.bind(window);
const OriginalXHR = window.XMLHttpRequest;

let extensionEnabled = true;
let rules: Rule[] = [];

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.source !== 'devproxy-content') return;

  if (event.data.type === 'RULES_UPDATE') {
    extensionEnabled = event.data.payload.enabled;
    rules = event.data.payload.rules;
  }
});

/** Determines the primary action type for logging */
function getActionFromRule(rule: Rule) {
  if (rule.simulateNetworkError) {
    return { action: 'network_error' as const, details: {} };
  }
  if (rule.statusCode && rule.statusCode >= 400) {
    return { action: 'status_changed' as const, details: { statusCode: rule.statusCode } };
  }
  if (rule.delayMs && rule.delayMs > 0) {
    return { action: 'delayed' as const, details: { delayMs: rule.delayMs } };
  }
  const headersModified = (rule.requestHeaders?.length || 0) + (rule.responseHeaders?.length || 0);
  return { action: 'headers_modified' as const, details: { headersModified } };
}

/** Notifies content script of intercepted request */
function notifyIntercepted(url: string, rule: Rule) {
  const { action, details } = getActionFromRule(rule);
  window.postMessage(
    {
      source: 'devproxy-interceptor',
      type: 'REQUEST_INTERCEPTED',
      payload: { url, ruleId: rule.id, ruleName: rule.name, action, details },
    },
    '*'
  );
}

function wildcardToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
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

function findMatchingRule(url: string): Rule | undefined {
  if (!extensionEnabled) return undefined;
  return rules.find((rule) => matchesRule(url, rule));
}

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

/** Applies header modifications to a Headers object */
function applyHeaderMods(headers: Headers, mods: Rule['requestHeaders']) {
  if (!mods?.length) return;
  for (const mod of mods) {
    if (mod.operation === 'remove') {
      headers.delete(mod.name);
    } else if (mod.value !== undefined) {
      headers.set(mod.name, mod.value);
    }
  }
}

// Fetch interceptor
window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (!extensionEnabled) return originalFetch(input, init);

  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const matchingRule = findMatchingRule(url);

  if (!matchingRule) return originalFetch(input, init);

  notifyIntercepted(url, matchingRule);

  if (matchingRule.delayMs) {
    await new Promise((resolve) => setTimeout(resolve, matchingRule.delayMs));
  }

  if (matchingRule.simulateNetworkError) {
    throw new TypeError('Failed to fetch');
  }

  if (matchingRule.statusCode && matchingRule.statusCode >= 400) {
    const errorBody = JSON.stringify({
      error: getStatusText(matchingRule.statusCode),
      status: matchingRule.statusCode,
      message: `Simulated by DevProxy rule: ${matchingRule.name}`,
    });

    const headers = new Headers({ 'Content-Type': 'application/json' });
    applyHeaderMods(headers, matchingRule.responseHeaders);

    return new Response(errorBody, {
      status: matchingRule.statusCode,
      statusText: getStatusText(matchingRule.statusCode),
      headers,
    });
  }

  if (matchingRule.requestHeaders?.length) {
    init = init || {};
    const headers = new Headers(init.headers);
    applyHeaderMods(headers, matchingRule.requestHeaders);
    init.headers = headers;
  }

  const response = await originalFetch(input, init);

  if (matchingRule.responseHeaders?.length) {
    const headers = new Headers(response.headers);
    applyHeaderMods(headers, matchingRule.responseHeaders);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return response;
};

// XHR interceptor
class InterceptedXHR extends OriginalXHR {
  private _url = '';
  private _matchingRule: Rule | undefined;

  open(method: string, url: string | URL, async = true, username?: string | null, password?: string | null): void {
    this._url = typeof url === 'string' ? url : url.href;

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

    if (rule.requestHeaders?.length) {
      for (const mod of rule.requestHeaders) {
        if (mod.operation !== 'remove' && mod.value !== undefined) {
          this.setRequestHeader(mod.name, mod.value);
        }
      }
    }

    if (rule.delayMs) {
      setTimeout(() => super.send(body), rule.delayMs);
    } else {
      super.send(body);
    }

    if (rule.statusCode) {
      Object.defineProperty(this, 'status', { get: () => rule.statusCode });
      Object.defineProperty(this, 'statusText', { get: () => getStatusText(rule.statusCode!) });
    }
  }
}

window.XMLHttpRequest = InterceptedXHR as unknown as typeof XMLHttpRequest;
