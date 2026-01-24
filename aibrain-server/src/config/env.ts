import { z } from 'zod';

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DATABASE_URL: z.string().default('postgresql://aibrain:dev_password@localhost:5432/aibrain_dev'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),

  // CORS
  CORS_ORIGIN: z.string().default('*')
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[Config] Environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    throw new Error('Invalid environment configuration');
  }
}

export const env = validateEnv();
