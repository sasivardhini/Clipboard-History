# 🚀 Quick Start - Test in 2 Minutes!

## Fastest Way to Test (No Icons Needed)

### Step 1: Swap Manifest File

```bash
# Backup original and use no-icons version
cd /home/user/Clipboard-History
mv manifest.json manifest-with-icons.json
mv manifest-no-icons.json manifest.json
```

### Step 2: Load in Chrome

1. Open Chrome and go to: **chrome://extensions/**
2. Toggle **Developer mode** ON (top right)
3. Click **Load unpacked**
4. Select folder: `/home/user/Clipboard-History`
5. Click **Select Folder**

### Step 3: Test It!

1. **Copy some text** from any webpage
2. **Click the extension icon** in Chrome toolbar
3. **See your clipboard history!** ✨

---

## Full Instructions

See **TESTING_GUIDE.md** for comprehensive testing instructions.

---

## If You Want Icons

### Option A: Use ImageMagick (if available)

```bash
cd /home/user/Clipboard-History
convert -size 16x16 xc:#6366f1 icons/icon16.png
convert -size 48x48 xc:#6366f1 icons/icon48.png
convert -size 128x128 xc:#6366f1 icons/icon128.png

# Then restore original manifest
mv manifest.json manifest-no-icons.json
mv manifest-with-icons.json manifest.json
```

### Option B: Download Icons

1. Visit: https://www.flaticon.com/free-icon/clipboard_3502601
2. Download in sizes: 16, 48, 128
3. Save as icon16.png, icon48.png, icon128.png in `icons/` folder
4. Restore original manifest

### Option C: Create in Any Image Editor

- Size: 16x16, 48x48, 128x128 pixels
- Background: #6366f1 (indigo)
- Add a clipboard icon symbol
- Export as PNG
- Name: icon16.png, icon48.png, icon128.png

---

## What to Test

### Basic Features (5 mins)
- ✅ Copy text → appears in popup
- ✅ Click item → copies back to clipboard
- ✅ Search for items
- ✅ Filter by category
- ✅ Pin/unpin items
- ✅ Delete items

### AI Tagging (2 mins)
Copy these and see AI detect them:
- `https://github.com` → URL
- `test@example.com` → Email
- `function test() { return 1; }` → JavaScript
- `{"name": "test"}` → JSON
- `(555) 123-4567` → Phone

### Advanced (3 mins)
- ⚙️ Open settings (gear icon)
- 🔍 Test keyboard shortcut: Ctrl+Shift+V
- 📊 Check statistics in About tab
- 🔒 Add excluded site in Privacy tab

---

## Troubleshooting

**Extension won't load?**
- Make sure you're using the no-icons manifest
- Check console for errors

**Clipboard not capturing?**
- Grant permissions when prompted
- Reload the extension

**Still stuck?**
See TESTING_GUIDE.md for detailed debugging steps.

---

**Ready to test? Let's go!** 🎉
