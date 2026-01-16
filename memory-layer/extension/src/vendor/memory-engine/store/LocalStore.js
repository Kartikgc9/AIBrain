"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStore = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const similarity_1 = require("../utils/similarity");
class LocalStore {
    constructor(persistencePath) {
        this.memories = [];
        this.initialized = false;
        this.persistencePath = persistencePath;
    }
    async init() {
        if (this.initialized)
            return;
        try {
            const data = await promises_1.default.readFile(this.persistencePath, 'utf-8');
            this.memories = JSON.parse(data);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist, start empty
                this.memories = [];
                await this.persist();
            }
            else {
                throw error;
            }
        }
        this.initialized = true;
    }
    async persist() {
        // Ensure directory exists
        const dir = path_1.default.dirname(this.persistencePath);
        await promises_1.default.mkdir(dir, { recursive: true });
        await promises_1.default.writeFile(this.persistencePath, JSON.stringify(this.memories, null, 2));
    }
    async saveMemory(memory) {
        await this.init();
        this.memories.push(memory);
        await this.persist();
        return memory.id;
    }
    async updateMemory(id, patch) {
        await this.init();
        const index = this.memories.findIndex(m => m.id === id);
        if (index === -1) {
            throw new Error(`Memory with id ${id} not found`);
        }
        this.memories[index] = { ...this.memories[index], ...patch, updatedAt: Date.now() };
        await this.persist();
    }
    async deleteMemory(id) {
        await this.init();
        this.memories = this.memories.filter(m => m.id !== id);
        await this.persist();
    }
    async getMemory(id) {
        await this.init();
        return this.memories.find(m => m.id === id) || null;
    }
    async searchByEmbedding(embedding, limit, filter) {
        await this.init();
        // 1. Filter first
        let candidates = this.memories;
        if (filter) {
            candidates = candidates.filter(m => this.matchesFilter(m, filter));
        }
        // 2. Compute similarities
        const scored = candidates.map(m => ({
            memory: m,
            score: (0, similarity_1.cosineSimilarity)(embedding, m.embedding)
        }));
        // 3. Sort by score desc
        scored.sort((a, b) => b.score - a.score);
        // 4. Slice
        return scored.slice(0, limit).map(s => s.memory);
    }
    async listMemories(limit, filter) {
        await this.init();
        let result = this.memories;
        if (filter) {
            result = result.filter(m => this.matchesFilter(m, filter));
        }
        // Sort by recent by default
        result.sort((a, b) => b.updatedAt - a.updatedAt);
        return result.slice(0, limit);
    }
    matchesFilter(memory, filter) {
        if (filter.type && memory.type !== filter.type)
            return false;
        if (filter.scope && memory.scope !== filter.scope)
            return false;
        if (filter.platform && memory.source.platform !== filter.platform)
            return false;
        if (filter.tags && filter.tags.length > 0) {
            // Check if memory has ALL tags or ANY tags? Usually ANY or ALL. Let's do intersection > 0 for ANY.
            // But typically filtering means "must have these tags". Let's assume ANY match for now or exact match?
            // Simple implementation: Check if required tags are present.
            // Let's go with: if ANY of the filter tags are in memory tags.
            const hasTag = filter.tags.some(t => memory.tags.includes(t));
            if (!hasTag)
                return false;
        }
        return true;
    }
}
exports.LocalStore = LocalStore;
