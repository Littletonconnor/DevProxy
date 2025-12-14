import type { Rule, Message } from '@/shared/types';

// Extension state - defaults to disabled for security
let extensionEnabled = false;
let rules: Rule[] = [];

// Storage type for type safety
interface StorageData {
  enabled?: boolean;
  rules?: Rule[];
}

// Load rules from storage on startup (but NOT enabled state - always start disabled)
chrome.storage.local.get(['rules'], (result: StorageData) => {
  // extensionEnabled stays false - user must enable each session
  rules = result.rules ?? [];
  console.log('[devProxy] Service worker initialized', {
    extensionEnabled,
    rulesCount: rules.length,
  });
});

// Handle messages from DevTools panel and content scripts
chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    console.log('[devProxy] Message received:', message.type);

    switch (message.type) {
      case 'GET_EXTENSION_STATE':
        sendResponse({ enabled: extensionEnabled, rules });
        return true; // We called sendResponse

      case 'TOGGLE_EXTENSION':
        extensionEnabled = message.enabled;
        chrome.storage.local.set({ enabled: extensionEnabled });
        broadcastToTabs({
          type: 'TOGGLE_EXTENSION',
          enabled: extensionEnabled,
        });
        return false; // No response needed

      case 'RULES_UPDATED':
        rules = message.rules;
        chrome.storage.local.set({ rules });
        broadcastToTabs({ type: 'RULES_UPDATED', rules });
        return false; // No response needed

      case 'GET_RULES':
        sendResponse(rules);
        return true; // We called sendResponse

      case 'REQUEST_INTERCEPTED':
        console.log(
          `[devProxy] Intercepted: ${message.url} (rule: ${message.ruleName})`
        );
        return false; // No response needed
    }

    return false;
  }
);

// Broadcast message to all tabs
function broadcastToTabs(message: Message) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Tab might not have content script loaded yet, ignore
        });
      }
    });
  });
}
