/**
 * Snippet Templates Manager
 * Allows users to save and reuse common text snippets
 */

class SnippetManager {
  constructor() {
    this.snippets = [];
  }

  /**
   * Initialize snippets from storage
   */
  async init() {
    try {
      const result = await chrome.storage.sync.get(['snippets']);
      this.snippets = result.snippets || this.getDefaultSnippets();
      console.log('✓ Snippets loaded:', this.snippets.length);
    } catch (error) {
      console.error('Failed to load snippets:', error);
      this.snippets = this.getDefaultSnippets();
    }
  }

  /**
   * Get default built-in snippets
   */
  getDefaultSnippets() {
    return [
      {
        id: 1,
        name: 'Email Signature',
        content: 'Best regards,\n[Your Name]\n[Your Title]\n[Contact Info]',
        category: 'email',
        tags: ['email', 'signature']
      },
      {
        id: 2,
        name: 'Meeting Follow-up',
        content: 'Hi team,\n\nThanks for joining the meeting today. Here are the key action items:\n\n1. \n2. \n3. \n\nPlease let me know if you have any questions.',
        category: 'email',
        tags: ['email', 'meeting']
      },
      {
        id: 3,
        name: 'Lorem Ipsum',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        category: 'text',
        tags: ['text', 'placeholder']
      },
      {
        id: 4,
        name: 'Code Comment Header',
        content: '/**\n * [Function Name]\n * @description [Description]\n * @param {type} param - [Description]\n * @returns {type} [Description]\n */',
        category: 'code',
        tags: ['code', 'comment']
      }
    ];
  }

  /**
   * Get all snippets
   */
  async getAllSnippets() {
    if (this.snippets.length === 0) {
      await this.init();
    }
    return this.snippets;
  }

  /**
   * Add new snippet
   */
  async addSnippet(name, content, category = 'text', tags = []) {
    const snippet = {
      id: Date.now(),
      name: name,
      content: content,
      category: category,
      tags: tags,
      createdAt: Date.now()
    };

    this.snippets.push(snippet);
    await this.save();

    console.log('✓ Snippet added:', name);
    return snippet;
  }

  /**
   * Update existing snippet
   */
  async updateSnippet(id, updates) {
    const index = this.snippets.findIndex(s => s.id === id);
    if (index !== -1) {
      this.snippets[index] = { ...this.snippets[index], ...updates };
      await this.save();
      console.log('✓ Snippet updated:', id);
      return this.snippets[index];
    }
    return null;
  }

  /**
   * Delete snippet
   */
  async deleteSnippet(id) {
    const index = this.snippets.findIndex(s => s.id === id);
    if (index !== -1) {
      const deleted = this.snippets.splice(index, 1)[0];
      await this.save();
      console.log('✓ Snippet deleted:', deleted.name);
      return true;
    }
    return false;
  }

  /**
   * Search snippets
   */
  searchSnippets(query) {
    const lowerQuery = query.toLowerCase();
    return this.snippets.filter(snippet =>
      snippet.name.toLowerCase().includes(lowerQuery) ||
      snippet.content.toLowerCase().includes(lowerQuery) ||
      snippet.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get snippets by category
   */
  getByCategory(category) {
    return this.snippets.filter(s => s.category === category);
  }

  /**
   * Save snippets to storage
   */
  async save() {
    try {
      await chrome.storage.sync.set({ snippets: this.snippets });
      console.log('✓ Snippets saved');
    } catch (error) {
      console.error('Failed to save snippets:', error);
    }
  }
}

// Export singleton instance
const snippetManager = new SnippetManager();
export default snippetManager;
