# API Specification: Memory Engine

Base URL (remote mode): `https://<host>/api/v1`  
Base URL (local in extension): pseudo-API via message passing.

---

## 1. Ingest Memories

### POST `/memories/ingest`

Ingest raw text from a browser source and let the engine extract/update memories.

**Request**

{
"user_id": "local_user",
"text": "full conversation or page content here",
"source": {
"url": "https://chat.openai.com/c/123",
"platform": "chatgpt",
"timestamp": 1734000000,
"page_title": "ChatGPT",
"conversation_id": "c123"
}
}

text

**Response**

{
"status": "ok",
"applied_operations": [
{
"op": "ADD",
"memory": { }
},
{
"op": "UPDATE",
"memory": { }
}
]
}

text

---

## 2. Retrieve Relevant Memories

### POST `/memories/retrieve`

Retrieve memories relevant to a query or current context.

**Request**

{
"user_id": "local_user",
"query": "I'm working on my LLM SaaS architecture",
"filters": {
"scope": ["user_global", "site"],
"platform": "chatgpt",
"min_confidence": 0.6
},
"limit": 10
}

text

**Response**

{
"status": "ok",
"memories": [
{
"id": "m1",
"content": "User is building a SaaS with Next.js + FastAPI + Postgres.",
"confidence": 0.91,
"scope": "user_global",
"type": "project",
"source": { "url": "...", "timestamp": 1733000000 },
"tags": ["saas", "architecture"],
"created_at": 1733000000,
"updated_at": 1733100000
}
]
}

text

---

## 3. Search Memories (Text)

### POST `/memories/search`

Text-based search (embedding + optional full-text).

**Request**

{
"user_id": "local_user",
"text": "Python backend preferences",
"limit": 20
}

text

**Response**

Same shape as `/memories/retrieve`.

---

## 4. List & Manage Memories

### GET `/memories`

Query parameters:

- `user_id` (required)
- `limit`, `offset`
- `type`, `scope`, `tag`, `platform`

**Response**

{
"status": "ok",
"memories": []
}

text

### DELETE `/memories/:id`

Delete a single memory.

**Response**

{ "status": "ok" }

text

---

## 5. Profile & Summaries (Optional v2)

### GET `/memories/profile`

Returns a high-level profile summary of user preferences & projects.

**Response**

{
"status": "ok",
"summary": "User is an AI/ML-focused developer using Python, FastAPI, and AWS...",
"profile_memories": []
}

text

---

## 6. Auth

For personal use:
- `x-api-key` header if remote.
- None in local-only mode.

x-api-key: <YOUR_SECRET>

text