import { MemoryStore } from '../store/MemoryStore';
import { LLMProvider } from '../llm/LLMProvider';
import { MemorySource } from '../models/Memory';
export declare class IngestionPipeline {
    private extractor;
    private store;
    private llm;
    constructor(store: MemoryStore, llm: LLMProvider);
    run(text: string, source: MemorySource, userId?: string): Promise<string[]>;
}
