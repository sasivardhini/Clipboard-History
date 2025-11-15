# Clipboard History Pro - AI Powered

> Never lose copied text again! Smart clipboard manager with AI-powered tagging and intelligent categorization.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Chrome](https://img.shields.io/badge/chrome-extension-orange)

## Overview

Clipboard History Pro is a powerful Chrome extension that stores your last 50 copied items with AI-powered smart tagging and categorization. Built from scratch with modern web technologies, it offers a seamless experience for managing your clipboard history.

### Key Features

- **50 Clipboard Items** - Store and access your last 50 copied items
- **AI-Powered Smart Tagging** - Automatically categorize content as Code, URL, Email, Phone, JSON, etc.
- **Intelligent Search** - Find items quickly by content or AI-generated tags
- **Pin Favorites** - Keep important items at the top
- **Privacy First** - All data stored locally, no external servers
- **Category Filters** - Quick filter by content type
- **Code Language Detection** - Automatically detect programming languages
- **Topic Extraction** - Extract key topics from text content
- **Entity Recognition** - Identify emails, URLs, dates, currencies, and more
- **Keyboard Shortcuts** - Quick access with Ctrl+Shift+V
- **Privacy Controls** - Exclude sensitive sites from monitoring
- **Modern UI** - Clean, responsive design with smooth animations

## Screenshot

```
┌─────────────────────────────────────┐
│  📋 Clipboard History               │
├─────────────────────────────────────┤
│  🔍 Search...                       │
├─────────────────────────────────────┤
│  [All] [Text] [Code] [URLs] [JSON] │
├─────────────────────────────────────┤
│  Total: 23  Pinned: 3   [Clear]    │
├─────────────────────────────────────┤
│  ⭐ CODE • JavaScript               │
│  function handleClick() {...        │
│  [javascript] [code] [function]     │
│  2h ago • 45 words                  │
├─────────────────────────────────────┤
│  📄 TEXT                            │
│  Meeting notes from today's...     │
│  [meeting] [notes] [work]           │
│  5h ago • 127 words                 │
└─────────────────────────────────────┘
```

## AI Tagging Engine

The extension uses advanced pattern matching and NLP techniques to intelligently categorize clipboard content:

### Content Types Detected

- **Code** - Detects 15+ programming languages (JavaScript, Python, Java, C++, etc.)
- **URL** - Validates and categorizes web links
- **Email** - Identifies email addresses
- **Phone** - Recognizes phone numbers
- **JSON** - Validates JSON data structures
- **Color** - Hex color codes
- **UUID** - Unique identifiers
- **IP Address** - Network addresses
- **Base64** - Encoded strings
- **Markdown** - Formatted text
- **Sensitive** - Credit cards, passwords (optional saving)

### Smart Features

- **Entity Recognition** - Extracts currencies, percentages, hashtags, mentions, file paths, dates, times
- **Topic Extraction** - Identifies key topics from text using word frequency analysis
- **Code Language Detection** - Matches patterns for 15+ programming languages
- **Confidence Scoring** - AI assigns confidence levels to categorizations
- **Metadata Generation** - Adds word count, line count, domain info, etc.

## Installation

### For Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/clipboard-history.git
   cd clipboard-history
   ```

2. **Add extension icons** (see `icons/README.md` for requirements)

3. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `Clipboard-History` directory

4. **Grant permissions**
   - The extension will request clipboard access
   - Accept permissions to enable clipboard monitoring

### For Production

1. Package the extension:
   ```bash
   zip -r clipboard-history-v1.0.0.zip . -x "*.git*" "*.md" "node_modules/*"
   ```

2. Submit to Chrome Web Store

## Usage

### Basic Usage

1. **Copy text anywhere** - The extension automatically captures it
2. **Open popup** - Click extension icon or press `Ctrl+Shift+V`
3. **Search & filter** - Find items by content or category
4. **Click to copy** - Click any item to copy it back to clipboard
5. **Pin favorites** - Click star icon to keep items at top

### Keyboard Shortcuts

- `Ctrl+Shift+V` (Mac: `Cmd+Shift+V`) - Open clipboard history
- `Ctrl+Shift+C` (Mac: `Cmd+Shift+C`) - Quick paste last item

Customize shortcuts at `chrome://extensions/shortcuts`

### Privacy Controls

1. **Exclude sensitive sites**
   - Open Settings (gear icon in popup)
   - Go to Privacy tab
   - Add sites to exclude list (supports wildcards)
   - Example: `*.banking.com`, `passwords.example.com`

2. **Disable sensitive content saving**
   - Settings → Privacy
   - Toggle "Save Sensitive Content" off
   - Credit cards and passwords won't be saved

3. **Clear history**
   - Click "Clear All" in popup (keeps pinned items)
   - Or Settings → Privacy → "Clear All Clipboard Data"

## Architecture

### File Structure

```
clipboard-history/
├── manifest.json           # Extension configuration
├── background.js          # Service worker (clipboard monitoring)
├── content.js            # Content script (clipboard capture)
├── popup.html            # Popup UI structure
├── popup.js              # Popup UI logic
├── options.html          # Settings page structure
├── options.js            # Settings page logic
├── storage.js            # IndexedDB storage manager
├── ai-tagger.js          # AI tagging engine
├── styles/
│   ├── popup.css        # Popup styles
│   └── options.css      # Settings styles
└── icons/
    ├── icon16.png       # 16x16 toolbar icon
    ├── icon48.png       # 48x48 management icon
    └── icon128.png      # 128x128 store icon
```

### Technology Stack

- **Manifest V3** - Latest Chrome extension standard
- **IndexedDB** - Efficient local storage for clipboard items
- **Vanilla JavaScript** - No dependencies, pure JS modules
- **CSS3** - Modern styling with animations
- **Service Workers** - Background clipboard monitoring

### Data Storage

All data is stored locally using IndexedDB:

- **Database**: `ClipboardHistoryDB`
- **Store**: `clipboardItems`
- **Max Items**: 50 (excluding pinned)
- **Indexes**: timestamp, category, isPinned, tags

### AI Processing

All AI tagging happens **locally** on your device:
- No external API calls
- No data sent to servers
- Pattern matching and NLP algorithms run in browser
- Privacy-first architecture

## Development

### Adding New Features

1. **Add new content type detection**
   - Edit `ai-tagger.js`
   - Add pattern to `patterns` object
   - Update `detectContentType()` function

2. **Add new entity recognition**
   - Edit `ai-tagger.js`
   - Add pattern to `entityPatterns`
   - Update `extractEntities()` function

3. **Add new programming language**
   - Edit `ai-tagger.js`
   - Add patterns to `codePatterns` object

### Code Style

- Use ES6+ features (modules, arrow functions, async/await)
- Follow JSDoc comments for functions
- Use descriptive variable names
- Keep functions small and focused
- Add error handling for all async operations

### Testing

Test the extension thoroughly:

1. **Clipboard capture** - Copy text from various sources
2. **Category detection** - Test all content types
3. **Search functionality** - Search by content and tags
4. **Pin/unpin** - Test pinning items
5. **Delete** - Test individual and bulk deletion
6. **Privacy** - Test excluded sites feature
7. **Shortcuts** - Test keyboard shortcuts
8. **Settings** - Test all settings options

## Performance

- **Fast search** - IndexedDB with indexes for quick queries
- **Efficient storage** - Automatic cleanup of old items
- **Low memory** - Max 1MB per clipboard item
- **Smooth UI** - CSS animations and transitions
- **Minimal CPU** - Clipboard check every 1 second

## Security

- **Local storage only** - No cloud sync, all data stays on device
- **Sensitive content detection** - Automatically flags credit cards
- **Site exclusion** - Block monitoring on sensitive sites
- **No tracking** - No analytics or telemetry
- **Secure permissions** - Minimal required permissions

## Future Enhancements (Premium)

### Planned Features for Monetization ($5-12/mo)

- **Unlimited History** - Store more than 50 items
- **Cloud Sync** - Sync across devices
- **Team Sharing** - Share clipboard items with team
- **Advanced AI** - GPT-powered summaries and insights
- **Export/Import** - Backup and restore data
- **Smart Collections** - AI-organized folders
- **Snippet Templates** - Reusable text templates
- **Custom Tags** - Manual tag addition
- **Search Filters** - Advanced search operators
- **Dark Mode** - Theme customization

## Browser Compatibility

- ✅ Google Chrome (v88+)
- ✅ Microsoft Edge (v88+)
- ✅ Brave Browser
- ✅ Any Chromium-based browser

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/clipboard-history/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/clipboard-history/discussions)
- **Email**: support@example.com

## Changelog

### Version 1.0.0 (2025-01-15)

- ✨ Initial release
- ✨ AI-powered tagging engine
- ✨ Store last 50 clipboard items
- ✨ Smart search and filters
- ✨ Pin favorite items
- ✨ Privacy controls
- ✨ Keyboard shortcuts
- ✨ Modern UI with animations
- ✨ 15+ programming language detection
- ✨ Entity recognition
- ✨ Local-first architecture

## Acknowledgments

- Built with inspiration from clipboard managers like Paste, CopyClip, and Ditto
- Icon design inspired by modern UI/UX principles
- AI categorization techniques from NLP research papers

---

**Built with ❤️ for developers and power users**

*Never lose copied text again!*
