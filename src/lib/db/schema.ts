/**
 * Drizzle ORM Schema for Better Auth Tables
 *
 * We only define tables that we directly query in our application.
 * Better Auth manages its own schema - this is just for type-safe queries.
 */

import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Better Auth Account Table
 * Stores OAuth tokens and authentication credentials
 */
export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
});
