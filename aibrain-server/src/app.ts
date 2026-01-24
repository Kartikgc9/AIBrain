import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { env } from './config/env.js';
import authPlugin from './plugins/auth.plugin.js';
import authRoutes from './routes/auth.routes.js';
import memoriesRoutes from './routes/memories.routes.js';

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport: env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname'
        }
      } : undefined
    }
  });

  // Register CORS
  await fastify.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true
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

  // WebSocket sync endpoint
  fastify.register(async (fastify) => {
    fastify.get('/api/v1/sync', { websocket: true }, (connection: any, request) => {
      const socket = connection.socket || connection;

      console.log('[WebSocket] Client connected');

      // Authenticate via query param token
      const token = (request.query as any).token;

      if (!token) {
        socket.close(1008, 'Missing authentication token');
        return;
      }

      let userId: string;

      try {
        const payload = fastify.jwt.verify(token) as any;
        userId = payload.userId;
      } catch (error) {
        socket.close(1008, 'Invalid authentication token');
        return;
      }

      console.log(`[WebSocket] User ${userId} authenticated`);

      // Store connection (in production, use a proper connection manager)
      const connectionId = Math.random().toString(36);

      // Handle messages from client
      socket.on('message', async (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());

          console.log('[WebSocket] Received:', data.type);

          // Handle different message types
          switch (data.type) {
            case 'PING':
              socket.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
              break;

            case 'MEMORY_CREATED':
            case 'MEMORY_UPDATED':
            case 'MEMORY_DELETED':
              // Broadcast to all other connections of this user
              // In production, use Redis Pub/Sub for multi-server support
              socket.send(JSON.stringify({
                type: 'SYNC_ACK',
                messageId: data.messageId
              }));
              break;

            default:
              console.warn('[WebSocket] Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('[WebSocket] Message handling error:', error);
        }
      });

      socket.on('close', () => {
        console.log(`[WebSocket] Client ${connectionId} disconnected`);
      });

      socket.on('error', (error: Error) => {
        console.error('[WebSocket] Socket error:', error);
      });

      // Send welcome message
      socket.send(JSON.stringify({
        type: 'CONNECTED',
        userId,
        timestamp: Date.now()
      }));
    });
  });

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    console.error('[Error]', error);

    if (error.validation) {
      return reply.code(400).send({
        success: false,
        error: 'Validation error',
        details: error.validation
      });
    }

    reply.code(error.statusCode || 500).send({
      success: false,
      error: error.message || 'Internal server error'
    });
  });

  return fastify;
}
