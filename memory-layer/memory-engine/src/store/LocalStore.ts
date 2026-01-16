import fs from 'fs/promises';
import path from 'path';
import { Memory, MemoryFilter } from '../models/Memory';
import { MemoryStore } from './MemoryStore';
import { cosineSimilarity } from '../utils/similarity';

export class LocalStore implements MemoryStore {
    private memories: Memory[] = [];
    private initialized = false;
    private readonly persistencePath: string;

    constructor(persistencePath: string) {
        this.persistencePath = persistencePath;
    }

    async init(): Promise<void> {
        if (this.initialized) return;

        try {
            const data = await fs.readFile(this.persistencePath, 'utf-8');
            this.memories = JSON.parse(data);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                // File doesn't exist, start empty
                this.memories = [];
                await this.persist();
            } else {
                throw error;
            }
        }
        this.initialized = true;
    }

    private async persist(): Promise<void> {
        // Ensure directory exists
        const dir = path.dirname(this.persistencePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(this.persistencePath, JSON.stringify(this.memories, null, 2));
    }

    async saveMemory(memory: Memory): Promise<string> {
        await this.init();
        this.memories.push(memory);
        await this.persist();
        return memory.id;
    }

    async updateMemory(id: string, patch: Partial<Memory>): Promise<void> {
        await this.init();
        const index = this.memories.findIndex(m => m.id === id);
        if (index === -1) {
            throw new Error(`Memory with id ${id} not found`);
        }
        this.memories[index] = { ...this.memories[index], ...patch, updatedAt: Date.now() };
        await this.persist();
    }

    async deleteMemory(id: string): Promise<void> {
        await this.init();
        this.memories = this.memories.filter(m => m.id !== id);
        await this.persist();
    }

    async getMemory(id: string): Promise<Memory | null> {
        await this.init();
        return this.memories.find(m => m.id === id) || null;
    }

    async searchByEmbedding(
        embedding: number[],
        limit: number,
        filter?: MemoryFilter
    ): Promise<Memory[]> {
        await this.init();

        // 1. Filter first
        let candidates = this.memories;
        if (filter) {
            candidates = candidates.filter(m => this.matchesFilter(m, filter));
        }

        // 2. Compute similarities
        const scored = candidates.map(m => ({
            memory: m,
            score: cosineSimilarity(embedding, m.embedding)
        }));

        // 3. Sort by score desc
        scored.sort((a, b) => b.score - a.score);

        // 4. Slice
        return scored.slice(0, limit).map(s => s.memory);
    }

    async listMemories(limit: number, filter?: MemoryFilter): Promise<Memory[]> {
        await this.init();
        let result = this.memories;
        if (filter) {
            result = result.filter(m => this.matchesFilter(m, filter));
        }
        // Sort by recent by default
        result.sort((a, b) => b.updatedAt - a.updatedAt);
        return result.slice(0, limit);
    }

    private matchesFilter(memory: Memory, filter: MemoryFilter): boolean {
        if (filter.type && memory.type !== filter.type) return false;
        if (filter.scope && memory.scope !== filter.scope) return false;
        if (filter.platform && memory.source.platform !== filter.platform) return false;
        if (filter.tags && filter.tags.length > 0) {
            // Check if memory has ALL tags or ANY tags? Usually ANY or ALL. Let's do intersection > 0 for ANY.
            // But typically filtering means "must have these tags". Let's assume ANY match for now or exact match?
            // Simple implementation: Check if required tags are present.
            // Let's go with: if ANY of the filter tags are in memory tags.
            const hasTag = filter.tags.some(t => memory.tags.includes(t));
            if (!hasTag) return false;
        }
        return true;
    }
}
