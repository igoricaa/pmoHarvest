/**
 * Drizzle ORM Database Instance
 *
 * Provides type-safe database access using the same PostgreSQL pool
 * that Better Auth uses. We don't manage migrations here - Better Auth
 * handles its own schema.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Use the same connection pool configuration as Better Auth
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Drizzle database instance with Better Auth schema
 * Use this for type-safe queries to Better Auth tables
 */
export const db = drizzle(pool, { schema });
