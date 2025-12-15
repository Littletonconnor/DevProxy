/**
 * Background service worker - manages extension state and rules.
 * Handles communication between DevTools panel and content scripts.
 */
import type { Rule, Message, LogEntry } from '@/shared/types';

let extensionEnabled = false;
let rules: Rule[] = [];
let logs: LogEntry[] = [];
const MAX_LOGS = 500;

interface StorageData {
  rules?: Rule[];
}

chrome.storage.local.get(['rules'], (result: StorageData) => {
  rules = result.rules ?? [];
});

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  switch (message.type) {
    case 'GET_EXTENSION_STATE':
      sendResponse({ enabled: extensionEnabled, rules });
      return true;

    case 'TOGGLE_EXTENSION':
      extensionEnabled = message.enabled;
      chrome.storage.local.set({ enabled: extensionEnabled });
      broadcastToTabs({ type: 'TOGGLE_EXTENSION', enabled: extensionEnabled });
      return false;

    case 'RULES_UPDATED':
      rules = message.rules;
      chrome.storage.local.set({ rules });
      broadcastToTabs({ type: 'RULES_UPDATED', rules });
      return false;

    case 'GET_RULES':
      sendResponse(rules);
      return true;

    case 'REQUEST_INTERCEPTED': {
      const entry: LogEntry = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        url: message.url,
        ruleId: message.ruleId,
        ruleName: message.ruleName,
        action: message.action,
        details: message.details,
      };
      logs.unshift(entry);
      if (logs.length > MAX_LOGS) {
        logs = logs.slice(0, MAX_LOGS);
      }
      return false;
    }

    case 'GET_LOGS':
      sendResponse(logs);
      return true;

    case 'CLEAR_LOGS':
      logs = [];
      return false;
  }

  return false;
});

function broadcastToTabs(message: Message) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {});
      }
    });
  });
}
