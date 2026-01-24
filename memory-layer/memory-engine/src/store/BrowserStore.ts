import { Memory, MemoryFilter } from '../models/Memory';
import { MemoryStore } from './MemoryStore';
import { cosineSimilarity } from '../utils/similarity';

// Simple IndexedDB wrapper
const DB_NAME = 'MemoryLayerDB';
const STORE_NAME = 'memories';

export class BrowserStore implements MemoryStore {
    private db: IDBDatabase | null = null;
    private initialized = false;
    private operationQueue: Promise<void> = Promise.resolve();

    async init(): Promise<void> {
        if (this.initialized) return;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                this.initialized = true;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
        });
    }

    /**
     * Queue an operation to prevent race conditions
     */
    private queueOperation<T>(operation: () => Promise<T>): Promise<T> {
        const result = this.operationQueue.then(operation);
        this.operationQueue = result.then(() => {}, () => {});
        return result;
    }

    async saveMemory(memory: Memory): Promise<string> {
        return this.queueOperation(async () => {
            await this.init();
            return new Promise((resolve, reject) => {
                const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                // Use put() instead of add() to handle duplicate keys (upsert behavior)
                const request = store.put(memory);

                request.onsuccess = () => resolve(memory.id);
                request.onerror = () => reject(request.error);
            });
        });
    }

    async updateMemory(id: string, patch: Partial<Memory>): Promise<void> {
        return this.queueOperation(async () => {
            await this.init();
            const memory = await this.getMemoryInternal(id);
            if (!memory) throw new Error("Memory not found");

            const updated = { ...memory, ...patch, updatedAt: Date.now() };

            return new Promise((resolve, reject) => {
                const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(updated);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        });
    }

    async deleteMemory(id: string): Promise<void> {
        return this.queueOperation(async () => {
            await this.init();
            return new Promise((resolve, reject) => {
                const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.delete(id);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        });
    }

    async getMemory(id: string): Promise<Memory | null> {
        await this.init();
        return this.getMemoryInternal(id);
    }

    /**
     * Internal method for getting a single memory (used within queued operations)
     */
    private async getMemoryInternal(id: string): Promise<Memory | null> {
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    async searchByEmbedding(
        embedding: number[],
        limit: number,
        filter?: MemoryFilter
    ): Promise<Memory[]> {
        await this.init();
        const allMemories = await this.getAllMemories();

        // 1. Filter
        let candidates = allMemories;
        if (filter) {
            candidates = candidates.filter(m => this.matchesFilter(m, filter));
        }

        // 2. Compute Similarities
        const scored = candidates.map(m => ({
            memory: m,
            score: cosineSimilarity(embedding, m.embedding)
        }));

        // 3. Sort
        scored.sort((a, b) => b.score - a.score);

        return scored.slice(0, limit).map(s => s.memory);
    }

    async listMemories(limit: number, filter?: MemoryFilter): Promise<Memory[]> {
        await this.init();
        let memories = await this.getAllMemories();
        if (filter) {
            memories = memories.filter(m => this.matchesFilter(m, filter));
        }
        return memories.slice(0, limit);
    }

    /**
     * Get all memories from the store
     * Public method for external access (e.g., export, sync)
     */
    async getAllMemories(): Promise<Memory[]> {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    private matchesFilter(memory: Memory, filter: MemoryFilter): boolean {
        // Type filter
        if (filter.type && memory.type !== filter.type) return false;

        // Scope filter
        if (filter.scope && memory.scope !== filter.scope) return false;

        // Tags filter - memory must have ALL specified tags
        if (filter.tags && filter.tags.length > 0) {
            const hasAllTags = filter.tags.every(tag =>
                memory.tags.includes(tag)
            );
            if (!hasAllTags) return false;
        }

        // Platform filter
        if (filter.platform && memory.source.platform !== filter.platform) {
            return false;
        }

        // Date range filter
        if (filter.startDate && memory.createdAt < filter.startDate) {
            return false;
        }
        if (filter.endDate && memory.createdAt > filter.endDate) {
            return false;
        }

        return true;
    }
}
