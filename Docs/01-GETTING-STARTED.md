# AIBrain - Getting Started Guide

## Table of Contents
1. [Overview](#overview)
2. [Loading the Extension in Chrome](#loading-the-extension-in-chrome)
3. [Loading in Other Browsers](#loading-in-other-browsers)
4. [Testing the Extension](#testing-the-extension)
5. [Starting the Server](#starting-the-server)
6. [Troubleshooting](#troubleshooting)

---

## Overview

AIBrain is a browser extension that creates a personal memory layer across AI chat platforms. It allows you to:
- Capture conversations from ChatGPT, Claude, Perplexity, Gemini, and Grok
- Search your memories using text or semantic search
- Insert memories directly into chat input fields

---

## Loading the Extension in Chrome

### Step 1: Build the Extension (if not already built)
```bash
cd D:\AIBrain\memory-layer\extension
npm install
npm run build
```

### Step 2: Open Chrome Extensions Page
1. Open Google Chrome
2. Navigate to: `chrome://extensions/`
   - Or click Menu (three dots) > More Tools > Extensions

### Step 3: Enable Developer Mode
1. Toggle **"Developer mode"** switch in the top-right corner to ON

### Step 4: Load the Extension
1. Click **"Load unpacked"** button (top-left)
2. Navigate to: `D:\AIBrain\memory-layer\extension\dist`
3. Select the `dist` folder and click "Select Folder"

### Step 5: Verify Installation
- You should see "AI Brain" in your extensions list
- A brain icon should appear in your Chrome toolbar
- If the icon is hidden, click the puzzle piece icon and pin "AI Brain"

---

## Loading in Other Browsers

### Microsoft Edge
1. Navigate to: `edge://extensions/`
2. Enable "Developer mode" (bottom-left toggle)
3. Click "Load unpacked"
4. Select `D:\AIBrain\memory-layer\extension\dist`

### Firefox (requires manifest v2 conversion)
Firefox uses a different extension format. The current manifest v3 won't work directly.

### Brave
Same process as Chrome:
1. Navigate to: `brave://extensions/`
2. Enable Developer mode
3. Load unpacked from `dist` folder

---

## Testing the Extension

### Test 1: Popup Window
1. Click the AI Brain icon in your toolbar
2. You should see a popup showing memory statistics
3. It should display "Total Memories: 0" initially

### Test 2: Content Script Injection
1. Navigate to https://chatgpt.com or https://claude.ai
2. Press `Ctrl+M` (or `Cmd+M` on Mac) - should trigger capture
3. You should see a brain button (🧠) appear near the chat input

### Test 3: Search Panel
1. On any supported AI platform
2. Press `Ctrl+Shift+M` (or `Cmd+Shift+M`)
3. A purple search panel should appear
4. You can drag it by the header

### Test 4: Memory Capture
1. Have a conversation on ChatGPT or Claude
2. Click the 🧠 button or press `Ctrl+M`
3. The button should turn green with a checkmark if successful
4. Click the extension popup to verify memory count increased

### Test 5: Memory Insertion
1. Open the search panel (`Ctrl+Shift+M`)
2. Search for a memory
3. Click "Insert" on a memory card
4. The content should appear in the chat input

---

## Starting the Server

The server provides optional cloud sync and semantic search capabilities.

### Prerequisites
- Node.js 18+
- PostgreSQL with pgvector extension
- OpenAI API key (for embeddings)

### Setup
```bash
cd D:\AIBrain\aibrain-server

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your configuration:
# DATABASE_URL=postgresql://user:pass@localhost:5432/aibrain
# JWT_SECRET=your-secret-key
# OPENAI_API_KEY=your-openai-key

# Run migrations
npm run migrate

# Start development server
npm run dev
```

### Server Endpoints
- `GET /health` - Health check
- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/memories` - Create memory
- `GET /api/v1/memories` - List memories
- `POST /api/v1/memories/search` - Semantic search

---

## Troubleshooting

### Extension Not Loading
- Ensure you selected the `dist` folder, not the `extension` folder
- Check for build errors: `npm run build`
- Look at Chrome's extension page for error messages

### Content Script Not Working
1. Open DevTools on the AI platform page (F12)
2. Check Console tab for `[AIBrain]` or `[AI Brain]` messages
3. If no messages, the content script may not have loaded
4. Try refreshing the page or reloading the extension

### Keyboard Shortcuts Not Working
1. Go to `chrome://extensions/shortcuts`
2. Find "AI Brain" and verify/set the shortcuts
3. Some websites may capture these shortcuts first

### Storage/IndexedDB Issues
1. Open DevTools > Application > IndexedDB
2. Look for "MemoryLayerDB"
3. You can delete it to reset local storage

### Service Worker Issues
1. Go to `chrome://extensions`
2. Find AI Brain and click "Details"
3. Click "Service Worker" to see its console
4. Check for initialization errors

### Common Error Messages

| Error | Solution |
|-------|----------|
| "Cannot read property 'sendMessage'" | Reload extension, refresh page |
| "Extension context invalidated" | Reload extension |
| "No memories found" | Capture some conversations first |
| "localStorage unavailable" | May be in private browsing mode |

---

## Supported Platforms

| Platform | URL | Status |
|----------|-----|--------|
| ChatGPT | chatgpt.com, chat.openai.com | ✅ Full Support |
| Claude | claude.ai | ✅ Full Support |
| Perplexity | perplexity.ai | ✅ Full Support |
| Gemini | gemini.google.com | ✅ Full Support |
| Grok | x.com/i/grok | ✅ Full Support |

---

## Next Steps

After getting the extension working:
1. Read [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) to understand the codebase
2. Read [03-CORE-CONCEPTS.md](./03-CORE-CONCEPTS.md) for technical concepts
3. Read [04-EXTENSION-DEEP-DIVE.md](./04-EXTENSION-DEEP-DIVE.md) for extension internals
4. Read [05-SERVER-DEEP-DIVE.md](./05-SERVER-DEEP-DIVE.md) for server internals
