# Architecture: Personal Browser Memory Layer

## 1. High-Level Overview

### Components

1. **Browser Extension (Frontend + Background)**
   - Content scripts: scrape page content / conversations.
   - Background service worker: central message router, storage adapter.
   - Popup UI: search, list, settings.
   - Options page: configuration.

2. **Memory Engine (Can be Local or Remote)**
   - **Extraction Service**:
     - LLM prompts for fact extraction & update decisions.
   - **Vector Store**:
     - Embeddings + similarity search.
   - **Document Store**:
     - Metadata + raw memory content.

3. **LLM & Embedding Providers**
   - Configurable:
     - OpenAI, Anthropic, local LLM via HTTP, etc.
     - Embeddings: OpenAI text-embedding-3-small OR local models.

---

## 2. Browser Extension Architecture

### 2.1 Content Scripts

- Responsible for:
  - Detecting supported sites (ChatGPT, Claude, etc.) via `location.hostname`.
  - Extracting conversation text or page content.
  - Sending `capture` events to background.

- Communication:
  - Uses `chrome.runtime.sendMessage` or `chrome.runtime.connect` to background.

### 2.2 Background Service Worker

- Core responsibilities:
  - Event handling:
    - `CAPTURE_CONVERSATION`
    - `CAPTURE_PAGE`
    - `USER_SEARCH_QUERY`
  - Calls the memory backend:
    - `POST /memories/ingest`
    - `POST /memories/retrieve`
  - Maintains:
    - Local IndexedDB for caching.
    - User settings in `chrome.storage.sync` or `local`.

- Modules:
  - `MemoryClient` (HTTP client or direct local JS SDK).
  - `SettingsManager` (loads settings, tokens, preferences).
  - `Logger` (structured logs).

### 2.3 Popup / UI

- Composition:
  - React or vanilla JS SPA inside `popup.html`.
  - Uses `chrome.runtime.sendMessage` to request data:
    - `GET_MEMORIES`
    - `SEARCH_MEMORIES`
    - `GET_SETTINGS`
    - `UPDATE_SETTINGS`

---

## 3. Memory Engine Architecture

### 3.1 Logical Modules

1. **IngestionPipeline**
   - Functions:
     - `ingestText(user_id, text, source_metadata)`
     - Preprocessing (chunking, cleaning).
     - LLM call for extraction.

2. **LLMExtractionService**
   - Takes raw text and returns candidate memories with structured fields.
   - Uses a **prompt template** to enforce schema.
   - Optionally uses tool/function-calling to emit operations.

3. **Similarity & Upsert Engine**
   - For each candidate memory:
     - Build query embedding.
     - Search top-k similar memories from vector store.
     - Call LLM or heuristic to decide:
       - `ADD`, `UPDATE(payload)`, `DELETE(id)`, `NOOP`.
   - Applies operations on Document + Vector store.

4. **Storage Layer**
   - Abstract interface:
     - `saveMemory(memoryDoc)`
     - `updateMemory(id, patch)`
     - `deleteMemory(id)`
     - `searchByEmbedding(embedding, filters, topK)`
     - `listMemories(query)`
   - Implementation 1 (Local JS/TS):
     - IndexedDB for docs.
     - In-memory vector index (cosine similarity) persisted periodically.
   - Implementation 2 (Remote):
     - FastAPI/Node + Postgres/pgvector OR Qdrant.

5. **Retrieval API**
   - Input: query text + optional filters.
   - Steps:
     - Compute embedding.
     - Vector search.
     - Filter by type/scope/confidence.
     - Return list of memory docs.

---

## 4. Data Model

### 4.1 Memory Document

type MemoryScope = "user_global" | "session" | "site" | "conversation";
type MemoryType = "preference" | "fact" | "task" | "project" | "meta";

interface Memory {
id: string;
userId: string;
content: string;
type: MemoryType;
scope: MemoryScope;
source: {
url: string;
platform?: string;
timestamp: number;
pageTitle?: string;
conversationId?: string;
};
createdAt: number;
updatedAt: number;
confidence: number;
tags: string[];
embedding: number[];
}

text

### 4.2 Settings

interface Settings {
llmProvider: "openai" | "anthropic" | "local";
llmModel: string;
embeddingModel: string;
autoCaptureEnabled: boolean;
perDomainOverrides: Record<string, { capture: boolean }>;
backendMode: "local" | "remote";
remoteBackendUrl?: string;
apiKey?: string;
}

text

---

## 5. Deployment & Runtime

### 5.1 Local-only Mode

- Runtime:
  - Browser extension + in-extension (or WASM) memory engine.
- Pros:
  - No external server, maximum privacy.
- Cons:
  - Limited compute for heavy LLM calls (unless calling cloud LLMs).

### 5.2 Remote Backend Mode

- Runtime:
  - Browser extension.
  - Node/FastAPI server running on local machine or VPS.
- Pros:
  - More CPU/RAM; can run local models.
- Cons:
  - Slight latency, network dependency.

---

## 6. Security & Privacy

- Keys stored via `chrome.storage` with minimal scope.
- All external calls use HTTPS.
- No third-party analytics by default.
- Optional error telemetry made opt-in.

---

## 7. Extensibility

- Plug-in new LLM providers by implementing a `LLMProvider` interface.
- Swap storage backends implementing `MemoryStore` interface.
- Add new ingestion sources as new content scripts.
