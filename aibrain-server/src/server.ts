import { buildApp } from './app.js';
import { env } from './config/env.js';
import { initializeDatabase } from './config/database.js';
import { redis } from './config/redis.js';

async function start() {
  try {
    console.log('[Server] Starting AIBrain server...');
    console.log('[Server] Environment:', env.NODE_ENV);

    // Initialize database and pgvector
    console.log('[Server] Initializing database...');
    await initializeDatabase();

    // Test Redis connection
    console.log('[Server] Testing Redis connection...');
    await redis.ping();
    console.log('[Server] Redis connected successfully');

    // Build Fastify app
    const app = await buildApp();

    // Start server
    const port = parseInt(env.PORT);
    const host = env.HOST;

    await app.listen({ port, host });

    console.log(`[Server] 🚀 AIBrain server running on http://${host}:${port}`);
    console.log(`[Server] Health check: http://${host}:${port}/health`);
    console.log(`[Server] WebSocket: ws://${host}:${port}/api/v1/sync`);
  } catch (error) {
    console.error('[Server] Startup error:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('[Server] Shutting down gracefully...');
  await redis.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[Server] Shutting down gracefully...');
  await redis.quit();
  process.exit(0);
});

start();
