# DevProxy - Chrome Extension Context Document

> **For AI Assistants**: This document is designed for collaborative development. Your role is to guide, explain, and teach—not to generate complete solutions. Ask clarifying questions, explain trade-offs, and help the developer understand _why_ before showing _how_. Break down complex tasks into digestible steps.

---

## Project Overview

**DevProxy** is an open-source Chrome DevTools extension for simulating network conditions during web development. It allows developers to test how their applications handle various HTTP scenarios without modifying backend code.

- **License**: MIT
- **Target**: Chrome Web Store (public release)
- **Manifest Version**: V3

---

## Core Features (MVP Scope)

### 1. Status Code Simulation

Override HTTP response status codes for matching requests.

**Supported codes** (at minimum):

- 4xx: 400, 401, 403, 404, 405, 408, 429
- 5xx: 500, 501, 502, 503, 504

**User should be able to**:

- Select from common presets OR enter custom code
- See the original status code vs simulated code in logs

### 2. Response Delay

Add artificial latency before responses return.

**User should be able to**:

- Set delay in milliseconds (0-30000ms range)
- Use presets: "Slow 3G" (~2000ms), "Fast 3G" (~500ms), "Offline simulation" (infinite/timeout)

### 3. Header Modification

Modify both request and response headers.

**Request headers**:

- Add new headers
- Modify existing headers
- Remove headers

**Response headers**:

- Add new headers (e.g., custom CORS headers)
- Modify existing headers
- Remove headers

### 4. URL Pattern Matching

Target specific network requests using flexible matching.

**Matching strategies**:

- **Contains**: URL includes substring
- **Exact**: Full URL match
- **Regex**: Regular expression matching
- **Wildcard**: Glob-style patterns (e.g., `*/api/*`)

---

## Explicitly Out of Scope (for MVP)

These features are intentionally excluded to keep the project focused:

- ❌ Response body modification
- ❌ GraphQL-specific support
- ❌ Record/replay functionality
- ❌ Import/export configurations
- ❌ Request blocking
- ❌ Per-tab rule isolation
- ❌ HTTP method filtering (GET/POST/etc.)

---

## Technical Architecture

### Manifest V3 Constraints

Chrome's Manifest V3 removed `webRequestBlocking` for non-enterprise extensions. The `declarativeNetRequest` API cannot modify response bodies or simulate status codes directly.

**Solution**: Use XHR/Fetch monkey-patching via injected content scripts.

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                        DevTools Panel                            │
│  React UI for rule management                                    │
└─────────────────┬───────────────────────────────────────────────┘
                  │ chrome.runtime.sendMessage
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Background Service Worker                     │
│  Stores rules in chrome.storage                                  │
│  Broadcasts rule updates to content scripts                      │
│  Manages extension state                                         │
└─────────────────┬───────────────────────────────────────────────┘
                  │ chrome.tabs.sendMessage
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Content Script                              │
│  Injects interceptor.ts into page context                        │
│  Bridges page ↔ extension messaging                              │
└─────────────────┬───────────────────────────────────────────────┘
                  │ window.postMessage
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Injected Script (interceptor.ts)                 │
│  Monkey-patches XMLHttpRequest.prototype                         │
│  Monkey-patches window.fetch                                     │
│  Intercepts requests, applies rules, returns modified response   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Technical Concepts to Understand

Before implementing, make sure you understand these concepts:

1. **Content Script vs Page Context**: Content scripts run in an isolated world and cannot access page JavaScript. To intercept `fetch`/`XHR`, we must inject code into the actual page context.

2. **Monkey-patching**: Replacing native browser APIs (`fetch`, `XMLHttpRequest`) with our own implementations that wrap the originals.

3. **Chrome Extension Messaging**: Three contexts (DevTools panel, background worker, content script) communicate via `chrome.runtime.sendMessage` and `chrome.tabs.sendMessage`.

4. **DevTools Panel Lifecycle**: DevTools extensions only activate when DevTools is open. The panel doesn't persist—state must be stored in `chrome.storage`.

---

## Tech Stack

| Layer             | Technology               | Rationale                                  |
| ----------------- | ------------------------ | ------------------------------------------ |
| DevTools Panel UI | React 18                 | Component-based, good DX                   |
| Build Tool        | Vite                     | Fast builds, good Chrome extension support |
| Styling           | Tailwind CSS             | Utility-first, rapid prototyping           |
| State Management  | React Context or Zustand | Keep it simple                             |
| Storage           | chrome.storage.local     | Persists rules across sessions             |
| Language          | TypeScript               | Type safety for extension APIs             |

---

## Project Structure (Suggested)

```
devProxy/
├── src/
│   ├── devtools/
│   │   ├── panel.html
│   │   ├── panel.tsx
│   │   ├── components/
│   │   │   ├── RuleList.tsx
│   │   │   ├── RuleEditor.tsx
│   │   │   ├── StatusCodePicker.tsx
│   │   │   ├── DelayInput.tsx
│   │   │   ├── HeaderEditor.tsx
│   │   │   └── UrlMatcher.tsx
│   │   └── hooks/
│   │       └── useRules.ts
│   │
│   ├── background/
│   │   └── service-worker.ts
│   │
│   ├── content/
│   │   └── content-script.ts
│   │
│   ├── injected/
│   │   └── interceptor.ts
│   │
│   ├── shared/
│   │   ├── types.ts
│   │   ├── matching.ts
│   │   └── constants.ts
│   │
│   └── devtools.ts
│
├── public/
│   ├── manifest.json
│   ├── devtools.html
│   └── icons/
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

---

## Data Structures

### Rule Interface

```typescript
interface Rule {
  id: string;
  enabled: boolean;
  name: string;

  urlPattern: string;
  matchType: 'contains' | 'exact' | 'regex' | 'wildcard';

  statusCode?: number;
  delayMs?: number;
  requestHeaders?: HeaderMod[];
  responseHeaders?: HeaderMod[];
}

interface HeaderMod {
  operation: 'add' | 'modify' | 'remove';
  name: string;
  value?: string;
}
```

### Message Types

```typescript
type Message =
  | { type: 'RULES_UPDATED'; rules: Rule[] }
  | { type: 'GET_RULES' }
  | { type: 'REQUEST_INTERCEPTED'; url: string; ruleId: string }
  | { type: 'TOGGLE_ENABLED'; enabled: boolean };
```

---

## Implementation Phases

### Phase 1: Project Setup & Basic Structure ✅

- [x] Initialize Vite + React + TypeScript project
- [x] Configure for Chrome extension output
- [x] Create manifest.json with correct permissions
- [x] Set up DevTools panel entry point
- [x] Verify extension loads in Chrome

**Questions to explore**: What permissions does manifest.json need? How does a DevTools extension differ from a regular extension?

### Phase 2: Messaging Infrastructure ✅

- [x] Background service worker skeleton
- [x] Content script that injects into pages
- [x] Message passing between all three contexts
- [x] Basic chrome.storage read/write

**Questions to explore**: Why can't the DevTools panel talk directly to content scripts? What's the "isolated world" problem?

### Phase 3: Request Interception (Core Logic) ✅

- [x] XHR monkey-patch implementation
- [x] Fetch monkey-patch implementation
- [x] URL matching logic
- [x] Apply status code override
- [x] Apply delay
- [x] Simulate network errors (TypeError throw)

**Questions to explore**: How do you preserve the original XHR/fetch behavior while intercepting? What happens if the page loads before your script runs?

### Phase 4: DevTools Panel UI ✅

- [x] Rule list display
- [x] Add/edit/delete rules
- [x] Enable/disable toggles (global + per-rule)
- [x] Auto-disable on DevTools close (security feature)
- [ ] Real-time status (what's being intercepted) — moved to Phase 8

### Phase 5: Header Modification ✅

- [x] Request header modification in interceptor
- [x] Response header modification in interceptor
- [x] Header editor UI component

### Phase 6: UI Polish & DevTools Integration

- [x] **Rename to DevProxy** - Update all references from `devProxy` to `DevProxy` (branding consistency)
- [x] **Install shadcn/ui** - Use shadcn components for consistent, professional UI:
  - Buttons, inputs, selects, switches
  - Dialog/modal for rule editor
  - Tabs component
  - Data table for rules and logs
- [x] **Chrome DevTools-style UI** - Make the panel look native to Chrome DevTools:
  - Uses system color scheme preference (auto light/dark)
  - shadcn components with Tailwind theme variables
  - Clean, compact typography matching DevTools style
- [x] **Extension icons** - Create proper icon set:
  - 16x16, 32x32, 48x48, 128x128 PNG icons
  - Network-themed design: bidirectional arrows with central proxy node

### Phase 7: Logging & Observability

- [x] **Remove console.log statements** - Clean up all debug logging from:
  - `interceptor.ts`
  - `content-script.ts`
  - `service-worker.ts`
- [x] **In-panel Activity Log** - Add a dedicated log view in the DevProxy panel:
  - Timestamp, URL, matched rule, action taken
  - Filter by URL/rule and action type
  - Clear log button
  - Color-coded by action type (delayed, status changed, headers modified, network error)
- [x] **Request counter badge** - Show count of intercepted requests in panel header and Activity tab

### Phase 8: Polish & Chrome Web Store Release

- [ ] **Error handling** - Graceful failures throughout
- [ ] **Edge cases** - iframes, web workers, service workers
- [ ] **README documentation** - Usage instructions, screenshots
- [ ] **Store listing assets**:
  - Promotional images (440x280, 920x680, 1400x560)
  - Screenshots (1280x800)
  - Detailed description with features
- [ ] **Privacy policy** - Required for Web Store
- [ ] **Landing page** - Simple site explaining the extension
- [ ] **Analytics** - Optional anonymous usage tracking (with consent)

---

## Key Files to Research

Before writing code, read and understand:

1. **Chrome Extension DevTools API**: https://developer.chrome.com/docs/extensions/reference/api/devtools
2. **Manifest V3 Overview**: https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3
3. **Content Scripts**: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
4. **XHR Interception Pattern**: Search for "XMLHttpRequest.prototype monkey patch"
5. **Fetch Interception Pattern**: Search for "override window.fetch"

---

## Common Pitfalls

1. **Timing Issues**: If the page's JavaScript runs before your interceptor is injected, you'll miss early requests. Use `"run_at": "document_start"` in manifest.

2. **Isolated Worlds**: Content scripts can't access `window.fetch` directly. You must inject a `<script>` tag into the page.

3. **Service Worker Lifecycle**: Background service workers can be terminated by Chrome. Don't store state in memory—use `chrome.storage`.

4. **DevTools Panel State**: The panel is destroyed when DevTools closes. Reload state from storage when it opens.

5. **CORS & Security**: Some requests (e.g., `mode: 'no-cors'`) have opaque responses you can't read. Be prepared to handle these gracefully.

---

## AI Collaboration Guidelines

When working with an AI assistant on this project:

### Do Ask For:

- Explanations of concepts you don't understand
- Trade-off discussions for architectural decisions
- Code review and suggestions for improvement
- Help debugging specific issues
- Breaking down complex tasks into smaller steps

### Don't Ask For:

- "Write the entire extension for me"
- Complete implementations without understanding them
- Skipping the learning process

### Good Prompt Examples:

- "Explain how XHR monkey-patching works before I implement it"
- "What are the pros and cons of using Zustand vs React Context here?"
- "I'm getting this error when injecting my script—can you help me debug?"
- "Review my URL matching function and suggest improvements"

### Less Ideal Prompt Examples:

- "Generate the complete interceptor.ts file"
- "Write all the React components for me"
- "Just make it work"

---

## Resources

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [Vite Chrome Extension Plugin](https://github.com/niceplugin/crx)
- [React DevTools Extension Example](https://github.com/niceplugin/crx-example)
- [ajax-hook library](https://github.com/niceplugin/ajax-hook) (reference for XHR interception)

---

## License

MIT License - See LICENSE file for details.

---

_Last updated: December 2024_
