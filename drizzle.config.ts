import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './api/schema.ts',
  out: './api/drizzle',
  dialect: 'mysql',
  dbCredentials: { url: process.env.DATABASE_URL || '' },
});
