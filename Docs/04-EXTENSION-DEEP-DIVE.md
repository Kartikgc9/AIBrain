# Browser Extension Deep Dive

## Table of Contents
1. [Service Worker Details](#service-worker-details)
2. [Content Script Injection](#content-script-injection)
3. [Search Panel Implementation](#search-panel-implementation)
4. [Memory Insertion Logic](#memory-insertion-logic)
5. [Platform Detection](#platform-detection)
6. [Build System (Vite)](#build-system-vite)

---

## Service Worker Details

### File: `background/index.ts`

The service worker is the extension's central hub.

### Memory Data Model

```typescript
interface Memory {
    id: string;           // UUID for unique identification
    userId: string;       // User identifier (local_user for offline)
    content: string;      // The actual memory text (max 1000 chars)
    type: MemoryType;     // Category of memory
    scope: MemoryScope;   // Visibility/context scope
    source: {
        url: string;      // Page URL where captured
        platform: string; // Domain name
        timestamp: number;// Unix timestamp
    };
    createdAt: number;    // When created
    updatedAt: number;    // Last modified
    confidence: number;   // Reliability score (0-1)
    tags: string[];       // Categorization tags
    embedding?: number[]; // Vector for semantic search (optional)
}

type MemoryType = 'preference' | 'fact' | 'task' | 'project' | 'meta';
type MemoryScope = 'user_global' | 'session' | 'site' | 'conversation';
```

### IndexedDB Initialization

```typescript
const DB_NAME = 'MemoryLayerDB';
const STORE_NAME = 'memories';

let dbInstance: IDBDatabase | null = null;

async function initDB(): Promise<IDBDatabase> {
    // Return existing connection if available
    if (dbInstance) return dbInstance;

    return new Promise((resolve, reject) => {
        // Open database with version 1
        const request = indexedDB.open(DB_NAME, 1);

        // Handle errors
        request.onerror = () => {
            console.error("[AI Brain] DB open error:", request.error);
            reject(request.error);
        };

        // Database opened successfully
        request.onsuccess = () => {
            dbInstance = request.result;
            resolve(dbInstance);
        };

        // First time setup or version upgrade
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // Create object store if it doesn't exist
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}
```

### Message Handling Pattern

```typescript
chrome.runtime.onMessage.addListener(
    (message: Message, sender: chrome.runtime.MessageSender, sendResponse) => {

    // Log for debugging
    console.log("[AI Brain] Received message:", message.type);

    // Route based on message type
    switch (message.type) {
        case 'CAPTURE_CONVERSATION':
            handleCapture(message.payload as CapturePayload)
                .then(sendResponse)
                .catch(error => sendResponse({
                    success: false,
                    message: error.message
                }));
            return true;  // ASYNC RESPONSE

        case 'GET_STATS':
            handleGetStats()
                .then(sendResponse);
            return true;

        case 'SEARCH_MEMORIES':
            handleSearch(message.payload as SearchPayload)
                .then(sendResponse);
            return true;

        default:
            return false;  // Sync, no response needed
    }
});
```

**Important:** `return true` tells Chrome to keep the message channel open for async responses.

### Search Algorithm

```typescript
async function searchMemories(params: SearchPayload): Promise<Memory[]> {
    const { query, embedding, limit = 20, filter } = params;

    // Get all memories from IndexedDB
    let allMemories = await getAllMemories();

    // Step 1: Apply filters first (reduces search space)
    if (filter) {
        allMemories = allMemories.filter(m => matchesFilter(m, filter));
    }

    // Step 2: Choose search strategy
    if (embedding && embedding.length > 0) {
        // Semantic search using cosine similarity
        const scored = allMemories.map(m => ({
            memory: m,
            score: cosineSimilarity(embedding, m.embedding || [])
        }));
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, limit).map(s => s.memory);
    }

    if (query) {
        // Text-based search
        const scored = allMemories.map(m => ({
            memory: m,
            score: textSearchScore(m, query)
        }));
        scored.sort((a, b) => b.score - a.score);
        return scored
            .filter(s => s.score > 0.1)  // Minimum threshold
            .slice(0, limit)
            .map(s => s.memory);
    }

    // No search criteria - return most recent
    return allMemories.slice(0, limit);
}
```

---

## Content Script Injection

### File: `universalContent.ts`

This script is injected into supported AI platforms.

### Button Injection

```typescript
function injectButton() {
    // Prevent duplicate buttons
    if (document.getElementById('ai-brain-btn')) return;

    // Detect current platform
    const platform = detectPlatform();
    if (!platform) return;

    // Get platform-specific config
    const config = platformConfigs[platform];
    if (!config) return;

    // Create and inject button
    const button = createAIBrainButton();

    try {
        config.injectButton(button);
        console.log(`[AI Brain] Button injected on ${config.name}`);
    } catch (error) {
        console.error('[AI Brain] Failed to inject button:', error);
    }
}
```

### Platform-Specific Configurations

```typescript
const platformConfigs: Record<string, PlatformConfig> = {
    'chatgpt': {
        name: 'ChatGPT',
        promptSelector: 'textarea[data-id="root"]',
        buttonPosition: 'after',
        injectButton: (button) => {
            const textarea = document.querySelector('textarea[data-id="root"]');
            if (textarea?.parentElement) {
                // Find send button and insert before it
                const sendButton = textarea.parentElement
                    .querySelector('button[data-testid="send-button"]');

                if (sendButton?.parentElement) {
                    sendButton.parentElement.insertBefore(button, sendButton);
                } else {
                    textarea.parentElement.appendChild(button);
                }
            }
        }
    },

    'claude': {
        name: 'Claude',
        promptSelector: 'div[contenteditable="true"]',
        buttonPosition: 'after',
        injectButton: (button) => {
            const editor = document.querySelector('div[contenteditable="true"]');
            const container = editor?.closest('fieldset') || editor?.parentElement;
            if (container) {
                container.appendChild(button);
            }
        }
    }
    // ... more platforms
};
```

### SPA Navigation Handling

Single Page Applications (like ChatGPT) don't trigger full page loads:

```typescript
// Initial injection
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
} else {
    injectButton();
}

// Re-inject on SPA navigation
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        // Delay to let new page content render
        setTimeout(injectButton, 1000);
    }
}).observe(document, { subtree: true, childList: true });
```

---

## Search Panel Implementation

### File: `searchPanel.ts`

The search panel is a floating overlay created entirely with JavaScript.

### Class Structure

```typescript
class MemorySearchPanel {
    private panel: HTMLElement | null = null;
    private state: SearchState = {
        query: '',
        filter: {},
        results: [],
        selectedIndex: -1,
        isLoading: false,
        showFilters: false
    };
    private debounceTimer: number | null = null;
    private isDragging = false;
    private dragOffset = { x: 0, y: 0 };
    private onInsertCallback: ((memory: any) => void) | null = null;
}
```

### Panel Creation (Dynamic HTML)

```typescript
private createPanel() {
    const panel = document.createElement('div');
    panel.id = 'aibrain-search-panel';

    // Inline styles (important for extension isolation)
    panel.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        width: 380px;
        height: 600px;
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
        z-index: 999999;  /* Very high to stay on top */
        display: flex;
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #e0e0e0;
        overflow: hidden;
    `;

    panel.innerHTML = `
        <div id="aibrain-panel-header">...</div>
        <div id="aibrain-search-area">...</div>
        <div id="aibrain-results-container">...</div>
        <div id="aibrain-footer">...</div>
    `;

    this.panel = panel;
    this.attachEventListeners();
}
```

### Draggable Panel

```typescript
private startDrag(e: MouseEvent) {
    if (!this.panel) return;
    this.isDragging = true;

    // Calculate offset from mouse to panel corner
    const rect = this.panel.getBoundingClientRect();
    this.dragOffset.x = e.clientX - rect.left;
    this.dragOffset.y = e.clientY - rect.top;
}

private drag(e: MouseEvent) {
    if (!this.isDragging || !this.panel) return;

    // Move panel to follow mouse
    const x = e.clientX - this.dragOffset.x;
    const y = e.clientY - this.dragOffset.y;

    this.panel.style.left = `${x}px`;
    this.panel.style.top = `${y}px`;
    this.panel.style.right = 'auto';  // Override initial right positioning
}

private stopDrag() {
    if (this.isDragging && this.panel) {
        this.isDragging = false;
        this.savePosition();  // Persist to localStorage
    }
}
```

### Debounced Search

Prevents API spam while typing:

```typescript
private debouncedSearch() {
    // Clear previous timer
    if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
    }

    // Set new timer
    this.debounceTimer = window.setTimeout(() => {
        this.performSearch();
    }, 300);  // Wait 300ms after last keystroke
}
```

### Keyboard Navigation

```typescript
private handleKeydown(e: KeyboardEvent) {
    switch (e.key) {
        case 'Escape':
            e.preventDefault();
            this.hide();
            break;

        case 'ArrowDown':
            e.preventDefault();
            this.state.selectedIndex = Math.min(
                this.state.selectedIndex + 1,
                this.state.results.length - 1
            );
            this.updateSelection();
            break;

        case 'ArrowUp':
            e.preventDefault();
            this.state.selectedIndex = Math.max(
                this.state.selectedIndex - 1,
                0
            );
            this.updateSelection();
            break;

        case 'Enter':
            e.preventDefault();
            if (this.state.selectedIndex >= 0) {
                this.insertMemory(this.state.results[this.state.selectedIndex]);
            }
            break;
    }
}
```

---

## Memory Insertion Logic

### File: `insertMemory.ts`

Handles inserting memory content into chat inputs across platforms.

### Platform Detection Array

```typescript
const platforms: PlatformConfig[] = [
    {
        name: 'ChatGPT',
        detect: () => window.location.hostname.includes('chatgpt.com'),
        insert: (content: string) => {
            // Multiple selectors for robustness
            const selectors = [
                'textarea[data-id="root"]',
                'textarea#prompt-textarea',
                'div[contenteditable="true"]'
            ];

            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (insertIntoElement(element, content)) {
                    return true;
                }
            }
            return false;
        }
    },
    // ... more platforms
];
```

### Input Type Handling

```typescript
// For textarea elements
if (element instanceof HTMLTextAreaElement) {
    const currentValue = element.value;
    const newValue = currentValue ? `${currentValue}\n\n${content}` : content;

    element.value = newValue;

    // Trigger events so React/Vue/Angular detect change
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.focus();

    return true;
}

// For contenteditable elements (Claude, some ChatGPT versions)
if (element instanceof HTMLElement && element.isContentEditable) {
    const currentText = element.innerText;
    const newText = currentText ? `${currentText}\n\n${content}` : content;

    element.innerText = newText;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.focus();

    // Move cursor to end
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false);  // false = collapse to end
    selection?.removeAllRanges();
    selection?.addRange(range);

    return true;
}
```

### Fallback: Clipboard

```typescript
async function copyToClipboard(content: string): Promise<void> {
    try {
        await navigator.clipboard.writeText(content);
        showNotification('Memory copied to clipboard!', 'info');
    } catch (error) {
        console.error('[AIBrain] Clipboard write failed:', error);
        showNotification('Failed to copy memory', 'error');
    }
}
```

### CSS Animation Injection

```typescript
let animationsInjected = false;

function injectAnimations() {
    if (animationsInjected) return;

    const style = document.createElement('style');
    style.textContent = `
        @keyframes aibrain-slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes aibrain-slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    animationsInjected = true;
}
```

---

## Platform Detection

### Centralized Detection Function

```typescript
// In insertMemory.ts (exported for reuse)
export function detectPlatform(): string {
    for (const platform of platforms) {
        if (platform.detect()) {
            return platform.name;
        }
    }
    return 'Unknown';
}

// In universalContent.ts (uses the shared function)
import { detectPlatform as detectPlatformName } from './insertMemory';

const platformNameToKey: Record<string, string> = {
    'ChatGPT': 'chatgpt',
    'Claude': 'claude',
    'Perplexity': 'perplexity',
    'Gemini': 'gemini',
    'Grok': 'grok'
};

function detectPlatform(): string | null {
    const platformName = detectPlatformName();
    if (platformName === 'Unknown') return null;
    return platformNameToKey[platformName] || null;
}
```

---

## Build System (Vite)

### File: `vite.config.ts`

Vite bundles the extension for production.

### Configuration

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react()],

    build: {
        rollupOptions: {
            input: {
                // Multiple entry points
                popup: resolve(__dirname, 'popup.html'),
                background: resolve(__dirname, 'src/background/index.ts'),
                universalContent: resolve(__dirname, 'src/content-scripts/universalContent.ts')
            },
            output: {
                entryFileNames: 'src/[name]/index.js',
                chunkFileNames: 'src/[name]/[hash].js'
            }
        },
        outDir: 'dist',
        emptyOutDir: true
    }
});
```

### Build Process

```
Source Files                    Built Files
─────────────                   ───────────
src/background/index.ts    ──►  dist/src/background/index.js
src/popup/Popup.tsx        ──►  dist/src/popup/index.js
src/content-scripts/*.ts   ──►  dist/src/universalContent/index.js
public/manifest.json       ──►  dist/manifest.json
public/*.png               ──►  dist/*.png
```

### Why Vite?

| Feature | Benefit |
|---------|---------|
| Fast HMR | Instant updates during development |
| ES Modules | Native browser support |
| Tree Shaking | Removes unused code |
| TypeScript | Built-in support |
| React | Plugin available |
| Small Bundles | Optimized for production |
