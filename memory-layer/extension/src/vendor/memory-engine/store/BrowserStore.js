"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserStore = void 0;
const similarity_1 = require("../utils/similarity");
// Simple IndexedDB wrapper
const DB_NAME = 'MemoryLayerDB';
const STORE_NAME = 'memories';
class BrowserStore {
    constructor() {
        this.db = null;
        this.initialized = false;
    }
    async init() {
        if (this.initialized)
            return;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                this.initialized = true;
                resolve();
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
        });
    }
    async saveMemory(memory) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(memory);
            request.onsuccess = () => resolve(memory.id);
            request.onerror = () => reject(request.error);
        });
    }
    async updateMemory(id, patch) {
        await this.init();
        const memory = await this.getMemory(id);
        if (!memory)
            throw new Error("Memory not found");
        const updated = { ...memory, ...patch, updatedAt: Date.now() };
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(updated);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    async deleteMemory(id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    async getMemory(id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }
    async searchByEmbedding(embedding, limit, filter) {
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
            score: (0, similarity_1.cosineSimilarity)(embedding, m.embedding)
        }));
        // 3. Sort
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, limit).map(s => s.memory);
    }
    async listMemories(limit, filter) {
        await this.init();
        let memories = await this.getAllMemories();
        if (filter) {
            memories = memories.filter(m => this.matchesFilter(m, filter));
        }
        return memories.slice(0, limit);
    }
    async getAllMemories() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    matchesFilter(memory, filter) {
        // Same logic as LocalStore
        if (filter.type && memory.type !== filter.type)
            return false;
        if (filter.scope && memory.scope !== filter.scope)
            return false;
        // ... complete implementation similar to LocalStore
        return true;
    }
}
exports.BrowserStore = BrowserStore;
