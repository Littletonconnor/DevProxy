import type { Rule, Message } from '@/shared/types';

// Content script: bridges the extension world and the page context

let currentRules: Rule[] = [];
let extensionEnabled = false;

// Inject the interceptor script into the page context
function injectInterceptor() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('interceptor.js');
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
  console.log('[devProxy] Interceptor injected');
}

// Send rules to the page context via window.postMessage
function sendRulesToPage() {
  window.postMessage(
    {
      source: 'devproxy-content',
      type: 'RULES_UPDATE',
      payload: {
        enabled: extensionEnabled,
        rules: currentRules,
      },
    },
    '*'
  );
}

// Listen for messages from the background service worker
chrome.runtime.onMessage.addListener((message: Message) => {
  console.log('[devProxy Content] Received:', message.type);

  switch (message.type) {
    case 'RULES_UPDATED':
      currentRules = message.rules;
      sendRulesToPage();
      break;

    case 'TOGGLE_EXTENSION':
      extensionEnabled = message.enabled;
      sendRulesToPage();
      break;
  }
});

// Listen for messages from the page context (interceptor)
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.source !== 'devproxy-interceptor') return;

  // Forward intercepted request info to background
  if (event.data.type === 'REQUEST_INTERCEPTED') {
    chrome.runtime.sendMessage({
      type: 'REQUEST_INTERCEPTED',
      url: event.data.payload.url,
      ruleId: event.data.payload.ruleId,
      ruleName: event.data.payload.ruleName,
    });
  }
});

// Initialize - always inject interceptor, it will pass through when disabled
(async function init() {
  // Get initial rules from background
  const response = await chrome.runtime.sendMessage({ type: 'GET_EXTENSION_STATE' });
  if (response) {
    extensionEnabled = response.enabled ?? false;
    currentRules = response.rules ?? [];
  }

  // Always inject interceptor on page load
  injectInterceptor();

  // Send initial rules after interceptor loads
  setTimeout(sendRulesToPage, 50);
})();
