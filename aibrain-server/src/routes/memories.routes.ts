import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { memoryService, type MemoryFilter } from '../services/memory.service.js';
import { llmService } from '../services/llm.service.js';

// Validation schemas
const createMemorySchema = z.object({
  content: z.string().min(1).max(10000),
  type: z.enum(['preference', 'fact', 'task', 'project', 'meta']),
  scope: z.enum(['user_global', 'session', 'site', 'conversation']),
  sourceUrl: z.string().url().optional(),
  sourcePlatform: z.string().optional(),
  sourceTimestamp: z.string().datetime().optional(),
  sourceConversationId: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  tags: z.array(z.string()).default([]),
  generateEmbedding: z.boolean().default(true)
});

const updateMemorySchema = createMemorySchema.partial().extend({
  embedding: z.array(z.number()).optional()
});

const searchSchema = z.object({
  query: z.string().optional(),
  embedding: z.array(z.number()).optional(),
  limit: z.number().min(1).max(100).default(20),
  filter: z.object({
    type: z.string().optional(),
    scope: z.string().optional(),
    tags: z.array(z.string()).optional(),
    platform: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  }).optional()
});

const ingestSchema = z.object({
  conversationText: z.string().min(1),
  context: z.object({
    url: z.string().url().optional(),
    platform: z.string().optional(),
    conversationId: z.string().optional()
  }).optional()
});

// Import memory item schema (for validation during import)
const importMemoryItemSchema = z.object({
  id: z.string().uuid().optional(),
  content: z.string().min(1).max(10000),
  type: z.enum(['preference', 'fact', 'task', 'project', 'meta']),
  scope: z.enum(['user_global', 'session', 'site', 'conversation']),
  sourceUrl: z.string().url().optional(),
  sourcePlatform: z.string().optional(),
  sourceTimestamp: z.union([z.string().datetime(), z.number()]).optional(),
  sourceConversationId: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  tags: z.array(z.string()).default([]),
  embedding: z.array(z.number()).optional()
});

const importSchema = z.object({
  memories: z.array(importMemoryItemSchema).min(1).max(10000),
  deduplicateOnImport: z.boolean().default(false)
});

const memoriesRoutes: FastifyPluginAsync = async (fastify) => {
  // Create memory
  fastify.post('/memories', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const data = createMemorySchema.parse(request.body);
      const userId = request.userId!;

      let embedding: number[] | undefined;

      // Generate embedding if requested
      if (data.generateEmbedding) {
        embedding = await llmService.generateEmbedding(data.content);
      }

      const memory = await memoryService.create(userId, {
        ...data,
        embedding: embedding as any,
        sourceTimestamp: data.sourceTimestamp ? new Date(data.sourceTimestamp) : undefined
      });

      reply.code(201).send({ success: true, memory });
    } catch (error: any) {
      console.error('[API] Create memory error:', error);
      reply.code(400).send({ success: false, error: error.message });
    }
  });

  // Get memory by ID
  fastify.get('/memories/:id', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = request.userId!;

      const memory = await memoryService.getById(id, userId);

      if (!memory) {
        return reply.code(404).send({ success: false, error: 'Memory not found' });
      }

      // Increment access count
      await memoryService.incrementAccessCount(id, userId);

      reply.send({ success: true, memory });
    } catch (error: any) {
      console.error('[API] Get memory error:', error);
      reply.code(500).send({ success: false, error: error.message });
    }
  });

  // Update memory
  fastify.put('/memories/:id', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = request.userId!;
      const updates = updateMemorySchema.parse(request.body);

      // Build the update object with proper types
      const updateData: Record<string, unknown> = { ...updates };

      // Regenerate embedding if content changed and requested
      if (updates.content && updates.generateEmbedding !== false) {
        updateData.embedding = await llmService.generateEmbedding(updates.content);
      }

      // Convert sourceTimestamp string to Date if provided
      if (updates.sourceTimestamp) {
        updateData.sourceTimestamp = new Date(updates.sourceTimestamp);
      }

      const memory = await memoryService.update(id, userId, updateData as any);

      if (!memory) {
        return reply.code(404).send({ success: false, error: 'Memory not found' });
      }

      reply.send({ success: true, memory });
    } catch (error: any) {
      console.error('[API] Update memory error:', error);
      reply.code(400).send({ success: false, error: error.message });
    }
  });

  // Delete memory
  fastify.delete('/memories/:id', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = request.userId!;

      const deleted = await memoryService.delete(id, userId);

      if (!deleted) {
        return reply.code(404).send({ success: false, error: 'Memory not found' });
      }

      reply.send({ success: true, message: 'Memory deleted' });
    } catch (error: any) {
      console.error('[API] Delete memory error:', error);
      reply.code(500).send({ success: false, error: error.message });
    }
  });

  // List memories
  fastify.get('/memories', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const userId = request.userId!;
      const query = request.query as any;

      const limit = parseInt(query.limit) || 50;
      const offset = parseInt(query.offset) || 0;

      const filter: MemoryFilter = {
        type: query.type,
        scope: query.scope,
        platform: query.platform,
        tags: query.tags ? (Array.isArray(query.tags) ? query.tags : [query.tags]) : undefined,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined
      };

      const memories = await memoryService.list(userId, filter, limit, offset);

      reply.send({ success: true, memories, count: memories.length });
    } catch (error: any) {
      console.error('[API] List memories error:', error);
      reply.code(500).send({ success: false, error: error.message });
    }
  });

  // Search memories
  fastify.post('/memories/search', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const data = searchSchema.parse(request.body);
      const userId = request.userId!;

      const filter: MemoryFilter | undefined = data.filter ? {
        ...data.filter,
        startDate: data.filter.startDate ? new Date(data.filter.startDate) : undefined,
        endDate: data.filter.endDate ? new Date(data.filter.endDate) : undefined
      } : undefined;

      let memories;

      // Semantic search if embedding provided or query given (generate embedding)
      if (data.embedding || data.query) {
        const embedding = data.embedding || (data.query ? await llmService.generateEmbedding(data.query) : null);

        if (embedding) {
          memories = await memoryService.searchByEmbedding(userId, embedding, data.limit, filter);
        } else {
          memories = await memoryService.list(userId, filter, data.limit);
        }
      } else {
        // No search criteria, just list with filters
        memories = await memoryService.list(userId, filter, data.limit);
      }

      reply.send({ success: true, memories, count: memories.length });
    } catch (error: any) {
      console.error('[API] Search memories error:', error);
      reply.code(400).send({ success: false, error: error.message });
    }
  });

  // Ingest conversation and extract memories
  fastify.post('/memories/ingest', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const data = ingestSchema.parse(request.body);
      const userId = request.userId!;

      // Extract memories using LLM
      const extractedMemories = await llmService.extractMemories(data.conversationText, data.context);

      // Generate embeddings for all extracted memories
      const contents = extractedMemories.map(m => m.content);
      const embeddings = await llmService.generateEmbeddings(contents);

      // Create memory objects
      const memoryData = extractedMemories.map((m, i) => ({
        content: m.content,
        type: m.type,
        scope: m.scope,
        tags: m.tags,
        confidence: m.confidence,
        sourceUrl: data.context?.url,
        sourcePlatform: data.context?.platform,
        sourceConversationId: data.context?.conversationId,
        sourceTimestamp: new Date(),
        embedding: embeddings[i] as any
      }));

      // Batch create memories
      const memories = await memoryService.batchCreate(userId, memoryData);

      reply.code(201).send({
        success: true,
        memories,
        count: memories.length,
        message: `Extracted and saved ${memories.length} memories`
      });
    } catch (error: any) {
      console.error('[API] Ingest error:', error);
      reply.code(500).send({ success: false, error: error.message });
    }
  });

  // Import memories (for migration)
  fastify.post('/memories/import', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const data = importSchema.parse(request.body);
      const { memories: importMemories, deduplicateOnImport } = data;

      const userId = request.userId!;

      let memoriesToImport = importMemories;

      // Optional deduplication
      if (deduplicateOnImport) {
        // Get existing memories
        const existing = await memoryService.list(userId, undefined, 10000);

        // Filter out duplicates (simple content comparison for now)
        const existingContents = new Set(existing.map(m => m.content.toLowerCase().trim()));
        memoriesToImport = importMemories.filter(
          m => !existingContents.has(m.content.toLowerCase().trim())
        );
      }

      // Convert sourceTimestamp strings/numbers to Date objects
      const normalizedMemories = memoriesToImport.map(m => ({
        ...m,
        sourceTimestamp: m.sourceTimestamp
          ? new Date(m.sourceTimestamp)
          : undefined
      }));

      // Import memories
      const imported = await memoryService.batchCreate(userId, normalizedMemories as any);

      reply.code(201).send({
        success: true,
        imported: imported.length,
        skipped: importMemories.length - imported.length,
        message: `Imported ${imported.length} memories, skipped ${importMemories.length - imported.length} duplicates`
      });
    } catch (error: any) {
      console.error('[API] Import error:', error);
      reply.code(500).send({ success: false, error: error.message });
    }
  });

  // Get updated memories (for sync)
  fastify.get('/memories/sync/updates', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const userId = request.userId!;
      const { updatedAfter } = request.query as { updatedAfter?: string };

      if (!updatedAfter) {
        return reply.code(400).send({ success: false, error: 'updatedAfter timestamp required' });
      }

      const memories = await memoryService.getUpdatedAfter(userId, new Date(updatedAfter));

      reply.send({ success: true, memories, count: memories.length });
    } catch (error: any) {
      console.error('[API] Sync updates error:', error);
      reply.code(500).send({ success: false, error: error.message });
    }
  });
};

export default memoriesRoutes;
