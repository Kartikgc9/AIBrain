import OpenAI from 'openai';
import { env } from '../config/env.js';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY
});

export class LLMService {
  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float'
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('[LLM] Embedding generation failed:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    try {
      // OpenAI supports up to 100 texts per request
      const batches: string[][] = [];
      for (let i = 0; i < texts.length; i += 100) {
        batches.push(texts.slice(i, i + 100));
      }

      const allEmbeddings: number[][] = [];

      for (const batch of batches) {
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: batch,
          encoding_format: 'float'
        });

        allEmbeddings.push(...response.data.map(d => d.embedding));
      }

      return allEmbeddings;
    } catch (error) {
      console.error('[LLM] Batch embedding generation failed:', error);
      throw new Error('Failed to generate embeddings');
    }
  }

  /**
   * Extract memories from conversation text using LLM
   * This uses the memory extraction logic
   */
  async extractMemories(conversationText: string, context?: {
    url?: string;
    platform?: string;
    conversationId?: string;
  }): Promise<Array<{
    content: string;
    type: string;
    scope: string;
    tags: string[];
    confidence: number;
  }>> {
    try {
      const systemPrompt = `You are an AI assistant that extracts personal memories from conversations.
Extract distinct, valuable pieces of information that the user would want to remember.
Each memory should be:
- A single, clear fact or preference
- Actionable or informative
- Worth storing for future reference

Categorize each memory:
- Type: preference, fact, task, project, or meta
- Scope: user_global (applies everywhere), session (temporary), site (specific website), conversation (this chat only)
- Tags: relevant keywords (array)
- Confidence: 0.0-1.0 (how certain you are this is worth remembering)

Return JSON array of memories.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract memories from this conversation:\n\n${conversationText}` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return [];

      const parsed = JSON.parse(content);
      const memories = parsed.memories || [];

      // Filter out low-confidence memories
      return memories.filter((m: any) => m.confidence >= 0.5);
    } catch (error) {
      console.error('[LLM] Memory extraction failed:', error);
      throw new Error('Failed to extract memories');
    }
  }

  /**
   * Detect duplicate or similar memories
   * Returns similarity score between 0 and 1
   */
  async detectDuplicates(memory1: string, memory2: string): Promise<number> {
    // Generate embeddings for both memories
    const embeddings = await this.generateEmbeddings([memory1, memory2]);

    // Calculate cosine similarity
    return this.cosineSimilarity(embeddings[0], embeddings[1]);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}

export const llmService = new LLMService();
