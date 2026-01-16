# AIBrain 🧠

**A privacy-first browser extension that creates an intelligent long-term memory layer for AI interactions.**

AIBrain extracts and stores stable, useful facts from your browser conversations across multiple AI platforms (ChatGPT, Claude, Perplexity, Gemini), building a personalized knowledge base that enhances your AI interactions with contextual memory.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://developer.chrome.com/docs/extensions/mv3/)

## Features

- **Universal AI Platform Support**: Works seamlessly with ChatGPT, Claude, Perplexity, and Gemini
- **LLM-Powered Memory Extraction**: Uses GPT-4 to intelligently extract facts, preferences, tasks, and projects
- **Privacy-First Design**: All processing happens locally by default, with optional remote backend
- **Semantic Search**: Find relevant memories using vector embeddings and cosine similarity
- **Intelligent Deduplication**: Automatically identifies and merges duplicate memories
- **One-Click Capture**: Press Ctrl+M (Cmd+M on Mac) or click the 🧠 button to save conversations
- **Clean UI**: Dark-themed React interface with memory stats and recent memories

## Project Status

**Currently in active development** - Core features are implemented and working:

- ✅ Browser extension with content script injection
- ✅ Memory capture and IndexedDB storage
- ✅ Support for 5 major AI platforms
- ✅ Intelligent memory extraction and ingestion pipeline
- ✅ Deduplication and update logic
- ✅ Unit tests with Jest
- 🚧 Full LLM-powered extraction (in progress)
- 🚧 Settings configuration UI (in progress)
- ⏳ Semantic search interface (planned)
- ⏳ Data export/import (planned)

## Known Limitations (v0.1.0)

This is an early release with the following known issues:
- **LLM extraction not yet integrated**: Captured conversations are stored but not processed through the memory-engine
- **No semantic search**: Basic storage only, similarity search coming in v0.2.0
- **Manual API key required**: Extension needs OpenAI API key configuration
- **Chrome only**: Firefox and Safari support planned

See [Issues](https://github.com/Kartikgc9/AIBrain/issues) for full list and roadmap.

## Architecture

AIBrain consists of two main components:

### 1. Browser Extension (`memory-layer/extension/`)
- **Technology**: Chrome Extension Manifest V3, React, TypeScript, Vite
- **Components**:
  - Background service worker with IndexedDB
  - Content scripts for platform-specific extraction
  - React-based popup UI
  - Settings management

### 2. Memory Engine (`memory-layer/memory-engine/`)
- **Technology**: Node.js, TypeScript, OpenAI API, Jest
- **Components**:
  - Storage layer (LocalStore, BrowserStore)
  - LLM provider abstraction (OpenAI)
  - Ingestion pipeline with ADD/UPDATE/DEDUPLICATE logic
  - Extraction service
  - Vector similarity utilities

## Installation

### For Users (Production)

*Coming soon - extension will be available on Chrome Web Store*

### For Developers (Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/Kartikgc9/AIBrain.git
   cd AIBrain
   ```

2. **Build the memory engine**
   ```bash
   cd memory-layer/memory-engine
   npm install
   npm run build
   npm test
   ```

3. **Build the extension**
   ```bash
   cd ../extension
   npm install
   npm run build
   ```

4. **Load the extension in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `memory-layer/extension/dist/` folder

5. **Configure your OpenAI API key**
   - Click the AIBrain extension icon
   - Go to Settings tab
   - Enter your OpenAI API key

## Usage

1. **Capture a conversation**: While on any supported AI chat platform, press `Ctrl+M` (or `Cmd+M` on Mac), or click the 🧠 button that appears in the interface
2. **View your memories**: Click the AIBrain extension icon to see stats and recent memories
3. **Search memories**: Use the search interface to find relevant past conversations (coming soon)

## Supported Platforms

- ChatGPT (chat.openai.com)
- Claude (claude.ai)
- Perplexity (perplexity.ai)
- Gemini (gemini.google.com)

**Coming soon**: Grok and other platforms

## Memory Types

AIBrain classifies memories into five types:

- **Preference**: User likes, dislikes, habits, and choices
- **Fact**: Objective information about the user or their context
- **Task**: TODOs, goals, action items
- **Project**: Ongoing work, projects, initiatives
- **Meta**: Information about how the user uses AI tools

## Privacy & Security

- **Local-First**: All data stored locally in your browser by default
- **No External Tracking**: No analytics or telemetry
- **API Key Security**: Stored securely in Chrome's encrypted storage
- **Open Source**: Full transparency - audit the code yourself
- **Optional Backend**: Remote sync is opt-in only

## Development

### Project Structure

```
AIBrain/
├── Docs/                          # Comprehensive documentation
├── memory-layer/
│   ├── extension/                 # Browser extension
│   │   ├── src/
│   │   │   ├── background/       # Service worker
│   │   │   ├── content-scripts/  # Platform extractors
│   │   │   └── popup/            # React UI
│   │   └── dist/                 # Build output
│   └── memory-engine/             # Core memory logic
│       ├── src/
│       │   ├── models/           # TypeScript types
│       │   ├── store/            # Storage layer
│       │   ├── llm/              # LLM providers
│       │   ├── ingestion/        # Memory pipeline
│       │   └── utils/            # Utilities
│       └── tests/                # Jest tests
└── external/
    └── mem0/                      # Reference implementation
```

### Key Technologies

- **TypeScript**: Primary language
- **React**: UI framework
- **Vite**: Build tool
- **OpenAI API**: LLM and embeddings
- **IndexedDB**: Browser storage
- **Jest**: Testing framework

### Running Tests

```bash
cd memory-layer/memory-engine
npm test
```

### Building

```bash
# Build everything
cd memory-layer/memory-engine && npm run build
cd ../extension && npm run build
```

## Documentation

Comprehensive documentation is available in the `Docs/` folder:

- [Product Requirements](Docs/PRD_memory_layer.md)
- [Architecture Design](Docs/ARCHITECTURE_memory_layer.md)
- [API Specification](Docs/API_SPEC_memory_layer.md)
- [Development Plan](Docs/DEVELOPMENT_PLAN_memory_layer.md)
- [Test Plan](Docs/TEST_PLAN_memory_layer.md)
- [LLM Prompts](Docs/LLM_PROMPTS_memory_layer.md)

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Ways to Contribute

- Report bugs and suggest features via [Issues](https://github.com/Kartikgc9/AIBrain/issues)
- Submit pull requests for bug fixes or new features
- Improve documentation
- Add support for new AI platforms
- Write tests
- Share your use cases and feedback

## Roadmap

See [DEVELOPMENT_PLAN_memory_layer.md](Docs/DEVELOPMENT_PLAN_memory_layer.md) for the full development roadmap.

**Upcoming features:**
- Semantic search and retrieval UI
- Data export/import functionality
- Per-domain memory controls
- Support for additional LLM providers (Anthropic, Gemini, etc.)
- Optional remote backend for cross-device sync
- Browser extension for Firefox and Safari

## Inspiration

AIBrain is inspired by [Mem0](https://github.com/mem0ai/mem0), a production-grade memory layer for AI systems. We've adapted the concept for browser-based AI interactions with a focus on privacy and local-first architecture.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/Kartikgc9/AIBrain/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Kartikgc9/AIBrain/discussions)
- **Email**: ykartikawadh@gmail.com

## Acknowledgments

- [Mem0](https://github.com/mem0ai/mem0) for inspiration and reference architecture
- OpenAI for GPT-4 and embedding models
- The open-source community for amazing tools and libraries

---

**Built with ❤️ for better AI interactions**
