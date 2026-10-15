import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    // Set before src/config/env.ts loads; dotenv never overrides variables that
    // already exist, so tests never read secrets from api/.env.
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-access-secret',
      REFRESH_SECRET: 'test-refresh-secret',
      ACCESS_TOKEN_TTL: '15m',
      REFRESH_TOKEN_TTL: '7d',
      SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
      CORS_ORIGIN: 'http://localhost:3000',
      RATE_LIMIT_MAX: '1000',
    },
  },
})
