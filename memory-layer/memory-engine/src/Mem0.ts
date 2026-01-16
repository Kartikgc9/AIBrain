import { BrowserStore } from './store/BrowserStore';
import { OpenAIProvider } from './llm/OpenAIProvider';
import { IngestionPipeline } from './ingestion/IngestionPipeline';
import { AddMemoryOptions, GetAllMemoryOptions, MemoryItem, SearchMemoryOptions, SearchResult } from './mem0-types';

export class Memory {
    private store: BrowserStore;
    private llm: OpenAIProvider;
    private pipeline: IngestionPipeline;

    constructor(config: { apiKey: string }) {
        if (!config.apiKey) throw new Error("API Key required for AiBrain Memory");
        this.store = new BrowserStore();
        this.llm = new OpenAIProvider(config.apiKey);
        this.pipeline = new IngestionPipeline(this.store, this.llm);
    }

    async init() {
        await this.store.init();
    }

    async add(messages: string | string[], config: AddMemoryOptions): Promise<SearchResult> {
        await this.init();

        const inputs = Array.isArray(messages) ? messages : [messages];
        const results: MemoryItem[] = [];

        for (const text of inputs) {
            // Map Mem0 config to our generic metadata
            const metadata = {
                ...config.metadata,
                userId: config.userId,
                agentId: config.agentId,
                runId: config.runId
            };

            const ids = await this.pipeline.run(text, {
                url: 'mem0-manual-add',
                timestamp: Date.now(),
                platform: 'manual',
                ...metadata
            });

            // Fetch back to return MemoryItems
            for (const id of ids) {
                const mem = await this.store.getMemory(id);
                if (mem) {
                    results.push({
                        id: mem.id,
                        memory: mem.content,
                        createdAt: new Date(mem.createdAt).toISOString(),
                        metadata: { ...mem.source, type: mem.type }
                    });
                }
            }
        }

        return { results };
    }

    async search(query: string, config: SearchMemoryOptions): Promise<SearchResult> {
        await this.init();
        const embedding = await this.llm.generateEmbedding(query);

        // Filter mapping would go here, currently basic
        const memories = await this.store.searchByEmbedding(embedding, config.limit || 10);

        const results: MemoryItem[] = memories.map(m => ({
            id: m.id,
            memory: m.content,
            score: 0.9, // Placeholder as searchByEmbedding doesn't return score publically yet
            createdAt: new Date(m.createdAt).toISOString(),
            metadata: { ...m.source, type: m.type }
        }));

        return { results };
    }

    async getAll(config: GetAllMemoryOptions): Promise<SearchResult> {
        await this.init();
        const memories = await this.store.listMemories(config.limit || 100);

        const results: MemoryItem[] = memories.map(m => ({
            id: m.id,
            memory: m.content,
            createdAt: new Date(m.createdAt).toISOString(),
            metadata: { ...m.source, type: m.type }
        }));

        return { results };
    }
}
