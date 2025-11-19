/**
 * Admin Utilities
 * Helper functions for admin/manager role checks and data filtering
 */

import type { Session } from "@/lib/auth-client";
import { useSession } from "@/lib/auth-client";
import { createHarvestClient } from "./harvest";

/**
 * Check if user is an administrator
 */
export function isAdmin(session: Session | null): boolean {
	return session?.user?.accessRoles?.includes("administrator") ?? false;
}

/**
 * Check if user is a manager
 */
export function isManager(session: Session | null): boolean {
	return session?.user?.accessRoles?.includes("manager") ?? false;
}

/**
 * Check if user is an administrator or manager
 */
export function isAdminOrManager(session: Session | null): boolean {
	return isAdmin(session) || isManager(session);
}

/**
 * Get IDs of projects that the manager is assigned to as project manager
 * Only returns projects where is_project_manager: true
 *
 * @param accessToken - User's Harvest OAuth access token
 * @returns Array of project IDs that the user manages
 */
export async function getManagedProjectIds(
	accessToken: string,
): Promise<number[]> {
	const client = createHarvestClient(accessToken);
	const assignments = await client.getCurrentUserProjectAssignments();

	return assignments.project_assignments
		.filter((pa) => pa.is_project_manager === true)
		.map((pa) => pa.project.id);
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

/**
 * Check if manager can manage a specific project
 *
 * @param accessToken - User's Harvest OAuth access token
 * @param projectId - Project ID to check
 * @returns True if user is project manager for this project
 */
export async function canManageProject(
	accessToken: string,
	projectId: number,
): Promise<boolean> {
	const managedProjectIds = await getManagedProjectIds(accessToken);
	return managedProjectIds.includes(projectId);
}

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
