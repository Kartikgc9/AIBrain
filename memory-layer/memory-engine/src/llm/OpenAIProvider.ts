import OpenAI from 'openai';
import { LLMProvider } from './LLMProvider';
import dotenv from 'dotenv';

dotenv.config();

export class OpenAIProvider implements LLMProvider {
    private client: OpenAI;
    private defaultModel: string;
    private embeddingModel: string;

    constructor(apiKey?: string, defaultModel = 'gpt-4-turbo-preview', embeddingModel = 'text-embedding-3-small') {
        this.client = new OpenAI({
            apiKey: apiKey || process.env.OPENAI_API_KEY,
        });
        this.defaultModel = defaultModel;
        this.embeddingModel = embeddingModel;
    }

    async generateCompletion(prompt: string, model?: string): Promise<string> {
        try {
            const response = await this.client.chat.completions.create({
                model: model || this.defaultModel,
                messages: [{ role: 'user', content: prompt }], // Simplified for now
            });
            return response.choices[0].message.content || '';
        } catch (error) {
            console.error('OpenAI Completion Error:', error);
            throw error;
        }
    }

    async generateEmbedding(text: string): Promise<number[]> {
        try {
            const response = await this.client.embeddings.create({
                model: this.embeddingModel,
                input: text.replace(/\n/g, ' '),
            });
            return response.data[0].embedding;
        } catch (error) {
            console.error('OpenAI Embedding Error:', error);
            throw error;
        }
    }
}
