# Testing Guide - Clipboard History Pro

## Quick Start (3 Options)

### Option 1: Test Without Icons (Fastest)

Since we don't have PNG icons yet, you can test immediately by temporarily removing icon requirements:

1. **Comment out icons in manifest.json** (lines 6-10 and 27-31)
2. **Load in Chrome** - Chrome will use a default icon
3. **Test all features**

### Option 2: Use Online Icon Generator (Recommended)

1. Go to https://www.favicon-generator.org/
2. Upload any clipboard image or create a simple design
3. Download the generated icons
4. Rename them to: icon16.png, icon48.png, icon128.png
5. Place in the `icons/` directory
6. Load extension in Chrome

### Option 3: Create Simple Icons with ImageMagick (If Available)

```bash
# If you have ImageMagick installed
convert -size 16x16 xc:#6366f1 icons/icon16.png
convert -size 48x48 xc:#6366f1 icons/icon48.png
convert -size 128x128 xc:#6366f1 icons/icon128.png
```

---

## How to Load Extension in Chrome

### Step 1: Open Chrome Extensions Page

1. Open **Google Chrome**
2. Navigate to: `chrome://extensions/`
   - Or click: Menu (⋮) → Extensions → Manage Extensions

### Step 2: Enable Developer Mode

1. Toggle **"Developer mode"** ON (top right corner)
2. You'll see new buttons appear: "Load unpacked", "Pack extension", "Update"

### Step 3: Load the Extension

1. Click **"Load unpacked"** button
2. Navigate to your extension folder: `/home/user/Clipboard-History`
3. Click **"Select Folder"**
4. The extension should now appear in your extensions list

### Step 4: Grant Permissions

When first loaded, Chrome may ask for permissions:
- ✅ **Read and change clipboard** - Required for clipboard monitoring
- ✅ **Read your browsing history** - For content scripts on all pages
- Click **"Allow"** or **"Grant permissions"**

---

## Testing Checklist

### 1. Basic Clipboard Capture

- [ ] Copy text from any webpage
- [ ] Click extension icon in toolbar
- [ ] Verify copied text appears in popup

### 2. AI Categorization

Test different content types:

- [ ] **Plain Text**: Copy paragraph → Should tag as "text"
- [ ] **URL**: Copy https://github.com → Should tag as "url"
- [ ] **Email**: Copy test@example.com → Should tag as "email"
- [ ] **Code**: Copy `function test() { return true; }` → Should detect "javascript"
- [ ] **JSON**: Copy `{"name": "test"}` → Should tag as "json"
- [ ] **Phone**: Copy (555) 123-4567 → Should tag as "phone"

### 3. Search & Filter

- [ ] Type in search box → Items filter instantly
- [ ] Click category tabs (All, Text, Code, URLs, JSON)
- [ ] Each filter shows only matching items

### 4. Pin/Unpin Items

- [ ] Hover over item → Action buttons appear
- [ ] Click star icon → Item moves to top with yellow highlight
- [ ] Click star again → Item unpins

### 5. Copy to Clipboard

- [ ] Click any item → Should copy to clipboard
- [ ] Paste (Ctrl+V) → Should paste the copied content
- [ ] Toast notification "Copied to clipboard!" appears

### 6. Delete Items

- [ ] Click trash icon on item → Item disappears
- [ ] Item is removed from list

### 7. Clear All

- [ ] Click "Clear All" button
- [ ] Confirm dialog appears
- [ ] Non-pinned items are deleted
- [ ] Pinned items remain

### 8. Keyboard Shortcuts

- [ ] Press `Ctrl+Shift+V` → Popup opens
- [ ] Press `Ctrl+Shift+C` → Last item is copied

### 9. Settings Page

- [ ] Click gear icon in popup → Settings page opens
- [ ] Navigate between tabs (General, Privacy, AI, Shortcuts, About)
- [ ] Toggle "Enable Clipboard Monitoring" OFF → Copying stops
- [ ] Toggle back ON → Copying resumes
- [ ] Add site to excluded list → That site no longer monitors
- [ ] View statistics in About tab

### 10. Privacy Features

- [ ] Add "*.example.com" to excluded sites
- [ ] Visit example.com and copy text
- [ ] Verify text is NOT saved
- [ ] Copy credit card number (test: 4111-1111-1111-1111)
- [ ] Should detect as "sensitive" (if enabled in settings)

---

## Common Issues & Solutions

### Extension doesn't load
- **Check manifest.json syntax** - Must be valid JSON
- **Check console errors** - Click "Errors" button on extension card
- **Try removing icons temporarily** - Comment out icon references

### Clipboard not capturing
- **Grant permissions** - Click "Details" → Check all permissions are granted
- **Reload extension** - Click reload icon on extension card
- **Check content script** - Open DevTools on webpage, look for console messages

### Popup is blank
- **Right-click extension icon → Inspect popup**
- **Check console for errors**
- **Verify popup.html and popup.js are loaded correctly**

### AI tagging not working
- **Check browser console** for JavaScript errors
- **Verify ai-tagger.js is loaded as module**
- **Test with simple content first** (e.g., plain URL)

### IndexedDB errors
- **Clear storage**: DevTools → Application → IndexedDB → ClipboardHistoryDB → Delete
- **Reload extension**
- **Try copying again**

---

## Debug Mode

### View Background Service Worker Logs

1. Go to `chrome://extensions/`
2. Find your extension
3. Click **"service worker"** link
4. DevTools opens showing console logs

### View Popup Logs

1. Right-click extension icon
2. Select **"Inspect popup"**
3. DevTools opens for popup

### View Content Script Logs

1. Open DevTools on any webpage (F12)
2. Console tab shows content script logs
3. Look for: "Clipboard History: Content script loaded"

---

## Performance Testing

### Test with Many Items

```javascript
// Run in popup DevTools console to add 50 test items
for (let i = 1; i <= 50; i++) {
  chrome.runtime.sendMessage({
    action: 'SAVE_CLIPBOARD',
    data: {
      content: `Test item ${i}: Lorem ipsum dolor sit amet`,
      url: 'https://test.com'
    }
  });
}
```

### Monitor Memory Usage

1. Open Chrome Task Manager: Shift+Esc
2. Find "Extension: Clipboard History Pro"
3. Monitor memory usage as you add items
4. Should stay under 50MB for 50 items

---

## Success Criteria

Extension is working correctly if:

✅ Copied text appears in popup within 1 second
✅ AI correctly categorizes at least 80% of content types
✅ Search returns results instantly
✅ UI is responsive and smooth
✅ No console errors in normal operation
✅ Statistics update correctly
✅ Settings persist after reload
✅ Memory usage stays reasonable (<50MB)

---

## Next Steps After Testing

1. **Add proper icons** - Create or download 16x16, 48x48, 128x128 PNG icons
2. **Test on different websites** - GitHub, Google Docs, StackOverflow, etc.
3. **Test edge cases** - Very long text, special characters, unicode
4. **Gather feedback** - Share with friends/colleagues
5. **Polish UI** - Adjust colors, spacing, animations
6. **Prepare for launch** - Screenshots, store listing, privacy policy

---

## Automated Testing (Future)

Consider adding:
- Unit tests for AI tagging engine
- Integration tests for storage operations
- E2E tests with Puppeteer
- Performance benchmarks

For now, manual testing is sufficient for v1.0!
