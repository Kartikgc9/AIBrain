# AIBrain Architecture Overview

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Directory Structure](#directory-structure)
3. [Component Overview](#component-overview)
4. [Data Flow](#data-flow)
5. [Communication Patterns](#communication-patterns)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           BROWSER EXTENSION                              │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │  Content Script │  │  Content Script │  │  Content Script │  ...    │
│  │   (ChatGPT)     │  │    (Claude)     │  │  (Perplexity)   │         │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘         │
│           │                    │                    │                   │
│           └────────────────────┼────────────────────┘                   │
│                                │                                        │
│                                ▼                                        │
│                    ┌─────────────────────┐                             │
│                    │   Service Worker    │                             │
│                    │   (Background)      │                             │
│                    │   - IndexedDB       │                             │
│                    │   - Message Handler │                             │
│                    └──────────┬──────────┘                             │
│                               │                                        │
│           ┌───────────────────┼───────────────────┐                   │
│           ▼                   ▼                   ▼                   │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐             │
│   │    Popup     │   │ Search Panel │   │   IndexedDB  │             │
│   │     UI       │   │   (Overlay)  │   │   Storage    │             │
│   └──────────────┘   └──────────────┘   └──────────────┘             │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP/WebSocket (Optional)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          SERVER (Optional)                               │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │   Fastify API   │  │   LLM Service   │  │   Memory Store  │         │
│  │   - Auth        │  │   - Embeddings  │  │   - PostgreSQL  │         │
│  │   - Routes      │  │   - Extraction  │  │   - pgvector    │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
AIBrain/
├── memory-layer/                    # Browser Extension
│   ├── extension/                   # Main extension code
│   │   ├── src/
│   │   │   ├── background/          # Service Worker
│   │   │   │   └── index.ts         # Message handling, IndexedDB
│   │   │   ├── content-scripts/     # Injected scripts
│   │   │   │   ├── chatgptContent.ts
│   │   │   │   ├── universalContent.ts
│   │   │   │   ├── searchPanel.ts
│   │   │   │   ├── insertMemory.ts
│   │   │   │   └── initSearchPanel.ts
│   │   │   ├── popup/               # Extension popup
│   │   │   │   └── Popup.tsx
│   │   │   └── manifest.json
│   │   ├── public/                  # Static assets
│   │   ├── dist/                    # Built extension (load this!)
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── memory-engine/               # Shared memory logic
│       └── src/
│           ├── models/              # Data models
│           ├── store/               # Storage implementations
│           └── utils/               # Utilities
│
├── aibrain-server/                  # Backend Server
│   └── src/
│       ├── config/                  # Configuration
│       │   ├── database.ts
│       │   └── env.ts
│       ├── db/                      # Database schema
│       │   └── schema.ts
│       ├── plugins/                 # Fastify plugins
│       │   └── auth.plugin.ts
│       ├── routes/                  # API routes
│       │   ├── auth.routes.ts
│       │   └── memories.routes.ts
│       ├── services/                # Business logic
│       │   ├── memory.service.ts
│       │   └── llm.service.ts
│       ├── app.ts                   # Fastify app setup
│       └── server.ts                # Entry point
│
└── docs/                            # Documentation
    ├── 01-GETTING-STARTED.md
    ├── 02-ARCHITECTURE.md
    └── ...
```

---

## Component Overview

### Browser Extension Components

#### 1. Service Worker (Background Script)
**File:** `extension/src/background/index.ts`

The brain of the extension that:
- Manages IndexedDB storage
- Handles messages from content scripts
- Performs search operations
- Runs even when popup is closed

```typescript
// Message types handled
type MessageType =
    | 'CAPTURE_CONVERSATION'   // Save conversation text
    | 'GET_STATS'              // Get memory count
    | 'GET_RECENT_MEMORIES'    // Get latest memories
    | 'SEARCH_MEMORIES'        // Search memories
```

#### 2. Content Scripts
Injected into AI platform pages:

| Script | Purpose |
|--------|---------|
| `universalContent.ts` | Button injection, conversation extraction |
| `chatgptContent.ts` | ChatGPT-specific scraping logic |
| `searchPanel.ts` | Floating search overlay |
| `insertMemory.ts` | Insert memories into chat inputs |
| `initSearchPanel.ts` | Shared initialization logic |

#### 3. Popup
**File:** `extension/src/popup/Popup.tsx`

React-based UI showing:
- Total memory count
- Recent memories list
- Quick actions

### Server Components

#### 1. API Layer (Fastify)
RESTful API with:
- JWT authentication
- Request validation (Zod)
- WebSocket sync support

#### 2. Memory Service
Business logic for:
- CRUD operations
- Semantic search (pgvector)
- Text search fallback
- Batch operations

#### 3. LLM Service
Integrations for:
- OpenAI embeddings (text-embedding-ada-002)
- Memory extraction from conversations
- (Future: Local model support)

---

## Data Flow

### Memory Capture Flow

```
User clicks 🧠 button
        │
        ▼
Content Script extracts conversation text
        │
        ▼
Sends CAPTURE_CONVERSATION message
        │
        ▼
Service Worker creates Memory object
        │
        ▼
Saves to IndexedDB
        │
        ▼
Returns success/failure
        │
        ▼
Content Script shows notification
```

### Memory Search Flow

```
User opens search panel (Ctrl+Shift+M)
        │
        ▼
Types search query
        │
        ▼
Content Script sends SEARCH_MEMORIES
        │
        ▼
Service Worker queries IndexedDB
        │
        ├── Has embedding? ──► Cosine similarity search
        │
        └── No embedding? ──► Text matching search
        │
        ▼
Returns sorted results
        │
        ▼
Search Panel renders memory cards
```

### Memory Insertion Flow

```
User clicks "Insert" on memory card
        │
        ▼
insertMemory() called with memory object
        │
        ▼
Detects current platform (ChatGPT/Claude/etc)
        │
        ▼
Finds appropriate input element
        │
        ├── Found? ──► Inserts text, triggers events
        │
        └── Not found? ──► Copies to clipboard
        │
        ▼
Shows success notification
```

---

## Communication Patterns

### Chrome Extension Messaging

Extensions use a message-passing architecture:

```
┌──────────────┐         ┌──────────────┐
│   Content    │ ──msg──► │   Service    │
│   Script     │ ◄──res── │   Worker     │
└──────────────┘         └──────────────┘
```

**Example:**
```typescript
// Content Script sends message
chrome.runtime.sendMessage({
    type: 'CAPTURE_CONVERSATION',
    payload: { text, url }
}, (response) => {
    if (response.success) {
        showSuccess();
    }
});

// Service Worker receives and responds
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CAPTURE_CONVERSATION') {
        handleCapture(message.payload)
            .then(sendResponse);
        return true; // Async response
    }
});
```

### Server Communication (Future)

```
Extension ◄──────────────────► Server
           │
           │  POST /api/v1/memories
           │  (Create memory)
           │
           │  POST /api/v1/memories/search
           │  (Semantic search)
           │
           │  WebSocket /api/v1/sync
           │  (Real-time sync)
```

---

## Storage Architecture

### Local Storage (IndexedDB)

```
Database: MemoryLayerDB
    │
    └── Object Store: memories
            │
            ├── Key: id (UUID)
            │
            └── Value: {
                    id: string,
                    userId: string,
                    content: string,
                    type: 'preference'|'fact'|'task'|'project'|'meta',
                    scope: 'user_global'|'session'|'site'|'conversation',
                    source: {
                        url: string,
                        platform: string,
                        timestamp: number
                    },
                    createdAt: number,
                    updatedAt: number,
                    tags: string[],
                    embedding?: number[],
                    confidence: number
                }
```

### Server Storage (PostgreSQL)

```sql
CREATE TABLE memories (
    id UUID PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR NOT NULL,
    scope VARCHAR NOT NULL,
    source_url VARCHAR,
    source_platform VARCHAR,
    source_timestamp TIMESTAMP,
    source_conversation_id VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    tags TEXT[],
    confidence FLOAT,
    access_count INT DEFAULT 0,
    embedding VECTOR(1536)  -- pgvector
);

-- Vector similarity index
CREATE INDEX ON memories
USING ivfflat (embedding vector_cosine_ops);
```

---

## Security Considerations

1. **Content Script Isolation**
   - Scripts run in isolated world
   - Can access DOM but not page's JavaScript

2. **Permissions**
   - Only requests necessary permissions
   - Host permissions limited to AI platforms

3. **Data Storage**
   - Local data stays in browser
   - Server sync is optional
   - JWT for authentication

4. **Input Validation**
   - All API inputs validated with Zod
   - SQL injection prevented via parameterization
