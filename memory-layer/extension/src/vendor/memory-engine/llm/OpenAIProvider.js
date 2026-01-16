"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class OpenAIProvider {
    constructor(apiKey, defaultModel = 'gpt-4-turbo-preview', embeddingModel = 'text-embedding-3-small') {
        this.client = new openai_1.default({
            apiKey: apiKey || process.env.OPENAI_API_KEY,
        });
        this.defaultModel = defaultModel;
        this.embeddingModel = embeddingModel;
    }
    async generateCompletion(prompt, model) {
        try {
            const response = await this.client.chat.completions.create({
                model: model || this.defaultModel,
                messages: [{ role: 'user', content: prompt }], // Simplified for now
            });
            return response.choices[0].message.content || '';
        }
        catch (error) {
            console.error('OpenAI Completion Error:', error);
            throw error;
        }
    }
    async generateEmbedding(text) {
        try {
            const response = await this.client.embeddings.create({
                model: this.embeddingModel,
                input: text.replace(/\n/g, ' '),
            });
            return response.data[0].embedding;
        }
        catch (error) {
            console.error('OpenAI Embedding Error:', error);
            throw error;
        }
    }
}
exports.OpenAIProvider = OpenAIProvider;
