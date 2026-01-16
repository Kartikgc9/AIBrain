# Directory Structure: Memory Layer + Browser Extension

memory-layer/
├── extension/
│ ├── public/
│ │ ├── icon16.png
│ │ ├── icon48.png
│ │ ├── icon128.png
│ │ └── popup.html
│ ├── src/
│ │ ├── manifest.json
│ │ ├── background/
│ │ │ ├── index.ts
│ │ │ ├── messageBus.ts
│ │ │ ├── memoryClient.ts
│ │ │ ├── settingsManager.ts
│ │ │ └── logger.ts
│ │ ├── content-scripts/
│ │ │ ├── chatgptContent.ts
│ │ │ ├── claudeContent.ts
│ │ │ ├── genericPageContent.ts
│ │ │ └── domUtils.ts
│ │ ├── popup/
│ │ │ ├── index.tsx
│ │ │ ├── App.tsx
│ │ │ └── components/
│ │ │ ├── MemoryList.tsx
│ │ │ ├── SearchBox.tsx
│ │ │ └── SettingsView.tsx
│ │ ├── options/
│ │ │ ├── index.tsx
│ │ │ └── OptionsApp.tsx
│ │ ├── types/
│ │ │ ├── messages.ts
│ │ │ └── memory.ts
│ │ └── utils/
│ │ ├── storage.ts
│ │ └── api.ts
│ ├── tsconfig.json
│ └── package.json
│
├── memory-engine/
│ ├── src/
│ │ ├── index.ts
│ │ ├── config.ts
│ │ ├── server.ts # Optional HTTP server (Fastify/Express)
│ │ ├── llm/
│ │ │ ├── LLMProvider.ts
│ │ │ ├── OpenAILLMProvider.ts
│ │ │ └── LocalLLMProvider.ts (optional)
│ │ ├── embeddings/
│ │ │ ├── EmbeddingProvider.ts
│ │ │ └── OpenAIEmbeddingProvider.ts
│ │ ├── store/
│ │ │ ├── MemoryStore.ts
│ │ │ ├── LocalStore.ts # JSON/FS store for Node dev
│ │ │ └── QdrantStore.ts # Example remote vector DB
│ │ ├── models/
│ │ │ └── Memory.ts
│ │ ├── ingestion/
│ │ │ ├── IngestionPipeline.ts
│ │ │ └── ExtractionService.ts
│ │ ├── retrieval/
│ │ │ └── RetrievalService.ts
│ │ ├── router/
│ │ │ └── httpRoutes.ts
│ │ └── utils/
│ │ ├── logger.ts
│ │ └── similarity.ts
│ ├── package.json
│ └── tsconfig.json
│
├── docs/
│ ├── PRD_memory_layer.md
│ ├── ARCHITECTURE_memory_layer.md
│ ├── API_SPEC_memory_layer.md
│ ├── LLM_PROMPTS_memory_layer.md
│ ├── DEVELOPMENT_PLAN_memory_layer.md
│ └── TEST_PLAN_memory_layer.md
│
└── README.md