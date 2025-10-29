/**
 * Harvest OAuth Token Refresh Utilities
 * Handles refreshing expired Harvest OAuth access tokens
 */

export interface HarvestTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
}

/**
 * Refresh a Harvest OAuth access token using a refresh token
 *
 * @param refreshToken - The refresh token to use
 * @returns TokenRefreshResult with new tokens or error
 */
export async function refreshHarvestToken(refreshToken: string): Promise<TokenRefreshResult> {
  try {
    const clientId = process.env.HARVEST_OAUTH_CLIENT_ID;
    const clientSecret = process.env.HARVEST_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Missing OAuth credentials');
    }

    const response = await fetch('https://id.getharvest.com/api/v2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'PMO Harvest Portal (token-refresh)',
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Harvest token refresh failed:', errorData);

      return {
        success: false,
        error: errorData.error_description || errorData.error || 'Token refresh failed',
      };
    }

    const data: HarvestTokenResponse = await response.json();

    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    console.error('Error refreshing Harvest token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if a token is expired or will expire soon
 *
 * @param expiresAt - Token expiration timestamp (seconds since epoch)
 * @param bufferSeconds - Refresh buffer in seconds (default: 5 minutes)
 * @returns true if token needs refresh
 */
export function isTokenExpired(
  expiresAt: number | null | undefined,
  bufferSeconds = 5 * 60
): boolean {
  if (!expiresAt) {
    return true; // Treat null/undefined as expired
  }

  const now = Math.floor(Date.now() / 1000);
  return expiresAt - now <= bufferSeconds;
}

/**
 * Calculate token expiration timestamp
 *
 * @param expiresIn - Token lifetime in seconds
 * @returns Expiration timestamp (seconds since epoch)
 */
export function calculateTokenExpiration(expiresIn: number): number {
  return Math.floor(Date.now() / 1000) + expiresIn;
}
