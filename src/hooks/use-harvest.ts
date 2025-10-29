import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
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
} from '@/types/harvest';

// ============================================================================
// Query Keys
// ============================================================================

export const harvestKeys = {
  all: ['harvest'] as const,
  timeEntries: (params?: Record<string, unknown>) =>
    [...harvestKeys.all, 'time-entries', params] as const,
  timeEntry: (id: number) => [...harvestKeys.all, 'time-entry', id] as const,
  expenses: (params?: Record<string, unknown>) => [...harvestKeys.all, 'expenses', params] as const,
  expense: (id: number) => [...harvestKeys.all, 'expense', id] as const,
  projects: () => [...harvestKeys.all, 'projects'] as const,
  userProjectAssignments: () => [...harvestKeys.all, 'user-project-assignments'] as const,
  tasks: (projectId: number) => [...harvestKeys.all, 'tasks', projectId] as const,
  expenseCategories: () => [...harvestKeys.all, 'expense-categories'] as const,
  currentUser: () => [...harvestKeys.all, 'current-user'] as const,
};

// ============================================================================
// Time Entries
// ============================================================================

export function useTimeEntries(params?: { from?: string; to?: string; user_id?: number }) {
  return useQuery({
    queryKey: harvestKeys.timeEntries(params),
    queryFn: async () => {
      const { data } = await axios.get<HarvestTimeEntryResponse>('/api/harvest/time-entries', {
        params,
      });
      return data;
    },
    staleTime: 0, // Always consider stale
    refetchOnWindowFocus: true, // Refetch when tab gains focus
    refetchOnMount: 'always', // Always refetch on mount
  });
}

export function useTimeEntry(id: number) {
  return useQuery({
    queryKey: harvestKeys.timeEntry(id),
    queryFn: async () => {
      const { data } = await axios.get<HarvestTimeEntry>(`/api/harvest/time-entries/${id}`);
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
      const { data } = await axios.post<HarvestTimeEntry>('/api/harvest/time-entries', input);
      return data;
    },
    onMutate: async (newEntry) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [...harvestKeys.all, 'time-entries'] });

      // Snapshot current value
      const previousData = queryClient.getQueryData(harvestKeys.timeEntries());

      // Optimistically update cache
      queryClient.setQueryData(harvestKeys.timeEntries(), (old: HarvestTimeEntryResponse | undefined) => {
        if (!old) return old;

        // Create optimistic entry with all required fields
        const optimisticEntry: HarvestTimeEntry = {
          ...newEntry,
          id: Date.now(), // Temporary ID
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
          timer_started_at: null,
          started_time: null,
          ended_time: null,
          billable: true,
          budgeted: true,
          billable_rate: null,
          cost_rate: null,
          user: { id: 0, name: '' },
          client: { id: 0, name: '', currency: '' },
          project: { id: newEntry.project_id, name: '', code: '' },
          task: { id: newEntry.task_id, name: '' },
          user_assignment: {
            id: 0,
            is_project_manager: false,
            is_active: true,
            budget: null,
            created_at: '',
            updated_at: '',
            hourly_rate: null
          },
          task_assignment: {
            id: 0,
            billable: true,
            is_active: true,
            created_at: '',
            updated_at: '',
            hourly_rate: null,
            budget: null
          },
          invoice: null,
          external_reference: null,
        };

        return {
          ...old,
          time_entries: [optimisticEntry, ...(old.time_entries || [])],
        };
      });

      return { previousData };
    },
    onError: (err, newEntry, context: any) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(harvestKeys.timeEntries(), context.previousData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...harvestKeys.all, 'time-entries'] });
    },
  });
}

export function useUpdateTimeEntry(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTimeEntryInput) => {
      const { data } = await axios.patch<HarvestTimeEntry>(
        `/api/harvest/time-entries/${id}`,
        input
      );
      return data;
    },
    onMutate: async (updatedFields) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [...harvestKeys.all, 'time-entries'] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(harvestKeys.timeEntries());

      // Optimistically update list
      queryClient.setQueryData(harvestKeys.timeEntries(), (old: HarvestTimeEntryResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          time_entries: old.time_entries.map((entry) =>
            entry.id === id
              ? { ...entry, ...updatedFields, updated_at: new Date().toISOString() }
              : entry
          ),
        };
      });

      // Optimistically update single entry if cached
      queryClient.setQueryData(harvestKeys.timeEntry(id), (old: HarvestTimeEntry | undefined) => {
        if (!old) return old;
        return { ...old, ...updatedFields, updated_at: new Date().toISOString() };
      });

      return { previousData };
    },
    onError: (err, updatedFields, context: any) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(harvestKeys.timeEntries(), context.previousData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...harvestKeys.all, 'time-entries'] });
      queryClient.invalidateQueries({ queryKey: harvestKeys.timeEntry(id) });
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
      await queryClient.cancelQueries({ queryKey: [...harvestKeys.all, 'time-entries'] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(harvestKeys.timeEntries());

      // Optimistically remove from cache
      queryClient.setQueryData(harvestKeys.timeEntries(), (old: HarvestTimeEntryResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          time_entries: old.time_entries.filter((entry) => entry.id !== id),
        };
      });

      return { previousData };
    },
    onError: (err, id, context: any) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(harvestKeys.timeEntries(), context.previousData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...harvestKeys.all, 'time-entries'] });
    },
  });
}

// ============================================================================
// Expenses
// ============================================================================

export function useExpenses(params?: { from?: string; to?: string; user_id?: number }) {
  return useQuery({
    queryKey: harvestKeys.expenses(params),
    queryFn: async () => {
      const { data } = await axios.get<HarvestExpenseResponse>('/api/harvest/expenses', {
        params,
      });
      return data;
    },
    staleTime: 0, // Always consider stale
    refetchOnWindowFocus: true, // Refetch when tab gains focus
    refetchOnMount: 'always', // Always refetch on mount
  });
}

export function useExpense(id: number) {
  return useQuery({
    queryKey: harvestKeys.expense(id),
    queryFn: async () => {
      const { data } = await axios.get<HarvestExpense>(`/api/harvest/expenses/${id}`);
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
        formData.append('project_id', input.project_id.toString());
        formData.append('expense_category_id', input.expense_category_id.toString());
        formData.append('spent_date', input.spent_date);
        if (input.total_cost !== undefined) formData.append('total_cost', input.total_cost.toString());
        if (input.notes) formData.append('notes', input.notes);
        if (input.billable !== undefined) formData.append('billable', input.billable.toString());
        formData.append('receipt', input.receipt);

        const { data } = await axios.post<HarvestExpense>('/api/harvest/expenses', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return data;
      } else {
        // Send as JSON if no receipt
        const { data } = await axios.post<HarvestExpense>('/api/harvest/expenses', input);
        return data;
      }
    },
    onMutate: async (newExpense) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [...harvestKeys.all, 'expenses'] });

      // Snapshot current value
      const previousData = queryClient.getQueryData(harvestKeys.expenses());

      // Optimistically update cache
      queryClient.setQueryData(harvestKeys.expenses(), (old: HarvestExpenseResponse | undefined) => {
        if (!old) return old;

        // Create optimistic entry with all required fields
        const optimisticExpense: HarvestExpense = {
          ...newExpense,
          id: Date.now(), // Temporary ID
          spent_date: newExpense.spent_date,
          total_cost: newExpense.total_cost || 0,
          units: newExpense.units || null,
          notes: newExpense.notes || null,
          billable: newExpense.billable !== undefined ? newExpense.billable : true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_locked: false,
          is_billed: false,
          is_closed: false,
          locked_reason: null,
          receipt: null,
          user: { id: 0, name: '' },
          client: { id: 0, name: '', currency: '' },
          project: { id: newExpense.project_id, name: '', code: '' },
          expense_category: {
            id: newExpense.expense_category_id,
            name: '',
            unit_name: null,
            unit_price: null
          },
          user_assignment: {
            id: 0,
            is_project_manager: false,
            is_active: true,
            budget: null,
            created_at: '',
            updated_at: '',
            hourly_rate: null
          },
          invoice: null,
        };

        return {
          ...old,
          expenses: [optimisticExpense, ...(old.expenses || [])],
        };
      });

      return { previousData };
    },
    onError: (err, newExpense, context: any) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(harvestKeys.expenses(), context.previousData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...harvestKeys.all, 'expenses'] });
    },
  });
}

export function useUpdateExpense(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateExpenseInput) => {
      const { data } = await axios.patch<HarvestExpense>(`/api/harvest/expenses/${id}`, input);
      return data;
    },
    onMutate: async (updatedFields) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [...harvestKeys.all, 'expenses'] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(harvestKeys.expenses());

      // Optimistically update list
      queryClient.setQueryData(harvestKeys.expenses(), (old: HarvestExpenseResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          expenses: old.expenses.map((expense) =>
            expense.id === id
              ? { ...expense, ...updatedFields, updated_at: new Date().toISOString() }
              : expense
          ),
        };
      });

      // Optimistically update single expense if cached
      queryClient.setQueryData(harvestKeys.expense(id), (old: HarvestExpense | undefined) => {
        if (!old) return old;
        return { ...old, ...updatedFields, updated_at: new Date().toISOString() };
      });

      return { previousData };
    },
    onError: (err, updatedFields, context: any) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(harvestKeys.expenses(), context.previousData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...harvestKeys.all, 'expenses'] });
      queryClient.invalidateQueries({ queryKey: harvestKeys.expense(id) });
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
      await queryClient.cancelQueries({ queryKey: [...harvestKeys.all, 'expenses'] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(harvestKeys.expenses());

      // Optimistically remove from cache
      queryClient.setQueryData(harvestKeys.expenses(), (old: HarvestExpenseResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          expenses: old.expenses.filter((expense) => expense.id !== id),
        };
      });

      return { previousData };
    },
    onError: (err, id, context: any) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(harvestKeys.expenses(), context.previousData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...harvestKeys.all, 'expenses'] });
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
      const { data } = await axios.get<HarvestProjectResponse>('/api/harvest/projects');
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
        '/api/harvest/user-project-assignments'
      );
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - projects don't change often
    refetchOnWindowFocus: true, // Refetch when tab gains focus
    enabled: options?.enabled,
  });
}

export function useTaskAssignments(
  projectId: number | null,
  options?: { isAdminOrManager?: boolean }
) {
  const isAdminOrManager = options?.isAdminOrManager ?? true; // Default to admin endpoint for backwards compatibility

  return useQuery({
    queryKey: harvestKeys.tasks(projectId!),
    queryFn: async () => {
      if (isAdminOrManager) {
        // Admin/Manager: Use project task assignments endpoint
        const { data } = await axios.get<HarvestTaskAssignmentResponse>(
          `/api/harvest/projects/${projectId}/tasks`
        );
        return data;
      } else {
        // Member: Use user task assignments endpoint
        const { data } = await axios.get<HarvestTaskAssignmentResponse>(
          `/api/harvest/user-task-assignments?projectId=${projectId}`
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
        '/api/harvest/expense-categories'
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
      const { data } = await axios.get<HarvestUser>('/api/harvest/users/me');
      return data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - user info doesn't change often
    refetchOnWindowFocus: false, // User info rarely changes, no need to refetch
  });
}
