"use client";

/**
 * Admin Utilities - Client Side
 *
 * Client-side hooks and utilities for admin/manager role checks and data filtering.
 * These hooks are designed for use in React client components only.
 *
 * DO NOT import these functions in server components or API routes. Use admin-utils-server.ts instead.
 */

import { useSession } from "@/lib/auth-client";

/**
 * Client-side hook to check if user is an administrator
 *
 * @returns boolean indicating if user has administrator role, or undefined if session is loading
 */
export function useIsAdmin(): boolean | undefined {
	const { data: session } = useSession();

	if (!session?.user) {
		return undefined; // Loading state
	}

	return session.user.accessRoles?.includes("administrator") ?? false;
}

/**
 * Client-side hook to check if user is a manager (but NOT an admin)
 *
 * @returns boolean indicating if user has manager role only, or undefined if session is loading
 */
export function useIsManager(): boolean | undefined {
	const { data: session } = useSession();
	const isAdmin = useIsAdmin();

	if (!session?.user || isAdmin === undefined) {
		return undefined; // Loading state
	}

	return !isAdmin && (session.user.accessRoles?.includes("manager") ?? false);
}

/**
 * Client-side hook to check if user is admin or manager
 * Replaces inline role checking in components
 *
 * @returns boolean indicating if user has admin or manager role, or undefined if session is loading
 */
export function useIsAdminOrManager(): boolean | undefined {
	const { data: session } = useSession();

	if (!session?.user) {
		return undefined; // Loading state
	}

	return (
		session.user.accessRoles?.some(
			(role) => role === "administrator" || role === "manager",
		) ?? false
	);
}

/**
 * Filter items by project IDs (for manager data filtering)
 * Generic function that works with any type that has a project.id field
 *
 * @param items - Array of items to filter
 * @param projectIds - Array of allowed project IDs
 * @returns Filtered array containing only items with matching project IDs
 */
export function filterByProjectIds<T extends { project: { id: number } }>(
	items: T[],
	projectIds: number[],
): T[] {
	return items.filter((item) => projectIds.includes(item.project.id));
}
