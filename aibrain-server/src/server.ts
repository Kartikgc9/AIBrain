import { buildApp } from './app.js';
import { env } from './config/env.js';
import { initializeDatabase } from './config/database.js';
import { redis } from './config/redis.js';

async function start() {
  try {
    // Initialize database and pgvector
    await initializeDatabase();

    // Test Redis connection
    await redis.ping();

    // Build Fastify app
    const app = await buildApp();

    // Start server
    const port = parseInt(env.PORT);
    const host = env.HOST;

    await app.listen({ port, host });

    app.log.info(`AIBrain server running on http://${host}:${port}`);
  } catch (error) {
    console.error('Startup error:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await redis.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await redis.quit();
  process.exit(0);
});

start();
