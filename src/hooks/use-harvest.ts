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
  expenses: (params?: Record<string, unknown>) =>
    [...harvestKeys.all, 'expenses', params] as const,
  expense: (id: number) => [...harvestKeys.all, 'expense', id] as const,
  projects: () => [...harvestKeys.all, 'projects'] as const,
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
  });
}

export function useCreateTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTimeEntryInput) => {
      const { data } = await axios.post<HarvestTimeEntry>('/api/harvest/time-entries', input);
      return data;
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
        input,
      );
      return data;
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
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateExpenseInput) => {
      const { data } = await axios.post<HarvestExpense>('/api/harvest/expenses', input);
      return data;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...harvestKeys.all, 'expenses'] });
    },
  });
}

// ============================================================================
// Projects & Tasks
// ============================================================================

export function useProjects() {
  return useQuery({
    queryKey: harvestKeys.projects(),
    queryFn: async () => {
      const { data } = await axios.get<HarvestProjectResponse>('/api/harvest/projects');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - projects don't change often
  });
}

export function useTaskAssignments(projectId: number | null) {
  return useQuery({
    queryKey: harvestKeys.tasks(projectId!),
    queryFn: async () => {
      const { data } = await axios.get<HarvestTaskAssignmentResponse>(
        `/api/harvest/projects/${projectId}/tasks`,
      );
      return data;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
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
        '/api/harvest/expense-categories',
      );
      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - categories rarely change
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
  });
}
