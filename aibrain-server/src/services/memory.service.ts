import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '../config/database.js';
import { memories, type Memory, type NewMemory } from '../db/schema.js';
import { arrayToVector, vectorToArray } from '../config/database.js';

export interface MemoryFilter {
  type?: string;
  scope?: string;
  tags?: string[];
  platform?: string;
  startDate?: Date;
  endDate?: Date;
}

export class MemoryService {
  /**
   * Create a new memory
   */
  async create(userId: string, memoryData: Omit<NewMemory, 'userId' | 'id' | 'createdAt' | 'updatedAt'>): Promise<Memory> {
    const [memory] = await db.insert(memories).values({
      userId,
      ...memoryData,
      embedding: memoryData.embedding ? arrayToVector(memoryData.embedding as any) : null
    }).returning();

    return memory;
  }

  /**
   * Get memory by ID
   */
  async getById(id: string, userId: string): Promise<Memory | null> {
    const [memory] = await db
      .select()
      .from(memories)
      .where(and(eq(memories.id, id), eq(memories.userId, userId)))
      .limit(1);

    return memory || null;
  }

  /**
   * Update memory
   */
  async update(id: string, userId: string, updates: Partial<NewMemory>): Promise<Memory | null> {
    // Build update data, converting embedding if needed
    const { embedding, ...rest } = updates;
    const updateData: Partial<NewMemory> & { updatedAt: Date; embedding?: string | null } = {
      ...rest,
      updatedAt: new Date()
    };

    // Convert embedding array to vector string if provided
    // Embedding comes in as number[] from API but is stored as string in schema
    if (embedding) {
      updateData.embedding = arrayToVector(embedding as unknown as number[]);
    }

    const [memory] = await db
      .update(memories)
      .set(updateData as Partial<NewMemory>)
      .where(and(eq(memories.id, id), eq(memories.userId, userId)))
      .returning();

    return memory || null;
  }

  /**
   * Delete memory
   */
  async delete(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(memories)
      .where(and(eq(memories.id, id), eq(memories.userId, userId)))
      .returning();

    return result.length > 0;
  }

  /**
   * List memories with filters
   */
  async list(userId: string, filter?: MemoryFilter, limit: number = 50, offset: number = 0): Promise<Memory[]> {
    // Build conditions array for dynamic filtering
    const conditions = [eq(memories.userId, userId)];

    if (filter?.type) {
      conditions.push(eq(memories.type, filter.type));
    }

    if (filter?.scope) {
      conditions.push(eq(memories.scope, filter.scope));
    }

    if (filter?.platform) {
      conditions.push(eq(memories.sourcePlatform, filter.platform));
    }

    if (filter?.tags && filter.tags.length > 0) {
      // Check if memory has all specified tags (parameterized to prevent SQL injection)
      conditions.push(sql`${memories.tags} @> ${filter.tags}`);
    }

    if (filter?.startDate) {
      conditions.push(sql`${memories.createdAt} >= ${filter.startDate}`);
    }

    if (filter?.endDate) {
      conditions.push(sql`${memories.createdAt} <= ${filter.endDate}`);
    }

    // Order by creation date descending and apply pagination
    const results = await db
      .select()
      .from(memories)
      .where(and(...conditions))
      .orderBy(desc(memories.createdAt))
      .limit(limit)
      .offset(offset);

    return results;
  }

  /**
   * Semantic search using pgvector cosine similarity
   */
  async searchByEmbedding(
    userId: string,
    embedding: number[],
    limit: number = 20,
    filter?: MemoryFilter
  ): Promise<Array<Memory & { similarity: number }>> {
    const vectorStr = arrayToVector(embedding);

    // Build WHERE clause for filters
    let whereConditions = [sql`${memories.userId} = ${userId}`];

    if (filter?.type) {
      whereConditions.push(sql`${memories.type} = ${filter.type}`);
    }

    if (filter?.scope) {
      whereConditions.push(sql`${memories.scope} = ${filter.scope}`);
    }

    if (filter?.platform) {
      whereConditions.push(sql`${memories.sourcePlatform} = ${filter.platform}`);
    }

    if (filter?.tags && filter.tags.length > 0) {
      // Parameterized array to prevent SQL injection
      whereConditions.push(sql`${memories.tags} @> ${filter.tags}`);
    }

    if (filter?.startDate) {
      whereConditions.push(sql`${memories.createdAt} >= ${filter.startDate}`);
    }

    if (filter?.endDate) {
      whereConditions.push(sql`${memories.createdAt} <= ${filter.endDate}`);
    }

    const whereClause = whereConditions.length > 1
      ? sql`WHERE ${sql.join(whereConditions, sql` AND `)}`
      : sql`WHERE ${whereConditions[0]}`;

    // Use pgvector cosine similarity for search
    const results = await db.execute(sql`
      SELECT
        *,
        1 - (embedding::vector(1536) <=> ${vectorStr}::vector(1536)) as similarity
      FROM memories
      ${whereClause}
      ORDER BY embedding::vector(1536) <=> ${vectorStr}::vector(1536)
      LIMIT ${limit}
    `);

    // postgres driver returns rows directly as array
    return results as unknown as Array<Memory & { similarity: number }>;
  }

  /**
   * Text-based search (fallback when no embedding available)
   */
  async searchByText(
    userId: string,
    query: string,
    limit: number = 20,
    filter?: MemoryFilter
  ): Promise<Memory[]> {
    // Build conditions array for dynamic filtering
    const conditions = [
      eq(memories.userId, userId),
      sql`${memories.content} ILIKE ${'%' + query + '%'}`
    ];

    if (filter?.type) {
      conditions.push(eq(memories.type, filter.type));
    }

    if (filter?.scope) {
      conditions.push(eq(memories.scope, filter.scope));
    }

    if (filter?.platform) {
      conditions.push(eq(memories.sourcePlatform, filter.platform));
    }

    const results = await db
      .select()
      .from(memories)
      .where(and(...conditions))
      .limit(limit);

    return results;
  }

  /**
   * Increment access count
   */
  async incrementAccessCount(id: string, userId: string): Promise<void> {
    await db
      .update(memories)
      .set({
        accessCount: sql`${memories.accessCount} + 1`
      })
      .where(and(eq(memories.id, id), eq(memories.userId, userId)));
  }

  /**
   * Get memories updated after a certain timestamp (for sync)
   */
  async getUpdatedAfter(userId: string, timestamp: Date): Promise<Memory[]> {
    return await db
      .select()
      .from(memories)
      .where(and(
        eq(memories.userId, userId),
        sql`${memories.updatedAt} > ${timestamp}`
      ))
      .orderBy(desc(memories.updatedAt));
  }

  /**
   * Batch create memories (for migration/import)
   */
  async batchCreate(userId: string, memoriesData: Array<Omit<NewMemory, 'userId'>>): Promise<Memory[]> {
    const values = memoriesData.map(m => ({
      userId,
      ...m,
      embedding: m.embedding ? arrayToVector(m.embedding as any) : null
    }));

    const result = await db.insert(memories).values(values).returning();

    return result;
  }
}

export const memoryService = new MemoryService();
