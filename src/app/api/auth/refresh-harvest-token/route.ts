import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { refreshHarvestToken } from "@/lib/harvest/token-refresh";

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
      return NextResponse.json(
        { error: "Unauthorized - no active session" },
        { status: 401 }
      );
    }

    // Get the current account (which contains the refresh token)
    // Better Auth stores OAuth tokens in the account table
    const accounts = await auth.api.listAccounts({
      headers: request.headers,
    });

    const harvestAccount = accounts?.find(
      (account: any) => account.providerId === "harvest"
    );

    if (!harvestAccount?.refreshToken) {
      return NextResponse.json(
        { error: "No refresh token found for Harvest account" },
        { status: 400 }
      );
    }

    // Refresh the token
    const result = await refreshHarvestToken(harvestAccount.refreshToken);

    if (!result.success || !result.accessToken || !result.refreshToken) {
      console.error("Token refresh failed:", result.error);

      return NextResponse.json(
        {
          error: result.error || "Failed to refresh token",
          requiresReauth: true, // Signal that user needs to re-authenticate
        },
        { status: 401 }
      );
    }

    // Update the account with new tokens
    // Note: Better Auth should have an API to update account tokens,
    // but if not, we need to update the database directly
    // For now, we'll return the new token and let the client handle it

    return NextResponse.json({
      success: true,
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      message: "Token refreshed successfully",
    });
  } catch (error) {
    console.error("Error in refresh-harvest-token endpoint:", error);

    return NextResponse.json(
      {
        error: "Internal server error during token refresh",
        requiresReauth: false,
      },
      { status: 500 }
    );
  }
}
