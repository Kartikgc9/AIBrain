import { Memory, MemoryFilter } from '../models/Memory';
import { MemoryStore } from './MemoryStore';
export declare class BrowserStore implements MemoryStore {
    private db;
    private initialized;
    init(): Promise<void>;
    saveMemory(memory: Memory): Promise<string>;
    updateMemory(id: string, patch: Partial<Memory>): Promise<void>;
    deleteMemory(id: string): Promise<void>;
    getMemory(id: string): Promise<Memory | null>;
    searchByEmbedding(embedding: number[], limit: number, filter?: MemoryFilter): Promise<Memory[]>;
    listMemories(limit: number, filter?: MemoryFilter): Promise<Memory[]>;
    private getAllMemories;
    private matchesFilter;
}
