/**
 * Options Page Controller
 * Manages settings and preferences
 */

// Default settings
const defaultSettings = {
  monitoringEnabled: true,
  maxItems: 50,
  autoCleanupDays: 30,
  saveSensitive: false,
  excludedSites: [],
  aiTaggingEnabled: true,
  codeDetection: true,
  topicExtraction: true,
  entityRecognition: true
};

let currentSettings = { ...defaultSettings };

// DOM elements
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.section');
const saveBtn = document.getElementById('saveSettings');
const resetBtn = document.getElementById('resetSettings');
const clearAllBtn = document.getElementById('clearAllData');
const toast = document.getElementById('toast');

// Setting inputs
const monitoringEnabled = document.getElementById('monitoringEnabled');
const maxItems = document.getElementById('maxItems');
const autoCleanupDays = document.getElementById('autoCleanupDays');
const saveSensitive = document.getElementById('saveSensitive');
const excludedSites = document.getElementById('excludedSites');
const aiTaggingEnabled = document.getElementById('aiTaggingEnabled');
const codeDetection = document.getElementById('codeDetection');
const topicExtraction = document.getElementById('topicExtraction');
const entityRecognition = document.getElementById('entityRecognition');

// Stat elements
const statTotal = document.getElementById('statTotal');
const statPinned = document.getElementById('statPinned');
const statCategories = document.getElementById('statCategories');

/**
 * Initialize options page
 */
async function init() {
  await loadSettings();
  await loadStats();
  setupEventListeners();
  checkWelcomeScreen();
}

/**
 * Check if this is the welcome screen
 */
function checkWelcomeScreen() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('welcome') === 'true') {
    showToast('Welcome to Clipboard History Pro! 🎉', 'success', 3000);
  }
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'GET_SETTINGS' });
    currentSettings = { ...defaultSettings, ...response };
    applySettings();
  } catch (error) {
    console.error('Error loading settings:', error);
    showToast('Error loading settings', 'error');
  }
}

/**
 * Apply settings to UI
 */
function applySettings() {
  monitoringEnabled.checked = currentSettings.monitoringEnabled;
  maxItems.value = currentSettings.maxItems || 50;
  autoCleanupDays.value = currentSettings.autoCleanupDays || 30;
  saveSensitive.checked = currentSettings.saveSensitive || false;
  excludedSites.value = (currentSettings.excludedSites || []).join('\n');
  aiTaggingEnabled.checked = currentSettings.aiTaggingEnabled !== false;
  codeDetection.checked = currentSettings.codeDetection !== false;
  topicExtraction.checked = currentSettings.topicExtraction !== false;
  entityRecognition.checked = currentSettings.entityRecognition !== false;
}

/**
 * Collect settings from UI
 */
function collectSettings() {
  return {
    monitoringEnabled: monitoringEnabled.checked,
    maxItems: parseInt(maxItems.value),
    autoCleanupDays: parseInt(autoCleanupDays.value),
    saveSensitive: saveSensitive.checked,
    excludedSites: excludedSites.value
      .split('\n')
      .map(site => site.trim())
      .filter(site => site.length > 0),
    aiTaggingEnabled: aiTaggingEnabled.checked,
    codeDetection: codeDetection.checked,
    topicExtraction: topicExtraction.checked,
    entityRecognition: entityRecognition.checked
  };
}

/**
 * Save settings
 */
async function saveSettings() {
  try {
    const settings = collectSettings();

    await chrome.runtime.sendMessage({
      action: 'UPDATE_SETTINGS',
      data: settings
    });

    currentSettings = settings;
    showToast('Settings saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showToast('Error saving settings', 'error');
  }
}

/**
 * Reset settings to defaults
 */
async function resetSettings() {
  if (confirm('Reset all settings to defaults?')) {
    try {
      await chrome.runtime.sendMessage({
        action: 'UPDATE_SETTINGS',
        data: defaultSettings
      });

      currentSettings = { ...defaultSettings };
      applySettings();
      showToast('Settings reset to defaults', 'success');
    } catch (error) {
      console.error('Error resetting settings:', error);
      showToast('Error resetting settings', 'error');
    }
  }
}

/**
 * Clear all clipboard data
 */
async function clearAllData() {
  const confirmed = confirm(
    'This will permanently delete all clipboard history (except pinned items). Are you sure?'
  );

  if (confirmed) {
    try {
      await chrome.runtime.sendMessage({ action: 'CLEAR_ALL' });
      await loadStats();
      showToast('Clipboard history cleared', 'success');
    } catch (error) {
      console.error('Error clearing data:', error);
      showToast('Error clearing data', 'error');
    }
  }
}

/**
 * Load statistics
 */
async function loadStats() {
  try {
    const stats = await chrome.runtime.sendMessage({ action: 'GET_STATS' });

    statTotal.textContent = stats.totalItems || 0;
    statPinned.textContent = stats.pinnedItems || 0;
    statCategories.textContent = Object.keys(stats.categories || {}).length;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Navigation
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const sectionId = item.dataset.section;

      // Update active nav item
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      // Show corresponding section
      sections.forEach(section => section.classList.remove('active'));
      document.getElementById(sectionId).classList.add('active');
    });
  });

  // Save settings
  saveBtn.addEventListener('click', saveSettings);

  // Reset settings
  resetBtn.addEventListener('click', resetSettings);

  // Clear all data
  clearAllBtn.addEventListener('click', clearAllData);

  // Auto-save on change (optional)
  const autoSaveInputs = [
    monitoringEnabled,
    aiTaggingEnabled,
    codeDetection,
    topicExtraction,
    entityRecognition
  ];

  autoSaveInputs.forEach(input => {
    input.addEventListener('change', () => {
      // Show indicator that setting will be saved
      saveBtn.classList.add('highlight');
      setTimeout(() => saveBtn.classList.remove('highlight'), 1000);
    });
  });
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info', duration = 2000) {
  toast.textContent = message;
  toast.className = `toast toast-${type} show`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
