# AI Brain Multi-Platform Architecture

## Overview
AI Brain uses a Chrome Extension architecture with content scripts injected on every major LLM platform.

## Architecture Diagram

```
ChatGPT ──┐
Claude ───┤
Perplexity┤── Content Scripts (inject 🧠 button)
Gemini ───┤
Grok ─────┴──► Background Worker ──► Local IndexedDB
                                   └──► Memory Engine (Mem0-compatible)
```

## Components

### 1. Content Scripts (Platform-Specific)
- **File**: `src/content-scripts/{platform}Content.ts`
- **Purpose**: Inject AI Brain button into each platform's UI
- **Platforms**:
  - ChatGPT (`chatgpt.com`, `chat.openai.com`)
  - Claude (`claude.ai`)
  - Perplexity (`perplexity.ai`)
  - Gemini (`gemini.google.com`)
  - Grok (`x.com/i/grok`)

### 2. Background Service Worker
- **File**: `src/background/index.ts`
- **Purpose**: 
  - Central message router
  - API key management
  - Memory operations (capture, search, retrieve)
  - Chrome storage management

### 3. Memory Engine
- **File**: `../memory-engine/src/Mem0.ts`
- **Purpose**:
  - LLM-based fact extraction
  - Vector embeddings generation
  - Memory storage and retrieval
  - Similarity search

### 4. Local Storage
- **IndexedDB**: Browser-based vector store
- **Database**: `MemoryLayerDB`
- **Collection**: `memories`

## Data Flow

### Capture Flow
```
1. User selects text on ChatGPT
2. Clicks "🧠 Save to AI Brain" button
3. Content Script → Background Worker
4. Background → Memory Engine
5. Memory Engine → Extract facts with LLM
6. Facts → Generate embeddings
7. Store in IndexedDB
```

### Retrieval Flow
```
1. User presses Ctrl+M on any platform
2. Content Script → Background Worker (search request)
3. Background → Memory Engine search
4. Return top 5 relevant memories
5. Display in floating panel
6. User clicks "Insert" → Inject into prompt bar
```

## Button Injection Strategy

### ChatGPT
```typescript
// Find textarea
const promptBar = document.querySelector('textarea[data-id="root"]');
// Create button next to send button
const button = createMemoryButton();
promptBar.parentElement.appendChild(button);
```

### Claude
```typescript
// Find composer
const composer = document.querySelector('[data-testid="composer"]');
const button = createMemoryButton();
composer.appendChild(button);
```

### Perplexity
```typescript
// Find search bar
const searchBar = document.querySelector('textarea[placeholder*="Ask"]');
const button = createMemoryButton();
searchBar.parentElement.appendChild(button);
```

## Keyboard Shortcuts
- **Ctrl+M** (Windows/Linux) / **Cmd+M** (Mac): Open memory search panel
- **Ctrl+S** (Windows/Linux) / **Cmd+S** (Mac): Quick save selection

## Privacy Model
- **Local-First**: All data stored in browser IndexedDB
- **No Cloud Sync**: Maximum privacy (optional cloud sync in future)
- **User Control**: Users can delete memories anytime

## Implementation Status
- [x] Background Worker
- [x] Memory Engine (Mem0-compatible)
- [x] Local Storage (IndexedDB)
- [ ] Button Injection (all platforms)
- [ ] Keyboard Shortcuts
- [ ] Memory Search UI
- [ ] Memory Insertion
