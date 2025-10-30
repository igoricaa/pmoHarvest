import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { refreshHarvestToken } from '@/lib/harvest/token-refresh';
import { getAccountByUserIdAndProvider, updateAccountTokens } from '@/lib/db/repositories/account';
import { logError } from '@/lib/logger';

/**
 * Refresh Harvest OAuth Token
 *
 * This endpoint refreshes an expired Harvest access token using the refresh token.
 * Better Auth's genericOAuth plugin doesn't support automatic refresh for custom providers,
 * so we implement it manually here.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user session
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized - no active session' }, { status: 401 });
    }

    // Get the Harvest account with OAuth tokens from the database
    const harvestAccount = await getAccountByUserIdAndProvider(session.user.id, 'harvest');

    if (!harvestAccount?.refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token found for Harvest account' },
        { status: 400 }
      );
    }

    // Refresh the token
    const refreshResult = await refreshHarvestToken(harvestAccount.refreshToken);

    if (!refreshResult.success || !refreshResult.accessToken || !refreshResult.refreshToken) {
      logError('Token refresh failed', new Error(refreshResult.error || 'Unknown error'));

      return NextResponse.json(
        {
          error: refreshResult.error || 'Failed to refresh token',
          requiresReauth: true, // Signal that user needs to re-authenticate
        },
        { status: 401 }
      );
    }

    // Update the account with new tokens in the database
    // Harvest rotates refresh tokens, so we need to update both
    const expiresAt = new Date(Date.now() + (refreshResult.expiresIn || 1209600) * 1000);

    await updateAccountTokens(session.user.id, 'harvest', {
      accessToken: refreshResult.accessToken,
      refreshToken: refreshResult.refreshToken,
      expiresAt,
    });

    return NextResponse.json({
      success: true,
      accessToken: refreshResult.accessToken,
      expiresIn: refreshResult.expiresIn,
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    logError('Failed to refresh Harvest token', error);

    return NextResponse.json(
      {
        error: 'Internal server error during token refresh',
        requiresReauth: false,
      },
      { status: 500 }
    );
  }
}
