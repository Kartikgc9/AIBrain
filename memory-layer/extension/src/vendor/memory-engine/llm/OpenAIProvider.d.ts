import { LLMProvider } from './LLMProvider';
export declare class OpenAIProvider implements LLMProvider {
    private client;
    private defaultModel;
    private embeddingModel;
    constructor(apiKey?: string, defaultModel?: string, embeddingModel?: string);
    generateCompletion(prompt: string, model?: string): Promise<string>;
    generateEmbedding(text: string): Promise<number[]>;
}
