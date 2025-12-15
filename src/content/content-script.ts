/**
 * Content script - bridges extension and page contexts.
 * Injects the interceptor and relays messages between them.
 */
import type { Rule, Message } from '@/shared/types';

let currentRules: Rule[] = [];
let extensionEnabled = false;

function injectInterceptor() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('interceptor.js');
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
}

function sendRulesToPage() {
  window.postMessage(
    {
      source: 'devproxy-content',
      type: 'RULES_UPDATE',
      payload: { enabled: extensionEnabled, rules: currentRules },
    },
    '*'
  );
}

chrome.runtime.onMessage.addListener((message: Message) => {
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

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.source !== 'devproxy-interceptor') return;

  if (event.data.type === 'REQUEST_INTERCEPTED') {
    chrome.runtime.sendMessage({
      type: 'REQUEST_INTERCEPTED',
      url: event.data.payload.url,
      ruleId: event.data.payload.ruleId,
      ruleName: event.data.payload.ruleName,
      action: event.data.payload.action,
      details: event.data.payload.details,
    });
  }
});

(async function init() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_EXTENSION_STATE' });
  if (response) {
    extensionEnabled = response.enabled ?? false;
    currentRules = response.rules ?? [];
  }
  injectInterceptor();
  setTimeout(sendRulesToPage, 50);
})();
