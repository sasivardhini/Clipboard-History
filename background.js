/**
 * Background Service Worker
 * Monitors clipboard changes and coordinates storage
 */

import storageManager from './storage.js';
import aiTagger from './ai-tagger.js';

// Last clipboard content to avoid duplicates
let lastClipboardContent = '';
let clipboardCheckInterval = null;

// Settings cache
let settings = {
  enabled: true,
  excludedSites: [],
  autoCleanupDays: 30,
  monitoringEnabled: true
};

/**
 * Initialize extension
 */
async function initialize() {
  console.log('Clipboard History Extension: Initializing...');

  // Initialize storage
  await storageManager.init();

  // Load settings
  await loadSettings();

  // Set up message listeners
  chrome.runtime.onMessage.addListener(handleMessage);

  // Set up context menu
  setupContextMenu();

  // Inject content scripts into all existing tabs
  await injectContentScriptsToAllTabs();

  // Start clipboard monitoring if enabled
  if (settings.monitoringEnabled) {
    startClipboardMonitoring();
  }

  console.log('Clipboard History Extension: Ready!');
}

/**
 * Inject content scripts into all existing tabs
 */
async function injectContentScriptsToAllTabs() {
  try {
    const tabs = await chrome.tabs.query({});

    for (const tab of tabs) {
      // Skip chrome:// and other restricted URLs
      if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://') && !tab.url.startsWith('about:')) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
        } catch (error) {
          // Silently skip tabs where injection fails
          console.log(`Could not inject into tab ${tab.id}:`, error.message);
        }
      }
    }

    console.log('Content scripts injected into existing tabs');
  } catch (error) {
    console.error('Error injecting content scripts:', error);
  }
}

/**
 * Load settings from chrome.storage
 */
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['settings'], (result) => {
      if (result.settings) {
        settings = { ...settings, ...result.settings };
      }
      resolve();
    });
  });
}

/**
 * Save settings to chrome.storage
 */
async function saveSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ settings }, resolve);
  });
}

/**
 * Handle messages from content scripts and popup
 */
function handleMessage(request, sender, sendResponse) {
  const { action, data } = request;

  switch (action) {
    case 'SAVE_CLIPBOARD':
      handleSaveClipboard(data, sender).then(sendResponse);
      return true; // Keep message channel open for async response

    case 'GET_ITEMS':
      storageManager.getAllItems().then(sendResponse);
      return true;

    case 'SEARCH_ITEMS':
      storageManager.searchItems(data.query).then(sendResponse);
      return true;

    case 'FILTER_BY_CATEGORY':
      storageManager.getItemsByCategory(data.category).then(sendResponse);
      return true;

    case 'TOGGLE_PIN':
      storageManager.togglePin(data.id).then(() => {
        sendResponse({ success: true });
      });
      return true;

    case 'DELETE_ITEM':
      storageManager.deleteItem(data.id).then(() => {
        sendResponse({ success: true });
      });
      return true;

    case 'CLEAR_ALL':
      storageManager.clearAll().then(() => {
        sendResponse({ success: true });
      });
      return true;

    case 'GET_STATS':
      storageManager.getStats().then(sendResponse);
      return true;

    case 'COPY_TO_CLIPBOARD':
      handleCopyToClipboard(data).then(sendResponse);
      return true;

    case 'GET_SETTINGS':
      sendResponse(settings);
      return false;

    case 'UPDATE_SETTINGS':
      settings = { ...settings, ...data };
      saveSettings().then(() => {
        if (data.monitoringEnabled !== undefined) {
          data.monitoringEnabled ? startClipboardMonitoring() : stopClipboardMonitoring();
        }
        sendResponse({ success: true });
      });
      return true;

    default:
      sendResponse({ error: 'Unknown action' });
      return false;
  }
}

/**
 * Handle saving clipboard content
 */
async function handleSaveClipboard(data, sender) {
  try {
    const { content, url } = data;

    // Avoid duplicates
    if (content === lastClipboardContent) {
      return { success: false, reason: 'duplicate' };
    }

    // Check if site is excluded
    if (url && isExcludedSite(url)) {
      return { success: false, reason: 'excluded_site' };
    }

    // Check content length (max 1MB)
    if (content.length > 1024 * 1024) {
      return { success: false, reason: 'too_large' };
    }

    // Analyze content with AI
    const analysis = aiTagger.analyze(content, url);

    // Don't save sensitive content by default
    if (analysis.category === 'sensitive' && !settings.saveSensitive) {
      return { success: false, reason: 'sensitive' };
    }

    // Create clipboard item
    const item = {
      content: content,
      category: analysis.category,
      tags: analysis.tags,
      url: url,
      title: analysis.metadata.title,
      metadata: analysis.metadata
    };

    // Save to storage
    const id = await storageManager.addItem(item);

    // Update last clipboard content
    lastClipboardContent = content;

    return { success: true, id: id, analysis: analysis };
  } catch (error) {
    console.error('Error saving clipboard:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle copying to clipboard
 */
async function handleCopyToClipboard(data) {
  try {
    const { content } = data;

    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab) {
      // Inject content script to copy
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (text) => {
          navigator.clipboard.writeText(text);
        },
        args: [content]
      });

      return { success: true };
    }

    return { success: false, error: 'No active tab' };
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if a site is excluded from monitoring
 */
function isExcludedSite(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    return settings.excludedSites.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(hostname);
      }
      return hostname.includes(pattern);
    });
  } catch {
    return false;
  }
}

/**
 * Start monitoring clipboard changes
 */
function startClipboardMonitoring() {
  if (clipboardCheckInterval) return;

  console.log('Clipboard monitoring started');

  // Check clipboard every 1 second
  clipboardCheckInterval = setInterval(async () => {
    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tab && tab.id) {
        // Request clipboard content from content script
        chrome.tabs.sendMessage(tab.id, { action: 'CHECK_CLIPBOARD' }).catch(() => {
          // Tab might not have content script injected
        });
      }
    } catch (error) {
      // Silently handle errors
    }
  }, 1000);
}

/**
 * Stop monitoring clipboard changes
 */
function stopClipboardMonitoring() {
  if (clipboardCheckInterval) {
    clearInterval(clipboardCheckInterval);
    clipboardCheckInterval = null;
    console.log('Clipboard monitoring stopped');
  }
}

/**
 * Set up context menu
 */
function setupContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'save-to-clipboard-history',
      title: 'Save to Clipboard History',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'open-clipboard-history',
      title: 'Open Clipboard History',
      contexts: ['all']
    });
  });
}

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case 'save-to-clipboard-history':
      if (info.selectionText) {
        await handleSaveClipboard({
          content: info.selectionText,
          url: tab.url
        }, { tab });
      }
      break;

    case 'open-clipboard-history':
      chrome.action.openPopup();
      break;
  }
});

/**
 * Handle keyboard commands
 */
chrome.commands.onCommand.addListener(async (command) => {
  switch (command) {
    case 'quick-paste-last':
      // Get last item and paste it
      const items = await storageManager.getAllItems();
      if (items.length > 0) {
        const lastItem = items[0];
        await handleCopyToClipboard({ content: lastItem.content });
      }
      break;
  }
});

/**
 * Handle extension installation or update
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First time installation
    console.log('Clipboard History Extension installed!');

    // Open welcome page
    chrome.tabs.create({
      url: 'options.html?welcome=true'
    });
  } else if (details.reason === 'update') {
    console.log('Clipboard History Extension updated!');
  }
});

// Initialize when service worker starts
initialize();
