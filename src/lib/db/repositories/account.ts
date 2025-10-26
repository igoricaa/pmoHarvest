/**
 * Account Repository
 *
 * Type-safe database operations for Better Auth account table.
 * Provides clean abstraction over Drizzle ORM queries.
 */

import { eq, and } from 'drizzle-orm';
import { db } from '../index';
import { account } from '../schema';

/**
 * Get account by user ID and provider ID
 *
 * @param userId - The user's ID
 * @param providerId - The OAuth provider ID (e.g., 'harvest')
 * @returns Account data or null if not found
 */
export async function getAccountByUserIdAndProvider(
  userId: string,
  providerId: string
) {
  const result = await db
    .select({
      refreshToken: account.refreshToken,
      accessToken: account.accessToken,
      accessTokenExpiresAt: account.accessTokenExpiresAt,
    })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, providerId)))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Update account OAuth tokens
 *
 * @param userId - The user's ID
 * @param providerId - The OAuth provider ID (e.g., 'harvest')
 * @param tokens - The new token values
 */
export async function updateAccountTokens(
  userId: string,
  providerId: string,
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }
) {
  await db
    .update(account)
    .set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresAt: tokens.expiresAt,
    })
    .where(and(eq(account.userId, userId), eq(account.providerId, providerId)));
}
