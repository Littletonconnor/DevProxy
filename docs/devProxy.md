# DevProxy Technical Documentation

A comprehensive guide to how DevProxy intercepts and modifies network requests, and the Chrome extension architecture that makes it possible.

## Table of Contents

1. [Chrome Extension Fundamentals](#chrome-extension-fundamentals)
2. [DevProxy Architecture](#devproxy-architecture)
3. [Request Interception Deep Dive](#request-interception-deep-dive)
4. [Message Passing System](#message-passing-system)
5. [Data Flow](#data-flow)
6. [Security Considerations](#security-considerations)

---

## Chrome Extension Fundamentals

### The Three Execution Contexts

Chrome extensions operate across multiple isolated execution contexts, each with different capabilities and restrictions:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CHROME BROWSER                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    SERVICE WORKER                             │   │
│  │  • Runs in background (no DOM access)                        │   │
│  │  • Manages extension state                                    │   │
│  │  • Has access to chrome.* APIs                               │   │
│  │  • Lifecycle: starts on-demand, can be terminated            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              │ chrome.runtime messaging              │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    CONTENT SCRIPT                             │   │
│  │  • Injected into web pages                                   │   │
│  │  • Shares DOM with page, but isolated JavaScript context     │   │
│  │  • Can access chrome.runtime API (limited)                   │   │
│  │  • Bridge between extension and page                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              │ window.postMessage                    │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    PAGE CONTEXT                               │   │
│  │  • The actual web page's JavaScript                          │   │
│  │  • No access to chrome.* APIs                                │   │
│  │  • Where fetch/XHR actually execute                          │   │
│  │  • Where we must intercept requests                          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Why Three Contexts Matter

**The Problem**: We want to intercept `fetch()` and `XMLHttpRequest` calls. But these APIs belong to the page context—not the extension.

**The Solution**: We inject a script directly into the page context that monkey-patches these APIs. But that script can't talk to the extension directly, so we need the content script as a bridge.

### Manifest V3

DevProxy uses Manifest V3, Chrome's latest extension platform:

```json
{
  "manifest_version": 3,
  "background": {
    "service_worker": "service-worker.js"
  },
  "content_scripts": [
    {
      "js": ["content-script.js"],
      "matches": ["<all_urls>"],
      "run_at": "document_start"
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["interceptor.js"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

Key Manifest V3 changes from V2:

- **Service Workers** replace persistent background pages (more memory efficient, but can be terminated)
- **web_accessible_resources** require explicit declaration
- **Host permissions** are separate from the manifest

---

## DevProxy Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DevProxy Extension                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────┐        ┌─────────────────────────────────┐   │
│   │   DevTools UI   │        │        Service Worker           │   │
│   │   (React App)   │◄──────►│                                 │   │
│   │                 │        │  • Stores rules in chrome.storage│   │
│   │  • Rule Editor  │        │  • Maintains activity logs      │   │
│   │  • Activity Log │        │  • Broadcasts state to all tabs │   │
│   │  • Toggle State │        │                                 │   │
│   └─────────────────┘        └─────────────────────────────────┘   │
│                                          │                          │
│                                          │ Broadcasts to all tabs   │
│                                          ▼                          │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    Per-Tab Components                        │   │
│   │  ┌─────────────────┐      ┌─────────────────────────────┐   │   │
│   │  │  Content Script │      │      Interceptor            │   │   │
│   │  │                 │◄────►│   (Page Context)            │   │   │
│   │  │  • Relays rules │      │                             │   │   │
│   │  │  • Reports logs │      │  • Patches fetch/XHR        │   │   │
│   │  │                 │      │  • Applies rule logic       │   │   │
│   │  └─────────────────┘      │  • Reports interceptions    │   │   │
│   │                           └─────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### File Structure

```
src/
├── background/
│   └── service-worker.ts    # Extension state, storage, broadcasts
├── content/
│   └── content-script.ts    # Bridge between extension and page
├── injected/
│   └── interceptor.ts       # Monkey-patches fetch/XHR (runs in page)
├── devtools/
│   ├── App.tsx              # Main UI application
│   ├── hooks/
│   │   ├── useRules.ts      # Rule CRUD operations
│   │   └── useLogs.ts       # Activity log polling
│   └── components/          # UI components
└── shared/
    └── types.ts             # Shared TypeScript interfaces
```

---

## Request Interception Deep Dive

### The Injection Chain

When a page loads, DevProxy establishes interception through this sequence:

```
┌────────────────────────────────────────────────────────────────────┐
│                      PAGE LOAD SEQUENCE                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Browser starts loading page                                     │
│     │                                                               │
│     ▼                                                               │
│  2. Content script injected (run_at: "document_start")             │
│     │  • Before any page JavaScript runs                           │
│     │  • Requests current state from service worker                │
│     │                                                               │
│     ▼                                                               │
│  3. Content script injects interceptor.js into page                │
│     │  const script = document.createElement('script');            │
│     │  script.src = chrome.runtime.getURL('interceptor.js');       │
│     │  document.head.appendChild(script);                          │
│     │                                                               │
│     ▼                                                               │
│  4. Interceptor patches window.fetch and XMLHttpRequest            │
│     │  • Saves original references                                 │
│     │  • Replaces with intercepting versions                       │
│     │                                                               │
│     ▼                                                               │
│  5. Content script sends rules to interceptor via postMessage      │
│     │                                                               │
│     ▼                                                               │
│  6. Page JavaScript runs (with patched APIs)                       │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Monkey-Patching fetch()

The interceptor replaces the global `fetch` function:

```typescript
// Save original
const originalFetch = window.fetch.bind(window);

// Replace with interceptor
window.fetch = async function (input, init) {
  const url = extractUrl(input);
  const matchingRule = findMatchingRule(url);

  if (!matchingRule) {
    return originalFetch(input, init); // Pass through unchanged
  }

  // Apply rule modifications...
  if (matchingRule.delayMs) {
    await sleep(matchingRule.delayMs);
  }

  if (matchingRule.simulateNetworkError) {
    throw new TypeError('Failed to fetch');
  }

  if (matchingRule.statusCode >= 400) {
    return new Response(errorBody, { status: matchingRule.statusCode });
  }

  // Modify headers and proceed
  return originalFetch(input, modifiedInit);
};
```

### Monkey-Patching XMLHttpRequest

XHR interception extends the class:

```typescript
const OriginalXHR = window.XMLHttpRequest;

class InterceptedXHR extends OriginalXHR {
  private _matchingRule: Rule | undefined;

  open(method, url, async, user, pass) {
    this._matchingRule = findMatchingRule(url);
    super.open(method, url, async, user, pass);
  }

  send(body) {
    if (!this._matchingRule) {
      super.send(body);
      return;
    }

    // Apply delays, modify headers, override status...
    if (rule.delayMs) {
      setTimeout(() => super.send(body), rule.delayMs);
    } else {
      super.send(body);
    }
  }
}

window.XMLHttpRequest = InterceptedXHR;
```

### Why This Approach?

**Alternative approaches and why they don't work:**

| Approach                       | Problem                                                                          |
| ------------------------------ | -------------------------------------------------------------------------------- |
| `chrome.webRequest` API        | Can block/redirect requests but cannot modify response bodies or simulate delays |
| `chrome.declarativeNetRequest` | Static rules only, no dynamic JavaScript logic                                   |
| Service Worker `fetch` handler | Only works for extension's own requests, not page requests                       |
| Content script fetch override  | Content scripts have isolated JS context—page's fetch is untouched               |

**Monkey-patching in page context** is the only way to:

- Add arbitrary delays
- Simulate network errors (TypeError)
- Return completely custom responses
- Apply complex matching logic

---

## Message Passing System

### Communication Channels

DevProxy uses two distinct messaging systems:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     MESSAGE PASSING ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  CHANNEL 1: chrome.runtime.sendMessage                              │
│  ════════════════════════════════════════                           │
│  Used between: DevTools ↔ Service Worker ↔ Content Scripts          │
│                                                                      │
│  ┌──────────┐    sendMessage     ┌────────────────┐                 │
│  │ DevTools │ ─────────────────► │ Service Worker │                 │
│  │   UI     │ ◄───────────────── │                │                 │
│  └──────────┘    sendResponse    └────────────────┘                 │
│                                          │                          │
│                                          │ tabs.sendMessage         │
│                                          ▼                          │
│                                  ┌────────────────┐                 │
│                                  │ Content Script │                 │
│                                  └────────────────┘                 │
│                                                                      │
│  CHANNEL 2: window.postMessage                                      │
│  ════════════════════════════════════════                           │
│  Used between: Content Script ↔ Interceptor (same tab)             │
│                                                                      │
│  ┌────────────────┐  postMessage  ┌─────────────┐                   │
│  │ Content Script │ ────────────► │ Interceptor │                   │
│  │                │ ◄──────────── │ (page ctx)  │                   │
│  └────────────────┘  postMessage  └─────────────┘                   │
│                                                                      │
│  Messages include { source: 'devproxy-*' } for identification       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Message Types

```typescript
type Message =
  // State management
  | { type: 'GET_EXTENSION_STATE' }
  | { type: 'TOGGLE_EXTENSION'; enabled: boolean }

  // Rule management
  | { type: 'RULES_UPDATED'; rules: Rule[] }
  | { type: 'GET_RULES' }

  // Activity logging
  | { type: 'REQUEST_INTERCEPTED'; url; ruleId; ruleName; action; details }
  | { type: 'GET_LOGS' }
  | { type: 'CLEAR_LOGS' };
```

### Broadcast Pattern

When rules change, the service worker broadcasts to ALL tabs:

```typescript
function broadcastToTabs(message: Message) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Tab might not have content script (e.g., chrome:// pages)
        });
      }
    });
  });
}
```

This ensures every tab's interceptor receives updated rules simultaneously.

---

## Data Flow

### Complete Request Interception Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    REQUEST INTERCEPTION FLOW                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Page JavaScript                                                     │
│       │                                                              │
│       │  fetch('/api/users')                                        │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    INTERCEPTOR                               │    │
│  │                                                              │    │
│  │  1. Extract URL from request                                 │    │
│  │  2. Check if extension enabled                               │    │
│  │  3. Find matching rule (first match wins)                    │    │
│  │     └─► No match? → originalFetch(request)                   │    │
│  │  4. Notify content script of interception                    │    │
│  │  5. Apply delay (if configured)                              │    │
│  │  6. Check for network error simulation                       │    │
│  │     └─► throw new TypeError('Failed to fetch')               │    │
│  │  7. Check for status code override                           │    │
│  │     └─► return new Response(errorBody, { status })           │    │
│  │  8. Modify request headers (if configured)                   │    │
│  │  9. Call originalFetch with modifications                    │    │
│  │  10. Modify response headers (if configured)                 │    │
│  │  11. Return response to page                                 │    │
│  │                                                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│       │                                                              │
│       │  postMessage({ type: 'REQUEST_INTERCEPTED', ... })          │
│       ▼                                                              │
│  ┌─────────────────┐                                                │
│  │  Content Script │                                                │
│  └────────┬────────┘                                                │
│           │                                                          │
│           │  chrome.runtime.sendMessage                              │
│           ▼                                                          │
│  ┌─────────────────┐                                                │
│  │  Service Worker │  → Stores in logs array                        │
│  └────────┬────────┘                                                │
│           │                                                          │
│           │  Polled every 1 second                                  │
│           ▼                                                          │
│  ┌─────────────────┐                                                │
│  │   DevTools UI   │  → Displays in Activity Log                    │
│  └─────────────────┘                                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Rule Update Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                       RULE UPDATE FLOW                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  User edits rule in DevTools                                        │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────┐                                                │
│  │   useRules()    │                                                │
│  │   React Hook    │                                                │
│  └────────┬────────┘                                                │
│           │                                                          │
│           │  chrome.runtime.sendMessage({ type: 'RULES_UPDATED' })  │
│           ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    SERVICE WORKER                            │    │
│  │                                                              │    │
│  │  1. Update in-memory rules array                             │    │
│  │  2. Persist to chrome.storage.local                          │    │
│  │  3. Broadcast to all tabs                                    │    │
│  │                                                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│           │                                                          │
│           │  chrome.tabs.sendMessage (to each tab)                  │
│           ▼                                                          │
│  ┌─────────────────┐     ┌─────────────────┐                        │
│  │ Content Script  │     │ Content Script  │    (multiple tabs)     │
│  │    (Tab 1)      │     │    (Tab 2)      │                        │
│  └────────┬────────┘     └────────┬────────┘                        │
│           │                       │                                  │
│           │  window.postMessage   │                                  │
│           ▼                       ▼                                  │
│  ┌─────────────────┐     ┌─────────────────┐                        │
│  │  Interceptor    │     │  Interceptor    │                        │
│  │  updates rules  │     │  updates rules  │                        │
│  └─────────────────┘     └─────────────────┘                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Security Considerations

### Content Security Policy (CSP)

Some websites have strict CSP headers that block inline scripts. DevProxy handles this by:

1. **Loading from extension URL**: The interceptor is loaded via `chrome.runtime.getURL()`, which is allowed by CSP
2. **web_accessible_resources**: The manifest explicitly exposes `interceptor.js` to web pages

### Origin Isolation

The interceptor uses source identifiers to prevent message spoofing:

```typescript
// Content script only accepts messages from interceptor
if (event.data?.source !== 'devproxy-interceptor') return;

// Interceptor only accepts messages from content script
if (event.data?.source !== 'devproxy-content') return;
```

### Extension Lifecycle

DevProxy disables itself when the DevTools panel closes:

```typescript
// In useRules.ts
useEffect(() => {
  const handleUnload = () => {
    chrome.runtime.sendMessage({ type: 'TOGGLE_EXTENSION', enabled: false });
  };
  window.addEventListener('beforeunload', handleUnload);
  return () => window.removeEventListener('beforeunload', handleUnload);
}, []);
```

This prevents rules from affecting pages when not actively debugging.

### Storage Security

Rules are stored in `chrome.storage.local`, which is:

- Isolated to the extension
- Not accessible by web pages
- Persisted across browser sessions
- Limited to ~5MB (more than enough for rules)

---

## Appendix: Rule Matching

Rules are matched in order (first match wins):

| Match Type | Description         | Example Pattern                    | Matches                             |
| ---------- | ------------------- | ---------------------------------- | ----------------------------------- |
| `contains` | URL includes string | `/api/users`                       | `https://example.com/api/users/123` |
| `exact`    | URL equals exactly  | `https://api.example.com/v1/users` | Only that exact URL                 |
| `wildcard` | Glob-style matching | `https://*/api/*`                  | `https://foo.com/api/bar`           |
| `regex`    | Regular expression  | `api/users/\d+`                    | `api/users/123`                     |

---

## Summary

DevProxy achieves network request interception through a carefully orchestrated system:

1. **Service Worker** maintains state and coordinates all components
2. **Content Script** bridges the extension and page contexts
3. **Interceptor** monkey-patches `fetch`/`XHR` in the page context
4. **Message passing** keeps all components synchronized

This architecture is necessary because Chrome's security model isolates extension code from page code—but network requests originate from pages, requiring us to inject code into that context.
