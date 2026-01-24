import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../config/env.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Register JWT plugin
  fastify.register(jwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: '7d'
    }
  });

  // Decorate request with authenticate method
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload = await request.jwtVerify();
      request.userId = (payload as any).userId;
    } catch (error) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });
};

export default fp(authPlugin);
