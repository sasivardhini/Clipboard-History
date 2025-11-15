/**
 * Popup UI Controller - Advanced Manual Refresh Edition
 * Manages the clipboard history popup interface with elegant manual refresh
 */

let allItems = [];
let filteredItems = [];
let currentCategory = 'all';
let searchQuery = '';
let lastItemCount = 0;
let isRefreshing = false;

// DOM elements
const clipboardList = document.getElementById('clipboardList');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const filterTabs = document.querySelectorAll('.filter-tab');
const totalCountEl = document.getElementById('totalCount');
const pinnedCountEl = document.getElementById('pinnedCount');
const clearAllBtn = document.getElementById('clearAllBtn');
const settingsBtn = document.getElementById('settingsBtn');
const refreshBtn = document.getElementById('refreshBtn');

/**
 * Initialize popup
 */
async function init() {
  showLoading();

  // Capture current clipboard content on open
  await captureCurrentClipboard();

  await loadItems();
  setupEventListeners();
  hideLoading();

  // Add subtle entrance animation
  document.body.classList.add('loaded');
}

/**
 * Capture current clipboard content
 */
async function captureCurrentClipboard() {
  try {
    // Read current clipboard
    const text = await navigator.clipboard.readText();

    if (text && text.trim()) {
      // Save to clipboard history
      await chrome.runtime.sendMessage({
        action: 'SAVE_CLIPBOARD',
        data: {
          content: text,
          url: 'chrome-extension://popup'
        }
      });
    }
  } catch (error) {
    // Clipboard read permission not granted or empty clipboard
    console.log('Could not read clipboard:', error.message);
  }
}

/**
 * Elegant manual refresh with advanced animations
 */
async function refreshItems(showSuccessAnimation = true) {
  if (isRefreshing) return; // Prevent multiple simultaneous refreshes

  isRefreshing = true;

  try {
    // Add spinning animation to refresh button
    refreshBtn.classList.add('refreshing');

    // Add elegant loading overlay
    const overlay = document.createElement('div');
    overlay.className = 'refresh-overlay';
    document.body.appendChild(overlay);

    setTimeout(() => overlay.classList.add('active'), 10);

    // Fetch new items
    const response = await chrome.runtime.sendMessage({ action: 'GET_ITEMS' });
    const newItems = response || [];

    // Check if there are new items
    const hasNewItems = newItems.length > lastItemCount;

    // Minimum refresh duration for smooth UX (600ms)
    await new Promise(resolve => setTimeout(resolve, 600));

    // Update items
    lastItemCount = newItems.length;
    allItems = newItems;

    // Fade out overlay
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 300);

    // Update display with stagger animation
    applyFilters();
    updateStats();

    // Show elegant success feedback
    if (showSuccessAnimation) {
      if (hasNewItems) {
        showRefreshSuccess('✨ New items loaded!', 'success');
        highlightNewItems();
      } else {
        showRefreshSuccess('✓ Up to date!', 'info');
      }
    }

    // Success state for refresh button
    setTimeout(() => {
      refreshBtn.classList.remove('refreshing');
      refreshBtn.classList.add('success');
      setTimeout(() => refreshBtn.classList.remove('success'), 1200);
    }, 100);

  } catch (error) {
    console.error('Refresh error:', error);
    showRefreshSuccess('⚠ Refresh failed', 'error');
    refreshBtn.classList.remove('refreshing');
    refreshBtn.classList.add('error');
    setTimeout(() => refreshBtn.classList.remove('error'), 1200);
  } finally {
    isRefreshing = false;
  }
}

/**
 * Load all clipboard items
 */
async function loadItems() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'GET_ITEMS' });
    allItems = response || [];
    applyFilters();
    updateStats();
  } catch (error) {
    console.error('Error loading items:', error);
    showEmptyState();
  }
}

/**
 * Apply current filters and search
 */
function applyFilters() {
  let items = [...allItems];

  // Apply category filter
  if (currentCategory !== 'all') {
    items = items.filter(item => item.category === currentCategory);
  }

  // Apply search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    items = items.filter(item =>
      item.content.toLowerCase().includes(query) ||
      item.tags.some(tag => tag.toLowerCase().includes(query)) ||
      (item.title && item.title.toLowerCase().includes(query))
    );
  }

  filteredItems = items;
  renderItems();
}

/**
 * Render clipboard items
 */
function renderItems() {
  if (filteredItems.length === 0) {
    showEmptyState();
    return;
  }

  hideEmptyState();

  clipboardList.innerHTML = filteredItems.map(item => createItemHTML(item)).join('');

  // Attach event listeners to items
  attachItemListeners();
}

/**
 * Create HTML for a clipboard item
 */
function createItemHTML(item) {
  const categoryIcon = getCategoryIcon(item.category);
  const timeAgo = getTimeAgo(item.timestamp);
  const preview = getContentPreview(item.content, item.category);
  const tagsHTML = item.tags.slice(0, 3).map(tag =>
    `<span class="tag">${escapeHTML(tag)}</span>`
  ).join('');

  return `
    <div class="clipboard-item ${item.isPinned ? 'pinned' : ''}" data-id="${item.id}">
      <div class="item-header">
        <div class="item-category">
          ${categoryIcon}
          <span class="category-label">${item.category}</span>
        </div>
        <div class="item-actions">
          <button class="action-btn pin-btn" data-id="${item.id}" title="${item.isPinned ? 'Unpin' : 'Pin'}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${item.isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </button>
          <button class="action-btn copy-btn" data-id="${item.id}" title="Copy">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          </button>
          <button class="action-btn delete-btn" data-id="${item.id}" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="item-title">${escapeHTML(item.title || preview)}</div>

      <div class="item-preview">${escapeHTML(preview)}</div>

      ${tagsHTML ? `<div class="item-tags">${tagsHTML}</div>` : ''}

      <div class="item-footer">
        <span class="item-time">${timeAgo}</span>
        ${item.metadata.wordCount ? `<span class="item-meta">${item.metadata.wordCount} words</span>` : ''}
        ${item.url ? `<span class="item-meta" title="${escapeHTML(item.url)}">from ${getDomain(item.url)}</span>` : ''}
      </div>
    </div>
  `;
}

/**
 * Get icon for category
 */
function getCategoryIcon(category) {
  const icons = {
    text: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    code: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    url: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>',
    email: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    phone: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>',
    json: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h3a2 2 0 012 2v6a2 2 0 002 2 2 2 0 002-2V9a2 2 0 012-2h3"/></svg>',
    color: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 000 20 4 4 0 010-8 2 2 0 100-4 6 6 0 000-12z"/></svg>',
    markdown: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h3l3 5 3-5h3v10h-3v-6l-3 4-3-4v6H3zM18 7h3v10h-3z"/></svg>',
  };
  return icons[category] || icons.text;
}

/**
 * Get content preview
 */
function getContentPreview(content, category) {
  const maxLength = 100;

  if (category === 'code') {
    // Show first few lines of code
    const lines = content.split('\n').slice(0, 3);
    return lines.join('\n').substring(0, maxLength);
  }

  return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
}

/**
 * Get time ago string
 */
function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

/**
 * Get domain from URL
 */
function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

/**
 * Escape HTML
 */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Attach event listeners to items
 */
function attachItemListeners() {
  // Copy buttons
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const item = allItems.find(i => i.id === id);
      if (item) {
        await copyToClipboard(item.content);
        showToast('Copied to clipboard!');
      }
    });
  });

  // Pin buttons
  document.querySelectorAll('.pin-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      await togglePin(id);
    });
  });

  // Delete buttons
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      await deleteItem(id);
    });
  });

  // Click to copy entire item
  document.querySelectorAll('.clipboard-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      if (e.target.closest('.action-btn')) return;

      const id = parseInt(item.dataset.id);
      const clipboardItem = allItems.find(i => i.id === id);
      if (clipboardItem) {
        await copyToClipboard(clipboardItem.content);
        showToast('Copied to clipboard!');
      }
    });
  });
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error('Copy failed:', error);
  }
}

/**
 * Toggle pin status
 */
async function togglePin(id) {
  try {
    await chrome.runtime.sendMessage({
      action: 'TOGGLE_PIN',
      data: { id }
    });
    await loadItems();
  } catch (error) {
    console.error('Toggle pin failed:', error);
  }
}

/**
 * Delete item
 */
async function deleteItem(id) {
  try {
    await chrome.runtime.sendMessage({
      action: 'DELETE_ITEM',
      data: { id }
    });
    await loadItems();
    showToast('Item deleted');
  } catch (error) {
    console.error('Delete failed:', error);
  }
}

/**
 * Update statistics
 */
function updateStats() {
  totalCountEl.textContent = allItems.length;
  pinnedCountEl.textContent = allItems.filter(item => item.isPinned).length;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Search input
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
    applyFilters();
  });

  // Clear search
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    applyFilters();
  });

  // Filter tabs
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCategory = tab.dataset.category;
      applyFilters();
    });
  });

  // Clear all button
  clearAllBtn.addEventListener('click', async () => {
    if (confirm('Clear all non-pinned items?')) {
      await chrome.runtime.sendMessage({ action: 'CLEAR_ALL' });
      await loadItems();
      showToast('Clipboard history cleared');
    }
  });

  // Settings button
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Refresh button
  refreshBtn.addEventListener('click', async () => {
    await refreshItems();
  });

  // Keyboard shortcut: Ctrl+R for refresh
  document.addEventListener('keydown', async (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
      e.preventDefault(); // Prevent browser refresh
      await refreshItems();
    }
  });
}

/**
 * Show/hide states
 */
function showLoading() {
  loadingState.style.display = 'flex';
  clipboardList.style.display = 'none';
  emptyState.style.display = 'none';
}

function hideLoading() {
  loadingState.style.display = 'none';
}

function showEmptyState() {
  emptyState.style.display = 'flex';
  clipboardList.style.display = 'none';
}

function hideEmptyState() {
  emptyState.style.display = 'none';
  clipboardList.style.display = 'block';
}

/**
 * Show toast notification
 */
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

/**
 * Show new item notification with animation
 */
function showNewItemNotification() {
  // Create subtle flash effect
  const flash = document.createElement('div');
  flash.className = 'new-item-flash';
  document.body.appendChild(flash);

  setTimeout(() => {
    flash.classList.add('active');
  }, 10);

  setTimeout(() => {
    flash.remove();
  }, 600);

  // Add highlight to first item
  setTimeout(() => {
    const firstItem = document.querySelector('.clipboard-item');
    if (firstItem) {
      firstItem.classList.add('new-item');
      setTimeout(() => {
        firstItem.classList.remove('new-item');
      }, 2000);
    }
  }, 100);
}

/**
 * Show elegant refresh success message
 */
function showRefreshSuccess(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `refresh-notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  // Add with animation
  setTimeout(() => notification.classList.add('show'), 10);

  // Remove after 2 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

/**
 * Highlight newly added items
 */
function highlightNewItems() {
  // Add highlight class to first 3 items
  const items = document.querySelectorAll('.clipboard-item');
  items.forEach((item, index) => {
    if (index < 3) {
      item.classList.add('new-item');
      setTimeout(() => {
        item.classList.remove('new-item');
      }, 2000);
    }
  });
}

// Initialize popup
init();
