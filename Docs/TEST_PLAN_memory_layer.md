# Test Plan: Personal Memory Layer

## 1. Scope

- Extension behaviors (content scripts, background, popup).
- Memory engine logic (extraction, updates, retrieval).
- Settings, privacy, and data lifecycle.

---

## 2. Unit Tests

### 2.1 Similarity & Embeddings

- Test cosine similarity function:
  - Handles zero vectors, identical vectors, orthogonal vectors.
- Test `EmbeddingProvider` wrapper:
  - Correctly handles API errors and timeouts (mocked).

### 2.2 MemoryStore

- `saveMemory`:
  - Writes doc, returns id.
- `updateMemory`:
  - Patches existing doc; throw if not found.
- `deleteMemory`:
  - Removes doc; idempotent.
- `searchByEmbedding`:
  - Returns items sorted by similarity.

### 2.3 ExtractionService

- Given a sample conversation:
  - Returns a JSON with 1–5 memories.
  - Each memory has all required fields.
- With mock LLM:
  - Handle invalid JSON return gracefully.

### 2.4 UpdateDecisionService

- Add scenario:
  - No similar memory found → `ADD`.
- Update scenario:
  - Similar memory same type & scope → `UPDATE`.
- Contradiction scenario:
  - Candidate conflicts strongly → `DELETE` + `ADD`.

---

## 3. Integration Tests

### 3.1 Ingestion Flow

- Simulate text from ChatGPT page.
- End-to-end:
  - `ingestText` → LLM extraction (mock) → memory store.
- Assert:
  - Memory count increases.
  - Embeddings computed.

### 3.2 Retrieval Flow

- Seed store with known memories.
- Query “Python backend preferences”.
- Assert:
  - Most similar memory about Python backend is top-1.

---

## 4. Browser Manual Tests

### 4.1 Content Scripts

- On chat.openai.com:
  - Capture conversation.
  - Ensure content script retrieves full conversation text.
- On non-whitelisted domain:
  - Verify no capture happens.

### 4.2 Popup UI

- Open popup:
  - Recent memories displayed.
  - Search returns relevant items.
- Settings:
  - Toggling auto-capture updates behavior.
  - Wipe-all removes all memories.

### 4.3 Error Conditions

- Simulate LLM failure:
  - Ingestion returns error; no crash.
  - User sees a friendly message (or silent fail for automatic flows).
- Simulate store failure (quota exceeded):
  - Log meaningful error.
  - Warn user in popup.

---

## 5. Performance

- Measure ingestion latency:
  - From `CAPTURE_CONVERSATION` message to memory saved.
- Measure retrieval latency:
  - From search query to results shown.
- Targets:
  - Retrieval < 200ms (local).
  - Ingestion end-to-end < 3s for typical chat.

---

## 6. Regression

- Before each release:
  - Run unit & integration tests.
  - Manual sanity checks on:
    - ChatGPT.
    - At least 1 other site (e.g., Perplexity).
