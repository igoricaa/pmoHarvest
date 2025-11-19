import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useSession } from "@/lib/auth-client";

/**
 * Normalize query params to ensure consistent cache keys
 * Sorts keys alphabetically and filters out undefined values
 */
function normalizeParams<T extends Record<string, unknown>>(
	params?: T,
): T | undefined {
	if (!params || Object.keys(params).length === 0) return undefined;

	// Sort keys alphabetically for consistent cache keys
	return Object.keys(params)
		.sort()
		.reduce((acc, key) => {
			const value = params[key];
			// Filter out undefined values
			if (value !== undefined) {
				acc[key as keyof T] = value as T[keyof T];
			}
			return acc;
		}, {} as T);
}

import type {
	HarvestTimeEntryResponse,
	HarvestTimeEntry,
	CreateTimeEntryInput,
	UpdateTimeEntryInput,
	HarvestExpenseResponse,
	HarvestExpense,
	CreateExpenseInput,
	UpdateExpenseInput,
	HarvestProjectResponse,
	HarvestTaskAssignmentResponse,
	HarvestExpenseCategoryResponse,
	HarvestUser,
	HarvestUserResponse,
	CreateUserInput,
	UpdateUserInput,
	HarvestClient as HarvestClientType,
	HarvestClientResponse,
	CreateClientInput,
	UpdateClientInput,
	HarvestProject,
	CreateProjectInput,
	UpdateProjectInput,
	HarvestUserAssignment,
	HarvestUserAssignmentResponse,
	CreateUserAssignmentInput,
	UpdateUserAssignmentInput,
	HarvestProjectAssignmentResponse,
} from "@/types/harvest";

// ============================================================================
// Query Keys
// ============================================================================

export const harvestKeys = {
	all: ["harvest"] as const,
	timeEntries: (params?: Record<string, unknown>) =>
		[...harvestKeys.all, "time-entries", normalizeParams(params)] as const,
	timeEntry: (id: number) => [...harvestKeys.all, "time-entry", id] as const,
	expenses: (params?: Record<string, unknown>) =>
		[...harvestKeys.all, "expenses", normalizeParams(params)] as const,
	expense: (id: number) => [...harvestKeys.all, "expense", id] as const,
	projects: () => [...harvestKeys.all, "projects"] as const,
	userProjectAssignments: () =>
		[...harvestKeys.all, "user-project-assignments"] as const,
	tasks: (projectId: number) =>
		[...harvestKeys.all, "tasks", projectId] as const,
	expenseCategories: () => [...harvestKeys.all, "expense-categories"] as const,
	currentUser: () => [...harvestKeys.all, "current-user"] as const,
	managedProjects: () => [...harvestKeys.all, "managed-projects"] as const,
	lockedPeriods: () => [...harvestKeys.all, "locked-periods"] as const,
	users: (params?: Record<string, unknown>) =>
		[...harvestKeys.all, "users", normalizeParams(params)] as const,
	clients: (params?: Record<string, unknown>) =>
		[...harvestKeys.all, "clients", normalizeParams(params)] as const,
	client: (id: number) => [...harvestKeys.all, "client", id] as const,
	userAssignments: (projectId: number) =>
		[...harvestKeys.all, "user-assignments", projectId] as const,
};

// ============================================================================
// Time Entries
// ============================================================================

export function useTimeEntries(params?: {
	from?: string;
	to?: string;
	user_id?: number;
	approval_status?: "unsubmitted" | "submitted" | "approved";
}) {
	return useQuery({
		queryKey: harvestKeys.timeEntries(params),
		queryFn: async () => {
			const { data } = await axios.get<HarvestTimeEntryResponse>(
				"/api/harvest/time-entries",
				{
					params,
				},
			);
			return data;
		},
		staleTime: 0, // Always consider stale
		refetchOnWindowFocus: true, // Refetch when tab gains focus
		refetchOnMount: "always", // Always refetch on mount
	});
}

export function useTimeEntry(id: number) {
	return useQuery({
		queryKey: harvestKeys.timeEntry(id),
		queryFn: async () => {
			const { data } = await axios.get<HarvestTimeEntry>(
				`/api/harvest/time-entries/${id}`,
			);
			return data;
		},
		enabled: !!id,
		refetchOnWindowFocus: true,
	});
}

export function useCreateTimeEntry() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: CreateTimeEntryInput) => {
			const { data } = await axios.post<HarvestTimeEntry>(
				"/api/harvest/time-entries",
				input,
			);
			return data;
		},
		onMutate: async (newEntry) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: [...harvestKeys.all, "time-entries"],
			});

			// Snapshot current value
			const previousData = queryClient.getQueryData(harvestKeys.timeEntries());

			// Generate temp ID for tracking optimistic entry
			const tempId = Date.now();

			// Optimistically update cache
			queryClient.setQueryData(
				harvestKeys.timeEntries(),
				(old: HarvestTimeEntryResponse | undefined) => {
					if (!old) return old;

					// Create optimistic entry with all required fields
					const optimisticEntry: HarvestTimeEntry = {
						...newEntry,
						id: tempId, // Temporary ID
						spent_date: newEntry.spent_date,
						hours: newEntry.hours || 0,
						hours_without_timer: newEntry.hours || 0,
						rounded_hours: newEntry.hours || 0,
						notes: newEntry.notes || null,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
						is_running: false,
						is_locked: false,
						is_billed: false,
						is_closed: false,
						locked_reason: null,
						approval_status: "unsubmitted",
						timer_started_at: null,
						started_time: null,
						ended_time: null,
						billable: true,
						budgeted: true,
						billable_rate: null,
						cost_rate: null,
						user: { id: 0, name: "" },
						client: { id: 0, name: "", currency: "" },
						project: { id: newEntry.project_id, name: "", code: "" },
						task: { id: newEntry.task_id, name: "" },
						user_assignment: {
							id: 0,
							is_project_manager: false,
							is_active: true,
							budget: null,
							created_at: "",
							updated_at: "",
							hourly_rate: null,
						},
						task_assignment: {
							id: 0,
							billable: true,
							is_active: true,
							created_at: "",
							updated_at: "",
							hourly_rate: null,
							budget: null,
						},
						invoice: null,
						external_reference: null,
					};

					return {
						...old,
						time_entries: [optimisticEntry, ...(old.time_entries || [])],
					};
				},
			);

			return { previousData, tempId };
		},
		onError: (err, newEntry, context: any) => {
			// Rollback on error
			if (context?.previousData) {
				queryClient.setQueryData(
					harvestKeys.timeEntries(),
					context.previousData,
				);
			}
		},
		onSuccess: () => {
			// Invalidate all time entries queries (regardless of params)
			queryClient.invalidateQueries({
				queryKey: [...harvestKeys.all, "time-entries"],
			});
		},
	});
}

export function useUpdateTimeEntry(id: number) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: UpdateTimeEntryInput) => {
			const { data } = await axios.patch<HarvestTimeEntry>(
				`/api/harvest/time-entries/${id}`,
				input,
			);
			return data;
		},
		onMutate: async (updatedFields) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: [...harvestKeys.all, "time-entries"],
			});

			// Snapshot previous value
			const previousData = queryClient.getQueryData(harvestKeys.timeEntries());

			// Optimistically update list
			queryClient.setQueryData(
				harvestKeys.timeEntries(),
				(old: HarvestTimeEntryResponse | undefined) => {
					if (!old) return old;
					return {
						...old,
						time_entries: old.time_entries.map((entry) =>
							entry.id === id
								? {
										...entry,
										...updatedFields,
										updated_at: new Date().toISOString(),
									}
								: entry,
						),
					};
				},
			);

			// Optimistically update single entry if cached
			queryClient.setQueryData(
				harvestKeys.timeEntry(id),
				(old: HarvestTimeEntry | undefined) => {
					if (!old) return old;
					return {
						...old,
						...updatedFields,
						updated_at: new Date().toISOString(),
					};
				},
			);

			return { previousData };
		},
		onError: (err, updatedFields, context: any) => {
			// Rollback on error
			if (context?.previousData) {
				queryClient.setQueryData(
					harvestKeys.timeEntries(),
					context.previousData,
				);
			}
		},
		onSuccess: (serverData) => {
			// Invalidate all time entries queries (regardless of params)
			queryClient.invalidateQueries({
				queryKey: [...harvestKeys.all, "time-entries"],
			});
			// Update single item cache immediately
			queryClient.setQueryData(harvestKeys.timeEntry(id), serverData);
		},
	});
}

export function useDeleteTimeEntry() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: number) => {
			await axios.delete(`/api/harvest/time-entries/${id}`);
		},
		onMutate: async (id) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: [...harvestKeys.all, "time-entries"],
			});

			// Snapshot previous value
			const previousData = queryClient.getQueryData(harvestKeys.timeEntries());

			// Optimistically remove from cache
			queryClient.setQueryData(
				harvestKeys.timeEntries(),
				(old: HarvestTimeEntryResponse | undefined) => {
					if (!old) return old;
					return {
						...old,
						time_entries: old.time_entries.filter((entry) => entry.id !== id),
					};
				},
			);

			return { previousData };
		},
		onError: (err, id, context: any) => {
			// Rollback on error
			if (context?.previousData) {
				queryClient.setQueryData(
					harvestKeys.timeEntries(),
					context.previousData,
				);
			}
		},
		onSuccess: () => {
			// Invalidate all time entries queries (regardless of params)
			queryClient.invalidateQueries({
				queryKey: [...harvestKeys.all, "time-entries"],
			});
		},
	});
}

// ============================================================================
// Expenses
// ============================================================================

export function useExpenses(params?: {
	from?: string;
	to?: string;
	user_id?: number;
	approval_status?: "unsubmitted" | "submitted" | "approved";
}) {
	return useQuery({
		queryKey: harvestKeys.expenses(params),
		queryFn: async () => {
			const { data } = await axios.get<HarvestExpenseResponse>(
				"/api/harvest/expenses",
				{
					params,
				},
			);
			return data;
		},
		staleTime: 0, // Always consider stale
		refetchOnWindowFocus: true, // Refetch when tab gains focus
		refetchOnMount: "always", // Always refetch on mount
	});
}

export function useExpense(id: number) {
	return useQuery({
		queryKey: harvestKeys.expense(id),
		queryFn: async () => {
			const { data } = await axios.get<HarvestExpense>(
				`/api/harvest/expenses/${id}`,
			);
			return data;
		},
		enabled: !!id,
		refetchOnWindowFocus: true,
	});
}

export function useCreateExpense() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: CreateExpenseInput) => {
			// If receipt is present, send as FormData
			if (input.receipt) {
				const formData = new FormData();
				formData.append("project_id", input.project_id.toString());
				formData.append(
					"expense_category_id",
					input.expense_category_id.toString(),
				);
				formData.append("spent_date", input.spent_date);
				if (input.total_cost !== undefined)
					formData.append("total_cost", input.total_cost.toString());
				if (input.notes) formData.append("notes", input.notes);
				if (input.billable !== undefined)
					formData.append("billable", input.billable.toString());
				formData.append("receipt", input.receipt);

				const { data } = await axios.post<HarvestExpense>(
					"/api/harvest/expenses",
					formData,
					{
						headers: {
							"Content-Type": "multipart/form-data",
						},
					},
				);
				return data;
			} else {
				// Send as JSON if no receipt
				const { data } = await axios.post<HarvestExpense>(
					"/api/harvest/expenses",
					input,
				);
				return data;
			}
		},
		onMutate: async (newExpense) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: [...harvestKeys.all, "expenses"],
			});

			// Snapshot current value
			const previousData = queryClient.getQueryData(harvestKeys.expenses());

			// Optimistically update cache
			queryClient.setQueryData(
				harvestKeys.expenses(),
				(old: HarvestExpenseResponse | undefined) => {
					if (!old) return old;

					// Create optimistic entry with all required fields
					const optimisticExpense: HarvestExpense = {
						...newExpense,
						id: Date.now(), // Temporary ID
						spent_date: newExpense.spent_date,
						total_cost: newExpense.total_cost || 0,
						units: newExpense.units || null,
						notes: newExpense.notes || null,
						billable:
							newExpense.billable !== undefined ? newExpense.billable : true,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
						is_locked: false,
						is_billed: false,
						is_closed: false,
						locked_reason: null,
						approval_status: "unsubmitted",
						receipt: null,
						user: { id: 0, name: "" },
						client: { id: 0, name: "", currency: "" },
						project: { id: newExpense.project_id, name: "", code: "" },
						expense_category: {
							id: newExpense.expense_category_id,
							name: "",
							unit_name: null,
							unit_price: null,
						},
						user_assignment: {
							id: 0,
							is_project_manager: false,
							is_active: true,
							budget: null,
							created_at: "",
							updated_at: "",
							hourly_rate: null,
						},
						invoice: null,
					};

					return {
						...old,
						expenses: [optimisticExpense, ...(old.expenses || [])],
					};
				},
			);

			// Generate temp ID for tracking optimistic entry
			const tempId = Date.now();

			return { previousData, tempId };
		},
		onError: (err, newExpense, context: any) => {
			// Rollback on error
			if (context?.previousData) {
				queryClient.setQueryData(harvestKeys.expenses(), context.previousData);
			}
		},
		onSuccess: () => {
			// Invalidate all expenses queries (regardless of params)
			queryClient.invalidateQueries({
				queryKey: [...harvestKeys.all, "expenses"],
			});
		},
	});
}

export function useUpdateExpense(id: number) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: UpdateExpenseInput) => {
			const { data } = await axios.patch<HarvestExpense>(
				`/api/harvest/expenses/${id}`,
				input,
			);
			return data;
		},
		onMutate: async (updatedFields) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: [...harvestKeys.all, "expenses"],
			});

			// Snapshot previous value
			const previousData = queryClient.getQueryData(harvestKeys.expenses());

			// Optimistically update list
			queryClient.setQueryData(
				harvestKeys.expenses(),
				(old: HarvestExpenseResponse | undefined) => {
					if (!old) return old;
					return {
						...old,
						expenses: old.expenses.map((expense) =>
							expense.id === id
								? {
										...expense,
										...updatedFields,
										updated_at: new Date().toISOString(),
									}
								: expense,
						),
					};
				},
			);

			// Optimistically update single expense if cached
			queryClient.setQueryData(
				harvestKeys.expense(id),
				(old: HarvestExpense | undefined) => {
					if (!old) return old;
					return {
						...old,
						...updatedFields,
						updated_at: new Date().toISOString(),
					};
				},
			);

			return { previousData };
		},
		onError: (err, updatedFields, context: any) => {
			// Rollback on error
			if (context?.previousData) {
				queryClient.setQueryData(harvestKeys.expenses(), context.previousData);
			}
		},
		onSuccess: (serverData) => {
			// Invalidate all expenses queries (regardless of params)
			queryClient.invalidateQueries({
				queryKey: [...harvestKeys.all, "expenses"],
			});
			// Update single item cache immediately
			queryClient.setQueryData(harvestKeys.expense(id), serverData);
		},
	});
}

export function useDeleteExpense() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: number) => {
			await axios.delete(`/api/harvest/expenses/${id}`);
		},
		onMutate: async (id) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: [...harvestKeys.all, "expenses"],
			});

			// Snapshot previous value
			const previousData = queryClient.getQueryData(harvestKeys.expenses());

			// Optimistically remove from cache
			queryClient.setQueryData(
				harvestKeys.expenses(),
				(old: HarvestExpenseResponse | undefined) => {
					if (!old) return old;
					return {
						...old,
						expenses: old.expenses.filter((expense) => expense.id !== id),
					};
				},
			);

			return { previousData };
		},
		onError: (err, id, context: any) => {
			// Rollback on error
			if (context?.previousData) {
				queryClient.setQueryData(harvestKeys.expenses(), context.previousData);
			}
		},
		onSuccess: () => {
			// Invalidate all expenses queries (regardless of params)
			queryClient.invalidateQueries({
				queryKey: [...harvestKeys.all, "expenses"],
			});
		},
	});
}

// ============================================================================
// Projects & Tasks
// ============================================================================

export function useProjects(options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: harvestKeys.projects(),
		queryFn: async () => {
			const { data } = await axios.get<HarvestProjectResponse>(
				"/api/harvest/projects",
			);
			return data;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes - projects don't change often
		refetchOnWindowFocus: true, // Refetch when tab gains focus
		enabled: options?.enabled,
	});
}

/**
 * User Project Assignments Hook
 *
 * Fetches projects assigned to the authenticated user.
 * Works for all user roles (members, managers, admins).
 */
export function useUserProjectAssignments(options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: harvestKeys.userProjectAssignments(),
		queryFn: async () => {
			const { data } = await axios.get<HarvestProjectResponse>(
				"/api/harvest/user-project-assignments",
			);
			return data;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes - projects don't change often
		refetchOnWindowFocus: true, // Refetch when tab gains focus
		enabled: options?.enabled,
	});
}

/**
 * Fetches task assignments for a specific project
 *
 * Handles role-based data fetching:
 * - Admin/Manager: Fetches from `/projects/{id}/tasks` (all project tasks)
 * - Member: Fetches from `/users/me/project_assignments` filtered by project (assigned tasks only)
 *
 * @param projectId - The project ID to fetch tasks for. Returns empty result if null/undefined.
 * @param options - Configuration options
 * @param options.isAdminOrManager - Whether the current user is an admin or manager (default: true for backwards compatibility)
 * @returns Query result with task assignments for the project
 *
 * @example Admin/Manager usage
 * ```tsx
 * const { data: tasks } = useTaskAssignments(projectId, { isAdminOrManager: true });
 * ```
 *
 * @example Member usage
 * ```tsx
 * const { data: tasks } = useTaskAssignments(projectId, { isAdminOrManager: false });
 * ```
 *
 * @remarks
 * - When `projectId` is null/undefined, the query is disabled and returns empty data
 * - The query is automatically disabled until `projectId` is set to avoid unnecessary API calls
 * - Uses 5-minute stale time for caching
 */
export function useTaskAssignments(
	projectId: number | null,
	options?: { isAdminOrManager?: boolean },
) {
	const isAdminOrManager = options?.isAdminOrManager ?? true; // Default to admin endpoint for backwards compatibility

	return useQuery({
		queryKey: harvestKeys.tasks(projectId!),
		queryFn: async () => {
			if (isAdminOrManager) {
				// Admin/Manager: Use project task assignments endpoint
				const { data } = await axios.get<HarvestTaskAssignmentResponse>(
					`/api/harvest/projects/${projectId}/tasks`,
				);
				return data;
			} else {
				// Member: Use user task assignments endpoint
				const { data } = await axios.get<HarvestTaskAssignmentResponse>(
					`/api/harvest/user-task-assignments?projectId=${projectId}`,
				);
				return data;
			}
		},
		enabled: !!projectId,
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchOnWindowFocus: true,
	});
}

// ============================================================================
// Expense Categories
// ============================================================================

export function useExpenseCategories() {
	return useQuery({
		queryKey: harvestKeys.expenseCategories(),
		queryFn: async () => {
			const { data } = await axios.get<HarvestExpenseCategoryResponse>(
				"/api/harvest/expense-categories",
			);
			return data;
		},
		staleTime: 10 * 60 * 1000, // 10 minutes - categories rarely change
		refetchOnWindowFocus: true,
	});
}

// ============================================================================
// Current User
// ============================================================================

export function useCurrentUser() {
	return useQuery({
		queryKey: harvestKeys.currentUser(),
		queryFn: async () => {
			const { data } = await axios.get<HarvestUser>("/api/harvest/users/me");
			return data;
		},
		staleTime: 30 * 60 * 1000, // 30 minutes - user info doesn't change often
		refetchOnWindowFocus: false, // User info rarely changes, no need to refetch
	});
}

// ============================================================================
// Managed Projects (for managers)
// ============================================================================

/**
 * Managed Projects Hook
 *
 * Fetches and caches project IDs where user is project manager.
 * Used by managers to filter time entries/expenses to their managed projects.
 */
export function useManagedProjects() {
	const { data: session } = useSession();

	const isManager = session?.user?.accessRoles?.includes("manager");
	const isAdmin = session?.user?.accessRoles?.includes("administrator");

	return useQuery({
		queryKey: harvestKeys.managedProjects(),
		queryFn: async () => {
			// Fetch raw project assignments data with is_project_manager flag
			const { data } = await axios.get<HarvestProjectAssignmentResponse>(
				"/api/harvest/user-project-assignments?raw=true",
			);

			// Filter to get only managed projects (client-side)
			return data.project_assignments
				.filter((pa) => pa.is_project_manager === true)
				.map((pa) => pa.project.id);
		},
		enabled: !!session && isManager && !isAdmin,
		staleTime: 10 * 60 * 1000, // 10 minutes - managed projects don't change often
		refetchOnWindowFocus: false,
	});
}

// ============================================================================
// Users (Admin Only)
// ============================================================================

export function useUsers(options?: { is_active?: boolean; enabled?: boolean }) {
	const { is_active, enabled } = options || {};
	return useQuery({
		queryKey: harvestKeys.users({ is_active }),
		queryFn: async () => {
			const { data } = await axios.get<HarvestUserResponse>(
				"/api/harvest/users",
				{
					params: { is_active },
				},
			);
			return data;
		},
		enabled,
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchOnWindowFocus: true,
	});
}

export function useCreateUser() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: CreateUserInput) => {
			const { data } = await axios.post<HarvestUser>(
				"/api/harvest/users",
				input,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: harvestKeys.users() });
		},
	});
}

export function useUpdateUser(userId: number) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: UpdateUserInput) => {
			const { data } = await axios.patch<HarvestUser>(
				`/api/harvest/users/${userId}`,
				input,
			);
			return data;
		},
		onMutate: async (updatedFields) => {
			// Cancel all user queries (not just one specific key)
			await queryClient.cancelQueries({
				queryKey: [...harvestKeys.all, "users"],
			});

			// Snapshot ALL user queries (returns array of [queryKey, data] tuples)
			const previousData = queryClient.getQueriesData({
				queryKey: [...harvestKeys.all, "users"],
			});

			// Optimistically update ALL user query caches
			queryClient.setQueriesData(
				{ queryKey: [...harvestKeys.all, "users"] },
				(old: HarvestUserResponse | undefined) => {
					if (!old) return old;
					return {
						...old,
						users: old.users.map((user) =>
							user.id === userId
								? {
										...user,
										...updatedFields,
										updated_at: new Date().toISOString(),
									}
								: user,
						),
					};
				},
			);

			return { previousData };
		},
		onError: (err, updatedFields, context: any) => {
			// Rollback all query caches
			if (context?.previousData) {
				context.previousData.forEach(([queryKey, data]: any) => {
					queryClient.setQueryData(queryKey, data);
				});
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: [...harvestKeys.all, "users"],
			});
		},
	});
}

export function useDeleteUser() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (userId: number) => {
			await axios.delete(`/api/harvest/users/${userId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: harvestKeys.users() });
		},
	});
}

// ============================================================================
// Clients (Admin/Manager)
// ============================================================================

export function useClients(params?: { is_active?: boolean }) {
	return useQuery({
		queryKey: harvestKeys.clients(params),
		queryFn: async () => {
			const { data } = await axios.get<HarvestClientResponse>(
				"/api/harvest/clients",
				{ params },
			);
			return data;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchOnWindowFocus: true,
	});
}

export function useClient(clientId: number) {
	return useQuery({
		queryKey: harvestKeys.client(clientId),
		queryFn: async () => {
			const { data } = await axios.get<HarvestClientType>(
				`/api/harvest/clients/${clientId}`,
			);
			return data;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchOnWindowFocus: true,
	});
}

export function useCreateClient() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: CreateClientInput) => {
			const { data } = await axios.post<HarvestClientType>(
				"/api/harvest/clients",
				input,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: harvestKeys.clients() });
		},
	});
}

export function useUpdateClient(clientId: number) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: UpdateClientInput) => {
			const { data } = await axios.patch<HarvestClientType>(
				`/api/harvest/clients/${clientId}`,
				input,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: harvestKeys.clients() });
			queryClient.invalidateQueries({ queryKey: harvestKeys.client(clientId) });
		},
	});
}

export function useDeleteClient() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (clientId: number) => {
			await axios.delete(`/api/harvest/clients/${clientId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: harvestKeys.clients() });
		},
	});
}

// ============================================================================
// Projects Write Operations (Admin/Manager)
// ============================================================================

export function useCreateProject() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: CreateProjectInput) => {
			const { data } = await axios.post<HarvestProject>(
				"/api/harvest/projects",
				input,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: harvestKeys.projects() });
			queryClient.invalidateQueries({
				queryKey: harvestKeys.userProjectAssignments(),
			});
		},
	});
}

export function useUpdateProject(projectId: number) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: UpdateProjectInput) => {
			const { data } = await axios.patch<HarvestProject>(
				`/api/harvest/projects/${projectId}`,
				input,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: harvestKeys.projects() });
			queryClient.invalidateQueries({
				queryKey: harvestKeys.userProjectAssignments(),
			});
		},
	});
}

export function useDeleteProject() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (projectId: number) => {
			await axios.delete(`/api/harvest/projects/${projectId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: harvestKeys.projects() });
			queryClient.invalidateQueries({
				queryKey: harvestKeys.userProjectAssignments(),
			});
		},
	});
}

// ============================================================================
// User Assignments (Admin/Manager)
// ============================================================================

export function useProjectUserAssignments(projectId: number) {
	return useQuery({
		queryKey: harvestKeys.userAssignments(projectId),
		queryFn: async () => {
			const { data } = await axios.get<HarvestUserAssignmentResponse>(
				`/api/harvest/projects/${projectId}/user-assignments`,
			);
			return data;
		},
		enabled: !!projectId,
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchOnWindowFocus: true,
	});
}

export function useCreateUserAssignment(projectId: number) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: CreateUserAssignmentInput) => {
			const { data } = await axios.post<HarvestUserAssignment>(
				`/api/harvest/projects/${projectId}/user-assignments`,
				input,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: harvestKeys.userAssignments(projectId),
			});
			queryClient.invalidateQueries({
				queryKey: harvestKeys.userProjectAssignments(),
			});
		},
	});
}

export function useUpdateUserAssignment(
	projectId: number,
	assignmentId: number,
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: UpdateUserAssignmentInput) => {
			const { data } = await axios.patch<HarvestUserAssignment>(
				`/api/harvest/projects/${projectId}/user-assignments/${assignmentId}`,
				input,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: harvestKeys.userAssignments(projectId),
			});
			queryClient.invalidateQueries({
				queryKey: harvestKeys.userProjectAssignments(),
			});
		},
	});
}

export function useDeleteUserAssignment(projectId: number) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (assignmentId: number) => {
			await axios.delete(
				`/api/harvest/projects/${projectId}/user-assignments/${assignmentId}`,
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: harvestKeys.userAssignments(projectId),
			});
			queryClient.invalidateQueries({
				queryKey: harvestKeys.userProjectAssignments(),
			});
		},
	});
}

// ============================================================================
// Locked Periods
// ============================================================================

/**
 * Locked Periods Hook
 *
 * Fetches locked week ranges (approved/locked timesheets and expenses).
 * Harvest locks entire weeks (Monday-Sunday), not individual dates.
 * Used to prevent users from selecting any date within locked weeks.
 */
export function useLockedPeriods() {
	const { data: session } = useSession();

	return useQuery({
		queryKey: harvestKeys.lockedPeriods(),
		queryFn: async () => {
			const { data } = await axios.get<{
				locked_weeks: Array<{ weekStart: string; weekEnd: string }>;
			}>("/api/harvest/locked-periods");
			return data.locked_weeks;
		},
		enabled: !!session,
		staleTime: 5 * 60 * 1000, // 5 minutes - locked periods don't change often
		refetchOnWindowFocus: true,
	});
}
