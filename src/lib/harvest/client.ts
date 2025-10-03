/**
 * Harvest API Client
 * Server-side client for interacting with the Harvest API v2
 */

import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type {
  HarvestTimeEntryResponse,
  HarvestTimeEntry,
  CreateTimeEntryInput,
  UpdateTimeEntryInput,
  TimeEntryQueryParams,
  HarvestExpenseResponse,
  HarvestExpense,
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseQueryParams,
  HarvestProjectResponse,
  HarvestProject,
  ProjectQueryParams,
  HarvestTaskAssignmentResponse,
  HarvestUserResponse,
  HarvestUser,
  HarvestExpenseCategoryResponse,
  TimeReportResponse,
} from '@/types/harvest';

const HARVEST_API_BASE_URL = 'https://api.harvestapp.com/v2';

export class HarvestAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: unknown,
  ) {
    super(message);
    this.name = 'HarvestAPIError';
  }
}

export class HarvestClient {
  private client: AxiosInstance;

  constructor(accountId: string, accessToken: string) {
    this.client = axios.create({
      baseURL: HARVEST_API_BASE_URL,
      headers: {
        'Harvest-Account-ID': accountId,
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'PMO Harvest Portal (contact@pmohive.com)',
        'Content-Type': 'application/json',
      },
    });

    // Add error interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<any>) => {
        if (error.response) {
          throw new HarvestAPIError(
            error.response.data?.error_description ||
              error.response.data?.message ||
              error.message,
            error.response.status,
            error.response.data,
          );
        }
        throw new HarvestAPIError(error.message, 500);
      },
    );
  }

  // ============================================================================
  // Current User
  // ============================================================================

  async getCurrentUser(): Promise<HarvestUser> {
    const response = await this.client.get<HarvestUser>('/users/me');
    return response.data;
  }

  // ============================================================================
  // Users
  // ============================================================================

  async getUsers(params?: { is_active?: boolean; page?: number }): Promise<HarvestUserResponse> {
    const response = await this.client.get<HarvestUserResponse>('/users', {
      params,
    });
    return response.data;
  }

  async getUser(userId: number): Promise<HarvestUser> {
    const response = await this.client.get<HarvestUser>(`/users/${userId}`);
    return response.data;
  }

  // ============================================================================
  // Projects
  // ============================================================================

  async getProjects(params?: ProjectQueryParams): Promise<HarvestProjectResponse> {
    const response = await this.client.get<HarvestProjectResponse>('/projects', {
      params,
    });
    return response.data;
  }

  async getProject(projectId: number): Promise<HarvestProject> {
    const response = await this.client.get<HarvestProject>(`/projects/${projectId}`);
    return response.data;
  }

  async getUserProjectAssignments(userId: number): Promise<HarvestProjectResponse> {
    const response = await this.client.get<HarvestProjectResponse>(
      `/users/${userId}/project_assignments`,
    );
    return response.data;
  }

  // ============================================================================
  // Task Assignments
  // ============================================================================

  async getTaskAssignments(
    projectId: number,
    params?: { is_active?: boolean },
  ): Promise<HarvestTaskAssignmentResponse> {
    const response = await this.client.get<HarvestTaskAssignmentResponse>(
      `/projects/${projectId}/task_assignments`,
      { params },
    );
    return response.data;
  }

  // ============================================================================
  // Time Entries
  // ============================================================================

  async getTimeEntries(params?: TimeEntryQueryParams): Promise<HarvestTimeEntryResponse> {
    const response = await this.client.get<HarvestTimeEntryResponse>('/time_entries', {
      params,
    });
    return response.data;
  }

  async getTimeEntry(timeEntryId: number): Promise<HarvestTimeEntry> {
    const response = await this.client.get<HarvestTimeEntry>(`/time_entries/${timeEntryId}`);
    return response.data;
  }

  async createTimeEntry(input: CreateTimeEntryInput): Promise<HarvestTimeEntry> {
    const response = await this.client.post<HarvestTimeEntry>('/time_entries', input);
    return response.data;
  }

  async updateTimeEntry(
    timeEntryId: number,
    input: UpdateTimeEntryInput,
  ): Promise<HarvestTimeEntry> {
    const response = await this.client.patch<HarvestTimeEntry>(
      `/time_entries/${timeEntryId}`,
      input,
    );
    return response.data;
  }

  async deleteTimeEntry(timeEntryId: number): Promise<void> {
    await this.client.delete(`/time_entries/${timeEntryId}`);
  }

  async restartTimeEntry(timeEntryId: number): Promise<HarvestTimeEntry> {
    const response = await this.client.patch<HarvestTimeEntry>(
      `/time_entries/${timeEntryId}/restart`,
    );
    return response.data;
  }

  async stopTimeEntry(timeEntryId: number): Promise<HarvestTimeEntry> {
    const response = await this.client.patch<HarvestTimeEntry>(`/time_entries/${timeEntryId}/stop`);
    return response.data;
  }

  // ============================================================================
  // Expenses
  // ============================================================================

  async getExpenses(params?: ExpenseQueryParams): Promise<HarvestExpenseResponse> {
    const response = await this.client.get<HarvestExpenseResponse>('/expenses', {
      params,
    });
    return response.data;
  }

  async getExpense(expenseId: number): Promise<HarvestExpense> {
    const response = await this.client.get<HarvestExpense>(`/expenses/${expenseId}`);
    return response.data;
  }

  async createExpense(input: CreateExpenseInput): Promise<HarvestExpense> {
    // Handle receipt upload if present
    let requestData: CreateExpenseInput | FormData = input;

    if (input.receipt && input.receipt instanceof File) {
      const formData = new FormData();
      formData.append('project_id', input.project_id.toString());
      formData.append('expense_category_id', input.expense_category_id.toString());
      formData.append('spent_date', input.spent_date);

      if (input.units !== undefined) formData.append('units', input.units.toString());
      if (input.total_cost !== undefined) formData.append('total_cost', input.total_cost.toString());
      if (input.notes) formData.append('notes', input.notes);
      if (input.billable !== undefined) formData.append('billable', input.billable.toString());

      formData.append('receipt', input.receipt);
      requestData = formData;
    }

    const response = await this.client.post<HarvestExpense>('/expenses', requestData, {
      headers:
        requestData instanceof FormData
          ? { 'Content-Type': 'multipart/form-data' }
          : { 'Content-Type': 'application/json' },
    });
    return response.data;
  }

  async updateExpense(expenseId: number, input: UpdateExpenseInput): Promise<HarvestExpense> {
    // Handle receipt upload if present
    let requestData: UpdateExpenseInput | FormData = input;

    if (input.receipt && input.receipt instanceof File) {
      const formData = new FormData();

      if (input.project_id !== undefined)
        formData.append('project_id', input.project_id.toString());
      if (input.expense_category_id !== undefined)
        formData.append('expense_category_id', input.expense_category_id.toString());
      if (input.spent_date) formData.append('spent_date', input.spent_date);
      if (input.units !== undefined) formData.append('units', input.units.toString());
      if (input.total_cost !== undefined) formData.append('total_cost', input.total_cost.toString());
      if (input.notes !== undefined) formData.append('notes', input.notes);
      if (input.billable !== undefined) formData.append('billable', input.billable.toString());

      formData.append('receipt', input.receipt);
      requestData = formData;
    }

    const response = await this.client.patch<HarvestExpense>(`/expenses/${expenseId}`, requestData, {
      headers:
        requestData instanceof FormData
          ? { 'Content-Type': 'multipart/form-data' }
          : { 'Content-Type': 'application/json' },
    });
    return response.data;
  }

  async deleteExpense(expenseId: number): Promise<void> {
    await this.client.delete(`/expenses/${expenseId}`);
  }

  // ============================================================================
  // Expense Categories
  // ============================================================================

  async getExpenseCategories(params?: {
    is_active?: boolean;
  }): Promise<HarvestExpenseCategoryResponse> {
    const response = await this.client.get<HarvestExpenseCategoryResponse>('/expense_categories', {
      params,
    });
    return response.data;
  }

  // ============================================================================
  // Reports
  // ============================================================================

  async getTimeReport(params?: {
    from?: string;
    to?: string;
    user_id?: number;
    client_id?: number;
    project_id?: number;
  }): Promise<TimeReportResponse> {
    const response = await this.client.get<TimeReportResponse>('/reports/time/clients', {
      params,
    });
    return response.data;
  }
}

// Factory function to create a Harvest client instance
export function createHarvestClient(): HarvestClient {
  const accountId = process.env.HARVEST_ACCOUNT_ID;
  const accessToken = process.env.HARVEST_ACCESS_TOKEN;

  if (!accountId || !accessToken) {
    throw new Error(
      'HARVEST_ACCOUNT_ID and HARVEST_ACCESS_TOKEN must be set in environment variables',
    );
  }

  return new HarvestClient(accountId, accessToken);
}
