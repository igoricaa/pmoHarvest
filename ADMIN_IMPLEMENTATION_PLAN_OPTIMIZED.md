# Admin/Manager Views - OPTIMIZED Implementation Plan

**Project:** PMO Harvest Portal
**Last Updated:** 2025-10-30
**Status:** ✅ Phase 4 Complete - Testing Next
**Current Phase:** Phase 5 - Testing
**Approach:** Performance-First, Maximum Code Reuse, Zero Breaking Changes

> **KEY OPTIMIZATION**: Reduced from ~8000 lines to ~4600 lines (**42% reduction**) through aggressive code reuse and architectural simplification.

---

## 🎯 Core Optimization Principles

### 1. **Extend, Don't Duplicate**
- ✅ Reuse existing API routes with query params instead of creating new ones
- ✅ Extend existing React Query hooks with options instead of creating new hooks
- ✅ Share components between member and admin views (just pass different data)
- ❌ Don't create separate admin API routes for read operations
- ❌ Don't duplicate table/form components

### 2. **Client-Side Filtering for Managers (Fast & Simple)**
- ✅ Fetch all data in one API call (Harvest allows per_page=2000)
- ✅ Filter by managed projects on client side (< 5ms for 2000 items)
- ✅ Cache managed project IDs (10min staleTime)
- ❌ Don't make multiple API calls per project (slow + rate limits)

### 3. **Aggressive Caching**
- Metadata (projects, categories, users): 5-10min staleTime
- Admin data (time/expenses): 30s staleTime
- Member data: 0 staleTime (always fresh)
- Shared cache between member/admin views

### 4. **Zero Breaking Changes**
- All existing routes unchanged
- Member functionality 100% backward compatible
- Only additive changes (new routes, optional parameters)

---

## 📦 Simplified Architecture

### Key Insight: The Harvest API Already Does Most of the Work

**Harvest API Behavior:**
- Admin tokens → Returns ALL data
- Manager tokens → Returns data for managed projects + assigned teammates
- Member tokens → Returns only own data

**Our Strategy:**
- For **read operations**: Use existing routes, Harvest API handles filtering
- For **managers**: Add client-side filter for managed projects only
- For **write operations**: Add new routes with permission checks

---

## 🔧 Implementation Breakdown

### Phase 1: Backend - Minimal API Changes (1-2 days)

#### A. Type Definitions (`src/types/harvest.ts`) - Extend existing file

**Add ~200 lines:**
```ts
// Users
export interface CreateUserInput {
  first_name: string;
  last_name: string;
  email: string;
  roles?: string[];
  is_contractor?: boolean;
  weekly_capacity?: number;
  default_hourly_rate?: number;
  cost_rate?: number;
}
export type UpdateUserInput = Partial<CreateUserInput>;

// Clients
export interface HarvestClientData {
  id: number;
  name: string;
  is_active: boolean;
  currency: string;
  address?: string;
}
export interface CreateClientInput {
  name: string;
  currency?: string;
  is_active?: boolean;
  address?: string;
}
export type UpdateClientInput = Partial<CreateClientInput>;

// Projects
export interface CreateProjectInput {
  client_id: number;
  name: string;
  code: string;
  is_billable?: boolean;
  bill_by?: 'Project' | 'Tasks' | 'People' | 'None';
  budget_by?: 'project' | 'project_cost' | 'task' | 'task_fees' | 'person' | 'none';
  budget?: number;
}
export type UpdateProjectInput = Partial<CreateProjectInput>;

// User Assignments
export interface HarvestUserAssignment {
  id: number;
  user: { id: number; name: string };
  project: { id: number; name: string; code: string };
  is_active: boolean;
  is_project_manager: boolean;
  hourly_rate: number | null;
  budget: number | null;
  created_at: string;
  updated_at: string;
}
export interface HarvestUserAssignmentResponse {
  user_assignments: HarvestUserAssignment[];
  per_page: number;
  total_pages: number;
  total_entries: number;
  // ... pagination fields
}
export interface CreateUserAssignmentInput {
  user_id: number;
  is_active?: boolean;
  is_project_manager?: boolean;
  use_default_rates?: boolean;
  hourly_rate?: number;
  budget?: number;
}
export type UpdateUserAssignmentInput = Partial<Omit<CreateUserAssignmentInput, 'user_id'>>;

// Approval status
export type ApprovalStatus = 'unsubmitted' | 'submitted' | 'approved';
```

---

#### B. Harvest Client (`src/lib/harvest/client.ts`) - Add methods

**Add ~300 lines (15 methods, each ~20 lines):**

```ts
// Users (admin only)
async createUser(input: CreateUserInput): Promise<HarvestUser> {
  const response = await this.client.post<HarvestUser>('/users', input);
  return response.data;
}

async updateUser(userId: number, input: UpdateUserInput): Promise<HarvestUser> {
  const response = await this.client.patch<HarvestUser>(`/users/${userId}`, input);
  return response.data;
}

async deleteUser(userId: number): Promise<void> {
  await this.client.delete(`/users/${userId}`);
}

// Clients (admin/manager)
async getClients(params?: { is_active?: boolean }): Promise<HarvestClientResponse> {
  const response = await this.client.get<HarvestClientResponse>('/clients', { params });
  return response.data;
}

async createClient(input: CreateClientInput): Promise<HarvestClient> {
  const response = await this.client.post<HarvestClient>('/clients', input);
  return response.data;
}

async updateClient(clientId: number, input: UpdateClientInput): Promise<HarvestClient> {
  const response = await this.client.patch<HarvestClient>(`/clients/${clientId}`, input);
  return response.data;
}

async deleteClient(clientId: number): Promise<void> {
  await this.client.delete(`/clients/${clientId}`);
}

// Projects (admin/manager)
async createProject(input: CreateProjectInput): Promise<HarvestProject> {
  const response = await this.client.post<HarvestProject>('/projects', input);
  return response.data;
}

async updateProject(projectId: number, input: UpdateProjectInput): Promise<HarvestProject> {
  const response = await this.client.patch<HarvestProject>(`/projects/${projectId}`, input);
  return response.data;
}

async deleteProject(projectId: number): Promise<void> {
  await this.client.delete(`/projects/${projectId}`);
}

// User Assignments (admin/manager)
async getProjectUserAssignments(projectId: number): Promise<HarvestUserAssignmentResponse> {
  const response = await this.client.get<HarvestUserAssignmentResponse>(
    `/projects/${projectId}/user_assignments`
  );
  return response.data;
}

async createUserAssignment(
  projectId: number,
  input: CreateUserAssignmentInput
): Promise<HarvestUserAssignment> {
  const response = await this.client.post<HarvestUserAssignment>(
    `/projects/${projectId}/user_assignments`,
    input
  );
  return response.data;
}

async updateUserAssignment(
  projectId: number,
  assignmentId: number,
  input: UpdateUserAssignmentInput
): Promise<HarvestUserAssignment> {
  const response = await this.client.patch<HarvestUserAssignment>(
    `/projects/${projectId}/user_assignments/${assignmentId}`,
    input
  );
  return response.data;
}

async deleteUserAssignment(projectId: number, assignmentId: number): Promise<void> {
  await this.client.delete(`/projects/${projectId}/user_assignments/${assignmentId}`);
}
```

---

#### C. Admin Utilities (`src/lib/admin-utils.ts`) - NEW file

**Add ~100 lines:**

```ts
import type { Session } from '@/lib/auth-client';
import { createHarvestClient } from './harvest';

/**
 * Check if user is administrator
 */
export function isAdmin(session: Session | null): boolean {
  return session?.user?.accessRoles?.includes('administrator') ?? false;
}

/**
 * Check if user is manager
 */
export function isManager(session: Session | null): boolean {
  return session?.user?.accessRoles?.includes('manager') ?? false;
}

/**
 * Check if user is administrator or manager
 */
export function isAdminOrManager(session: Session | null): boolean {
  return isAdmin(session) || isManager(session);
}

/**
 * Get IDs of projects that the manager is assigned to as project manager
 */
export async function getManagedProjectIds(accessToken: string): Promise<number[]> {
  const client = createHarvestClient(accessToken);
  const assignments = await client.getCurrentUserProjectAssignments();

  return assignments.project_assignments
    .filter(pa => pa.is_project_manager === true)
    .map(pa => pa.project.id);
}

/**
 * Filter items by project IDs (for manager filtering)
 */
export function filterByProjectIds<T extends { project: { id: number } }>(
  items: T[],
  projectIds: number[]
): T[] {
  return items.filter(item => projectIds.includes(item.project.id));
}

/**
 * Check if manager can manage a specific project
 */
export async function canManageProject(
  accessToken: string,
  projectId: number
): Promise<boolean> {
  const managedProjectIds = await getManagedProjectIds(accessToken);
  return managedProjectIds.includes(projectId);
}
```

---

#### D. New API Routes - Only 8 files (vs. 20 in original plan)

**Create these routes (~600 lines total):**

1. `src/app/api/harvest/users/route.ts` (GET, POST)
2. `src/app/api/harvest/users/[id]/route.ts` (PATCH, DELETE)
3. `src/app/api/harvest/clients/route.ts` (GET, POST)
4. `src/app/api/harvest/clients/[id]/route.ts` (PATCH, DELETE)
5. `src/app/api/harvest/projects/route.ts` - ADD POST method to existing file
6. `src/app/api/harvest/projects/[id]/route.ts` (NEW - PATCH, DELETE)
7. `src/app/api/harvest/projects/[id]/user-assignments/route.ts` (GET, POST)
8. `src/app/api/harvest/projects/[id]/user-assignments/[assignmentId]/route.ts` (PATCH, DELETE)

**Template for all routes:**
```ts
// Standard pattern (all routes follow this)
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createHarvestClient } from '@/lib/harvest';
import { getErrorMessage } from '@/lib/api-utils';
import { isAdmin, isAdminOrManager } from '@/lib/admin-utils';

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Role check (adjust per route)
    if (!isAdminOrManager(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Get access token
    const { accessToken } = await auth.api.getAccessToken({
      body: { providerId: 'harvest' },
      headers: request.headers,
    });

    if (!accessToken) {
      return NextResponse.json({ error: 'No Harvest access token' }, { status: 401 });
    }

    // 4. Parse body
    const body = await request.json();

    // 5. Call Harvest API
    const client = createHarvestClient(accessToken);
    const result = await client.createResource(body);

    // 6. Return response
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to create resource') },
      { status: 500 }
    );
  }
}
```

**Why minimal?**
- Existing `/api/harvest/time-entries` already works for admin (Harvest API filters by token)
- Existing `/api/harvest/expenses` already works for admin
- Only need to add manager client-side filtering in React Query hooks
- Only need new routes for write operations (create/update/delete)

---

### Phase 2: React Query Hooks (1 day)

#### A. Extend Existing Hooks (`src/hooks/use-harvest.ts`) - Modify existing file

**Add ~200 lines to existing hooks:**

```ts
// Extend existing useTimeEntries hook with filterByRole option
export function useTimeEntries(params?: {
  from?: string;
  to?: string;
  user_id?: number;
  filterByRole?: boolean; // NEW parameter
}) {
  const { data: session } = useSession();
  const { data: managedProjectIds } = useManagedProjects(); // NEW

  return useQuery({
    queryKey: harvestKeys.timeEntries(params),
    queryFn: async () => {
      const { data } = await axios.get<HarvestTimeEntryResponse>('/api/harvest/time-entries', {
        params: { from: params?.from, to: params?.to, user_id: params?.user_id },
      });

      // NEW: Apply manager filtering if requested
      if (params?.filterByRole && session && managedProjectIds) {
        const isManager = session.user.accessRoles.includes('manager');
        const isAdmin = session.user.accessRoles.includes('administrator');

        if (isManager && !isAdmin) {
          return {
            ...data,
            time_entries: filterByProjectIds(data.time_entries, managedProjectIds),
            total_entries: data.time_entries.filter(e =>
              managedProjectIds.includes(e.project.id)
            ).length,
          };
        }
      }

      return data;
    },
    staleTime: params?.filterByRole ? 30_000 : 0, // 30s for admin, fresh for member
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });
}

// SAME pattern for useExpenses
export function useExpenses(params?: {
  from?: string;
  to?: string;
  user_id?: number;
  filterByRole?: boolean; // NEW
}) {
  // ... same logic as useTimeEntries
}

// NEW: Managed projects cache for managers
export function useManagedProjects() {
  const { data: session } = useSession();
  const isManager = session?.user?.accessRoles?.includes('manager');
  const isAdmin = session?.user?.accessRoles?.includes('administrator');

  return useQuery({
    queryKey: harvestKeys.managedProjects(),
    queryFn: async () => {
      const { accessToken } = await auth.api.getAccessToken({
        body: { providerId: 'harvest' },
      });
      const projectIds = await getManagedProjectIds(accessToken);
      return projectIds;
    },
    enabled: !!session && isManager && !isAdmin,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
```

#### B. Add New Hooks for Admin Operations (~200 lines)

```ts
// Query keys
export const harvestKeys = {
  // ... existing keys
  managedProjects: () => [...harvestKeys.all, 'managed-projects'] as const,
  clients: () => [...harvestKeys.all, 'clients'] as const,
  client: (id: number) => [...harvestKeys.all, 'client', id] as const,
  userAssignments: (projectId: number) =>
    [...harvestKeys.all, 'user-assignments', projectId] as const,
};

// Users
export function useUsers(params?: { is_active?: boolean }) {
  return useQuery({
    queryKey: [...harvestKeys.all, 'users', params],
    queryFn: async () => {
      const { data } = await axios.get<HarvestUserResponse>('/api/harvest/users', { params });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const { data } = await axios.post<HarvestUser>('/api/harvest/users', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...harvestKeys.all, 'users'] });
      toast.success('User created successfully');
    },
  });
}

// ... similar hooks for update, delete

// Clients
export function useClients(params?: { is_active?: boolean }) {
  return useQuery({
    queryKey: harvestKeys.clients(),
    queryFn: async () => {
      const { data } = await axios.get<HarvestClientResponse>('/api/harvest/clients', { params });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateClient() { /* ... */ }

// Projects (only add write operations, read uses existing)
export function useCreateProject() { /* ... */ }
export function useUpdateProject(id: number) { /* ... */ }
export function useDeleteProject() { /* ... */ }

// User Assignments
export function useUserAssignments(projectId: number | null) {
  return useQuery({
    queryKey: harvestKeys.userAssignments(projectId!),
    queryFn: async () => {
      const { data } = await axios.get<HarvestUserAssignmentResponse>(
        `/api/harvest/projects/${projectId}/user-assignments`
      );
      return data;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateUserAssignment(projectId: number) { /* ... */ }
export function useUpdateUserAssignment(projectId: number, assignmentId: number) { /* ... */ }
export function useDeleteUserAssignment(projectId: number) { /* ... */ }
```

**Total hooks added: ~10 new hooks + 2 extended hooks = ~400 lines**

---

### Phase 3: Components - Maximum Reuse (2-3 days)

#### A. Generic DataTable (`src/components/admin/data-table.tsx`) - NEW

**One component replaces 6 specific table components (~100 lines):**

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessor: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends { id: number }>({
  data,
  columns,
  isLoading,
  emptyMessage = 'No data found',
  onRowClick,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col, i) => (
              <TableHead key={i} className={col.className}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(item => (
            <TableRow
              key={item.id}
              className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col, i) => (
                <TableCell key={i} className={col.className}>
                  {col.accessor(item)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

#### B. Generic FiltersBar (`src/components/admin/filters-bar.tsx`) - NEW

**One component replaces 4 filter components (~150 lines):**

```tsx
'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

export interface FilterConfig {
  type: 'select' | 'date-range' | 'search';
  label: string;
  value: any;
  onChange: (value: any) => void;
  options?: { value: string; label: string }[]; // for select
  placeholder?: string;
}

interface FiltersBarProps {
  filters: FilterConfig[];
  onReset?: () => void;
}

export function FiltersBar({ filters, onReset }: FiltersBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/50 rounded-lg">
      {filters.map((filter, i) => (
        <div key={i} className="flex flex-col gap-2">
          <label className="text-sm font-medium">{filter.label}</label>
          {filter.type === 'select' && (
            <Select value={filter.value} onValueChange={filter.onChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={filter.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {filter.options?.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {/* ... date-range and search implementations */}
        </div>
      ))}
      {onReset && (
        <Button variant="outline" onClick={onReset}>
          Reset Filters
        </Button>
      )}
    </div>
  );
}
```

#### C. New Form Modals (~800 lines total for 4 forms)

**Follow existing TimeEntryForm pattern:**

1. `src/components/admin/forms/project-form-modal.tsx` (~200 lines)
2. `src/components/admin/forms/client-form-modal.tsx` (~150 lines)
3. `src/components/admin/forms/user-form-modal.tsx` (~250 lines) - admin only
4. `src/components/admin/forms/user-assignment-form-modal.tsx` (~200 lines)

Each follows this pattern:
- React Hook Form + Zod validation
- Dialog wrapper with open/onOpenChange props
- Form fields using shadcn/ui components
- Submit button with loading state
- Success/error toasts

**Reuse existing forms:**
- TimeEntryForm (already exists, no changes)
- ExpenseForm (already exists, no changes)

---

### Phase 4: Admin Pages - Copy Member Pages Structure (2 days)

**Key Strategy: Copy existing member pages, modify data source + add columns**

#### Example: Admin Time Entries Page

```tsx
// src/app/dashboard/admin/time/page.tsx
// COPY from src/app/dashboard/time/page.tsx, then modify:

'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { useSession } from '@/lib/auth-client';
import { isAdminOrManager } from '@/lib/admin-utils';
import { useTimeEntries, useDeleteTimeEntry } from '@/hooks/use-harvest';
import { DataTable, type Column } from '@/components/admin/data-table';
import { FiltersBar } from '@/components/admin/filters-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, CheckCircle } from 'lucide-react';

export default function AdminTimePage() {
  const { data: session } = useSession();
  const [filters, setFilters] = useState({
    from: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
    userId: '',
    projectId: '',
  });

  // Role guard
  if (!session || !isAdminOrManager(session)) {
    return <div>Access denied</div>;
  }

  // ONLY DIFFERENCE: filterByRole: true
  const { data, isLoading } = useTimeEntries({
    ...filters,
    filterByRole: true, // NEW
  });

  const deleteMutation = useDeleteTimeEntry();

  // Table columns (extends member view with User and Status columns)
  const columns: Column<HarvestTimeEntry>[] = [
    { header: 'Date', accessor: (e) => format(new Date(e.spent_date), 'PP') },
    { header: 'User', accessor: (e) => e.user.name }, // NEW column
    { header: 'Project', accessor: (e) => e.project.name, className: 'font-medium' },
    { header: 'Task', accessor: (e) => e.task.name },
    { header: 'Hours', accessor: (e) => <Badge variant="secondary">{e.hours}h</Badge> },
    { header: 'Status', accessor: (e) => <ApprovalBadge status={e.approval_status} /> }, // NEW
    { header: 'Notes', accessor: (e) => e.notes || '—', className: 'max-w-xs truncate' },
    {
      header: 'Actions',
      accessor: (e) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleApprove(e.id)}>
            <CheckCircle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header - SAME as member page */}
      <div>
        <h1 className="text-3xl font-bold">Time Entries Management</h1>
        <p className="text-muted-foreground">View and manage team time entries</p>
      </div>

      {/* NEW: Filters */}
      <FiltersBar filters={filterConfigs} />

      {/* Card - SAME structure as member page */}
      <Card>
        <CardHeader>
          <CardTitle>Time Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable data={data?.time_entries || []} columns={columns} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
```

**All 7 admin pages follow this pattern:**
- Copy member page structure
- Add `filterByRole: true` to hooks
- Add User/Status columns
- Add admin actions (approve, edit, delete)
- Add FiltersBar component

**Total: ~2100 lines for 7 pages (vs. ~3500 in original plan)**

---

## 📊 Implementation Summary

### Code Breakdown

| Component | Lines | Files |
|-----------|-------|-------|
| **Backend** | ~1400 | 12 |
| - Type definitions | 200 | 1 (extend) |
| - Harvest client methods | 300 | 1 (extend) |
| - Admin utilities | 100 | 1 (new) |
| - API routes | 600 | 8 (new) |
| - React Query hooks | 200 | 1 (extend) |
| **Frontend** | ~3180 | 18 |
| - Generic DataTable | 100 | 1 (new) |
| - Generic FiltersBar | 150 | 1 (new) |
| - Form modals | 800 | 4 (new) |
| - Admin pages | 2100 | 7 (new) |
| - Sidebar nav | 30 | 1 (extend) |
| **TOTAL** | **~4580** | **30** |

### Comparison to Original Plan

| Metric | Original Plan | Optimized Plan | Savings |
|--------|--------------|----------------|---------|
| Total Lines of Code | ~8000 | ~4600 | **43%** |
| API Route Files | 20 | 8 | **60%** |
| Table Components | 6 | 1 | **83%** |
| Filter Components | 4 | 1 | **75%** |
| React Query Hooks | 20 new | 10 new + 2 extended | **50%** |
| Form Components | 7 | 4 (reuse 3) | **43%** |
| Implementation Days | 9-13 | 4-6 | **55%** |

---

## ✅ Implementation Checklist

### ✅ Phase 1: Backend (COMPLETE)

#### ✅ Types & Utils
- [x] Add type definitions to `src/types/harvest.ts` (~200 lines + 35 lines for `HarvestProjectAssignment` types)
- [x] Create `src/lib/admin-utils.ts` with role checks and filtering (~100 lines + `useIsAdminOrManager()` hook)
- [x] Fix TypeScript error: Added `HarvestProjectAssignmentResponse` type
- [x] Code deduplication: Replaced inline role checks in `expense-form.tsx` and `time-entry-form.tsx` with hook

#### ✅ Harvest Client
- [x] Add users CRUD methods to `HarvestClient` (~60 lines)
- [x] Add clients CRUD methods (~80 lines)
- [x] Add projects CRUD methods (~60 lines)
- [x] Add user assignments CRUD methods (~100 lines)
- [x] Fix `getCurrentUserProjectAssignments()` return type

#### ✅ API Routes (8 files)
- [x] Create `src/app/api/harvest/users/route.ts` (GET, POST - admin only)
- [x] Create `src/app/api/harvest/users/[id]/route.ts` (PATCH, DELETE - admin only)
- [x] Create `src/app/api/harvest/clients/route.ts` (GET, POST - admin/manager)
- [x] Create `src/app/api/harvest/clients/[id]/route.ts` (GET, PATCH, DELETE - admin/manager) - **Added GET handler post-implementation**
- [x] Add POST to `src/app/api/harvest/projects/route.ts` (admin/manager)
- [x] Create `src/app/api/harvest/projects/[id]/route.ts` (PATCH, DELETE - admin/manager) - **Removed canManageProject() checks**
- [x] Create `src/app/api/harvest/projects/[id]/user-assignments/route.ts` (GET, POST - admin/manager) - **Removed canManageProject() checks**
- [x] Create `src/app/api/harvest/projects/[id]/user-assignments/[assignmentId]/route.ts` (PATCH, DELETE - admin/manager) - **Removed canManageProject() checks**

#### ⚡ Post-Implementation Optimizations (COMPLETE)

After Phase 1 & 2 implementation, we identified and fixed 3 critical issues:

**Fix 1: useManagedProjects() Missing enabled Condition** ✅
- **Problem**: Hook ran for all users (including members), causing unnecessary API calls
- **Solution**: Added `enabled: !!session && isManager && !isAdmin` condition
- **Impact**: Eliminates wasted network traffic and potential console errors for non-managers

**Fix 2: Removed Redundant Permission Checks** ✅
- **Problem**: `canManageProject()` caused N+1 queries (2 API calls per manager request)
- **Solution**: Deleted permission checks from 3 API routes, trust Harvest API's OAuth-based permissions
- **Files modified**:
  - `src/app/api/harvest/projects/[id]/route.ts` (PATCH, DELETE)
  - `src/app/api/harvest/projects/[id]/user-assignments/route.ts` (GET, POST)
  - `src/app/api/harvest/projects/[id]/user-assignments/[assignmentId]/route.ts` (PATCH, DELETE)
- **Impact**: 50% faster for managers (1 API call instead of 2), ~40 lines of code removed

**Fix 3: Added GET Single Client Endpoint** ✅
- **Problem**: No efficient way to fetch single client for edit forms
- **Solution**: Added GET handler to `src/app/api/harvest/clients/[id]/route.ts` and `useClient(clientId)` hook
- **Impact**: Eliminates need to fetch entire client list for single-client operations

---

### ✅ Phase 2: React Query Hooks (COMPLETE)

#### ✅ API Endpoint Enhancement
- [x] Modified `src/app/api/harvest/user-project-assignments/route.ts` with `?raw=true` parameter

#### ✅ Manager Filtering Hook
- [x] Add `useManagedProjects` hook (~30 lines) - **Fixed: Added enabled condition post-implementation**

#### ✅ React Query - New Admin Hooks (~300 lines total)
- [x] Add users hooks (useUsers, useCreateUser, useUpdateUser, useDeleteUser)
- [x] Add clients hooks (useClients, useClient, useCreateClient, useUpdateClient, useDeleteClient) - **Added useClient() post-implementation**
- [x] Add projects write hooks (useCreateProject, useUpdateProject, useDeleteProject)
- [x] Add user assignments hooks (useProjectUserAssignments, useCreateUserAssignment, useUpdateUserAssignment, useDeleteUserAssignment)

**Design Decision**: Did NOT modify `useTimeEntries` or `useExpenses`. Manager filtering will be done at component level using `useManagedProjects()` + `useMemo()` for cleaner, more reusable hooks.

### ✅ Phase 3: Frontend Components (COMPLETE)

#### Shared Components ✅
- [x] Create `src/components/admin/data-table.tsx` (~75 lines)
- [x] Create `src/components/admin/filters-bar.tsx` (~155 lines)

#### Forms ✅
- [x] Create `src/components/admin/forms/project-form-modal.tsx` (~378 lines)
- [x] Create `src/components/admin/forms/client-form-modal.tsx` (~216 lines)
- [x] Create `src/components/admin/forms/user-form-modal.tsx` (~311 lines)
- [x] Create `src/components/admin/forms/user-assignment-form-modal.tsx` (~220 lines)

### ✅ Phase 4: Admin Pages (COMPLETE)

#### Pages ✅
- [x] Create `src/app/dashboard/admin/page.tsx` (~270 lines) - Overview dashboard with stats
- [x] Create `src/app/dashboard/admin/time/page.tsx` (~220 lines) - Time entries management
- [x] Create `src/app/dashboard/admin/expenses/page.tsx` (~235 lines) - Expenses management
- [x] Create `src/app/dashboard/admin/projects/page.tsx` (~285 lines) - Projects list
- [x] Create `src/app/dashboard/admin/projects/[projectId]/assignments/page.tsx` (~215 lines) - User assignments
- [x] Create `src/app/dashboard/admin/clients/page.tsx` (~200 lines) - Clients list
- [x] Create `src/app/dashboard/admin/team/page.tsx` (~215 lines) - Team management (admin only)

#### Navigation ✅
- [x] Update `src/components/app-sidebar.tsx` with admin nav items (~40 lines added)

### Phase 5: Testing (NEXT)
- [ ] Test admin account (full access to all features)
- [ ] Test manager account (filtered to managed projects only)
- [ ] Test member account (no admin access, redirected)
- [ ] Test approval workflows (time entries + expenses)
- [ ] Test user assignments (add/edit/remove)
- [ ] Test manager filtering (verify only managed projects visible)

---

## 🚀 Timeline

**Total: 4-6 days** (vs. 9-13 days in original plan)

- ✅ Day 1-2: Backend (types, client, API routes, hooks) - COMPLETE
- ✅ Day 3: Frontend components (tables, filters, forms) - COMPLETE
- ✅ Day 4-5: Admin pages (copy member pages + modify) - COMPLETE
- ⏸️ Day 6: Testing and polish - NEXT

**Actual Time: 4-5 days** - On track with optimized estimate
**Savings: 5-7 days** through code reuse

---

## 🔑 Key Optimizations Explained

### 1. Why Client-Side Filtering is Fast

```ts
// Fetch all data once (2000 items)
const allEntries = await harvestClient.getTimeEntries({ from, to }); // ~100ms

// Filter 2000 items on client
const filtered = allEntries.filter(e => managedProjectIds.includes(e.project.id)); // ~5ms

// vs. Multiple API calls (SLOW)
for (const projectId of managedProjectIds) {
  await harvestClient.getTimeEntries({ project_id: projectId }); // 5 projects = ~500ms + rate limit issues
}
```

**Result**: 95% faster for managers with 5+ projects

### 2. Why Shared Cache Matters

```tsx
// Member view
const { data } = useTimeEntries({ from, to });

// Admin view (manager navigates here)
const { data } = useTimeEntries({ from, to, filterByRole: true });

// React Query sees similar key, reuses cache
// Just applies client-side filter to cached data = instant
```

### 3. Why Generic Components Win

```tsx
// OLD: 6 separate table components
<TimeEntriesTable data={timeEntries} />
<ExpensesTable data={expenses} />
<ProjectsTable data={projects} />
// ... 3 more

// NEW: 1 generic component
<DataTable data={data} columns={columns} />
// Define columns per page (flexible, type-safe, reusable)
```

**Maintenance**: Change table styling once, all tables update

---

## 📝 Important Notes

### Harvest API Behavior (Critical Understanding)

**User Tokens Already Filter Data:**
- Admin token → Harvest returns ALL data
- Manager token → Harvest returns data for managed projects + assigned teammates
- Member token → Harvest returns only own data

**Our Additional Filtering:**
- We only need client-side filtering for **managers** to ensure they ONLY see projects where `is_project_manager: true`
- Harvest's manager filtering is broader (includes assigned teammates even if not project manager)
- Our filtering is more restrictive (aligns with admin/manager distinction in UI)

### Performance Characteristics

**API Call Times (typical):**
- GET /time_entries (2000 items): ~100ms
- GET /expenses (2000 items): ~80ms
- GET /projects (100 items): ~50ms
- Client-side filter (2000 items): ~5ms

**Cache Hit Rates (expected):**
- Projects: 95% (rarely change)
- Users: 90% (rarely change)
- Time entries (member): 0% (always fresh)
- Time entries (admin): 70% (30s staleTime)

### Breaking Change Prevention

**Rules:**
1. Never modify existing API route behavior
2. Never change existing hook signatures (only add optional parameters)
3. Never modify existing components (create new or extend)
4. Never change existing types (only extend)

**How to verify:**
```bash
# Before implementation
git diff src/app/api/harvest/time-entries/route.ts
# Should be: no changes

git diff src/hooks/use-harvest.ts
# Should show: only additions (new parameters, new hooks)
```

---

## 🎉 Expected Outcomes

After implementation:

✅ **Admins** can:
- View all time entries and expenses across organization
- Approve/reject time entries and expenses
- Manage all projects, clients, and users
- Assign users to projects with custom rates
- Full team management (create/edit/archive users)

✅ **Managers** can:
- View time entries and expenses for managed projects only
- Approve/reject entries for their projects
- Manage user assignments for their projects
- Create/edit clients and projects (with appropriate permissions)
- Cannot access team management page

✅ **Members** experience:
- Zero changes to existing functionality
- No access to admin routes (graceful redirect)
- Existing views work exactly as before

✅ **Performance**:
- Admin views load in < 500ms (with warm cache)
- Manager filtering adds < 10ms overhead
- Member views unaffected (same performance as before)

✅ **Code Quality**:
- 43% less code than original plan
- Higher reusability (generic components)
- Easier to maintain (less duplication)
- Easier to test (fewer code paths)

---

**For detailed API specifications and original comprehensive plan, see [ADMIN_IMPLEMENTATION_PLAN.md](./ADMIN_IMPLEMENTATION_PLAN.md)**
