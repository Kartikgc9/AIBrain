# Product Requirements Document (PRD)
## Product: Personal Memory Layer for Browser Extension
## Owner: <your_name>
## Version: v1.0

---

## 1. Vision

Build a **personal, privacy-first memory layer** that:
- Listens to content in the browser (ChatGPT, Perplexity, Claude, Gmail, Docs, etc.)
- Extracts **stable, useful, user-specific facts** using an LLM
- Stores, updates, and deletes memories intelligently using embeddings + metadata
- Exposes a simple API to **retrieve relevant memories** when the user opens a new tab / conversation / page
- Is **production-ready**: observable, configurable, and safe to run locally or with a remote backend.

---

## 2. Primary Use Cases

1. **Contextual Assist for Chat-based AI**
   - User chats with ChatGPT/Claude/Perplexity.
   - Extension captures conversation, extracts facts about user preferences, tasks, projects.
   - Next time user opens AI site, extension surfaces relevant memories and offers them to paste into prompt.

2. **Task & Project Memory**
   - User researches a topic (e.g., “Build an LLM app with Next.js”).
   - Extension extracts and stores project-related facts (stack choices, links, constraints).
   - When user revisits similar topics/sites, extension recalls these facts.

3. **Personal Profile & Preferences**
   - Over time, extension builds a long-term profile:
     - Preferred tools, programming languages, writing style, schedule, etc.
   - Exposed as a “Personal Profile Memory” that can be inserted into prompts.

4. **Search in Personal Memory**
   - User opens extension popup and searches:
   - “What did I decide about my SaaS architecture last week?”
   - Extension retrieves relevant memories via semantic search.

---

## 3. Core Functional Requirements

### 3.1 Memory Ingestion

- **Sources**
  - Browser DOM from:
    - ChatGPT, Claude, Perplexity, Gemini, etc.
    - Gmail (optional v2)
    - Generic HTML pages (articles, docs)
- **Events**
  - `conversation_end` (user presses Enter, or conversation idle)
  - `page_close` / `tab_unload`
  - `manual_capture` via extension button

- **Pipeline**
  1. Collect raw text (content + limited metadata).
  2. Chunk or structure it if needed.
  3. Send to backend (or local worker) for memory extraction.

### 3.2 Memory Extraction & Update Logic

- **LLM-based extraction**
  - Prompt model to:
    - Extract atomic, stable facts about user / tasks / preferences.
    - Label each memory with:
      - `type` (preference, task, fact, project, meta)
      - `scope` (user-global, session, site, conversation)
      - `confidence` (0–1)
  - Use **tool / function calling** for:
    - `ADD_MEMORY`
    - `UPDATE_MEMORY`
    - `DELETE_MEMORY`
    - `NOOP`

- **Decision Model**
  - For each candidate memory:
    - Compute embedding.
    - Search existing memories by semantic similarity + metadata.
    - Provide candidate + nearest neighbors to LLM to decide:
      - Create new memory vs update vs delete vs noop.

### 3.3 Memory Storage

- **Semantics**
  - Each memory document:
    ```
    {
      "id": "uuid",
      "user_id": "local_user",
      "content": "User likes to use Python and FastAPI for backend projects.",
      "type": "preference",
      "scope": "user_global",
      "source": {
        "url": "https://chat.openai.com/...",
        "platform": "chatgpt",
        "timestamp": 1734000000,
        "conversation_id": "c123"
      },
      "created_at": 1734000000,
      "updated_at": 1734000100,
      "confidence": 0.92,
      "embedding": [0.1, 0.2, 0.3],
      "tags": ["python", "backend", "fastapi"]
    }
    ```

- **Backends (configurable)**
  - Local only:
    - `IndexedDB` for raw docs and metadata.
    - Local vector index (e.g., in-memory + periodic persisted JSON or WASM FAISS/Annoy/Local Qdrant).
  - Remote:
    - HTTP API to FastAPI/Node backend using:
      - Postgres + pgvector OR
      - Qdrant / Weaviate / Chroma.

### 3.4 Retrieval

- APIs (extension ↔ memory backend):
  - `getRelevantMemories(query, context, limit=10)`
  - `getProfileMemories(limit=20)`
  - `getMemoriesByTag(tag, limit=50)`
  - `searchMemories(text_query, limit=20)`

- Mechanism:
  - Compute embedding of query.
  - Perform vector search + filter by scope, recency, confidence.
  - (Optional) Re-rank using LLM or scoring heuristic.

- Integration:
  - On specific sites (e.g., ChatGPT):
    - Show a small overlay: “3 relevant memories found – insert?”
    - On click, show preview and copy-to-clipboard or auto-insert into prompt.

### 3.5 UX / UI

- **Browser Action Popup**
  - Search bar over memories.
  - Filters: site, date, type, tags.
  - Recent memories view.
  - Settings (model, backend, privacy, auto-capture toggle).

- **Contextual Overlay**
  - Badge on supported sites.
  - Quick actions:
    - “Capture this conversation”
    - “Show related memories”

- **Settings**
  - On/off per domain.
  - Local-only mode.
  - Data export (JSON).
  - Data wipe.

---

## 4. Non-Functional Requirements

- **Performance**
  - Memory retrieval < 200ms (local backend).
  - End-to-end extraction & write < 3s for typical conversations.
- **Reliability**
  - Robust against browser reloads.
  - Graceful fallback if backend unavailable.
- **Security & Privacy**
  - All memory data encrypted at rest (if local).
  - TLS for any remote requests.
  - Clear data deletion and export.
- **Extensibility**
  - Abstract storage interface.
  - Abstract LLM provider + embedding provider.

---

## 5. Phases / Milestones

### Phase 1 – MVP (Local-only)
- DOM capture for ChatGPT + generic pages.
- Local memory store (IndexedDB + simple cosine search).
- LLM-based extraction & add-only memory.
- Basic popup UI with search & list.

### Phase 2 – Intelligent Updates
- Similarity search + LLM-based ADD/UPDATE/DELETE/NOOP.
- Memory confidence & scopes.
- Contextual overlay and auto-suggest.

### Phase 3 – Productionization
- Logging, metrics, feature flags.
- Pluggable backends (local / remote).
- Settings, export, full wipe, per-site opt-out.

### Phase 4 – Advanced Features (optional)
- Time-based decay / consolidation.
- User-level profile summarization.
- Graph relationships between entities.

---

## 6. Out of Scope (v1)

- Multi-user cloud SaaS (this is personal).
- Mobile browsers.
- Complex graph reasoning.
- Cross-device sync (can be v2).
