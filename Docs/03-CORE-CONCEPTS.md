# Core Concepts and Technologies

## Table of Contents
1. [Browser Extension Fundamentals](#browser-extension-fundamentals)
2. [TypeScript Concepts](#typescript-concepts)
3. [IndexedDB and Storage](#indexeddb-and-storage)
4. [Vector Embeddings and Semantic Search](#vector-embeddings-and-semantic-search)
5. [DOM Manipulation](#dom-manipulation)
6. [Asynchronous JavaScript](#asynchronous-javascript)

---

## Browser Extension Fundamentals

### What is a Browser Extension?
A browser extension is a small program that modifies or enhances the browser's functionality. Extensions can:
- Add UI elements (buttons, popups, sidebars)
- Modify web page content
- Interact with browser APIs
- Run background processes

### Manifest V3 (Chrome)
The manifest.json defines extension metadata and permissions:

```json
{
    "manifest_version": 3,        // Required, latest version
    "name": "AI Brain",           // Display name
    "version": "1.0.0",           // Semantic versioning

    "permissions": [
        "storage",     // Use chrome.storage API
        "activeTab",   // Access current tab
        "scripting"    // Inject scripts programmatically
    ],

    "host_permissions": [
        "https://chatgpt.com/*"   // URLs we can access
    ],

    "background": {
        "service_worker": "background.js",  // Background script
        "type": "module"                    // ES modules support
    },

    "content_scripts": [{
        "matches": ["https://chatgpt.com/*"],  // URL patterns
        "js": ["content.js"],                  // Scripts to inject
        "run_at": "document_idle"              // When to inject
    }],

    "action": {
        "default_popup": "popup.html"  // Toolbar popup
    }
}
```

### Extension Components Explained

#### 1. Service Worker (Background Script)
```
┌─────────────────────────────────────────────┐
│            Service Worker                    │
├─────────────────────────────────────────────┤
│ - Runs in background                        │
│ - No DOM access                             │
│ - Event-driven (wakes on events)            │
│ - Can be suspended to save memory           │
│ - Handles extension-wide state              │
└─────────────────────────────────────────────┘
```

**Lifecycle:**
```
Install ──► Activate ──► Running ──► Idle ──► Terminated
                              ▲                    │
                              └────────────────────┘
                               (Event triggers wake)
```

#### 2. Content Scripts
```
┌─────────────────────────────────────────────┐
│            Content Script                    │
├─────────────────────────────────────────────┤
│ - Runs in web page context                  │
│ - Has DOM access                            │
│ - Isolated from page's JavaScript           │
│ - Can send messages to service worker       │
│ - Re-injected on navigation                 │
└─────────────────────────────────────────────┘
```

**Isolation Model:**
```
┌───────────────────────────────────────────┐
│              Web Page                      │
├───────────────────────────────────────────┤
│  Page's JS World    │  Content Script     │
│  ┌───────────────┐  │  ┌───────────────┐  │
│  │ window.foo    │  │  │ window.foo    │  │
│  │ (different!)  │  │  │ (different!)  │  │
│  └───────────────┘  │  └───────────────┘  │
│         │          Shared DOM       │      │
│         └──────────────┼────────────┘      │
│                   document                 │
└───────────────────────────────────────────┘
```

#### 3. Popup
- HTML page shown when clicking extension icon
- Short-lived (closes when user clicks away)
- Can communicate with service worker
- Good for quick actions and status display

---

## TypeScript Concepts

### Why TypeScript?
TypeScript adds static typing to JavaScript:

```typescript
// JavaScript - no type checking
function add(a, b) {
    return a + b;
}
add("1", 2);  // Returns "12" - probably not intended!

// TypeScript - catches errors at compile time
function add(a: number, b: number): number {
    return a + b;
}
add("1", 2);  // Error: Argument of type 'string' is not assignable
```

### Key TypeScript Features Used

#### 1. Interfaces
Define object shapes:

```typescript
interface Memory {
    id: string;
    content: string;
    type: 'preference' | 'fact' | 'task';  // Union type
    tags: string[];
    createdAt: number;
    embedding?: number[];  // Optional property
}

// Usage
const memory: Memory = {
    id: '123',
    content: 'User prefers dark mode',
    type: 'preference',
    tags: ['ui', 'settings'],
    createdAt: Date.now()
};
```

#### 2. Type Aliases
Create reusable types:

```typescript
type MessageType = 'CAPTURE_CONVERSATION' | 'SEARCH_MEMORIES' | 'GET_STATS';

type SearchPayload = {
    query?: string;
    embedding?: number[];
    limit?: number;
};
```

#### 3. Generics
Reusable type-safe code:

```typescript
// Without generics - loses type info
function getFirst(arr: any[]): any {
    return arr[0];
}

// With generics - preserves type
function getFirst<T>(arr: T[]): T | undefined {
    return arr[0];
}

const num = getFirst([1, 2, 3]);      // Type: number
const str = getFirst(['a', 'b']);      // Type: string
```

#### 4. Async/Await Types
```typescript
async function fetchMemory(id: string): Promise<Memory | null> {
    const memory = await db.get(id);
    return memory || null;
}
```

---

## IndexedDB and Storage

### What is IndexedDB?
IndexedDB is a browser database for storing structured data:

```
┌─────────────────────────────────────────────┐
│              IndexedDB                       │
├─────────────────────────────────────────────┤
│  Database: MemoryLayerDB                    │
│  ├── Object Store: memories                 │
│  │   ├── {id: "abc", content: "..."}       │
│  │   ├── {id: "def", content: "..."}       │
│  │   └── ...                                │
│  └── Object Store: settings                 │
│      └── {key: "theme", value: "dark"}     │
└─────────────────────────────────────────────┘
```

### IndexedDB vs Other Storage

| Feature | localStorage | IndexedDB | chrome.storage |
|---------|-------------|-----------|----------------|
| Capacity | ~5MB | ~unlimited | ~5MB |
| Data Types | Strings only | Any (including blobs) | JSON |
| Async | No | Yes | Yes |
| Queryable | No | Yes (indexes) | No |
| Transactions | No | Yes | No |

### IndexedDB Basic Operations

```typescript
// Opening a database
const request = indexedDB.open('MemoryLayerDB', 1);

request.onupgradeneeded = (event) => {
    const db = event.target.result;

    // Create object store with key
    if (!db.objectStoreNames.contains('memories')) {
        db.createObjectStore('memories', { keyPath: 'id' });
    }
};

// Adding data
const transaction = db.transaction(['memories'], 'readwrite');
const store = transaction.objectStore('memories');
store.add({ id: 'abc', content: 'Hello' });

// Reading data
const getRequest = store.get('abc');
getRequest.onsuccess = () => {
    console.log(getRequest.result);  // { id: 'abc', content: 'Hello' }
};

// Using put() instead of add() for upsert
store.put({ id: 'abc', content: 'Updated!' });  // Won't fail if exists
```

### Transaction Model

```
┌─────────────────────────────────────────────┐
│              Transaction                     │
├─────────────────────────────────────────────┤
│  Mode: 'readonly' or 'readwrite'            │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  Operation 1: get('id1')            │   │
│  │  Operation 2: put({...})            │   │
│  │  Operation 3: delete('id2')         │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ──► All succeed or all fail (atomic)       │
└─────────────────────────────────────────────┘
```

---

## Vector Embeddings and Semantic Search

### What are Embeddings?
Embeddings convert text into numerical vectors that capture meaning:

```
Text: "I love programming"
      │
      ▼ (Embedding Model)

Vector: [0.12, -0.34, 0.56, ..., 0.89]  // 1536 dimensions
```

### Why Use Embeddings?
Similar concepts have similar vectors:

```
"I love coding"     ──► [0.11, -0.33, 0.55, ...]  ─┐
                                                   ├─ Close together!
"I enjoy programming" ──► [0.12, -0.34, 0.56, ...] ─┘

"I hate vegetables" ──► [-0.45, 0.67, -0.12, ...]  ── Far apart!
```

### Cosine Similarity
Measures angle between vectors (ignores magnitude):

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
}

// Returns value between -1 and 1
// 1 = identical direction
// 0 = perpendicular
// -1 = opposite direction
```

### Semantic Search Process

```
Query: "How do I set up React?"
        │
        ▼
1. Generate query embedding
   [0.15, -0.28, 0.42, ...]
        │
        ▼
2. Compare with all stored embeddings
   Memory 1: similarity = 0.92 ✓
   Memory 2: similarity = 0.34
   Memory 3: similarity = 0.87 ✓
        │
        ▼
3. Return top-k results
   [Memory 1, Memory 3, ...]
```

### pgvector (PostgreSQL)
Server uses pgvector for efficient vector operations:

```sql
-- Create vector column
ALTER TABLE memories
ADD COLUMN embedding VECTOR(1536);

-- Create index for fast similarity search
CREATE INDEX ON memories
USING ivfflat (embedding vector_cosine_ops);

-- Similarity search
SELECT *, 1 - (embedding <=> query_vector) AS similarity
FROM memories
ORDER BY embedding <=> query_vector
LIMIT 10;
```

---

## DOM Manipulation

### What is the DOM?
Document Object Model - tree representation of HTML:

```
        document
           │
           ▼
         <html>
         /    \
      <head>  <body>
                │
              <div>
              /    \
           <p>    <button>
```

### Querying Elements

```typescript
// Single element
const button = document.querySelector('button#submit');
const input = document.querySelector('textarea[data-id="root"]');

// Multiple elements
const messages = document.querySelectorAll('[data-message-author-role]');

// By ID (fastest)
const panel = document.getElementById('search-panel');
```

### Creating Elements

```typescript
// Create element
const div = document.createElement('div');

// Set attributes
div.id = 'my-panel';
div.className = 'panel';
div.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
`;

// Set content
div.innerHTML = `
    <h1>Title</h1>
    <p>Content</p>
`;

// Or safely with textContent
div.textContent = userInput;  // Prevents XSS

// Add to page
document.body.appendChild(div);
```

### Event Handling

```typescript
// Click handler
button.addEventListener('click', (event) => {
    event.preventDefault();  // Stop default behavior
    event.stopPropagation(); // Stop bubbling

    doSomething();
});

// Keyboard handler
document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 'M') {
        event.preventDefault();
        openPanel();
    }
});

// Input handler with debouncing
let debounceTimer: number;
input.addEventListener('input', (event) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        search(event.target.value);
    }, 300);
});
```

### MutationObserver
Watch for DOM changes (useful for SPAs):

```typescript
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type === 'childList') {
            // Elements added or removed
            checkForNewMessages();
        }
    }
});

observer.observe(document.body, {
    childList: true,  // Watch for added/removed children
    subtree: true,    // Watch all descendants
    attributes: true  // Watch attribute changes
});
```

---

## Asynchronous JavaScript

### The Event Loop

```
┌─────────────────────────────────────────────────────────┐
│                      Event Loop                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   Call Stack          Task Queue       Microtask Queue   │
│   ┌─────────┐        ┌─────────┐      ┌─────────┐       │
│   │ func3() │        │ timeout │      │ promise │       │
│   │ func2() │        │ click   │      │ then()  │       │
│   │ func1() │        │ network │      │         │       │
│   └─────────┘        └─────────┘      └─────────┘       │
│        │                  │                │             │
│        ▼                  ▼                ▼             │
│   Execute sync ──► Process microtasks ──► Process tasks │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Callbacks (Old Pattern)
```typescript
// Callback hell
getData(function(a) {
    getMoreData(a, function(b) {
        getEvenMoreData(b, function(c) {
            console.log(c);
        });
    });
});
```

### Promises (Better)
```typescript
getData()
    .then(a => getMoreData(a))
    .then(b => getEvenMoreData(b))
    .then(c => console.log(c))
    .catch(error => console.error(error));
```

### Async/Await (Best)
```typescript
async function processData() {
    try {
        const a = await getData();
        const b = await getMoreData(a);
        const c = await getEvenMoreData(b);
        console.log(c);
    } catch (error) {
        console.error(error);
    }
}
```

### Parallel vs Sequential

```typescript
// Sequential - slow (waits for each)
async function sequential() {
    const a = await fetchA();  // 1 second
    const b = await fetchB();  // 1 second
    // Total: 2 seconds
}

// Parallel - fast (runs simultaneously)
async function parallel() {
    const [a, b] = await Promise.all([
        fetchA(),  // 1 second
        fetchB()   // 1 second (same time)
    ]);
    // Total: 1 second
}
```

### Chrome Extension Messaging with Async

```typescript
// Sending (content script)
async function captureMemory(text: string): Promise<boolean> {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(
            { type: 'CAPTURE', payload: { text } },
            (response) => {
                resolve(response.success);
            }
        );
    });
}

// Receiving (service worker)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CAPTURE') {
        // Handle async operation
        handleCapture(message.payload)
            .then(result => sendResponse({ success: true, result }))
            .catch(error => sendResponse({ success: false, error: error.message }));

        return true;  // IMPORTANT: Indicates async response
    }
});
```
