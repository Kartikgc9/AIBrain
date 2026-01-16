export interface LLMProvider {
    /**
     * generateCompletion
     * @param prompt System or User prompt
     * @param model Model name
     */
    generateCompletion(prompt: string, model?: string): Promise<string>;
    /**
     * generateEmbedding
     * @param text Text to embed
     */
    generateEmbedding(text: string): Promise<number[]>;
}
