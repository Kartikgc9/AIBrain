import { Memory, MemoryFilter } from "../models/Memory";
export interface MemoryStore {
    /**
     * Save a new memory.
     * @param memory The memory to save
     * @returns The ID of the saved memory
     */
    saveMemory(memory: Memory): Promise<string>;
    /**
     * Update an existing memory with a partial update.
     * @param id The ID of the memory to update
     * @param patch Partial memory object
     */
    updateMemory(id: string, patch: Partial<Memory>): Promise<void>;
    /**
     * Delete a memory by ID.
     * @param id The ID of the memory to delete
     */
    deleteMemory(id: string): Promise<void>;
    /**
     * Get a memory by ID.
     * @param id The ID of the memory
     */
    getMemory(id: string): Promise<Memory | null>;
    /**
     * Search memories by embedding similarity.
     * @param embedding Query embedding vector
     * @param limit ID of the memory
     * @param filter Optional filters
     */
    searchByEmbedding(embedding: number[], limit: number, filter?: MemoryFilter): Promise<Memory[]>;
    /**
     * List memories matching filters (non-semantic).
     * @param filter Filters to apply
     * @param limit Max results
     */
    listMemories(limit: number, filter?: MemoryFilter): Promise<Memory[]>;
}
