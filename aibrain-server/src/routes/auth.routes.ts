import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authService } from '../services/auth.service.js';
import { setSession, deleteSession } from '../config/redis.js';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Register new user
  fastify.post('/auth/register', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '15 minutes'
      }
    }
  }, async (request, reply) => {
    try {
      const { email, password } = registerSchema.parse(request.body);

      const user = await authService.register(email, password);

      // Generate JWT token
      const token = fastify.jwt.sign({
        userId: user.id,
        email: user.email
      });

      // Store session in Redis
      await setSession(user.id, {
        email: user.email,
        createdAt: new Date()
      });

      reply.code(201).send({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt
        }
      });
    } catch (error: any) {
      request.log.error({ err: error }, 'Register error');

      if (error.message === 'User already exists') {
        return reply.code(409).send({ success: false, error: error.message });
      }

      reply.code(400).send({ success: false, error: error.message });
    }
  });

  // Login user
  fastify.post('/auth/login', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '15 minutes'
      }
    }
  }, async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body);

      const user = await authService.login(email, password);

      if (!user) {
        return reply.code(401).send({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Generate JWT token
      const token = fastify.jwt.sign({
        userId: user.id,
        email: user.email
      });

      // Store session in Redis
      await setSession(user.id, {
        email: user.email,
        loginAt: new Date()
      });

      reply.send({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt
        }
      });
    } catch (error: any) {
      request.log.error({ err: error }, 'Login error');
      reply.code(400).send({ success: false, error: error.message });
    }
  });

  // Logout user
  fastify.post('/auth/logout', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const userId = request.userId!;

      // Delete session from Redis
      await deleteSession(userId);

      reply.send({ success: true, message: 'Logged out successfully' });
    } catch (error: any) {
      request.log.error({ err: error }, 'Logout error');
      reply.code(500).send({ success: false, error: error.message });
    }
  });

  // Refresh token
  fastify.post('/auth/refresh', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const userId = request.userId!;

      const user = await authService.getUserById(userId);

      if (!user) {
        return reply.code(404).send({ success: false, error: 'User not found' });
      }

      // Generate new JWT token
      const token = fastify.jwt.sign({
        userId: user.id,
        email: user.email
      });

      reply.send({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email
        }
      });
    } catch (error: any) {
      request.log.error({ err: error }, 'Refresh token error');
      reply.code(500).send({ success: false, error: error.message });
    }
  });

  // Get current user
  fastify.get('/auth/me', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const userId = request.userId!;

      const user = await authService.getUserById(userId);

      if (!user) {
        return reply.code(404).send({ success: false, error: 'User not found' });
      }

      reply.send({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
          settings: user.settings
        }
      });
    } catch (error: any) {
      request.log.error({ err: error }, 'Get user error');
      reply.code(500).send({ success: false, error: error.message });
    }
  });
};

export default authRoutes;
