import 'dotenv/config';

const required = ['NODE_ENV', 'PORT', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

if (process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}

export const config = Object.freeze({
  env: process.env.NODE_ENV,
  isProd: process.env.NODE_ENV === 'production',
  isDev: process.env.NODE_ENV !== 'production',
  port: Number(process.env.PORT),
  logLevel: process.env.LOG_LEVEL || 'info',
  databaseUrl: process.env.DATABASE_URL || null,
  aiProvider: process.env.AI_PROVIDER || 'mock',
  aiServiceUrl: (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, ''),
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS) || 15_000,
  aiServiceKey: process.env.AI_SERVICE_KEY || null,
  corsOrigin: process.env.CORS_ORIGIN || null,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID || null,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || null,
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/v1/auth/google/callback',
  version: '0.1.0',
});