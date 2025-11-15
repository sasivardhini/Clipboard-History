/**
 * Background Service Worker
 * Monitors clipboard changes and coordinates storage
 * Now with GROQ AI integration (ultra-fast!)
 */

import storageManager from './storage.js';
import aiTagger from './ai-tagger.js';
import groqAI from './groq-ai.js';

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

  // Initialize GROQ AI (API key loaded from storage)
  await groqAI.init();

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

    // Analyze content with GROQ AI (ultra-fast Llama model!)
    let analysis;
    try {
      // Try GROQ AI first (super fast!)
      console.log('Analyzing with GROQ AI...');
      analysis = await groqAI.analyzeContent(content, 'text');

      // Enhance with local metadata if needed
      if (!analysis.metadata) {
        const localAnalysis = aiTagger.analyze(content, url);
        analysis.metadata = localAnalysis.metadata;
      }

      console.log('✓ GROQ AI analysis:', analysis.category, analysis.tags);
    } catch (error) {
      // Fallback to local AI tagger
      console.log('Using local AI tagger fallback');
      analysis = aiTagger.analyze(content, url);
    }

    // Don't save sensitive content by default
    if (analysis.category === 'sensitive' && !settings.saveSensitive) {
      return { success: false, reason: 'sensitive' };
    }

    // Create clipboard item with GROQ AI analysis
    const item = {
      content: content,
      category: analysis.category || 'text',
      tags: analysis.tags || [],
      url: url,
      title: analysis.title || analysis.metadata?.title || content.substring(0, 40),
      metadata: {
        ...analysis.metadata,
        aiGenerated: analysis.aiGenerated || true,
        aiProvider: analysis.aiProvider || 'GROQ',
        confidence: analysis.confidence || 0.9,
        sentiment: analysis.sentiment || 'informational'
      }
    };

    console.log('✓ Saving item:', {
      category: item.category,
      tags: item.tags.join(', '),
      aiProvider: item.metadata.aiProvider,
      length: content.length
    });

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

// Track system clipboard monitoring
let systemClipboardInterval = null;
let lastSystemClipboard = '';

/**
 * Start monitoring clipboard changes
 * Monitors SYSTEM clipboard (from ANY app, not just browser)
 */
function startClipboardMonitoring() {
  console.log('✓ Starting clipboard monitoring...');

  // Content scripts handle browser clipboard events
  // This monitors SYSTEM clipboard (from other apps)

  if (systemClipboardInterval) {
    clearInterval(systemClipboardInterval);
  }

  // Poll system clipboard every 2 seconds
  systemClipboardInterval = setInterval(async () => {
    try {
      // Background script CAN read clipboard (has permissions)
      const clipboardText = await navigator.clipboard.readText();

      if (clipboardText && clipboardText.trim() && clipboardText !== lastSystemClipboard) {
        lastSystemClipboard = clipboardText;

        console.log('✓ System clipboard changed:', clipboardText.substring(0, 50));

        // Save to clipboard history
        await saveClipboard({
          content: clipboardText,
          url: 'system-clipboard'
        });
      }
    } catch (error) {
      // Clipboard read may fail if extension loses focus
      console.debug('System clipboard check:', error.message);
    }
  }, 2000); // Check every 2 seconds

  console.log('✓ System clipboard monitoring active (2s polling)');
}

/**
 * Stop monitoring clipboard changes
 */
function stopClipboardMonitoring() {
  console.log('Clipboard monitoring disabled');

  if (systemClipboardInterval) {
    clearInterval(systemClipboardInterval);
    systemClipboardInterval = null;
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
