import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

redis.on('error', (error) => {
  console.error('[Redis] Connection error:', error);
});

// Session cache helpers
export async function setSession(userId: string, sessionData: any, ttl: number = 86400) {
  await redis.setex(`session:${userId}`, ttl, JSON.stringify(sessionData));
}

export async function getSession(userId: string) {
  const data = await redis.get(`session:${userId}`);
  return data ? JSON.parse(data) : null;
}

export async function deleteSession(userId: string) {
  await redis.del(`session:${userId}`);
}

// Rate limiting helpers
export async function checkRateLimit(key: string, limit: number, window: number): Promise<boolean> {
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, window);
  }

  return current <= limit;
}
