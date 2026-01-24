# Development Patterns and Best Practices

## Table of Contents
1. [Code Organization Patterns](#code-organization-patterns)
2. [Error Handling](#error-handling)
3. [Security Best Practices](#security-best-practices)
4. [Performance Optimization](#performance-optimization)
5. [Testing Strategies](#testing-strategies)
6. [Debugging Tips](#debugging-tips)

---

## Code Organization Patterns

### 1. Singleton Pattern

Used for services and stores that should have one instance:

```typescript
// BrowserStore - single database connection
let searchPanelInstance: MemorySearchPanel | null = null;

export function getSearchPanel(onInsert?: (memory: any) => void): MemorySearchPanel {
    if (!searchPanelInstance) {
        searchPanelInstance = new MemorySearchPanel(onInsert);
    }
    return searchPanelInstance;
}
```

**When to use:**
- Database connections
- State managers
- UI components that should be unique (search panel)

### 2. Module Pattern

Encapsulate related functionality:

```typescript
// initSearchPanel.ts - shared initialization logic
let initialized = false;
let searchPanel: MemorySearchPanel | null = null;

export function initSearchPanel(): MemorySearchPanel {
    if (initialized && searchPanel) {
        return searchPanel;
    }

    searchPanel = getSearchPanel((memory) => {
        insertMemory(memory);
    });

    document.addEventListener('keydown', handleKeydown);

    initialized = true;
    return searchPanel;
}
```

**Benefits:**
- Prevents duplicate initialization
- Encapsulates state
- Clear public API

### 3. Strategy Pattern

Different behaviors for different platforms:

```typescript
interface PlatformConfig {
    name: string;
    detect: () => boolean;
    insert: (content: string) => boolean;
}

const platforms: PlatformConfig[] = [
    {
        name: 'ChatGPT',
        detect: () => window.location.hostname.includes('chatgpt.com'),
        insert: insertIntoChatGPT
    },
    {
        name: 'Claude',
        detect: () => window.location.hostname.includes('claude.ai'),
        insert: insertIntoClaude
    }
];

// Usage - find and use appropriate strategy
for (const platform of platforms) {
    if (platform.detect()) {
        return platform.insert(content);
    }
}
```

### 4. Observer Pattern

React to DOM changes (used for SPA navigation):

```typescript
// Watch for URL changes in single-page apps
let lastUrl = location.href;

new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        // Navigation detected - reinject button
        setTimeout(injectButton, 1000);
    }
}).observe(document, { subtree: true, childList: true });
```

### 5. Repository Pattern

Abstract data access:

```typescript
// MemoryStore interface - defines what any store must implement
interface MemoryStore {
    saveMemory(memory: Memory): Promise<string>;
    getMemory(id: string): Promise<Memory | null>;
    updateMemory(id: string, patch: Partial<Memory>): Promise<void>;
    deleteMemory(id: string): Promise<void>;
    searchByEmbedding(embedding: number[], limit: number): Promise<Memory[]>;
    listMemories(limit: number, filter?: MemoryFilter): Promise<Memory[]>;
}

// BrowserStore implements the interface using IndexedDB
export class BrowserStore implements MemoryStore {
    // ... implementation
}

// Could have ServerStore using REST API
export class ServerStore implements MemoryStore {
    // ... different implementation
}
```

---

## Error Handling

### 1. Try-Catch with Specific Types

```typescript
async function handleCapture(payload: CapturePayload) {
    try {
        const memory = createMemory(payload);
        await saveMemory(memory);
        return { success: true, message: "Memory saved!" };

    } catch (error) {
        console.error("[AI Brain] Capture error:", error);

        // Return user-friendly message
        return {
            success: false,
            message: error instanceof Error ? error.message : "Failed to save memory"
        };
    }
}
```

### 2. Graceful Degradation

```typescript
// localStorage might fail in private browsing
private savePosition() {
    if (!this.panel) return;

    try {
        localStorage.setItem('aibrain-search-panel-position', JSON.stringify({
            left: rect.left,
            top: rect.top
        }));
    } catch (e) {
        // Silent fail - position just won't persist
        console.warn('[AIBrain] Could not save position:', e);
    }
}
```

### 3. Fallback Chain

```typescript
export async function insertMemory(memory: any): Promise<void> {
    const content = memory.content;

    // Try 1: Platform-specific insertion
    for (const platform of platforms) {
        if (platform.detect() && platform.insert(content)) {
            showNotification('Memory inserted!', 'success');
            return;
        }
    }

    // Try 2: Generic insertion
    if (genericInsert(content)) {
        showNotification('Memory inserted!', 'success');
        return;
    }

    // Try 3: Clipboard fallback
    await copyToClipboard(content);
}
```

### 4. Validation Errors

```typescript
fastify.post('/memories', async (request, reply) => {
    try {
        const data = createMemorySchema.parse(request.body);
        // ... create memory

    } catch (error) {
        if (error instanceof z.ZodError) {
            // Detailed validation errors
            return reply.code(400).send({
                success: false,
                error: 'Validation failed',
                details: error.errors
            });
        }

        // Re-throw unexpected errors
        throw error;
    }
});
```

---

## Security Best Practices

### 1. SQL Injection Prevention

**Bad:**
```typescript
// NEVER do this - SQL injection vulnerable!
query = sql`SELECT * FROM memories WHERE tags @> ARRAY[${tags.join(',')}]::text[]`;
```

**Good:**
```typescript
// Parameterized query - safe!
query = sql`SELECT * FROM memories WHERE tags @> ${tags}`;
```

### 2. Input Validation

Always validate before processing:

```typescript
const importSchema = z.object({
    memories: z.array(z.object({
        content: z.string().min(1).max(10000),  // Length limits
        type: z.enum(['preference', 'fact', 'task', 'project', 'meta']),  // Whitelist
        confidence: z.number().min(0).max(1).optional()  // Range check
    })).min(1).max(10000)  // Array size limits
});
```

### 3. XSS Prevention

```typescript
// Bad - innerHTML with user data
div.innerHTML = `<p>${userInput}</p>`;  // XSS vulnerable!

// Good - textContent escapes automatically
div.textContent = userInput;

// Or sanitize if HTML is needed
div.innerHTML = DOMPurify.sanitize(userInput);
```

### 4. Authorization Checks

```typescript
async getById(id: string, userId: string): Promise<Memory | null> {
    const [memory] = await db
        .select()
        .from(memories)
        .where(and(
            eq(memories.id, id),
            eq(memories.userId, userId)  // User can only access own memories
        ));

    return memory || null;
}
```

### 5. Extension Permissions

Request only necessary permissions:

```json
{
    "permissions": [
        "storage",      // For IndexedDB
        "activeTab",    // For current tab only
        "scripting"     // For injecting scripts
    ],
    "host_permissions": [
        "https://chatgpt.com/*",  // Only specific sites
        "https://claude.ai/*"
    ]
}
```

---

## Performance Optimization

### 1. Debouncing

Prevent excessive function calls:

```typescript
private debounceTimer: number | null = null;

private debouncedSearch() {
    if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
        this.performSearch();
    }, 300);  // Wait for typing to stop
}
```

### 2. Operation Queuing

Prevent race conditions in IndexedDB:

```typescript
private operationQueue: Promise<void> = Promise.resolve();

private queueOperation<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operationQueue.then(operation);
    this.operationQueue = result.then(() => {}, () => {});
    return result;
}

async saveMemory(memory: Memory): Promise<string> {
    return this.queueOperation(async () => {
        await this.init();
        // ... actual save logic
    });
}
```

### 3. Lazy Loading

Only load what's needed:

```typescript
// Don't create panel until needed
show() {
    if (this.panel) {
        this.panel.style.display = 'flex';
        return;
    }

    // Create panel only on first show
    this.createPanel();
    document.body.appendChild(this.panel!);
}
```

### 4. CSS Animation Injection

Inject once, use many times:

```typescript
let animationsInjected = false;

function injectAnimations() {
    if (animationsInjected) return;  // Only once

    const style = document.createElement('style');
    style.textContent = `
        @keyframes aibrain-slideIn { ... }
        @keyframes aibrain-slideOut { ... }
    `;
    document.head.appendChild(style);
    animationsInjected = true;
}
```

### 5. Efficient DOM Queries

```typescript
// Bad - queries DOM for every result
results.forEach(memory => {
    const container = document.querySelector('#results');
    container.appendChild(createCard(memory));
});

// Good - batch DOM updates
const container = document.querySelector('#results');
const fragment = document.createDocumentFragment();
results.forEach(memory => {
    fragment.appendChild(createCard(memory));
});
container.appendChild(fragment);  // Single DOM update
```

---

## Testing Strategies

### 1. Unit Tests

Test individual functions:

```typescript
// utils/similarity.test.ts
import { cosineSimilarity } from './similarity';

describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
        const vec = [0.1, 0.2, 0.3];
        expect(cosineSimilarity(vec, vec)).toBeCloseTo(1);
    });

    it('returns 0 for orthogonal vectors', () => {
        const a = [1, 0];
        const b = [0, 1];
        expect(cosineSimilarity(a, b)).toBeCloseTo(0);
    });

    it('handles empty vectors', () => {
        expect(cosineSimilarity([], [])).toBe(0);
    });
});
```

### 2. Integration Tests

Test API endpoints:

```typescript
// routes/memories.test.ts
import { buildApp } from '../app';

describe('Memories API', () => {
    let app;
    let token;

    beforeAll(async () => {
        app = await buildApp();
        // Get auth token
        const res = await app.inject({
            method: 'POST',
            url: '/api/v1/auth/login',
            payload: { email: 'test@test.com', password: 'test' }
        });
        token = res.json().token;
    });

    it('creates a memory', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/api/v1/memories',
            headers: { Authorization: `Bearer ${token}` },
            payload: {
                content: 'Test memory',
                type: 'fact',
                scope: 'user_global'
            }
        });

        expect(res.statusCode).toBe(201);
        expect(res.json().memory.content).toBe('Test memory');
    });
});
```

### 3. Manual Testing Checklist

```markdown
## Extension Testing Checklist

### Installation
- [ ] Extension loads without errors
- [ ] Icon appears in toolbar
- [ ] Popup opens when clicked

### Content Script
- [ ] Brain button appears on ChatGPT
- [ ] Brain button appears on Claude
- [ ] Brain button appears on Perplexity
- [ ] Brain button appears on Gemini

### Memory Capture
- [ ] Ctrl+M captures text
- [ ] Button click captures text
- [ ] Success notification appears
- [ ] Memory count increases in popup

### Search Panel
- [ ] Ctrl+Shift+M opens panel
- [ ] Panel is draggable
- [ ] Search returns results
- [ ] Arrow keys navigate results
- [ ] Enter inserts memory
- [ ] Esc closes panel

### Memory Insertion
- [ ] Insert works on ChatGPT
- [ ] Insert works on Claude
- [ ] Clipboard fallback works
```

---

## Debugging Tips

### 1. Service Worker Debugging

```typescript
// Add detailed logging
console.log("[AI Brain] Service Worker Starting...");
console.log("[AI Brain] Received message:", message.type);
console.log("[AI Brain] Search complete, found:", memories.length);

// View in Chrome:
// 1. Go to chrome://extensions
// 2. Find AI Brain
// 3. Click "Service Worker" link
```

### 2. Content Script Debugging

```typescript
// Content scripts log to the page's console
console.log('[AIBrain] Content script initialized');
console.log('[AIBrain] Detected platform:', platform);

// View in:
// 1. Open target page (chatgpt.com)
// 2. Open DevTools (F12)
// 3. Check Console tab
```

### 3. IndexedDB Inspection

```
1. Open DevTools on any page
2. Go to Application tab
3. Expand IndexedDB in sidebar
4. Find "MemoryLayerDB"
5. Click "memories" object store
6. View/delete data
```

### 4. Network Debugging

For server communication:

```
1. Open DevTools
2. Go to Network tab
3. Filter by "XHR" or "Fetch"
4. Click request to see details
5. Check Request/Response tabs
```

### 5. Common Issues

| Issue | Debug Steps |
|-------|-------------|
| Button not appearing | Check Console for errors, verify URL matches |
| Memory not saving | Check Service Worker console, verify IndexedDB |
| Search not working | Check message passing, verify data in IndexedDB |
| Keyboard shortcut not working | Check chrome://extensions/shortcuts |
| "Extension context invalidated" | Reload extension, refresh page |

### 6. Useful DevTools Commands

```javascript
// In page console - check if content script loaded
document.querySelector('#ai-brain-btn')

// In Service Worker console - check stored memories
indexedDB.open('MemoryLayerDB').onsuccess = function(e) {
    const db = e.target.result;
    const tx = db.transaction('memories', 'readonly');
    tx.objectStore('memories').getAll().onsuccess = function(e) {
        console.log('All memories:', e.target.result);
    };
};

// Check extension state
chrome.storage.local.get(null, console.log);
```
