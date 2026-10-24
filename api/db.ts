import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

let pool: mysql.Pool | null = null;

export function database() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error('DATABASE_URL is empty');
  if (!pool) pool = mysql.createPool({ uri: url, timezone: 'Z' });
  return drizzle(pool, { schema, mode: 'default' });
}
