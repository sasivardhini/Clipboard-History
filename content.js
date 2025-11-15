/**
 * Content Script
 * Runs on web pages to capture clipboard events
 */

// Track last clipboard content to avoid duplicates
let lastProcessedContent = '';

/**
 * Listen for copy events
 */
document.addEventListener('copy', async (event) => {
  try {
    // Small delay to ensure clipboard is updated
    setTimeout(async () => {
      const copiedText = await navigator.clipboard.readText();

      if (copiedText && copiedText !== lastProcessedContent) {
        lastProcessedContent = copiedText;

        // Send to background script
        chrome.runtime.sendMessage({
          action: 'SAVE_CLIPBOARD',
          data: {
            content: copiedText,
            url: window.location.href
          }
        }).catch(() => {
          // Extension context invalidated, ignore
        });
      }
    }, 100);
  } catch (error) {
    // Clipboard access denied or error
    console.debug('Clipboard access error:', error);
  }
});

/**
 * Listen for cut events
 */
document.addEventListener('cut', async (event) => {
  try {
    // Small delay to ensure clipboard is updated
    setTimeout(async () => {
      const cutText = await navigator.clipboard.readText();

      if (cutText && cutText !== lastProcessedContent) {
        lastProcessedContent = cutText;

        // Send to background script
        chrome.runtime.sendMessage({
          action: 'SAVE_CLIPBOARD',
          data: {
            content: cutText,
            url: window.location.href
          }
        }).catch(() => {
          // Extension context invalidated, ignore
        });
      }
    }, 100);
  } catch (error) {
    // Clipboard access denied or error
    console.debug('Clipboard access error:', error);
  }
});

/**
 * Listen for messages from background script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { action } = request;

  switch (action) {
    case 'CHECK_CLIPBOARD':
      checkClipboard().then(sendResponse);
      return true;

    case 'PASTE_CONTENT':
      pasteContent(request.data.content);
      sendResponse({ success: true });
      return false;

    default:
      return false;
  }
});

/**
 * Check clipboard content (called periodically by background script)
 */
async function checkClipboard() {
  try {
    const clipboardText = await navigator.clipboard.readText();

    if (clipboardText && clipboardText !== lastProcessedContent) {
      lastProcessedContent = clipboardText;

      // Send to background script
      chrome.runtime.sendMessage({
        action: 'SAVE_CLIPBOARD',
        data: {
          content: clipboardText,
          url: window.location.href
        }
      });

      return { success: true };
    }

    return { success: false, reason: 'no_change' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Paste content to active element
 */
function pasteContent(content) {
  const activeElement = document.activeElement;

  if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) {
    if (activeElement.isContentEditable) {
      // For contenteditable elements
      document.execCommand('insertText', false, content);
    } else {
      // For input and textarea
      const start = activeElement.selectionStart;
      const end = activeElement.selectionEnd;
      const value = activeElement.value;

      activeElement.value = value.substring(0, start) + content + value.substring(end);
      activeElement.selectionStart = activeElement.selectionEnd = start + content.length;

      // Trigger input event
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
  } else {
    // Copy to clipboard as fallback
    navigator.clipboard.writeText(content);
  }
}

/**
 * Show notification (optional feature)
 */
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `clipboard-history-notification clipboard-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #333;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 999999;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease-out;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// Add animation styles
if (!document.getElementById('clipboard-history-styles')) {
  const style = document.createElement('style');
  style.id = 'clipboard-history-styles';
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }

    .clipboard-info {
      background: #4CAF50 !important;
    }

    .clipboard-warning {
      background: #FF9800 !important;
    }

    .clipboard-error {
      background: #F44336 !important;
    }
  `;
  document.head.appendChild(style);
}

console.log('Clipboard History: Content script loaded');
