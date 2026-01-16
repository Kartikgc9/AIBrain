# Development Plan: Memory Layer Browser Extension (Production-Ready)

## Phase 0 – Setup (1–2 days)

- Initialize monorepo structure (`memory-layer/`).
- Choose stack:
  - Extension: TypeScript + minimal React (for popup/options).
  - Memory engine: TypeScript (Node) or local-only in extension.
- Configure tooling:
  - ESLint, Prettier, Jest/Vitest.
  - Build system for extension (Vite/Webpack/Rspack).

---

## Phase 1 – Extension MVP (3–5 days)

### Goals

- Basic extension with:
  - Popup UI.
  - Content script for ChatGPT.
  - Background script with routing.

### Tasks

1. Manifest v3 file:
   - `background.service_worker`
   - `content_scripts` for chatgpt.com.
   - `action` for popup.

2. Content script:
   - Extract conversation text from DOM.
   - Send message to background: `{type: "CAPTURE_CONVERSATION", text, sourceMetadata}`.

3. Background:
   - Log captured data.
   - Store raw captures in local IndexedDB for debugging.

4. Popup:
   - Show list of last 10 raw captures.

---

## Phase 2 – Local Memory Engine (7–10 days)

### Goals

- Implement minimal in-browser memory engine:
  - Extraction (LLM).
  - Memory model.
  - Embeddings + similarity search.

### Tasks

1. Define `Memory` interface and `Settings` types.
2. Implement `LLMProvider` that calls chosen model (OpenAI initially).
3. Implement `EmbeddingProvider`.
4. Write `ExtractionService` with prompt templates from `LLM_PROMPTS_memory_layer.md`.
5. Implement `MemoryStore` in IndexedDB:
   - `save`, `update`, `delete`, `query`, `searchByEmbedding`.
6. Implement naive similarity search in JS:
   - Cosine similarity over in-memory array of vectors.
7. Wire ingestion pipeline:
   - `ingestText` → `extractMemories` → `addMemory` (ADD-only for now).

---

## Phase 3 – Intelligent Updates (7–10 days)

### Goals

- Implement ADD/UPDATE/DELETE/NOOP logic using LLM + similarity search.

### Tasks

1. For each candidate memory:
   - Search top-k similar existing memories.
2. Create `UpdateDecisionService` using prompt.
3. Apply operations:
   - `ADD`: create new memory.
   - `UPDATE`: patch existing memory content + embedding.
   - `DELETE`: remove.
4. Add tests with mocked LLM to verify logic.
5. Add metrics counters for operations.

---

## Phase 4 – Retrieval & UI Integration (5–7 days)

### Goals

- Expose retrieval API.
- Use it in popup + contextual overlay on sites.

### Tasks

1. Implement `RetrievalService`:
   - `getRelevantMemories(query)`:
     - embed query, vector search, filter & sort.
2. Background message handlers:
   - `SEARCH_MEMORIES`
   - `GET_RELEVANT_MEMORIES_FOR_PAGE`
3. Popup:
   - Search bar → show results.
4. Content script:
   - On supported sites, display a non-intrusive badge:
     - On click, show retrieved memories and “copy to clipboard” button.

---

## Phase 5 – Settings, Privacy, Reliability (5–7 days)

### Goals

- Make extension configurable & robust.

### Tasks

1. Options page:
   - Configure API keys, model names, auto-capture toggle, per-domain settings.
2. Enforce privacy:
   - Per-domain capture whitelist/blacklist.
   - Wipe-all button.
   - Export-all JSON.
3. Error handling:
   - Graceful fallback if LLM/embeddings fail.
   - Retry with exponential backoff (max 1–2 times).

---

## Phase 6 – Remote Backend Optional (7–10 days)

### Goals

- Allow running a Node server for memory engine.

### Tasks

1. Implement HTTP server with:
   - `/memories/ingest`
   - `/memories/retrieve`
   - `/memories/search`
   - `/memories` (list, delete).
2. Plug in persistent store:
   - Qdrant or Postgres+pgvector.
3. Add `MemoryClient` in extension to call remote backend.

---

## Phase 7 – Testing & Hardening (5–7 days)

### Goals

- Ensure stability for daily use.

### Tasks

1. Unit tests:
   - LLM integration (mock).
   - Memory store.
   - Similarity functions.
2. Integration tests with:
   - Simulated ingestion + retrieval flows.
3. Manual QA:
   - Test on Chrome, Brave, (optionally Firefox with MV2 adaptation).
4. Prepare release:
   - Versioning.
   - Changelog.
