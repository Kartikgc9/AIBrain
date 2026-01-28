import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import authPlugin from './plugins/auth.plugin.js';
import authRoutes from './routes/auth.routes.js';
import memoriesRoutes from './routes/memories.routes.js';

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      redact: ['req.headers.authorization', 'password', 'token', 'apiKey'],
      transport: env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname'
        }
      } : undefined
    }
  });

  // Block wildcard CORS in production
  if (env.NODE_ENV === 'production' && env.CORS_ORIGIN === '*') {
    throw new Error('Wildcard CORS origin is not allowed in production. Set CORS_ORIGIN to specific origins.');
  }

  // Register CORS
  await fastify.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true
  });

  // Register security headers
  await fastify.register(helmet);

  // Register global rate limiting
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
  });

  // Register WebSocket support
  await fastify.register(websocket);

  // Register authentication plugin
  await fastify.register(authPlugin);

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // API v1 routes
  await fastify.register(authRoutes, { prefix: '/api/v1' });
  await fastify.register(memoriesRoutes, { prefix: '/api/v1' });

  // WebSocket sync endpoint with message-based auth
  fastify.register(async (fastify) => {
    fastify.get('/api/v1/sync', { websocket: true }, (connection: any, request) => {
      const socket = connection.socket || connection;

      request.log.info('WebSocket client connected');

      let userId: string | null = null;
      const AUTH_TIMEOUT_MS = 5000;

      // Set auth timeout - close if no AUTH message received
      const authTimer = setTimeout(() => {
        if (!userId) {
          request.log.warn('WebSocket auth timeout');
          socket.close(1008, 'Authentication timeout');
        }
      }, AUTH_TIMEOUT_MS);

      // Handle messages from client
      socket.on('message', async (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());

          // First message must be AUTH
          if (!userId) {
            if (data.type !== 'AUTH' || !data.token) {
              socket.close(1008, 'First message must be AUTH with token');
              return;
            }

            try {
              const payload = fastify.jwt.verify(data.token) as any;
              userId = payload.userId;
              clearTimeout(authTimer);
              request.log.info({ userId }, 'WebSocket user authenticated');

              socket.send(JSON.stringify({
                type: 'CONNECTED',
                userId,
                timestamp: Date.now()
              }));
            } catch {
              socket.close(1008, 'Invalid authentication token');
            }
            return;
          }

          request.log.debug({ type: data.type }, 'WebSocket message received');

          // Handle different message types
          switch (data.type) {
            case 'PING':
              socket.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
              break;

            case 'MEMORY_CREATED':
            case 'MEMORY_UPDATED':
            case 'MEMORY_DELETED':
              socket.send(JSON.stringify({
                type: 'SYNC_ACK',
                messageId: data.messageId
              }));
              break;

            default:
              request.log.warn({ type: data.type }, 'Unknown WebSocket message type');
          }
        } catch (error) {
          request.log.error({ err: error }, 'WebSocket message handling error');
        }
      });

      socket.on('close', () => {
        clearTimeout(authTimer);
        request.log.info('WebSocket client disconnected');
      });

      socket.on('error', (error: Error) => {
        request.log.error({ err: error }, 'WebSocket socket error');
      });
    });
  });

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'Request error');

    if (error.validation) {
      return reply.code(400).send({
        success: false,
        error: 'Validation error',
        details: error.validation
      });
    }

    const statusCode = error.statusCode || 500;
    const message = statusCode >= 500 && env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message || 'Internal server error';

    reply.code(statusCode).send({
      success: false,
      error: message
    });
  });

  return fastify;
}
