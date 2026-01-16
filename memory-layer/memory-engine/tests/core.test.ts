
import { LocalStore } from '../src/store/LocalStore';
import { IngestionPipeline } from '../src/ingestion/IngestionPipeline';
import { LLMProvider } from '../src/llm/LLMProvider';
import { cosineSimilarity } from '../src/utils/similarity';
import { Memory } from '../src/models/Memory';
import fs from 'fs/promises';
import path from 'path';

// Mock LLM Provider
class MockLLMProvider implements LLMProvider {
    async generateCompletion(prompt: string, model?: string): Promise<string> {
        return JSON.stringify([
            {
                content: "User likes TypeScript",
                type: "preference",
                scope: "user_global",
                confidence: 0.9,
                tags: ["programming", "typescript"]
            }
        ]);
    }

    async generateEmbedding(text: string): Promise<number[]> {
        // Return a dummy embedding
        return [0.1, 0.2, 0.3];
    }
}

describe('Memory Engine Core', () => {
    const testDir = path.join(__dirname, 'test-data');
    const testFile = path.join(testDir, 'memories.json');

    beforeAll(async () => {
        // Ensure test dir exists
        await fs.mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
        // Cleanup file
        try {
            await fs.unlink(testFile);
        } catch { }
    });

    afterAll(async () => {
        try {
            await fs.rmdir(testDir);
        } catch { }
    });

    test('Cosine Similarity', () => {
        const v1 = [1, 0];
        const v2 = [1, 0];
        const v3 = [0, 1];
        expect(cosineSimilarity(v1, v2)).toBeCloseTo(1);
        expect(cosineSimilarity(v1, v3)).toBeCloseTo(0);
    });

    test('LocalStore CRUD', async () => {
        const store = new LocalStore(testFile);
        await store.init();

        const memory: Memory = {
            id: '123',
            userId: 'test-user',
            content: 'Test Content',
            type: 'fact',
            scope: 'session',
            source: { url: 'http://test.com', timestamp: 123 },
            createdAt: 123,
            updatedAt: 123,
            confidence: 1,
            tags: [],
            embedding: [0.1, 0.1]
        };

        // Save
        await store.saveMemory(memory);
        let saved = await store.getMemory('123');
        expect(saved).toBeDefined();
        expect(saved?.content).toBe('Test Content');

        // Update
        await store.updateMemory('123', { content: 'Updated Content' });
        saved = await store.getMemory('123');
        expect(saved?.content).toBe('Updated Content');

        // Delete
        await store.deleteMemory('123');
        saved = await store.getMemory('123');
        expect(saved).toBeNull();
    });

    test('Ingestion Pipeline', async () => {
        const store = new LocalStore(testFile);
        const llm = new MockLLMProvider();
        const pipeline = new IngestionPipeline(store, llm);

        await store.init();

        const ids = await pipeline.run("I love TypeScript", { url: 'test', timestamp: 0 });
        expect(ids.length).toBe(1);

        const saved = await store.getMemory(ids[0]);
        expect(saved).toBeDefined();
        expect(saved?.content).toBe("User likes TypeScript");
        expect(saved?.embedding).toEqual([0.1, 0.2, 0.3]);
    });
});
