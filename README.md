<p align="center">
  <img src="public/icons/icon.svg" alt="DevProxy" width="128" height="128">
</p>

<h1 align="center">DevProxy</h1>

<p align="center">
  A Chrome DevTools extension for simulating network conditions during development.
  <br>
  Test how your application handles errors, latency, and edge cases—without touching your backend.
</p>

---

## What is DevProxy?

DevProxy lets you intercept network requests directly in Chrome DevTools and modify their behavior. Instead of setting up mock servers or modifying backend code, you can instantly simulate:

- **HTTP error responses** (401 Unauthorized, 500 Internal Server Error, etc.)
- **Network latency** (slow connections, timeouts)
- **Custom headers** (test CORS, authentication, caching)
- **Connection failures** (offline behavior, network errors)

All interception happens client-side by monkey-patching `fetch` and `XMLHttpRequest`. Your actual backend remains untouched.

---

## Features

### Status Code Simulation

Override HTTP responses with common error codes:

| Category | Codes |
|----------|-------|
| Client Errors (4xx) | 400, 401, 403, 404, 405, 408, 429 |
| Server Errors (5xx) | 500, 501, 502, 503, 504 |

When a rule matches, DevProxy returns a synthetic response with the configured status code—the request never reaches your server.

### Response Delays

Add artificial latency to test loading states and timeout handling:

| Preset | Delay |
|--------|-------|
| Fast 3G | ~500ms |
| Slow 3G | ~2000ms |
| Very Slow | ~5000ms |
| Timeout Test | ~10000ms |
| Custom | 0-30000ms |

### Header Modification

Modify request and response headers without backend changes:

- **Add** new headers (custom auth tokens, feature flags)
- **Modify** existing headers (override cache-control, content-type)
- **Remove** headers (strip authentication, cookies)

Use cases: Testing CORS configurations, simulating different authentication states, debugging caching behavior.

### Network Error Simulation

Simulate complete connection failures. Fetch requests reject with `TypeError('Failed to fetch')`, mimicking offline behavior or server unavailability.

### URL Pattern Matching

Target specific requests with flexible matching:

| Match Type | Example Pattern | Matches |
|------------|-----------------|---------|
| **Contains** | `/api/users` | Any URL containing that substring |
| **Exact** | `https://api.example.com/users` | Only that exact URL |
| **Regex** | `^https://api\..*\.com/v2/.*$` | URLs matching the pattern |
| **Wildcard** | `https://*/api/*` | Glob-style pattern matching |

### Activity Logging

Track all intercepted requests in real-time:

- Filter logs by URL, rule name, or action type
- Color-coded actions (delayed, status changed, headers modified, network error)
- Clear logs with one click

---

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/Littletonconnor/DevProxy.git
cd DevProxy

# Install dependencies
npm install

# Build the extension
npm run build
```

### Load in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `dist` folder from the project

### Open DevTools

1. Open Chrome DevTools on any page (F12 or Cmd+Option+I)
2. Find the **DevProxy** tab in the DevTools panel
3. Enable the extension using the toggle switch

---

## Usage

### Creating a Rule

1. Click **Add Rule** in the DevProxy panel
2. Configure the rule:
   - **Name**: A descriptive label (e.g., "Simulate auth failure")
   - **URL Pattern**: The requests to match (e.g., `/api/auth`)
   - **Match Type**: How to match URLs (contains, exact, regex, wildcard)
3. Set one or more actions:
   - Select a status code to return
   - Add a delay in milliseconds
   - Modify request/response headers
   - Enable network error simulation
4. Click **Create**

### Example: Testing Error Handling

```
Name: API 500 Error
URL Pattern: /api/
Match Type: Contains
Status Code: 500 Internal Server Error
```

Any request containing `/api/` will now return a 500 error, letting you verify your error handling UI.

### Example: Simulating Slow Networks

```
Name: Slow API Response
URL Pattern: /api/data
Match Type: Contains
Delay: 3000ms
```

All matching requests will take 3 seconds to respond, perfect for testing loading spinners and timeout logic.

### Example: Testing Authentication

```
Name: Missing Auth Token
URL Pattern: /api/protected
Match Type: Contains
Request Headers:
  - Operation: Remove
  - Header: Authorization
```

Removes the Authorization header to test how your app handles unauthenticated requests.

---

## How It Works

DevProxy uses a multi-layer architecture to intercept requests:

```
DevTools Panel (React UI)
        ↓
Background Service Worker (state management, storage)
        ↓
Content Script (bridge between extension and page)
        ↓
Injected Interceptor (monkey-patches fetch/XHR)
```

### Why This Architecture?

Chrome extensions run in isolated contexts. The DevTools panel cannot directly access page JavaScript. To intercept `fetch` and `XMLHttpRequest`, DevProxy injects a script directly into the page context that wraps the native APIs.

### Manifest V3 Compliance

DevProxy is built for Chrome's Manifest V3, which removed the `webRequestBlocking` API for non-enterprise extensions. The `declarativeNetRequest` API can't simulate status codes or delays, so DevProxy uses client-side interception instead.

### Security Features

- **Auto-disable on close**: When you close DevTools, interception automatically stops
- **Explicit opt-in**: The extension starts disabled—you must manually enable it each session
- **No persistent background**: Rules are stored in `chrome.storage`, not in memory

---

## Development

```bash
# Start development mode (watches for changes)
npm run dev

# Build for production
npm run build

# Generate icons from SVG
node scripts/generate-icons.js
```

### Project Structure

```
src/
├── devtools/          # React UI (panel, components, hooks)
├── background/        # Service worker (state, messaging)
├── content/           # Content script (bridge)
├── injected/          # Interceptor (fetch/XHR patching)
└── shared/            # Types, constants, utilities
```

### Tech Stack

- **UI**: React 19, Tailwind CSS 4, shadcn/ui
- **Build**: Vite 7, TypeScript 5
- **Icons**: Lucide React

---

## Limitations

- **XHR response headers**: XMLHttpRequest response headers are read-only. Request headers and delays work, but response header modification only applies to `fetch`.
- **Opaque responses**: Requests with `mode: 'no-cors'` produce opaque responses that cannot be inspected or modified.
- **Service workers**: Requests made by the page's service worker run in a separate context and are not intercepted.
- **Early requests**: Requests that fire before the interceptor script loads may not be caught. DevProxy injects at `document_start` to minimize this window.

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built for developers who need to test the unhappy path.
</p>
