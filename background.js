/**
 * Background Service Worker
 * Monitors clipboard changes and coordinates storage
 * Now with GROQ AI integration (ultra-fast!) + Snippet Templates!
 */

import storageManager from './storage.js';
import aiTagger from './ai-tagger.js';
import groqAI from './groq-ai.js';
import snippetManager from './snippets.js';

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
  console.log('===========================================');
  console.log('Clipboard History Extension: Initializing...');
  console.log('===========================================');

  try {
    // Request clipboard permissions explicitly
    console.log('Requesting clipboard permissions...');
    const hasPermissions = await chrome.permissions.contains({
      permissions: ['clipboardRead', 'clipboardWrite']
    });

    if (!hasPermissions) {
      console.warn('⚠️ Clipboard permissions not granted! Extension may not work properly.');
      console.log('Requesting permissions...');
      try {
        const granted = await chrome.permissions.request({
          permissions: ['clipboardRead', 'clipboardWrite']
        });
        console.log('Permissions granted:', granted);
      } catch (e) {
        console.error('Could not request permissions:', e);
      }
    } else {
      console.log('✓ Clipboard permissions already granted');
    }

    // Initialize storage
    console.log('Initializing storage...');
    await storageManager.init();
    console.log('✓ Storage initialized');

    // Test storage immediately
    const testItems = await storageManager.getAllItems();
    console.log('✓ Storage test: Found', testItems.length, 'existing items');

    // Initialize GROQ AI (API key loaded from storage)
    console.log('Initializing GROQ AI...');
    await groqAI.init();
    console.log('✓ GROQ AI initialized');

    // Initialize snippet manager
    console.log('Initializing snippets...');
    await snippetManager.init();
    console.log('✓ Snippets initialized');

    // Load settings
    console.log('Loading settings...');
    await loadSettings();
    console.log('✓ Settings loaded:', settings);

    // Set up message listeners
    chrome.runtime.onMessage.addListener(handleMessage);
    console.log('✓ Message listeners registered');

    // Set up context menu
    setupContextMenu();
    console.log('✓ Context menu setup');

    // Note: Content scripts are auto-injected via manifest.json
    // No manual injection needed (prevents double-execution errors)

    // Start clipboard monitoring if enabled (ALWAYS START IT!)
    console.log('Starting clipboard monitoring...');
    startClipboardMonitoring();
    console.log('✓ Clipboard monitoring started');

    // Keep service worker alive
    keepAlive();
    console.log('✓ Keep-alive mechanism activated');

    console.log('===========================================');
    console.log('✓✓✓ Clipboard History Extension: READY! ✓✓✓');
    console.log('===========================================');
    console.log('');
    console.log('📋 Clipboard monitoring is now active!');
    console.log('📋 Copy any text/image and it will be captured');
    console.log('📋 Check clipboard: Press Ctrl+Shift+V');
    console.log('');
  } catch (error) {
    console.error('❌ INITIALIZATION ERROR:', error);
    console.error('Stack:', error.stack);
  }
}

/**
 * Keep service worker alive
 */
function keepAlive() {
  setInterval(() => {
    // Ping to keep service worker alive
    console.debug('Service worker: alive');
  }, 20000); // Every 20 seconds
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

    // Snippet management
    case 'GET_SNIPPETS':
      snippetManager.getAllSnippets().then(sendResponse);
      return true;

    case 'ADD_SNIPPET':
      snippetManager.addSnippet(data.name, data.content, data.category, data.tags).then(sendResponse);
      return true;

    case 'UPDATE_SNIPPET':
      snippetManager.updateSnippet(data.id, data.updates).then(sendResponse);
      return true;

    case 'DELETE_SNIPPET':
      snippetManager.deleteSnippet(data.id).then(sendResponse);
      return true;

    case 'SEARCH_SNIPPETS':
      sendResponse(snippetManager.searchSnippets(data.query));
      return false;

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
    const { content, url, type, mimeType, size } = data;

    // Avoid duplicates
    if (content === lastClipboardContent) {
      return { success: false, reason: 'duplicate' };
    }

    // Check if site is excluded
    if (url && isExcludedSite(url)) {
      return { success: false, reason: 'excluded_site' };
    }

    // Check content length (max 5MB for images, 1MB for text)
    const maxSize = type === 'image' ? 5 * 1024 * 1024 : 1024 * 1024;
    if (content.length > maxSize) {
      return { success: false, reason: 'too_large' };
    }

    let item;

    // Handle IMAGE clipboard
    if (type === 'image') {
      item = {
        content: content, // base64 image data
        category: 'image',
        tags: ['image', mimeType?.includes('png') ? 'png' : 'jpg', 'screenshot'],
        url: url,
        title: `Image (${Math.round(size / 1024)}KB)`,
        metadata: {
          type: 'image',
          mimeType: mimeType,
          size: size,
          aiGenerated: false,
          timestamp: Date.now()
        }
      };

      console.log('✓ Saving image:', {
        category: 'image',
        mimeType: mimeType,
        size: `${Math.round(size / 1024)}KB`
      });
    }
    // Handle TEXT clipboard
    else {
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
      item = {
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

      console.log('✓ Saving text:', {
        category: item.category,
        tags: item.tags.join(', '),
        aiProvider: item.metadata.aiProvider,
        length: content.length
      });
    }

    // Save to storage
    const id = await storageManager.addItem(item);

    // Update last clipboard content
    lastClipboardContent = content;

    return { success: true, id: id, category: item.category };
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
let lastSystemClipboardHash = '';

/**
 * Start monitoring clipboard changes
 * Monitors SYSTEM clipboard (from ANY app, not just browser)
 * Now supports TEXT, IMAGES, and FILES!
 */
function startClipboardMonitoring() {
  console.log('✓ Starting clipboard monitoring...');

  // Content scripts handle browser clipboard events
  // This monitors SYSTEM clipboard (from other apps)

  if (systemClipboardInterval) {
    clearInterval(systemClipboardInterval);
  }

  // Poll system clipboard every 300ms (ultra-responsive!)
  systemClipboardInterval = setInterval(async () => {
    try {
      // Read clipboard items (supports text, images, files)
      const clipboardItems = await navigator.clipboard.read();

      if (clipboardItems && clipboardItems.length > 0) {
        const item = clipboardItems[0];

        // Check for IMAGE first (priority)
        if (item.types.includes('image/png') || item.types.includes('image/jpeg') || item.types.includes('image/gif') || item.types.includes('image/webp')) {
          const imageType = item.types.find(t => t.startsWith('image/'));
          const imageBlob = await item.getType(imageType);

          // Convert blob to base64 for storage
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = reader.result;
            const hash = base64.substring(0, 100); // Simple hash for duplicate detection

            if (hash !== lastSystemClipboardHash) {
              lastSystemClipboardHash = hash;

              console.log('✓ Image copied:', imageBlob.type, Math.round(imageBlob.size/1024) + 'KB');

              // Save image to clipboard history
              const result = await handleSaveClipboard({
                content: base64,
                type: 'image',
                mimeType: imageBlob.type,
                size: imageBlob.size,
                url: 'clipboard-image'
              }, null);

              if (result.success) {
                console.log('✓ Image saved to history');
              } else {
                console.warn('Failed to save image:', result.reason || result.error);
              }
            }
          };
          reader.onerror = () => {
            console.error('Failed to read image blob');
          };
          reader.readAsDataURL(imageBlob);
        }
        // Check for TEXT
        else if (item.types.includes('text/plain')) {
          const textBlob = await item.getType('text/plain');
          const clipboardText = await textBlob.text();

          if (clipboardText && clipboardText.trim() && clipboardText !== lastSystemClipboard) {
            lastSystemClipboard = clipboardText;
            lastSystemClipboardHash = clipboardText.substring(0, 100);

            console.log('✓ Text copied:', clipboardText.substring(0, 50) + '...');

            // Save to clipboard history
            const result = await handleSaveClipboard({
              content: clipboardText,
              type: 'text',
              url: 'clipboard'
            }, null);

            if (result.success) {
              console.log('✓ Text saved to history');
            } else {
              console.warn('Failed to save text:', result.reason || result.error);
            }
          }
        }
      }
    } catch (error) {
      // Clipboard read may fail if extension loses focus - this is normal
      // Don't spam console
      if (!error.message.includes('Document is not focused')) {
        console.debug('Clipboard check:', error.message);
      }
    }
  }, 300); // Check every 300ms for instant response!

  console.log('✓ Clipboard monitoring active (300ms polling) - TEXT + IMAGES supported!');
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
