# Server Architecture Deep Dive

## Table of Contents
1. [Fastify Framework](#fastify-framework)
2. [Database Layer (Drizzle ORM)](#database-layer-drizzle-orm)
3. [Authentication System](#authentication-system)
4. [Memory Service](#memory-service)
5. [Vector Search with pgvector](#vector-search-with-pgvector)
6. [WebSocket Sync](#websocket-sync)
7. [Validation with Zod](#validation-with-zod)

---

## Fastify Framework

### Why Fastify?
Fastify is a high-performance Node.js web framework:

| Feature | Benefit |
|---------|---------|
| Speed | 2x faster than Express |
| Schema-based | Built-in validation |
| Plugins | Modular architecture |
| TypeScript | First-class support |
| Logging | Pino logger integrated |

### Application Setup

```typescript
// app.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';

export async function buildApp() {
    const fastify = Fastify({
        logger: {
            level: env.NODE_ENV === 'production' ? 'info' : 'debug',
            transport: env.NODE_ENV === 'development' ? {
                target: 'pino-pretty',  // Pretty logs in dev
                options: {
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname'
                }
            } : undefined
        }
    });

    // Register plugins
    await fastify.register(cors, {
        origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
        credentials: true
    });

    await fastify.register(websocket);
    await fastify.register(authPlugin);

    // Register routes
    await fastify.register(authRoutes, { prefix: '/api/v1' });
    await fastify.register(memoriesRoutes, { prefix: '/api/v1' });

    return fastify;
}
```

### Plugin System

Fastify plugins encapsulate functionality:

```typescript
// plugins/auth.plugin.ts
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';

// Extend Fastify types
declare module 'fastify' {
    interface FastifyRequest {
        userId?: string;
    }
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
    // Register JWT
    fastify.register(jwt, {
        secret: env.JWT_SECRET,
        sign: { expiresIn: '7d' }
    });

    // Add authenticate decorator
    fastify.decorate('authenticate', async (request, reply) => {
        try {
            const payload = await request.jwtVerify();
            request.userId = payload.userId;
        } catch (error) {
            reply.code(401).send({ error: 'Unauthorized' });
        }
    });
};

// fp() ensures plugin is loaded before routes
export default fp(authPlugin);
```

### Route Definition

```typescript
// routes/memories.routes.ts
const memoriesRoutes: FastifyPluginAsync = async (fastify) => {

    // Protected route with authentication
    fastify.post('/memories', {
        onRequest: [fastify.authenticate]  // Run auth first
    }, async (request, reply) => {
        const data = createMemorySchema.parse(request.body);
        const userId = request.userId!;

        const memory = await memoryService.create(userId, data);

        reply.code(201).send({ success: true, memory });
    });

    // Route with path parameters
    fastify.get('/memories/:id', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const { id } = request.params as { id: string };
        const memory = await memoryService.getById(id, request.userId!);

        if (!memory) {
            return reply.code(404).send({ error: 'Not found' });
        }

        reply.send({ success: true, memory });
    });
};
```

---

## Database Layer (Drizzle ORM)

### What is an ORM?
Object-Relational Mapping translates between objects and database tables:

```
TypeScript Object          SQL Table
───────────────           ─────────
{                         CREATE TABLE memories (
  id: 'abc',                id VARCHAR PRIMARY KEY,
  content: 'Hello',         content TEXT,
  type: 'fact'              type VARCHAR
}                         );
```

### Schema Definition

```typescript
// db/schema.ts
import { pgTable, uuid, text, varchar, timestamp, real, integer } from 'drizzle-orm/pg-core';

export const memories = pgTable('memories', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: varchar('user_id', { length: 255 }).notNull(),
    content: text('content').notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    scope: varchar('scope', { length: 50 }).notNull(),
    sourceUrl: varchar('source_url', { length: 2048 }),
    sourcePlatform: varchar('source_platform', { length: 255 }),
    sourceTimestamp: timestamp('source_timestamp'),
    sourceConversationId: varchar('source_conversation_id', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    tags: text('tags').array(),
    confidence: real('confidence'),
    accessCount: integer('access_count').default(0),
    embedding: text('embedding')  // Stored as vector string
});

// Infer types from schema
export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;
```

### Database Connection

```typescript
// config/database.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Create connection
const connectionString = env.DATABASE_URL;
const client = postgres(connectionString);

// Create Drizzle instance
export const db = drizzle(client);

// Vector conversion utilities
export function arrayToVector(arr: number[]): string {
    return `[${arr.join(',')}]`;
}

export function vectorToArray(vec: string): number[] {
    return JSON.parse(vec.replace(/^\[|\]$/g, `[`).replace(/\]$/, `]`));
}
```

### Query Building

```typescript
// Basic queries
import { eq, and, desc, sql } from 'drizzle-orm';

// SELECT * FROM memories WHERE user_id = ? AND id = ?
const [memory] = await db
    .select()
    .from(memories)
    .where(and(
        eq(memories.userId, userId),
        eq(memories.id, id)
    ))
    .limit(1);

// INSERT INTO memories VALUES (...)
const [newMemory] = await db
    .insert(memories)
    .values({
        userId,
        content: 'Hello',
        type: 'fact',
        scope: 'user_global'
    })
    .returning();

// UPDATE memories SET ... WHERE ...
const [updated] = await db
    .update(memories)
    .set({ content: 'Updated', updatedAt: new Date() })
    .where(eq(memories.id, id))
    .returning();

// DELETE FROM memories WHERE ...
await db
    .delete(memories)
    .where(eq(memories.id, id));
```

### Dynamic Query Building

```typescript
// Build conditions array for flexible filtering
async function list(userId: string, filter?: MemoryFilter): Promise<Memory[]> {
    const conditions = [eq(memories.userId, userId)];

    if (filter?.type) {
        conditions.push(eq(memories.type, filter.type));
    }

    if (filter?.scope) {
        conditions.push(eq(memories.scope, filter.scope));
    }

    if (filter?.tags && filter.tags.length > 0) {
        // PostgreSQL array contains operator
        conditions.push(sql`${memories.tags} @> ${filter.tags}`);
    }

    // Combine all conditions with AND
    return await db
        .select()
        .from(memories)
        .where(and(...conditions))
        .orderBy(desc(memories.createdAt))
        .limit(50);
}
```

---

## Authentication System

### JWT (JSON Web Tokens)

JWTs are self-contained tokens for authentication:

```
Header.Payload.Signature
───────────────────────
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJ1c2VySWQiOiIxMjMiLCJpYXQiOjE2MTYyMzkwMjJ9.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### Token Structure

```typescript
// Header (algorithm info)
{
    "alg": "HS256",
    "typ": "JWT"
}

// Payload (claims)
{
    "userId": "123",
    "iat": 1616239022,  // Issued at
    "exp": 1616843822   // Expires
}

// Signature
HMACSHA256(
    base64UrlEncode(header) + "." + base64UrlEncode(payload),
    secret
)
```

### Authentication Flow

```
1. User Login
   ┌─────────┐                    ┌─────────┐
   │ Client  │ ──POST /login───► │ Server  │
   │         │ { email, pass }   │         │
   │         │ ◄──────────────── │         │
   │         │ { token: "..." }  │         │
   └─────────┘                    └─────────┘

2. Authenticated Request
   ┌─────────┐                    ┌─────────┐
   │ Client  │ ──GET /memories──► │ Server  │
   │         │ Authorization:     │         │
   │         │ Bearer <token>     │ verify  │
   │         │ ◄──────────────── │   ✓     │
   │         │ { memories: [...] }│         │
   └─────────┘                    └─────────┘
```

### Implementation

```typescript
// Login route
fastify.post('/auth/login', async (request, reply) => {
    const { email, password } = request.body;

    // Verify credentials
    const user = await userService.verifyCredentials(email, password);
    if (!user) {
        return reply.code(401).send({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = fastify.jwt.sign({ userId: user.id });

    reply.send({ success: true, token });
});

// Protected route
fastify.get('/memories', {
    onRequest: [fastify.authenticate]  // Verify token
}, async (request) => {
    // request.userId is now available
    const memories = await memoryService.list(request.userId);
    return { memories };
});
```

---

## Memory Service

### Service Pattern

Services encapsulate business logic:

```typescript
// services/memory.service.ts
export class MemoryService {

    async create(userId: string, data: CreateMemoryInput): Promise<Memory> {
        // Business logic here
        const [memory] = await db.insert(memories).values({
            userId,
            ...data,
            embedding: data.embedding ? arrayToVector(data.embedding) : null
        }).returning();

        return memory;
    }

    async getById(id: string, userId: string): Promise<Memory | null> {
        const [memory] = await db
            .select()
            .from(memories)
            .where(and(
                eq(memories.id, id),
                eq(memories.userId, userId)  // Security: user can only see own
            ))
            .limit(1);

        return memory || null;
    }

    async searchByEmbedding(
        userId: string,
        embedding: number[],
        limit: number = 20
    ): Promise<Array<Memory & { similarity: number }>> {
        // Raw SQL for vector operations
        const results = await db.execute(sql`
            SELECT
                *,
                1 - (embedding::vector(1536) <=> ${arrayToVector(embedding)}::vector(1536)) as similarity
            FROM memories
            WHERE user_id = ${userId}
            ORDER BY embedding::vector(1536) <=> ${arrayToVector(embedding)}::vector(1536)
            LIMIT ${limit}
        `);

        return results as Array<Memory & { similarity: number }>;
    }
}

// Export singleton instance
export const memoryService = new MemoryService();
```

---

## Vector Search with pgvector

### What is pgvector?
PostgreSQL extension for vector similarity search:

```sql
-- Enable extension
CREATE EXTENSION vector;

-- Add vector column
ALTER TABLE memories
ADD COLUMN embedding VECTOR(1536);  -- OpenAI embedding size

-- Create index for fast search
CREATE INDEX ON memories
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### Distance Operators

| Operator | Distance Type | Use Case |
|----------|--------------|----------|
| `<->` | L2 (Euclidean) | General similarity |
| `<=>` | Cosine | Normalized vectors (embeddings) |
| `<#>` | Inner product | Pre-normalized vectors |

### Similarity Search Query

```sql
-- Find 10 most similar memories
SELECT
    *,
    1 - (embedding <=> query_embedding) AS similarity
FROM memories
WHERE user_id = 'user123'
ORDER BY embedding <=> query_embedding
LIMIT 10;
```

### In TypeScript

```typescript
async searchByEmbedding(userId: string, queryEmbedding: number[]) {
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    const results = await db.execute(sql`
        SELECT
            id, content, type, scope, tags,
            1 - (embedding::vector(1536) <=> ${vectorStr}::vector(1536)) as similarity
        FROM memories
        WHERE user_id = ${userId}
          AND embedding IS NOT NULL
        ORDER BY embedding::vector(1536) <=> ${vectorStr}::vector(1536)
        LIMIT 20
    `);

    return results;
}
```

---

## WebSocket Sync

### Real-time Communication

WebSocket enables bidirectional communication:

```
Traditional HTTP:
Client ──Request──► Server
Client ◄──Response── Server
(Connection closes)

WebSocket:
Client ◄────────────► Server
(Connection stays open)
(Either side can send anytime)
```

### Implementation

```typescript
// WebSocket endpoint
fastify.register(async (fastify) => {
    fastify.get('/api/v1/sync', { websocket: true }, (connection, request) => {
        const socket = connection.socket;

        // Authenticate via query token
        const token = request.query.token;
        let userId: string;

        try {
            const payload = fastify.jwt.verify(token);
            userId = payload.userId;
        } catch {
            socket.close(1008, 'Invalid token');
            return;
        }

        console.log(`[WS] User ${userId} connected`);

        // Handle incoming messages
        socket.on('message', async (message: Buffer) => {
            const data = JSON.parse(message.toString());

            switch (data.type) {
                case 'PING':
                    socket.send(JSON.stringify({
                        type: 'PONG',
                        timestamp: Date.now()
                    }));
                    break;

                case 'MEMORY_CREATED':
                    // Sync to other devices
                    broadcastToUser(userId, data);
                    socket.send(JSON.stringify({
                        type: 'SYNC_ACK',
                        messageId: data.messageId
                    }));
                    break;
            }
        });

        socket.on('close', () => {
            console.log(`[WS] User ${userId} disconnected`);
        });

        // Send welcome message
        socket.send(JSON.stringify({
            type: 'CONNECTED',
            userId,
            timestamp: Date.now()
        }));
    });
});
```

---

## Validation with Zod

### What is Zod?
TypeScript-first schema validation:

```typescript
import { z } from 'zod';

// Define schema
const createMemorySchema = z.object({
    content: z.string().min(1).max(10000),
    type: z.enum(['preference', 'fact', 'task', 'project', 'meta']),
    scope: z.enum(['user_global', 'session', 'site', 'conversation']),
    sourceUrl: z.string().url().optional(),
    tags: z.array(z.string()).default([]),
    confidence: z.number().min(0).max(1).optional()
});

// Infer TypeScript type from schema
type CreateMemoryInput = z.infer<typeof createMemorySchema>;
// {
//     content: string;
//     type: 'preference' | 'fact' | 'task' | 'project' | 'meta';
//     scope: 'user_global' | 'session' | 'site' | 'conversation';
//     sourceUrl?: string;
//     tags: string[];
//     confidence?: number;
// }
```

### Validation in Routes

```typescript
fastify.post('/memories', async (request, reply) => {
    try {
        // Validate and parse - throws if invalid
        const data = createMemorySchema.parse(request.body);

        // data is now typed correctly
        const memory = await memoryService.create(userId, data);

        reply.code(201).send({ success: true, memory });

    } catch (error) {
        if (error instanceof z.ZodError) {
            // Validation failed - return helpful errors
            return reply.code(400).send({
                success: false,
                error: 'Validation failed',
                details: error.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message
                }))
            });
        }
        throw error;
    }
});
```

### Complex Schema Examples

```typescript
// Nested objects
const ingestSchema = z.object({
    conversationText: z.string().min(1),
    context: z.object({
        url: z.string().url().optional(),
        platform: z.string().optional(),
        conversationId: z.string().optional()
    }).optional()
});

// Arrays with validation
const importSchema = z.object({
    memories: z.array(memoryItemSchema).min(1).max(10000),
    deduplicateOnImport: z.boolean().default(false)
});

// Union types
const timestampSchema = z.union([
    z.string().datetime(),
    z.number()
]);

// Partial schemas (for updates)
const updateMemorySchema = createMemorySchema.partial();

// Transform data during validation
const dateSchema = z.string().datetime().transform(str => new Date(str));
```

### Security Benefits

Zod prevents:
- SQL injection (validates input types)
- Buffer overflow (enforces string lengths)
- Type confusion (ensures expected types)
- Missing required fields (explicit requirements)

```typescript
// This request body...
{
    "content": 123,  // Should be string
    "type": "invalid_type",  // Not in enum
    "confidence": 2.5  // > 1, out of range
}

// ...produces these errors:
[
    { field: "content", message: "Expected string, received number" },
    { field: "type", message: "Invalid enum value" },
    { field: "confidence", message: "Number must be less than or equal to 1" }
]
```
