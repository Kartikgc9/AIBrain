import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../db/schema.js';

const connectionString = process.env.DATABASE_URL || 'postgresql://aibrain:dev_password@localhost:5432/aibrain_dev';

// Create postgres client
export const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

// Create drizzle instance
export const db = drizzle(sql, { schema });

// Initialize database extensions and vector index
export async function initializeDatabase() {
  try {
    // Enable pgvector extension
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;

    // Create vector index if not exists (HNSW for fast approximate nearest neighbor search)
    await sql`
      CREATE INDEX IF NOT EXISTS idx_memories_embedding
      ON memories USING hnsw (embedding::vector(1536) vector_cosine_ops)
    `;

    console.log('[Database] pgvector extension and indexes initialized');
  } catch (error) {
    console.error('[Database] Initialization error:', error);
    throw error;
  }
}

// Helper function to convert array to pgvector format
export function arrayToVector(arr: number[]): string {
  return `[${arr.join(',')}]`;
}

// Helper function to parse vector from database
export function vectorToArray(vectorStr: string): number[] {
  if (!vectorStr) return [];
  const cleaned = vectorStr.replace(/[\[\]]/g, '');
  return cleaned.split(',').map(Number);
}
