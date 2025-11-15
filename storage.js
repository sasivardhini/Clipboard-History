/**
 * IndexedDB Storage Manager for Clipboard History
 * Efficiently stores and retrieves clipboard items with AI tags
 */

const DB_NAME = 'ClipboardHistoryDB';
const DB_VERSION = 1;
const STORE_NAME = 'clipboardItems';
const MAX_ITEMS = 50;

class StorageManager {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true
          });

          // Create indexes for efficient querying
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('category', 'category', { unique: false });
          objectStore.createIndex('isPinned', 'isPinned', { unique: false });
          objectStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        }
      };
    });
  }

  /**
   * Add a new clipboard item
   * @param {Object} item - Clipboard item with content and metadata
   * @returns {Promise<number>} - ID of the added item
   */
  async addItem(item) {
    if (!this.db) await this.init();

    // Ensure we don't exceed max items (excluding pinned)
    await this.cleanupOldItems();

    const clipboardItem = {
      content: item.content,
      category: item.category,
      tags: item.tags || [],
      timestamp: Date.now(),
      isPinned: false,
      url: item.url || null,
      title: item.title || null,
      metadata: item.metadata || {}
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(clipboardItem);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all clipboard items (pinned first, then by timestamp)
   * @returns {Promise<Array>} - Array of clipboard items
   */
  async getAllItems() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result;
        // Sort: pinned items first, then by timestamp (newest first)
        items.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return b.timestamp - a.timestamp;
        });
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Search clipboard items by content or tags
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Matching clipboard items
   */
  async searchItems(query) {
    const allItems = await this.getAllItems();
    const lowerQuery = query.toLowerCase();

    return allItems.filter(item => {
      return (
        item.content.toLowerCase().includes(lowerQuery) ||
        item.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
        (item.category && item.category.toLowerCase().includes(lowerQuery)) ||
        (item.title && item.title.toLowerCase().includes(lowerQuery))
      );
    });
  }

  /**
   * Filter items by category
   * @param {string} category - Category to filter by
   * @returns {Promise<Array>} - Filtered items
   */
  async getItemsByCategory(category) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('category');
      const request = index.getAll(category);

      request.onsuccess = () => {
        const items = request.result;
        items.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return b.timestamp - a.timestamp;
        });
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Toggle pin status of an item
   * @param {number} id - Item ID
   * @returns {Promise<void>}
   */
  async togglePin(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.isPinned = !item.isPinned;
          const updateRequest = store.put(item);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          reject(new Error('Item not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Delete an item
   * @param {number} id - Item ID
   * @returns {Promise<void>}
   */
  async deleteItem(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all non-pinned items
   * @returns {Promise<void>}
   */
  async clearAll() {
    const items = await this.getAllItems();
    const deletePromises = items
      .filter(item => !item.isPinned)
      .map(item => this.deleteItem(item.id));

    return Promise.all(deletePromises);
  }

  /**
   * Cleanup old items (keep only MAX_ITEMS non-pinned items)
   * @returns {Promise<void>}
   */
  async cleanupOldItems() {
    const items = await this.getAllItems();
    const nonPinnedItems = items.filter(item => !item.isPinned);

    if (nonPinnedItems.length >= MAX_ITEMS) {
      // Sort by timestamp (oldest first) and delete excess
      nonPinnedItems.sort((a, b) => a.timestamp - b.timestamp);
      const itemsToDelete = nonPinnedItems.slice(0, nonPinnedItems.length - MAX_ITEMS + 1);

      const deletePromises = itemsToDelete.map(item => this.deleteItem(item.id));
      return Promise.all(deletePromises);
    }
  }

  /**
   * Get statistics about clipboard usage
   * @returns {Promise<Object>} - Statistics object
   */
  async getStats() {
    const items = await this.getAllItems();
    const categories = {};

    items.forEach(item => {
      categories[item.category] = (categories[item.category] || 0) + 1;
    });

    return {
      totalItems: items.length,
      pinnedItems: items.filter(item => item.isPinned).length,
      categories: categories,
      oldestItem: items.length > 0 ? new Date(Math.min(...items.map(i => i.timestamp))) : null,
      newestItem: items.length > 0 ? new Date(Math.max(...items.map(i => i.timestamp))) : null
    };
  }
}

// Export as singleton
const storageManager = new StorageManager();
export default storageManager;
