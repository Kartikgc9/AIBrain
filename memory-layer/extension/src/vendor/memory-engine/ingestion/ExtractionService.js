"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractionService = void 0;
class ExtractionService {
    constructor(llm) {
        this.llm = llm;
    }
    async extractMemories(text, context) {
        const prompt = `
    You are a personal memory assistant. Extract useful, stable facts, preferences, tasks, or project details from the following text.
    Ignore trivial conversation or temporary context.
    
    Return a JSON array of objects with the following schema:
    {
      "content": "The actual fact or memory content",
      "type": "preference" | "fact" | "task" | "project" | "meta",
      "scope": "user_global" | "session" | "site" | "conversation",
      "confidence": number (0.0 to 1.0),
      "tags": ["tag1", "tag2"]
    }

    Text:
    ${text}

    JSON Output:
    `;
        try {
            const result = await this.llm.generateCompletion(prompt);
            // Clean up markdown code blocks if present
            const cleanResult = result.replace(/```json/g, '').replace(/```/g, '').trim();
            const memories = JSON.parse(cleanResult);
            return memories;
        }
        catch (error) {
            console.error('Extraction Failed:', error);
            return [];
        }
    }
}
exports.ExtractionService = ExtractionService;
