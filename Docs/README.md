# Personal Memory Layer – Browser Extension

A production-oriented, personal memory engine that runs behind your browser, extracts long-term useful information from your browsing and conversations (ChatGPT, Claude, etc.), and makes it instantly retrievable.

---

## Features

- LLM-powered memory extraction (facts, preferences, projects).
- Smart ADD / UPDATE / DELETE / NOOP operations.
- Local vector search over your own knowledge.
- Browser UI for search, browsing, and settings.
- Optional remote backend for heavier workloads.

---

## Repo Layout

- `extension/` – Chrome/Chromium extension (MV3, TS).
- `memory-engine/` – Memory engine (local or remote).
- `docs/` – PRD, architecture, API spec, prompts, plans.

See:
- `docs/PRD_memory_layer.md`
- `docs/ARCHITECTURE_memory_layer.md`
- `docs/API_SPEC_memory_layer.md`

---

## Getting Started

1. Configure `.env` / settings (API keys, LLM models).
2. Build extension:
   - `cd extension && npm install && npm run build`
3. Load `extension/dist` as unpacked extension in Chrome.
4. (Optional) Run memory engine server:
   - `cd memory-engine && npm install && npm run dev`

---

## Status

- Core architecture defined.
- Ready for implementation and iteration.
