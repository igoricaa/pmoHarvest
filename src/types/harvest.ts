// Harvest API Type Definitions
// Based on Harvest API v2: https://help.getharvest.com/api-v2/

// ============================================================================
// User Types
// ============================================================================

export interface HarvestUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  telephone: string;
  timezone: string;
  has_access_to_all_future_projects: boolean;
  is_contractor: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  weekly_capacity: number;
  default_hourly_rate: number;
  cost_rate: number;
  roles: string[];
  avatar_url: string;
}

export interface HarvestUserResponse {
  users: HarvestUser[];
  per_page: number;
  total_pages: number;
  total_entries: number;
  next_page: number | null;
  previous_page: number | null;
  page: number;
  links: {
    first: string;
    next: string | null;
    previous: string | null;
    last: string;
  };
}

// ============================================================================
// Project Types
// ============================================================================

export interface HarvestClient {
  id: number;
  name: string;
  currency: string;
}

export interface HarvestProject {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
  is_billable: boolean;
  is_fixed_fee: boolean;
  bill_by: 'Project' | 'Tasks' | 'People' | 'None';
  budget: number | null;
  budget_by: 'project' | 'project_cost' | 'task' | 'task_fees' | 'person' | 'none';
  budget_is_monthly: boolean;
  notify_when_over_budget: boolean;
  over_budget_notification_percentage: number;
  show_budget_to_all: boolean;
  created_at: string;
  updated_at: string;
  starts_on: string | null;
  ends_on: string | null;
  client: HarvestClient;
  notes: string;
  cost_budget: number | null;
  cost_budget_include_expenses: boolean;
  hourly_rate: number | null;
  fee: number | null;
}

export interface HarvestProjectResponse {
  projects: HarvestProject[];
  per_page: number;
  total_pages: number;
  total_entries: number;
  next_page: number | null;
  previous_page: number | null;
  page: number;
  links: {
    first: string;
    next: string | null;
    previous: string | null;
    last: string;
  };
}

// ============================================================================
// Task Types
// ============================================================================

export interface HarvestTask {
  id: number;
  name: string;
  billable_by_default: boolean;
  default_hourly_rate: number | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HarvestTaskAssignment {
  id: number;
  is_active: boolean;
  billable: boolean;
  hourly_rate: number | null;
  budget: number | null;
  created_at: string;
  updated_at: string;
  task: HarvestTask;
  project: {
    id: number;
    name: string;
    code: string;
  };
}

export interface HarvestTaskAssignmentResponse {
  task_assignments: HarvestTaskAssignment[];
  per_page: number;
  total_pages: number;
  total_entries: number;
  next_page: number | null;
  previous_page: number | null;
  page: number;
  links: {
    first: string;
    next: string | null;
    previous: string | null;
    last: string;
  };
}

// ============================================================================
// Time Entry Types
// ============================================================================

export interface HarvestTimeEntry {
  id: number;
  spent_date: string; // YYYY-MM-DD format
  hours: number;
  hours_without_timer: number;
  rounded_hours: number;
  notes: string | null;
  is_locked: boolean;
  locked_reason: string | null;
  is_closed: boolean;
  is_billed: boolean;
  timer_started_at: string | null;
  started_time: string | null;
  ended_time: string | null;
  is_running: boolean;
  billable: boolean;
  budgeted: boolean;
  billable_rate: number | null;
  cost_rate: number | null;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    name: string;
  };
  user_assignment: {
    id: number;
    is_project_manager: boolean;
    is_active: boolean;
    budget: number | null;
    created_at: string;
    updated_at: string;
    hourly_rate: number | null;
  };
  client: {
    id: number;
    name: string;
    currency: string;
  };
  project: {
    id: number;
    name: string;
    code: string;
  };
  task: {
    id: number;
    name: string;
  };
  task_assignment: {
    id: number;
    billable: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    hourly_rate: number | null;
    budget: number | null;
  };
  external_reference: {
    id: string;
    group_id: string;
    account_id: string;
    permalink: string;
  } | null;
  invoice: {
    id: number;
    number: string;
  } | null;
}

export interface HarvestTimeEntryResponse {
  time_entries: HarvestTimeEntry[];
  per_page: number;
  total_pages: number;
  total_entries: number;
  next_page: number | null;
  previous_page: number | null;
  page: number;
  links: {
    first: string;
    next: string | null;
    previous: string | null;
    last: string;
  };
}

export interface CreateTimeEntryInput {
  project_id: number;
  task_id: number;
  spent_date: string; // YYYY-MM-DD
  hours?: number;
  notes?: string;
  started_time?: string; // HH:MM
  ended_time?: string; // HH:MM
  external_reference?: {
    id: string;
    group_id?: string;
    account_id?: string;
    permalink?: string;
  };
}

export interface UpdateTimeEntryInput extends Partial<CreateTimeEntryInput> {}

// ============================================================================
// Expense Types
// ============================================================================

export interface HarvestExpenseCategory {
  id: number;
  name: string;
  unit_name: string | null;
  unit_price: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HarvestExpenseCategoryResponse {
  expense_categories: HarvestExpenseCategory[];
  per_page: number;
  total_pages: number;
  total_entries: number;
  next_page: number | null;
  previous_page: number | null;
  page: number;
  links: {
    first: string;
    next: string | null;
    previous: string | null;
    last: string;
  };
}

export interface HarvestExpense {
  id: number;
  spent_date: string; // YYYY-MM-DD
  notes: string | null;
  total_cost: number;
  units: number | null;
  is_closed: boolean;
  is_locked: boolean;
  is_billed: boolean;
  locked_reason: string | null;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    name: string;
  };
  user_assignment: {
    id: number;
    is_project_manager: boolean;
    is_active: boolean;
    budget: number | null;
    created_at: string;
    updated_at: string;
    hourly_rate: number | null;
  };
  client: {
    id: number;
    name: string;
    currency: string;
  };
  project: {
    id: number;
    name: string;
    code: string;
  };
  expense_category: {
    id: number;
    name: string;
    unit_name: string | null;
    unit_price: number | null;
  };
  receipt: {
    url: string;
    file_name: string;
    file_size: number;
    content_type: string;
  } | null;
  invoice: {
    id: number;
    number: string;
  } | null;
  billable: boolean;
}

export interface HarvestExpenseResponse {
  expenses: HarvestExpense[];
  per_page: number;
  total_pages: number;
  total_entries: number;
  next_page: number | null;
  previous_page: number | null;
  page: number;
  links: {
    first: string;
    next: string | null;
    previous: string | null;
    last: string;
  };
}

export interface CreateExpenseInput {
  project_id: number;
  expense_category_id: number;
  spent_date: string; // YYYY-MM-DD
  units?: number;
  total_cost?: number;
  notes?: string;
  billable?: boolean;
  receipt?: File | string; // File object or base64 string
}

export interface UpdateExpenseInput extends Partial<CreateExpenseInput> {}

// ============================================================================
// Report Types (for Dashboard)
// ============================================================================

export interface TimeReportEntry {
  user_id: number;
  user_name: string;
  client_id: number;
  client_name: string;
  project_id: number;
  project_name: string;
  task_id: number;
  task_name: string;
  hours: number;
  rounded_hours: number;
  billable: boolean;
  currency: string;
  total_amount: number;
}

export interface TimeReportResponse {
  results: TimeReportEntry[];
  per_page: number;
  total_pages: number;
  total_entries: number;
  next_page: number | null;
  previous_page: number | null;
  page: number;
  links: {
    first: string;
    next: string | null;
    previous: string | null;
    last: string;
  };
}

// ============================================================================
// API Error Types
// ============================================================================

export interface HarvestAPIError {
  error: string;
  error_description: string;
}

export interface HarvestValidationError {
  message: string;
  errors: Array<{
    field: string;
    message: string;
  }>;
}

// ============================================================================
// Common Query Parameters
// ============================================================================

export interface PaginationParams {
  page?: number;
  per_page?: number;
}

export interface TimeEntryQueryParams extends PaginationParams {
  user_id?: number;
  client_id?: number;
  project_id?: number;
  task_id?: number;
  is_billed?: boolean;
  is_running?: boolean;
  updated_since?: string; // ISO 8601 format
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

export interface ExpenseQueryParams extends PaginationParams {
  user_id?: number;
  client_id?: number;
  project_id?: number;
  is_billed?: boolean;
  updated_since?: string; // ISO 8601 format
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

export interface ProjectQueryParams extends PaginationParams {
  is_active?: boolean;
  client_id?: number;
  updated_since?: string; // ISO 8601 format
}
