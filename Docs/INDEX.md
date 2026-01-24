# AIBrain Documentation Index

Welcome to the AIBrain documentation! This guide will help you understand, use, and contribute to the project.

## Quick Links

| Document | Description | Level |
|----------|-------------|-------|
| [01-GETTING-STARTED.md](./01-GETTING-STARTED.md) | Installation, loading extension, testing | Beginner |
| [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) | System design, component overview | Intermediate |
| [03-CORE-CONCEPTS.md](./03-CORE-CONCEPTS.md) | Fundamental concepts explained | Beginner |
| [04-EXTENSION-DEEP-DIVE.md](./04-EXTENSION-DEEP-DIVE.md) | Browser extension internals | Advanced |
| [05-SERVER-DEEP-DIVE.md](./05-SERVER-DEEP-DIVE.md) | Backend server internals | Advanced |
| [06-DEVELOPMENT-PATTERNS.md](./06-DEVELOPMENT-PATTERNS.md) | Best practices, debugging | Intermediate |

---

## Learning Path

### For Users
1. Start with **[01-GETTING-STARTED.md](./01-GETTING-STARTED.md)** to install and test the extension

### For Developers (New to Web Development)
1. **[03-CORE-CONCEPTS.md](./03-CORE-CONCEPTS.md)** - Learn fundamentals
2. **[01-GETTING-STARTED.md](./01-GETTING-STARTED.md)** - Set up the project
3. **[02-ARCHITECTURE.md](./02-ARCHITECTURE.md)** - Understand the structure

### For Experienced Developers
1. **[02-ARCHITECTURE.md](./02-ARCHITECTURE.md)** - Quick overview
2. **[04-EXTENSION-DEEP-DIVE.md](./04-EXTENSION-DEEP-DIVE.md)** - Extension details
3. **[05-SERVER-DEEP-DIVE.md](./05-SERVER-DEEP-DIVE.md)** - Server details
4. **[06-DEVELOPMENT-PATTERNS.md](./06-DEVELOPMENT-PATTERNS.md)** - Patterns and best practices

---

## Project Summary

**AIBrain** is a browser extension that creates a persistent memory layer across AI chat platforms.

### Key Features
- Capture conversations from ChatGPT, Claude, Perplexity, Gemini, Grok
- Full-text and semantic search across memories
- Insert memories directly into chat inputs
- Optional cloud sync with the server

### Technology Stack

| Component | Technology |
|-----------|------------|
| Extension | TypeScript, Vite, React |
| Storage (Local) | IndexedDB |
| Server | Fastify, TypeScript |
| Database | PostgreSQL + pgvector |
| Validation | Zod |
| Authentication | JWT |

---

## Quick Start

```bash
# Clone and install
git clone <repo>
cd AIBrain

# Extension
cd memory-layer/extension
npm install
npm run build

# Load in Chrome:
# 1. Go to chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the `dist` folder

# Server (optional)
cd aibrain-server
npm install
npm run dev
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+M` | Capture current conversation |
| `Ctrl+Shift+M` | Open search panel |
| `Esc` | Close search panel |
| `↑/↓` | Navigate search results |
| `Enter` | Insert selected memory |

---

## Topics Covered in Documentation

### 01-GETTING-STARTED.md
- Loading extension in Chrome, Edge, Brave
- Testing each feature
- Starting the server
- Troubleshooting common issues

### 02-ARCHITECTURE.md
- System architecture diagram
- Directory structure
- Component overview
- Data flow diagrams
- Communication patterns
- Storage architecture

### 03-CORE-CONCEPTS.md
- Browser Extension fundamentals (Manifest V3)
- TypeScript concepts (interfaces, generics, async/await)
- IndexedDB and storage options
- Vector embeddings and semantic search
- DOM manipulation
- Asynchronous JavaScript patterns

### 04-EXTENSION-DEEP-DIVE.md
- Service Worker details
- Content script injection
- Search panel implementation
- Memory insertion logic
- Platform detection
- Vite build system

### 05-SERVER-DEEP-DIVE.md
- Fastify framework
- Drizzle ORM
- Authentication with JWT
- Memory service implementation
- Vector search with pgvector
- WebSocket sync
- Zod validation

### 06-DEVELOPMENT-PATTERNS.md
- Code organization patterns
- Error handling strategies
- Security best practices
- Performance optimization
- Testing strategies
- Debugging tips
