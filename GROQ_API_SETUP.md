# GROQ AI Setup Instructions

## Quick Setup (30 seconds)

**Note:** You'll need a GROQ API key. Get one free at: https://console.groq.com

### Method 1: Browser Console (Easiest)

1. Load the extension in Chrome
2. Open the extension popup
3. Press F12 to open Developer Tools
4. Go to Console tab
5. Paste this command with YOUR API key and press Enter:

```javascript
chrome.storage.sync.set({ groqApiKey: 'YOUR_GROQ_API_KEY_HERE' }, () => {
  console.log('✓ GROQ API key saved! Reload the extension.');
});
```

6. Reload the extension (chrome://extensions → click reload)
7. Done! AI analysis is now active.

### Method 2: Settings Page (Future)

Once the settings UI is ready:
1. Right-click extension icon → Options
2. Go to "AI Settings" tab
3. Paste your GROQ API key
4. Click "Save"

### Verify It's Working

1. Copy any text
2. Open the extension popup
3. Look for the "GROQ" badge with lightning icon ⚡
4. Check console for: `✓ GROQ AI initialized (API key loaded)`

## About GROQ

- **Model**: Llama 3.1-8b-instant
- **Speed**: 10x faster than GPT-4
- **Cost**: Very affordable
- **Privacy**: Your content is analyzed but not stored by GROQ

## Troubleshooting

**No "GROQ" badge appearing?**
- Check console for "No GROQ API key - using fallback"
- Re-run the setup command above
- Reload the extension

**Still not working?**
- Open background page: chrome://extensions → Details → "background page"
- Check console for errors
- Verify API key is set: `chrome.storage.sync.get(['groqApiKey'], console.log)`

**Want to disable GROQ AI?**
```javascript
chrome.storage.sync.set({ groqApiKey: '' });
```
Extension will fall back to local pattern matching.

## API Key Storage

- Stored in chrome.storage.sync (encrypted by Chrome)
- Syncs across your Chrome browsers
- Private to your extension
- Can be changed anytime
