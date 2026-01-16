import { LLMProvider } from '../llm/LLMProvider';
import { MemoryType, MemoryScope } from '../models/Memory';
export interface ExtractedMemory {
    content: string;
    type: MemoryType;
    scope: MemoryScope;
    confidence: number;
    tags: string[];
}
export declare class ExtractionService {
    private llm;
    constructor(llm: LLMProvider);
    extractMemories(text: string, context?: any): Promise<ExtractedMemory[]>;
}
