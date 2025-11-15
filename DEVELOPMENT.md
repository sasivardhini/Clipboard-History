# Development Guide

## Getting Started

### Prerequisites

- Google Chrome (v88+) or any Chromium-based browser
- Basic knowledge of JavaScript, HTML, CSS
- Understanding of Chrome Extension APIs
- Familiarity with IndexedDB

### Setting Up Development Environment

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/clipboard-history.git
   cd clipboard-history
   ```

2. **Load extension in Chrome**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the project directory

3. **Make changes and reload**
   - After making code changes, click the reload icon on the extension card
   - Or use the keyboard shortcut: `Ctrl+R` on the extension page

## Architecture Overview

### Core Components

#### 1. Background Service Worker (`background.js`)

The service worker runs in the background and handles:
- Clipboard monitoring
- Message routing between components
- Context menu management
- Keyboard command handling
- Storage coordination

**Key Functions:**
- `initialize()` - Sets up the extension on install
- `handleSaveClipboard()` - Processes and saves clipboard content
- `handleMessage()` - Routes messages from popup and content scripts
- `startClipboardMonitoring()` - Begins clipboard checks
- `isExcludedSite()` - Checks if current site is excluded

#### 2. Storage Manager (`storage.js`)

Manages all IndexedDB operations:
- CRUD operations for clipboard items
- Search and filtering
- Pin/unpin management
- Auto-cleanup of old items

**Key Functions:**
- `init()` - Initializes IndexedDB
- `addItem()` - Adds new clipboard item
- `getAllItems()` - Retrieves all items (sorted)
- `searchItems()` - Searches by content or tags
- `togglePin()` - Pins/unpins items
- `cleanupOldItems()` - Removes old items beyond max limit

#### 3. AI Tagging Engine (`ai-tagger.js`)

Performs local AI analysis on clipboard content:
- Content type detection
- Programming language identification
- Entity extraction
- Topic extraction

**Key Functions:**
- `analyze()` - Main analysis entry point
- `detectContentType()` - Identifies content category
- `detectCodeLanguage()` - Identifies programming language
- `extractEntities()` - Finds entities (emails, URLs, etc.)
- `extractTopics()` - Extracts key topics using NLP

#### 4. Content Script (`content.js`)

Runs on web pages to capture clipboard events:
- Listens for copy/cut events
- Monitors clipboard changes
- Sends clipboard data to background script

**Key Functions:**
- `checkClipboard()` - Checks current clipboard content
- `pasteContent()` - Pastes content to active element

#### 5. Popup UI (`popup.html`, `popup.js`)

The main interface for viewing clipboard history:
- Displays clipboard items
- Search and filter functionality
- Item actions (copy, pin, delete)

**Key Functions:**
- `loadItems()` - Fetches items from storage
- `applyFilters()` - Applies search and category filters
- `renderItems()` - Renders items to DOM
- `togglePin()` - Pins/unpins items
- `deleteItem()` - Deletes items

#### 6. Options Page (`options.html`, `options.js`)

Settings and configuration interface:
- General settings
- Privacy controls
- AI tagging options
- Statistics display

**Key Functions:**
- `loadSettings()` - Loads settings from storage
- `saveSettings()` - Saves settings
- `loadStats()` - Loads usage statistics

## Data Flow

```
User copies text
       ↓
Content Script detects copy event
       ↓
Content Script sends to Background Worker
       ↓
Background Worker → AI Tagging Engine
       ↓
AI Tagging Engine analyzes content
       ↓
Background Worker → Storage Manager
       ↓
Storage Manager saves to IndexedDB
       ↓
Popup UI retrieves and displays items
```

## Adding New Features

### Adding a New Content Type

1. **Add pattern to AI Tagger** (`ai-tagger.js`):
   ```javascript
   this.patterns = {
     // ... existing patterns
     newType: /your-regex-pattern/
   };
   ```

2. **Update detection logic**:
   ```javascript
   detectContentType(content) {
     // ... existing checks
     if (this.patterns.newType.test(content)) {
       result.type = 'newType';
       result.tags.push('newType', 'related-tag');
       result.confidence = 0.95;
       return result;
     }
   }
   ```

3. **Add icon to popup** (`popup.js`):
   ```javascript
   getCategoryIcon(category) {
     const icons = {
       // ... existing icons
       newType: '<svg>...</svg>'
     };
   }
   ```

4. **Add filter tab** (`popup.html`):
   ```html
   <button class="filter-tab" data-category="newType">New Type</button>
   ```

### Adding a New Programming Language

1. **Add patterns** (`ai-tagger.js`):
   ```javascript
   this.codePatterns = {
     // ... existing languages
     newlang: [
       /\bkeyword1\b/,
       /\bkeyword2\b/,
       /specific-syntax/
     ]
   };
   ```

2. The `detectCodeLanguage()` function will automatically detect it.

### Adding New Entity Recognition

1. **Add pattern** (`ai-tagger.js`):
   ```javascript
   this.entityPatterns = {
     // ... existing patterns
     newEntity: /pattern-for-entity/g
   };
   ```

2. **Update extraction** (`extractEntities()`):
   ```javascript
   const newEntities = content.match(this.entityPatterns.newEntity);
   if (newEntities && newEntities.length > 0) {
     entities.push('newEntity', 'related-tag');
   }
   ```

## Debugging

### Using Chrome DevTools

1. **Background Service Worker**
   - Go to `chrome://extensions/`
   - Click "service worker" link under extension
   - Opens DevTools for background script

2. **Popup**
   - Right-click extension icon → Inspect popup
   - Opens DevTools for popup

3. **Content Script**
   - Open DevTools on any webpage
   - Content script logs appear in console

4. **Options Page**
   - Right-click on options page → Inspect
   - Opens DevTools for options page

### Common Issues

**Clipboard not capturing:**
- Check permissions in manifest.json
- Verify content script is injected
- Check for errors in background service worker

**IndexedDB errors:**
- Clear IndexedDB in DevTools → Application → IndexedDB
- Check for quota errors (1MB limit per item)

**AI tagging not working:**
- Check patterns in ai-tagger.js
- Verify confidence thresholds
- Add console.logs to debug analysis

**UI not updating:**
- Check message passing between components
- Verify storage operations complete
- Reload extension after changes

### Logging

Add debug logging throughout the codebase:

```javascript
// Background
console.log('[Background] Message received:', request);

// Storage
console.log('[Storage] Items saved:', items);

// AI Tagger
console.log('[AI] Analysis result:', analysis);

// Popup
console.log('[Popup] Loaded items:', allItems);
```

## Testing

### Manual Testing Checklist

**Basic Functionality:**
- [ ] Copy text from webpage → appears in popup
- [ ] Copy code snippet → detected correctly
- [ ] Copy URL → categorized as URL
- [ ] Copy email → categorized as email
- [ ] Copy phone → categorized as phone
- [ ] Copy JSON → validated and categorized

**Search & Filter:**
- [ ] Search by content works
- [ ] Search by tag works
- [ ] Category filters work
- [ ] Clear search works

**Item Actions:**
- [ ] Click item to copy works
- [ ] Pin/unpin works
- [ ] Delete item works
- [ ] Clear all works (keeps pinned)

**Settings:**
- [ ] Toggle monitoring works
- [ ] Excluded sites work
- [ ] Max items limit enforced
- [ ] Auto-cleanup works
- [ ] Settings persist after reload

**Keyboard Shortcuts:**
- [ ] Ctrl+Shift+V opens popup
- [ ] Ctrl+Shift+C pastes last item

**Privacy:**
- [ ] Sensitive content detection works
- [ ] Excluded sites not monitored
- [ ] Clear all removes data

### Performance Testing

1. **Add 50+ items** - Verify cleanup works
2. **Large content** - Test 1MB clipboard item
3. **Search performance** - Search with many items
4. **Memory usage** - Check with Chrome Task Manager
5. **Startup time** - Measure initialization speed

## Code Style Guide

### JavaScript

```javascript
// Use ES6+ features
const items = await getItems();

// Async/await over promises
async function loadData() {
  const data = await fetchData();
  return data;
}

// Descriptive names
function handleClipboardCopy(content, url) {
  // Clear, descriptive parameter names
}

// JSDoc comments
/**
 * Analyzes clipboard content
 * @param {string} content - Content to analyze
 * @param {string} url - Source URL
 * @returns {Object} - Analysis result
 */
function analyze(content, url) {
  // ...
}

// Error handling
try {
  await riskyOperation();
} catch (error) {
  console.error('Operation failed:', error);
  showToast('Error occurred', 'error');
}
```

### CSS

```css
/* Use CSS custom properties */
:root {
  --primary-color: #6366f1;
}

/* BEM naming convention */
.clipboard-item {}
.clipboard-item__header {}
.clipboard-item--pinned {}

/* Mobile-first responsive */
.container {
  width: 100%;
}

@media (min-width: 768px) {
  .container {
    width: 420px;
  }
}
```

### HTML

```html
<!-- Semantic HTML -->
<header class="header">
  <h1>Title</h1>
</header>

<main class="main">
  <section class="section">
    <article class="item">
      ...
    </article>
  </section>
</main>

<!-- Accessibility -->
<button aria-label="Delete item" title="Delete">
  <svg>...</svg>
</button>
```

## Performance Optimization

### IndexedDB Best Practices

1. **Use indexes** for frequently queried fields
2. **Batch operations** when possible
3. **Limit query results** with pagination
4. **Delete old data** regularly

### UI Optimization

1. **Virtual scrolling** for large lists (future enhancement)
2. **Debounce search** to avoid excessive queries
3. **CSS animations** over JavaScript
4. **Lazy load** images and heavy content

### Memory Management

1. **Clear references** to large objects
2. **Limit content size** (1MB max)
3. **Auto-cleanup** old items
4. **Cache frequently used data**

## Security Considerations

### Content Security Policy

The manifest.json includes a strict CSP:
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```

### Permissions

Request minimal permissions:
- `storage` - For IndexedDB
- `clipboardRead` - To read clipboard
- `clipboardWrite` - To write clipboard
- `activeTab` - For current tab only
- `scripting` - For content script injection

### Sensitive Data

1. **Detect credit cards** and flag as sensitive
2. **Allow disabling** sensitive content saving
3. **Exclude sites** from monitoring
4. **No external requests** - all processing local

## Release Process

### Version Numbering

Follow Semantic Versioning (SemVer):
- `1.0.0` - Major.Minor.Patch
- Major: Breaking changes
- Minor: New features, backward compatible
- Patch: Bug fixes

### Pre-release Checklist

- [ ] Test all features
- [ ] Update version in manifest.json
- [ ] Update CHANGELOG.md
- [ ] Update README.md if needed
- [ ] Test on different Chrome versions
- [ ] Test on different screen sizes
- [ ] Check for console errors
- [ ] Verify icons are correct
- [ ] Test fresh install
- [ ] Test upgrade from previous version

### Building for Production

1. **Remove development code**
   ```bash
   # Remove console.logs (optional)
   # Minify CSS/JS (optional)
   ```

2. **Create ZIP file**
   ```bash
   zip -r clipboard-history-v1.0.0.zip . \
     -x "*.git*" \
     -x "*.md" \
     -x "node_modules/*" \
     -x ".vscode/*"
   ```

3. **Test the ZIP**
   - Extract to new folder
   - Load unpacked in Chrome
   - Test all features

4. **Upload to Chrome Web Store**
   - Log in to Chrome Web Store Developer Dashboard
   - Upload ZIP file
   - Fill out store listing
   - Submit for review

## Troubleshooting

### Common Development Issues

**Extension not loading:**
- Check manifest.json syntax
- Verify all file paths are correct
- Look for errors in background service worker

**Changes not appearing:**
- Click reload button on extension card
- Hard refresh (Ctrl+Shift+R)
- Clear browser cache

**IndexedDB errors:**
- Check quota limits
- Verify object store schema
- Clear and reinitialize database

**Message passing fails:**
- Verify sender/receiver are active
- Check message format matches
- Add error handlers to catch failures

**CSS not loading:**
- Check file paths in HTML
- Verify manifest web_accessible_resources
- Clear browser cache

## Resources

### Chrome Extension Documentation
- [Manifest V3 Guide](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Extension APIs](https://developer.chrome.com/docs/extensions/reference/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

### Tools
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [Extension Reloader](https://chrome.google.com/webstore/detail/extensions-reloader/)
- [JSON Validator](https://jsonlint.com/)

### Community
- [Stack Overflow - Chrome Extensions](https://stackoverflow.com/questions/tagged/google-chrome-extension)
- [Reddit - r/ChromeExtensions](https://reddit.com/r/ChromeExtensions)

---

Happy coding! 🚀
