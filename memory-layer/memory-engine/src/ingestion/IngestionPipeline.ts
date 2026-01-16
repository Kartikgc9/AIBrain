import { v4 as uuidv4 } from 'uuid';
import { ExtractionService } from './ExtractionService';
import { MemoryStore } from '../store/MemoryStore';
import { LLMProvider } from '../llm/LLMProvider';
import { Memory, MemorySource } from '../models/Memory';
import { cosineSimilarity } from '../utils/similarity'; // Ensure this is available or use store's search

export class IngestionPipeline {
    private extractor: ExtractionService;
    private store: MemoryStore;
    private llm: LLMProvider;

    constructor(store: MemoryStore, llm: LLMProvider) {
        this.store = store;
        this.llm = llm;
        this.extractor = new ExtractionService(llm);
    }

    async run(text: string, source: MemorySource, userId: string = 'local_user'): Promise<string[]> {
        const candidates = await this.extractor.extractMemories(text);
        const processedIds: string[] = [];

        for (const candidate of candidates) {
            const embedding = await this.llm.generateEmbedding(candidate.content);

            // MEM0 UPDATE PHASE: Search for similar existing memories
            const similarMemories = await this.store.searchByEmbedding(embedding, 5, {
                type: candidate.type,
                scope: candidate.scope
            });

            let action = 'ADD';
            let targetId: string | null = null;
            let existingMemory: Memory | null = null;

            if (similarMemories.length > 0) {
                const topMatch = similarMemories[0];
                const similarity = cosineSimilarity(embedding, topMatch.embedding);

                if (similarity > 0.95) {
                    // Exact match or very close -> Deduplicate (just update timestamp)
                    action = 'DEDUPLICATE';
                    targetId = topMatch.id;
                    existingMemory = topMatch;
                } else if (similarity > 0.85) {
                    // High similarity -> Merge/Update
                    action = 'UPDATE';
                    targetId = topMatch.id;
                    existingMemory = topMatch;
                }
            }

            if (action === 'DEDUPLICATE' && targetId) {
                console.log(`Deduplicating memory ${targetId}`);
                await this.store.updateMemory(targetId, {
                    updatedAt: Date.now(),
                    // Optionally merge sources list if we tracked that
                });
                processedIds.push(targetId);

            } else if (action === 'UPDATE' && targetId && existingMemory) {
                console.log(`Updating memory ${targetId}`);
                // Simple merge strategy: Append new content if it adds value, or just update metadata
                // For MVP, lets just update the timestamp and maybe boost confidence
                await this.store.updateMemory(targetId, {
                    updatedAt: Date.now(),
                    confidence: Math.max(existingMemory.confidence, candidate.confidence)
                });
                processedIds.push(targetId);

            } else {
                // ADD
                const memory: Memory = {
                    id: uuidv4(),
                    userId,
                    content: candidate.content,
                    type: candidate.type,
                    scope: candidate.scope,
                    source,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    confidence: candidate.confidence,
                    tags: candidate.tags,
                    embedding
                };
                const id = await this.store.saveMemory(memory);
                processedIds.push(id);
            }
        }

        return processedIds;
    }
}
