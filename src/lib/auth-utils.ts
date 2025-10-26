/**
 * Authentication Utility Functions
 * Helper functions for managing auth state and token refresh
 */

import { authClient } from "./auth-client";

/**
 * Refresh the user's Harvest access token
 *
 * @returns The new access token or null if refresh failed
 */
export async function refreshUserHarvestToken(): Promise<string | null> {
  try {
    const response = await fetch("/api/auth/refresh-harvest-token", {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();

      // If requiresReauth is true, user needs to sign in again
      if (error.requiresReauth) {
        console.warn("Refresh token expired - user needs to re-authenticate");
        // Redirect to sign-in
        window.location.href = "/sign-in?error=session_expired";
        return null;
      }

      console.error("Token refresh failed:", error);
      return null;
    }

    const data = await response.json();
    return data.accessToken;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}

/**
 * Check if user is authenticated
 *
 * @returns true if user has an active session
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const session = await authClient.getSession();
    return !!session.data?.user;
  } catch {
    return false;
  }
}

/**
 * Get the user's current session
 *
 * @returns The session data or null
 */
export async function getCurrentSession() {
  try {
    const session = await authClient.getSession();
    return session.data;
  } catch {
    return null;
  }
}

/**
 * Check if user has a specific permission
 *
 * @param resource - The resource (e.g., 'timeEntries', 'expenses')
 * @param action - The action (e.g., 'create', 'read', 'approve')
 * @returns true if user has the permission
 */
export async function hasPermission(
  resource: keyof {
    timeEntries: unknown;
    expenses: unknown;
    projects: unknown;
    users: unknown;
    reports: unknown;
  },
  action: string
): Promise<boolean> {
  const session = await getCurrentSession();

  if (!session?.user?.permissions) {
    return false;
  }

  const permissions = session.user.permissions as any;
  return permissions[resource]?.includes(action) || false;
}

/**
 * Check if user has a specific role
 *
 * @param role - The role to check (e.g., 'administrator', 'manager', 'member')
 * @returns true if user has the role
 */
export async function hasRole(role: string): Promise<boolean> {
  const session = await getCurrentSession();

  if (!session?.user?.accessRoles) {
    return false;
  }

  const roles = session.user.accessRoles as string[];
  return roles.includes(role);
}
