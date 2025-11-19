/**
 * Admin Utilities - Server Side
 *
 * Server-side helper functions for admin/manager role checks and data filtering.
 * These functions are designed for use in API routes, server components, and server actions.
 *
 * DO NOT import these functions in client components. Use admin-utils-client.ts instead.
 */

import type { Session } from "@/lib/auth-client";
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
