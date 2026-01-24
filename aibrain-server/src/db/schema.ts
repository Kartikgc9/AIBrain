import { pgTable, uuid, varchar, text, timestamp, real, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  settings: jsonb('settings').default({}).notNull()
});

// Memories table with pgvector support
export const memories = pgTable('memories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  type: varchar('type', { length: 20 }).notNull(), // preference, fact, task, project, meta
  scope: varchar('scope', { length: 20 }).notNull(), // user_global, session, site, conversation

  // Source metadata
  sourceUrl: text('source_url'),
  sourcePlatform: varchar('source_platform', { length: 50 }),
  sourceTimestamp: timestamp('source_timestamp', { withTimezone: true }),
  sourceConversationId: varchar('source_conversation_id', { length: 255 }),

  // Temporal & quality
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  confidence: real('confidence'),
  accessCount: integer('access_count').default(0).notNull(),

  // Categorization
  tags: text('tags').array().default(sql`ARRAY[]::text[]`).notNull(),

  // Embedding - stored as text representation of array, will be cast to vector in queries
  // pgvector extension needs to be enabled: CREATE EXTENSION IF NOT EXISTS vector;
  embedding: text('embedding') // Will be used as vector(1536) in SQL
}, (table) => ({
  userIdIdx: index('idx_memories_user_id').on(table.userId),
  typeScopeIdx: index('idx_memories_type_scope').on(table.userId, table.type, table.scope),
  tagsIdx: index('idx_memories_tags').on(table.tags)
  // Vector index will be created via raw SQL: CREATE INDEX idx_memories_embedding ON memories USING hnsw (embedding vector_cosine_ops);
}));

// Memory relationships table (for cross-conversation linking, consolidation)
export const memoryRelationships = pgTable('memory_relationships', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceMemoryId: uuid('source_memory_id').notNull().references(() => memories.id, { onDelete: 'cascade' }),
  targetMemoryId: uuid('target_memory_id').notNull().references(() => memories.id, { onDelete: 'cascade' }),
  relationshipType: varchar('relationship_type', { length: 50 }).notNull(), // similar, contradiction, evolution
  strength: real('strength'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// Type exports for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;

export type MemoryRelationship = typeof memoryRelationships.$inferSelect;
export type NewMemoryRelationship = typeof memoryRelationships.$inferInsert;
