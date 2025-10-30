# Admin/Manager Views Implementation Plan

**Project:** PMO Harvest Portal
**Last Updated:** 2025-10-29
**Status:** Planning Complete → Implementation Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Access Control Strategy](#access-control-strategy)
3. [Architecture & Implementation](#architecture--implementation)
4. [API Reference](#api-reference)
5. [Component Specifications](#component-specifications)
6. [Manager Filtering Logic](#manager-filtering-logic)
7. [Implementation Checklist](#implementation-checklist)
8. [Testing Strategy](#testing-strategy)
9. [Future Enhancements](#future-enhancements)
10. [Technical Notes](#technical-notes)

---

## Overview

### Goal
Create comprehensive management interfaces for administrators and project managers to oversee time entries, expenses, clients, projects, and team members across the PMO Harvest Portal.

### Scope
- **Administrators**: Full access to all resources (time entries, expenses, projects, clients, users)
- **Managers**: Filtered access based on managed projects and assigned teammates
- **Members**: No access to admin views (existing member views only)

### Key Features
- View and manage all time entries and expenses (with approval workflows)
- Full CRUD operations for projects, clients, and user assignments
- Team management (admin only): create/edit/archive users
- Role-based data filtering for managers
- Bulk approval actions for expenses and time entries
- Charts and analytics for admin dashboard

---

## Access Control Strategy

### 🔐 Role Definitions

#### Administrator
```ts
accessRoles: ['administrator']
```
**Capabilities:**
- ✅ View ALL time entries, expenses, projects, clients, users
- ✅ Create, update, delete any resource
- ✅ Approve/reject time entries and expenses
- ✅ Manage team members (create users, edit roles, archive)
- ✅ No filtering applied - sees entire organization

#### Manager
```ts
accessRoles: ['manager']
```
**Capabilities:**
- ✅ View time entries and expenses for:
  - Assigned teammates
  - Projects they manage (`is_project_manager: true`)
- ✅ Create/edit/delete resources within managed projects
- ✅ Approve/reject time entries and expenses for managed projects
- ✅ Manage projects and user assignments (scoped to managed projects)
- ✅ Create/edit clients
- ❌ **Cannot** access team management (admin only)
- ⚠️ **Filtered** data - only sees managed projects

#### Member
```ts
accessRoles: ['member']
```
**Capabilities:**
- ✅ View own time entries and expenses
- ✅ Create/edit/delete own time entries and expenses
- ❌ **No access** to admin views

---

## Architecture & Implementation

### Directory Structure

```
src/
├── app/
│   ├── api/
│   │   └── harvest/
│   │       ├── admin/                    # NEW: Admin API routes
│   │       │   ├── users/
│   │       │   │   ├── route.ts          # GET, POST
│   │       │   │   └── [id]/
│   │       │   │       └── route.ts      # GET, PATCH, DELETE
│   │       │   ├── clients/
│   │       │   │   ├── route.ts
│   │       │   │   └── [id]/route.ts
│   │       │   ├── projects/
│   │       │   │   ├── route.ts
│   │       │   │   ├── [id]/route.ts
│   │       │   │   └── [id]/user-assignments/
│   │       │   │       ├── route.ts
│   │       │   │       └── [assignmentId]/route.ts
│   │       │   ├── time-entries/
│   │       │   │   ├── route.ts          # GET (all, filtered by role)
│   │       │   │   └── [id]/route.ts     # PATCH, DELETE
│   │       │   └── expenses/
│   │       │       ├── route.ts
│   │       │       └── [id]/route.ts
│   │       └── [existing routes...]
│   └── dashboard/
│       ├── admin/                        # NEW: Admin pages
│       │   ├── page.tsx                  # Overview dashboard
│       │   ├── time/
│       │   │   └── page.tsx              # Time entries management
│       │   ├── expenses/
│       │   │   └── page.tsx              # Expenses management
│       │   ├── projects/
│       │   │   ├── page.tsx              # Projects list
│       │   │   └── [id]/
│       │   │       └── assignments/
│       │   │           └── page.tsx      # User assignments
│       │   ├── clients/
│       │   │   └── page.tsx              # Clients management
│       │   └── team/
│       │       └── page.tsx              # Team management (admin only)
│       └── [existing routes...]
├── components/
│   ├── admin/                            # NEW: Admin components
│   │   ├── tables/
│   │   │   ├── time-entries-table.tsx
│   │   │   ├── expenses-table.tsx
│   │   │   ├── projects-table.tsx
│   │   │   ├── clients-table.tsx
│   │   │   ├── users-table.tsx
│   │   │   └── user-assignments-table.tsx
│   │   ├── forms/
│   │   │   ├── project-form-modal.tsx
│   │   │   ├── client-form-modal.tsx
│   │   │   ├── user-form-modal.tsx
│   │   │   ├── user-assignment-form-modal.tsx
│   │   │   └── approval-actions-modal.tsx
│   │   ├── filters/
│   │   │   ├── date-range-filter.tsx
│   │   │   ├── user-filter.tsx
│   │   │   ├── project-filter.tsx
│   │   │   └── approval-status-filter.tsx
│   │   └── charts/
│   │       ├── hours-by-project-chart.tsx
│   │       ├── hours-by-user-chart.tsx
│   │       └── expenses-by-project-chart.tsx
│   └── [existing components...]
├── hooks/
│   └── use-harvest.ts                    # EXTEND: Add admin hooks
├── lib/
│   ├── admin-utils.ts                    # NEW: Admin utilities
│   └── harvest/
│       └── client.ts                     # EXTEND: Add CRUD methods
└── types/
    └── harvest.ts                        # EXTEND: Add admin types
```

---

## API Reference

### Base URL: `/api/harvest/admin/`

All admin API routes follow this pattern:
1. **Session check**: Verify user is authenticated
2. **Role check**: Verify user has admin or manager role
3. **Access token**: Get user-specific Harvest OAuth token
4. **Manager filtering** (if applicable): Filter data by managed projects
5. **Harvest API call**: Use `HarvestClient` to interact with Harvest
6. **Response**: Return JSON with proper error handling

---

### 1. Users Management (Admin Only)

#### `GET /api/harvest/admin/users`
List all users in the organization.

**Query Parameters:**
- `is_active` (boolean, optional): Filter by active/archived status
- `page` (number, optional): Page number (default: 1)
- `per_page` (number, optional): Results per page (default: 50, max: 100)

**Response:**
```json
{
  "users": [
    {
      "id": 123,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "roles": ["manager"],
      "is_active": true,
      "is_contractor": false,
      "weekly_capacity": 126000,
      "default_hourly_rate": 100,
      "cost_rate": 75
    }
  ],
  "per_page": 50,
  "total_pages": 1,
  "total_entries": 12,
  "page": 1
}
```

**Permissions:**
- ✅ Administrator only
- ❌ Manager: 403 Forbidden
- ❌ Member: 403 Forbidden

---

#### `POST /api/harvest/admin/users`
Create a new user (sends invitation email).

**Request Body:**
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@example.com",
  "roles": ["member"],
  "is_contractor": false,
  "weekly_capacity": 126000,
  "default_hourly_rate": 80
}
```

**Required Fields:**
- `first_name`, `last_name`, `email`

**Optional Fields:**
- `roles` (array): `["member"]`, `["manager"]`, or `["administrator"]`
- `is_contractor` (boolean)
- `weekly_capacity` (number): Seconds (e.g., 126000 = 35 hours)
- `default_hourly_rate` (number)
- `cost_rate` (number)

**Response:** User object (201 Created)

**Permissions:** Admin only

---

#### `PATCH /api/harvest/admin/users/[id]`
Update user details.

**Request Body:** Partial user object (any fields to update)

**Response:** Updated user object (200 OK)

**Permissions:** Admin only

---

#### `DELETE /api/harvest/admin/users/[id]`
Delete a user (only if no time entries or expenses exist).

**Response:** 200 OK

**Permissions:** Admin only

---

### 2. Clients Management (Admin/Manager)

#### `GET /api/harvest/admin/clients`
List all clients.

**Query Parameters:**
- `is_active` (boolean, optional)
- `updated_since` (ISO 8601 datetime, optional)
- `page`, `per_page`

**Response:**
```json
{
  "clients": [
    {
      "id": 456,
      "name": "Acme Corp",
      "is_active": true,
      "currency": "USD",
      "address": "123 Main St"
    }
  ]
}
```

**Permissions:**
- ✅ Administrator
- ✅ Manager
- ❌ Member: 403 Forbidden

---

#### `POST /api/harvest/admin/clients`
Create a new client.

**Request Body:**
```json
{
  "name": "New Client Inc.",
  "currency": "USD",
  "is_active": true,
  "address": "456 Elm St"
}
```

**Required:** `name`

**Response:** Client object (201 Created)

**Permissions:** Admin/Manager

---

#### `PATCH /api/harvest/admin/clients/[id]`
Update client details.

**Permissions:** Admin/Manager

---

#### `DELETE /api/harvest/admin/clients/[id]`
Delete a client (only if no projects exist).

**Permissions:** Admin/Manager

---

### 3. Projects Management (Admin/Manager)

#### `GET /api/harvest/admin/projects`
List all projects (admin) or managed projects (manager).

**Query Parameters:**
- `is_active` (boolean)
- `client_id` (number)
- `updated_since` (ISO 8601)
- `page`, `per_page`

**Manager Filtering:**
- Fetch all projects via Harvest API
- Filter to only projects where user has `is_project_manager: true`

**Response:**
```json
{
  "projects": [
    {
      "id": 789,
      "name": "Website Redesign",
      "code": "WEB-2024",
      "client": { "id": 456, "name": "Acme Corp" },
      "is_active": true,
      "is_billable": true,
      "bill_by": "Tasks",
      "budget": 50000,
      "budget_by": "project"
    }
  ]
}
```

**Permissions:**
- ✅ Administrator: All projects
- ✅ Manager: Only managed projects
- ❌ Member: 403 Forbidden

---

#### `POST /api/harvest/admin/projects`
Create a new project.

**Request Body:**
```json
{
  "client_id": 456,
  "name": "New Project",
  "code": "NP-2024",
  "is_billable": true,
  "bill_by": "Tasks",
  "budget_by": "project",
  "budget": 100000
}
```

**Required:** `client_id`, `name`

**Response:** Project object (201 Created)

**Permissions:** Admin/Manager

---

#### `PATCH /api/harvest/admin/projects/[id]`
Update project details.

**Manager Check:** Verify manager has `is_project_manager: true` for this project

**Permissions:**
- ✅ Administrator
- ✅ Manager (only if managing this project)

---

#### `DELETE /api/harvest/admin/projects/[id]`
Delete a project (only if no time entries or expenses exist).

**Permissions:** Admin/Manager (with check)

---

### 4. User Assignments (Admin/Manager)

#### `GET /api/harvest/admin/projects/[id]/user-assignments`
List all users assigned to a project.

**Response:**
```json
{
  "user_assignments": [
    {
      "id": 111,
      "user": { "id": 123, "name": "John Doe" },
      "project": { "id": 789, "name": "Website Redesign" },
      "is_active": true,
      "is_project_manager": true,
      "hourly_rate": 120,
      "budget": 10000
    }
  ]
}
```

**Permissions:** Admin/Manager (with project check)

---

#### `POST /api/harvest/admin/projects/[id]/user-assignments`
Assign a user to a project.

**Request Body:**
```json
{
  "user_id": 123,
  "is_project_manager": false,
  "use_default_rates": true,
  "hourly_rate": 100,
  "budget": 5000
}
```

**Required:** `user_id`

**Permissions:** Admin/Manager (with project check)

---

#### `PATCH /api/harvest/admin/projects/[id]/user-assignments/[assignmentId]`
Update user assignment details.

**Permissions:** Admin/Manager (with project check)

---

#### `DELETE /api/harvest/admin/projects/[id]/user-assignments/[assignmentId]`
Remove user from project (only if no time entries or expenses exist).

**Permissions:** Admin/Manager (with project check)

---

### 5. Time Entries Management (Admin/Manager)

#### `GET /api/harvest/admin/time-entries`
List all time entries (filtered by role).

**Query Parameters:**
- `user_id` (number, optional)
- `project_id` (number, optional)
- `client_id` (number, optional)
- `approval_status` (string, optional): `unsubmitted`, `submitted`, `approved`
- `from`, `to` (dates, optional)
- `page`, `per_page`

**Manager Filtering:**
- Fetch user's managed project IDs
- Filter time entries by `project_id IN (managedProjectIds)`

**Response:** Same as `/api/harvest/time-entries` but with ALL entries (filtered by role)

**Permissions:**
- ✅ Administrator: All time entries
- ✅ Manager: Time entries for managed projects only
- ❌ Member: 403 Forbidden

---

#### `PATCH /api/harvest/admin/time-entries/[id]`
Update any time entry (including approval status).

**Request Body:**
```json
{
  "approval_status": "approved",
  "notes": "Approved by manager",
  "hours": 8
}
```

**Manager Check:** Verify time entry belongs to managed project

**Permissions:**
- ✅ Administrator
- ✅ Manager (only for managed projects)

---

#### `DELETE /api/harvest/admin/time-entries/[id]`
Delete any time entry.

**Manager Check:** Verify time entry belongs to managed project

**Permissions:**
- ✅ Administrator
- ✅ Manager (only for managed projects)

---

### 6. Expenses Management (Admin/Manager)

#### `GET /api/harvest/admin/expenses`
List all expenses (filtered by role).

**Query Parameters:**
- `user_id`, `project_id`, `client_id`, `approval_status`
- `from`, `to`, `page`, `per_page`

**Manager Filtering:** Same as time entries

**Response:** All expenses (filtered by role)

**Permissions:**
- ✅ Administrator: All expenses
- ✅ Manager: Expenses for managed projects only
- ❌ Member: 403 Forbidden

---

#### `PATCH /api/harvest/admin/expenses/[id]`
Update any expense (including approval status).

**Request Body:**
```json
{
  "approval_status": "approved",
  "notes": "Approved with receipt",
  "total_cost": 125.50
}
```

**Manager Check:** Verify expense belongs to managed project

**Permissions:**
- ✅ Administrator
- ✅ Manager (only for managed projects)

---

#### `DELETE /api/harvest/admin/expenses/[id]`
Delete any expense.

**Permissions:** Admin/Manager (with check)

---

## Component Specifications

### Admin Dashboard Overview (`/dashboard/admin/page.tsx`)

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  Admin Dashboard                                     │
├─────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ Hours   │ │ Pending │ │ Active  │ │ Team    │  │
│  │ Tracked │ │ Expenses│ │ Projects│ │ Members │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
├─────────────────────────────────────────────────────┤
│  ┌───────────────────────┐ ┌───────────────────┐   │
│  │ Hours by Project      │ │ Recent Activity   │   │
│  │ (Bar Chart)           │ │ (Timeline)        │   │
│  └───────────────────────┘ └───────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Components:**
- Summary cards (4 metrics)
- Bar chart: Hours by project (top 10)
- Recent activity feed (latest 10 time entries/expenses)

**Data Sources:**
- `useAdminTimeEntries({ from: weekStart, to: weekEnd })`
- `useAdminExpenses({ from: monthStart, to: monthEnd })`
- `useAdminProjects({ is_active: true })`
- `useUsers({ is_active: true })` (admin only)

---

### Time Entries Management (`/dashboard/admin/time/page.tsx`)

**Features:**
1. **Filters Bar:**
   - Date range picker
   - User dropdown (all users for admin, assigned teammates for manager)
   - Project dropdown (all projects for admin, managed projects for manager)
   - Approval status dropdown
   - Client dropdown

2. **Data Table:**
   - Columns: Date, User, Project, Task, Hours, Notes, Status, Actions
   - Sortable by date, hours
   - Row actions: Edit, Delete, Approve (if status = submitted)
   - Bulk selection for approval

3. **Actions:**
   - Export to CSV
   - Bulk approve selected entries
   - Edit time entry modal (opens on row click)

**Components Used:**
- `<TimeEntriesTable>` (from `components/admin/tables/`)
- `<DateRangeFilter>`, `<UserFilter>`, `<ProjectFilter>`, `<ApprovalStatusFilter>`
- `<ApprovalActionsModal>` (bulk approve/reject)

---

### Expenses Management (`/dashboard/admin/expenses/page.tsx`)

**Similar to Time Entries, but with:**
- Additional column: Receipt (clickable icon to view)
- Approval workflow prominently displayed
- Badge colors: `unsubmitted` (gray), `submitted` (yellow), `approved` (green)

**Approval Actions:**
- Single approve button per row (if status = submitted)
- Bulk approve modal with notes field
- Option to reject (set status back to unsubmitted with notes)

---

### Projects Management (`/dashboard/admin/projects/page.tsx`)

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  Projects                              [+ New]       │
├─────────────────────────────────────────────────────┤
│  Filters: [Active ▼] [Client ▼] [Search...]        │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐  │
│  │ Website Redesign      [Edit] [Archive]       │  │
│  │ Client: Acme Corp │ Budget: $50,000         │  │
│  │ Team: 5 members   │ Status: Active          │  │
│  │ [Manage Assignments]                         │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ Mobile App Development                       │  │
│  │ ...                                          │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Features:**
- Card-based layout (easier to scan than table for projects)
- Each card shows: Name, Code, Client, Budget, Team size, Status
- Quick actions: Edit, Archive, Manage Assignments
- Create button opens modal with full project form

**Project Form Modal:**
- Fields: Client, Name, Code, Billing method, Budget type, Budget amount, Dates, Notes
- Validation: Client and Name required

---

### User Assignments (`/dashboard/admin/projects/[id]/assignments/page.tsx`)

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  User Assignments: Website Redesign                 │
│  [+ Assign User]                                    │
├─────────────────────────────────────────────────────┤
│  Name          │ PM │ Rate  │ Budget   │ Actions   │
├─────────────────────────────────────────────────────┤
│  John Doe      │ ✓  │ $120  │ $10,000  │ Edit Del  │
│  Jane Smith    │    │ $100  │ $5,000   │ Edit Del  │
│  ...           │    │       │          │           │
└─────────────────────────────────────────────────────┘
```

**Features:**
- Table view with all assigned users
- Toggle for project manager permission
- Custom hourly rate (or use default)
- Budget allocation per user
- Add user button opens modal with user dropdown + settings

**Assignment Form Modal:**
- User dropdown (exclude already assigned users)
- Project manager checkbox
- Use default rates checkbox
- Custom hourly rate field (enabled if unchecked)
- Budget field

---

### Clients Management (`/dashboard/admin/clients/page.tsx`)

**Layout:** Similar to projects, card-based

**Card Content:**
- Client name
- Currency
- Number of active projects
- Active/Archived status

**Actions:**
- Create client modal
- Edit client modal
- Archive/Activate button

**Client Form Modal:**
- Fields: Name (required), Currency, Address, Active status

---

### Team Management (`/dashboard/admin/team/page.tsx`) - **Admin Only**

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  Team                                   [+ Invite]   │
├─────────────────────────────────────────────────────┤
│  Filters: [Role ▼] [Status ▼] [Search...]          │
├─────────────────────────────────────────────────────┤
│  Name          │ Email         │ Role  │ Status │   │
├─────────────────────────────────────────────────────┤
│  John Doe      │ john@...      │ Mgr   │ Active │ E │
│  Jane Smith    │ jane@...      │ Mem   │ Active │ E │
│  ...           │               │       │        │   │
└─────────────────────────────────────────────────────┘
```

**Features:**
- Table view with all users
- Filters: Role (Admin/Manager/Member), Status (Active/Archived)
- Invite user button opens modal
- Edit button per row opens user details modal

**User Form Modal:**
- Fields: First name, Last name, Email, Role, Contractor status, Weekly capacity, Default rate, Cost rate
- Send invitation automatically on create

---

## Manager Filtering Logic

### Problem
Managers should only see data for projects they manage. Harvest API doesn't provide a direct "managed projects" endpoint.

### Solution
1. **Fetch user's project assignments:**
   ```ts
   const assignments = await harvestClient.getCurrentUserProjectAssignments();
   ```

2. **Filter to managed projects:**
   ```ts
   const managedProjects = assignments.project_assignments
     .filter(pa => pa.is_project_manager === true)
     .map(pa => pa.project.id);
   ```

3. **Apply filter to queries:**
   - For **projects**: Filter fetched projects by `project.id IN managedProjects`
   - For **time entries**: Fetch all, then filter by `time_entry.project.id IN managedProjects`
   - For **expenses**: Fetch all, then filter by `expense.project.id IN managedProjects`

### Caching Strategy
- Cache `managedProjects` list in React Query:
  ```ts
  export const harvestKeys = {
    managedProjects: () => ['harvest', 'managed-projects'] as const,
  };

  export function useManagedProjects() {
    return useQuery({
      queryKey: harvestKeys.managedProjects(),
      queryFn: async () => {
        const { data } = await axios.get('/api/harvest/managed-projects');
        return data.projectIds; // number[]
      },
      staleTime: 10 * 60 * 1000, // 10 minutes
    });
  }
  ```

- Invalidate on project assignment changes

### API Route Pattern

**File:** `src/lib/admin-utils.ts`

```ts
export async function getManagedProjectIds(
  accessToken: string
): Promise<number[]> {
  const client = createHarvestClient(accessToken);
  const assignments = await client.getCurrentUserProjectAssignments();

  return assignments.project_assignments
    .filter(pa => pa.is_project_manager === true)
    .map(pa => pa.project.id);
}

export function filterByManagedProjects<T extends { project: { id: number } }>(
  items: T[],
  managedProjectIds: number[]
): T[] {
  return items.filter(item => managedProjectIds.includes(item.project.id));
}
```

**File:** `src/app/api/harvest/admin/time-entries/route.ts`

```ts
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  // Check role
  const isAdmin = session.user.accessRoles.includes('administrator');
  const isManager = session.user.accessRoles.includes('manager');

  if (!isAdmin && !isManager) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { accessToken } = await auth.api.getAccessToken({
    body: { providerId: 'harvest' },
    headers: request.headers,
  });

  const client = createHarvestClient(accessToken);

  // Parse query params
  const params = {
    from: searchParams.get('from'),
    to: searchParams.get('to'),
    project_id: searchParams.get('project_id'),
    // ... other params
  };

  // Fetch time entries
  let timeEntries = await client.getTimeEntries(params);

  // Apply manager filtering
  if (isManager && !isAdmin) {
    const managedProjectIds = await getManagedProjectIds(accessToken);
    timeEntries.time_entries = filterByManagedProjects(
      timeEntries.time_entries,
      managedProjectIds
    );
    timeEntries.total_entries = timeEntries.time_entries.length;
  }

  return NextResponse.json(timeEntries);
}
```

---

## Implementation Checklist

### 🔧 Backend (Estimated: 2-3 days)

#### 1. Type Definitions (`src/types/harvest.ts`)
- [ ] Add `CreateUserInput`, `UpdateUserInput` types
- [ ] Add `HarvestClientResponse` type
- [ ] Add `CreateClientInput`, `UpdateClientInput` types
- [ ] Add `CreateProjectInput`, `UpdateProjectInput` types
- [ ] Add `CreateUserAssignmentInput`, `UpdateUserAssignmentInput` types
- [ ] Add `HarvestUserAssignment` type
- [ ] Add approval status types: `ApprovalStatus = 'unsubmitted' | 'submitted' | 'approved'`

#### 2. Harvest Client (`src/lib/harvest/client.ts`)
- [ ] Add `createUser(input: CreateUserInput): Promise<HarvestUser>`
- [ ] Add `updateUser(userId: number, input: UpdateUserInput): Promise<HarvestUser>`
- [ ] Add `deleteUser(userId: number): Promise<void>`
- [ ] Add `getClients(params?): Promise<HarvestClientResponse>` (if not exists)
- [ ] Add `createClient(input: CreateClientInput): Promise<HarvestClient>`
- [ ] Add `updateClient(clientId: number, input: UpdateClientInput): Promise<HarvestClient>`
- [ ] Add `deleteClient(clientId: number): Promise<void>`
- [ ] Add `createProject(input: CreateProjectInput): Promise<HarvestProject>`
- [ ] Add `updateProject(projectId: number, input: UpdateProjectInput): Promise<HarvestProject>`
- [ ] Add `deleteProject(projectId: number): Promise<void>`
- [ ] Add `getUserAssignments(projectId: number): Promise<HarvestUserAssignmentResponse>`
- [ ] Add `createUserAssignment(projectId: number, input: CreateUserAssignmentInput): Promise<HarvestUserAssignment>`
- [ ] Add `updateUserAssignment(projectId: number, assignmentId: number, input: UpdateUserAssignmentInput): Promise<HarvestUserAssignment>`
- [ ] Add `deleteUserAssignment(projectId: number, assignmentId: number): Promise<void>`

#### 3. Admin Utilities (`src/lib/admin-utils.ts`) - NEW FILE
- [ ] Create file
- [ ] Add `isAdmin(session: Session): boolean`
- [ ] Add `isManager(session: Session): boolean`
- [ ] Add `isAdminOrManager(session: Session): boolean`
- [ ] Add `getManagedProjectIds(accessToken: string): Promise<number[]>`
- [ ] Add `filterByManagedProjects<T>(items: T[], managedProjectIds: number[]): T[]`
- [ ] Add `canManageProject(accessToken: string, projectId: number): Promise<boolean>`

#### 4. API Routes - Users (`src/app/api/harvest/admin/users/`)
- [ ] Create `route.ts`: `GET` (list users), `POST` (create user)
- [ ] Create `[id]/route.ts`: `GET` (single user), `PATCH` (update), `DELETE`
- [ ] Add admin-only permission checks
- [ ] Test with admin and manager accounts

#### 5. API Routes - Clients (`src/app/api/harvest/admin/clients/`)
- [ ] Create `route.ts`: `GET`, `POST`
- [ ] Create `[id]/route.ts`: `GET`, `PATCH`, `DELETE`
- [ ] Add admin/manager permission checks
- [ ] Test with admin and manager accounts

#### 6. API Routes - Projects (`src/app/api/harvest/admin/projects/`)
- [ ] Create `route.ts`: `GET` (with manager filtering), `POST`
- [ ] Create `[id]/route.ts`: `GET`, `PATCH`, `DELETE`
- [ ] Add manager project check for edit/delete
- [ ] Test manager filtering logic

#### 7. API Routes - User Assignments (`src/app/api/harvest/admin/projects/[id]/user-assignments/`)
- [ ] Create `route.ts`: `GET`, `POST`
- [ ] Create `[assignmentId]/route.ts`: `GET`, `PATCH`, `DELETE`
- [ ] Add manager project check
- [ ] Test assignment operations

#### 8. API Routes - Time Entries Admin (`src/app/api/harvest/admin/time-entries/`)
- [ ] Create `route.ts`: `GET` (with manager filtering)
- [ ] Create `[id]/route.ts`: `PATCH` (update any entry), `DELETE`
- [ ] Implement manager filtering logic
- [ ] Test approval status updates

#### 9. API Routes - Expenses Admin (`src/app/api/harvest/admin/expenses/`)
- [ ] Create `route.ts`: `GET` (with manager filtering)
- [ ] Create `[id]/route.ts`: `PATCH`, `DELETE`
- [ ] Implement manager filtering logic
- [ ] Test approval workflow

#### 10. React Query Hooks (`src/hooks/use-harvest.ts`)
- [ ] Add `useUsers()`, `useUser(id)`, `useCreateUser()`, `useUpdateUser(id)`, `useDeleteUser()`
- [ ] Add `useClients()`, `useClient(id)`, `useCreateClient()`, `useUpdateClient(id)`, `useDeleteClient()`
- [ ] Add `useAdminProjects()` (filtered by role)
- [ ] Add `useCreateProject()`, `useUpdateProject(id)`, `useDeleteProject()`
- [ ] Add `useUserAssignments(projectId)`, `useCreateUserAssignment(projectId)`, `useUpdateUserAssignment(projectId, assignmentId)`, `useDeleteUserAssignment(projectId)`
- [ ] Add `useAdminTimeEntries(params)` (filtered by role)
- [ ] Add `useUpdateAnyTimeEntry(id)`, `useDeleteAnyTimeEntry()`
- [ ] Add `useAdminExpenses(params)` (filtered by role)
- [ ] Add `useUpdateAnyExpense(id)`, `useDeleteAnyExpense()`
- [ ] Add `useManagedProjects()` (for managers)
- [ ] Add proper query key structure for admin queries
- [ ] Configure staleTime appropriately (admin data: 30s-1min)

---

### 🎨 Frontend - Pages (Estimated: 3-4 days)

#### 11. Admin Dashboard Overview (`src/app/dashboard/admin/page.tsx`)
- [ ] Create page component
- [ ] Add role guard (redirect if not admin/manager)
- [ ] Implement summary cards (4 metrics)
- [ ] Add bar chart: Hours by project (use recharts)
- [ ] Add recent activity feed (time entries + expenses)
- [ ] Add loading states
- [ ] Test with admin and manager accounts

#### 12. Time Entries Management (`src/app/dashboard/admin/time/page.tsx`)
- [ ] Create page component
- [ ] Add role guard
- [ ] Implement filters bar (date range, user, project, approval status)
- [ ] Use `<TimeEntriesTable>` component
- [ ] Add edit time entry modal
- [ ] Add bulk approval action
- [ ] Add export to CSV functionality
- [ ] Test filtering and approval workflow

#### 13. Expenses Management (`src/app/dashboard/admin/expenses/page.tsx`)
- [ ] Create page component
- [ ] Add role guard
- [ ] Implement filters bar
- [ ] Use `<ExpensesTable>` component
- [ ] Add view receipt functionality
- [ ] Add edit expense modal
- [ ] Add bulk approval action
- [ ] Test approval workflow

#### 14. Projects Management (`src/app/dashboard/admin/projects/page.tsx`)
- [ ] Create page component
- [ ] Add role guard
- [ ] Implement card-based layout
- [ ] Add filters (active/archived, client, search)
- [ ] Use `<ProjectFormModal>` for create/edit
- [ ] Add archive/activate functionality
- [ ] Add link to user assignments page
- [ ] Test with admin and manager (verify filtering)

#### 15. User Assignments (`src/app/dashboard/admin/projects/[id]/assignments/page.tsx`)
- [ ] Create page component
- [ ] Add role guard + project access check
- [ ] Use `<UserAssignmentsTable>` component
- [ ] Use `<UserAssignmentFormModal>` for add/edit
- [ ] Add remove assignment functionality
- [ ] Test assignment operations

#### 16. Clients Management (`src/app/dashboard/admin/clients/page.tsx`)
- [ ] Create page component
- [ ] Add role guard
- [ ] Implement card-based layout
- [ ] Use `<ClientFormModal>` for create/edit
- [ ] Add archive/activate functionality
- [ ] Test with admin and manager

#### 17. Team Management (`src/app/dashboard/admin/team/page.tsx`)
- [ ] Create page component
- [ ] Add admin-only guard (403 for managers)
- [ ] Implement table layout
- [ ] Add filters (role, status)
- [ ] Use `<UserFormModal>` for create/edit
- [ ] Add archive/activate functionality
- [ ] Test user creation (invitation email)

---

### 🧩 Frontend - Components (Estimated: 2-3 days)

#### 18. Admin Tables (`src/components/admin/tables/`)
- [ ] Create `time-entries-table.tsx` (sortable, with inline actions)
- [ ] Create `expenses-table.tsx` (sortable, with receipt icon)
- [ ] Create `projects-table.tsx` (or use card layout)
- [ ] Create `clients-table.tsx` (or use card layout)
- [ ] Create `users-table.tsx` (with role badges)
- [ ] Create `user-assignments-table.tsx` (with PM toggle)

#### 19. Admin Forms (`src/components/admin/forms/`)
- [ ] Create `project-form-modal.tsx` (full project form)
- [ ] Create `client-form-modal.tsx` (client details)
- [ ] Create `user-form-modal.tsx` (user profile, admin only)
- [ ] Create `user-assignment-form-modal.tsx` (assign user to project)
- [ ] Create `approval-actions-modal.tsx` (bulk approve/reject)

#### 20. Admin Filters (`src/components/admin/filters/`)
- [ ] Create `date-range-filter.tsx` (reusable date picker)
- [ ] Create `user-filter.tsx` (dropdown with all users)
- [ ] Create `project-filter.tsx` (dropdown with all projects)
- [ ] Create `approval-status-filter.tsx` (dropdown: unsubmitted/submitted/approved)

#### 21. Admin Charts (`src/components/admin/charts/`)
- [ ] Install recharts: `pnpm add recharts`
- [ ] Create `hours-by-project-chart.tsx` (bar chart)
- [ ] Create `hours-by-user-chart.tsx` (bar chart)
- [ ] Create `expenses-by-project-chart.tsx` (bar or pie chart)

---

### 🧭 Navigation & Access Control (Estimated: 1 day)

#### 22. Update Sidebar (`src/components/app-sidebar.tsx`)
- [ ] Add conditional admin navigation section
- [ ] Show only to admin/manager roles
- [ ] Add menu items:
  - Management (admin dashboard)
  - Time Overview (admin time entries)
  - Expenses Overview (admin expenses)
  - Projects
  - Clients
  - Team (admin only)
- [ ] Test visibility with different roles

#### 23. Create Route Guards
- [ ] Add role check to all admin pages
- [ ] Redirect to `/dashboard` if not admin/manager
- [ ] Show 403 error if manager tries to access admin-only pages
- [ ] Test navigation and guards

---

### 🧪 Testing & Polish (Estimated: 1-2 days)

#### 24. Role-Based Testing
- [ ] Test with **admin account**: Verify full access to all features
- [ ] Test with **manager account**: Verify filtering works (only managed projects)
- [ ] Test with **member account**: Verify no access to admin views
- [ ] Test approval workflows (time entries and expenses)
- [ ] Test user assignments (add/edit/remove)

#### 25. Manager Filtering Verification
- [ ] Create test data: 3 projects (manager assigned to 2)
- [ ] Verify manager only sees 2 projects in admin projects page
- [ ] Verify time entries filtered by managed projects only
- [ ] Verify expenses filtered by managed projects only
- [ ] Verify manager cannot edit projects they don't manage

#### 26. Edge Cases & Error Handling
- [ ] Test deleting entities with dependencies (should fail gracefully)
- [ ] Test permission errors (should show clear messages)
- [ ] Test loading states for all queries
- [ ] Test empty states (no data)
- [ ] Test pagination for large datasets

#### 27. UI/UX Polish
- [ ] Ensure consistent design with existing dashboard
- [ ] Add loading skeletons
- [ ] Add success/error toasts for mutations
- [ ] Verify mobile responsiveness
- [ ] Add keyboard shortcuts where applicable

#### 28. Documentation
- [ ] Update `CLAUDE.md` with admin patterns
- [ ] Document manager filtering logic
- [ ] Add JSDoc comments to utility functions
- [ ] Update README if needed

---

## Testing Strategy

### Test Accounts Setup

Create three test accounts in Harvest:

1. **Admin Account**
   - Email: `admin@pmohive.com`
   - Role: Administrator
   - Access: Full

2. **Manager Account**
   - Email: `manager@pmohive.com`
   - Role: Manager
   - Projects: Assigned as project manager to 2 out of 5 projects
   - Teammates: Assigned 3 team members

3. **Member Account**
   - Email: `member@pmohive.com`
   - Role: Member
   - Projects: Assigned to 1 project

### Test Scenarios

#### Scenario 1: Admin Full Access
1. Login as admin
2. Navigate to `/dashboard/admin`
3. Verify all 4 summary cards show data
4. Navigate to `/dashboard/admin/time`
5. Verify all time entries from all users are visible
6. Filter by a specific user → should work
7. Navigate to `/dashboard/admin/projects`
8. Verify all 5 projects are visible
9. Edit a project → should succeed
10. Navigate to `/dashboard/admin/team`
11. Create a new user → should succeed

#### Scenario 2: Manager Filtered Access
1. Login as manager
2. Navigate to `/dashboard/admin`
3. Verify summary cards show data for managed projects only
4. Navigate to `/dashboard/admin/time`
5. Verify only time entries from managed projects are visible
6. Filter by a user not in assigned teammates → should show no results
7. Navigate to `/dashboard/admin/projects`
8. Verify only 2 managed projects are visible
9. Try to edit a non-managed project (via direct URL) → should get 403
10. Navigate to `/dashboard/admin/team`
11. Should get 403 Forbidden

#### Scenario 3: Member No Access
1. Login as member
2. Navigate to `/dashboard/admin` (via direct URL)
3. Should be redirected to `/dashboard`
4. Try to access any admin route → should be redirected

#### Scenario 4: Approval Workflow
1. Login as member
2. Create a time entry → status should be "unsubmitted"
3. Logout, login as manager
4. Navigate to `/dashboard/admin/time`
5. Find the time entry
6. Approve it → status should change to "approved"
7. Try to delete approved entry → should succeed (or fail if locked by Harvest)

#### Scenario 5: User Assignments
1. Login as admin
2. Navigate to a project's user assignments page
3. Assign a new user to the project
4. Set them as project manager
5. Set a custom hourly rate
6. Save → should succeed
7. Verify user appears in assignments table
8. Edit the assignment → change hourly rate
9. Save → should succeed
10. Remove assignment (if user has no time logged) → should succeed

---

## Future Enhancements

### Phase 2 Features (Post-MVP)

1. **Advanced Reporting**
   - Detailed time reports by project/user/date range
   - Expense reports with receipt attachments
   - Billable vs. non-billable hours breakdown
   - Export reports to PDF/Excel

2. **Notifications**
   - Email/in-app notifications for pending approvals
   - Reminder for managers when time entries are submitted
   - Alerts for over-budget projects

3. **Bulk Operations**
   - Bulk approve/reject time entries
   - Bulk approve/reject expenses
   - Bulk assign users to multiple projects

4. **Dashboard Customization**
   - Allow admins to customize dashboard widgets
   - Add more chart types (pie, line, stacked bar)
   - Save custom filters/views

5. **Audit Log**
   - Track all admin actions (who did what and when)
   - Display audit log in a dedicated page
   - Export audit log

6. **Project Templates**
   - Create project templates with predefined tasks
   - Apply templates when creating new projects
   - Manage template library

7. **Task Management**
   - Full CRUD for tasks (currently read-only)
   - Assign tasks to projects
   - Set task budgets and rates

8. **Invoicing Integration**
   - View invoices associated with time entries/expenses
   - Link to Harvest invoicing features
   - Invoice status tracking

9. **Mobile-Optimized Admin Views**
   - Responsive tables with horizontal scroll
   - Mobile-friendly filters (bottom sheet)
   - Touch-friendly action buttons

10. **Advanced Permissions**
    - Custom permission sets beyond admin/manager/member
    - Grant specific permissions (e.g., "can approve expenses but not time entries")
    - Project-specific permissions for managers

11. **Budget Tracking & Alerts**
    - Visual budget progress bars on project cards
    - Alerts when project approaching budget limit
    - Budget forecasting based on historical data

12. **Time Tracking Insights**
    - Average hours per project/user
    - Productivity trends over time
    - Idle time detection

---

## Technical Notes

### Harvest API Limitations

1. **No Direct Manager Query**
   - Harvest doesn't provide an endpoint like `/v2/managers/{id}/projects`
   - Must fetch all project assignments and filter by `is_project_manager: true`

2. **Approval Status Field**
   - `approval_status` field exists on time entries and expenses
   - Values: `unsubmitted`, `submitted`, `approved`
   - No built-in "reject" status (can use notes field for rejection reason)

3. **Deletion Constraints**
   - Cannot delete users/projects/clients with associated time entries or expenses
   - Must archive instead of delete in most cases

4. **Rate Limits**
   - Harvest API has rate limits (100 requests per 15 seconds per account)
   - Use pagination to avoid hitting limits
   - Cache data aggressively

5. **Pagination**
   - Max `per_page`: 2000 for most endpoints, 100 for some
   - Default: 2000 (very generous)
   - Use pagination for large datasets (e.g., all time entries for a year)

### Performance Considerations

1. **Manager Filtering**
   - Fetching all data and filtering client-side may be slow for large datasets
   - Consider caching managed project IDs
   - Use `staleTime` to avoid excessive refetches

2. **Data Tables**
   - Large tables (100+ rows) should use virtualization
   - Consider using `@tanstack/react-virtual` for large datasets
   - Add server-side pagination for very large datasets

3. **Charts**
   - Aggregate data before rendering charts
   - Limit chart data to top 10-20 items
   - Use memoization to avoid recomputing aggregations

4. **React Query Configuration**
   - Admin data should have lower `staleTime` (30s-1min) than member data
   - Use `refetchOnWindowFocus` for critical data (pending approvals)
   - Implement optimistic updates for better UX

### Security Considerations

1. **Permission Checks**
   - **Always** verify permissions on the server (API routes)
   - Client-side checks (hiding UI) are for UX only, not security
   - Return 403 Forbidden for unauthorized requests

2. **Manager Project Access**
   - Before allowing edit/delete, verify manager has `is_project_manager: true`
   - Use `canManageProject()` utility function consistently

3. **Input Validation**
   - Validate all input on the server before sending to Harvest API
   - Use Zod schemas for validation
   - Sanitize user input (especially in notes fields)

4. **Access Token Security**
   - User-specific OAuth tokens are stored securely (encrypted in DB)
   - Never expose tokens in client-side code
   - Tokens auto-refresh on expiration

### Code Patterns

#### API Route Template

```ts
// src/app/api/harvest/admin/[resource]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createHarvestClient } from '@/lib/harvest';
import { getErrorMessage } from '@/lib/api-utils';
import { isAdmin, isManager } from '@/lib/admin-utils';

export async function GET(request: NextRequest) {
  try {
    // 1. Auth check
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Role check
    if (!isAdmin(session) && !isManager(session)) {
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

    // 4. Parse query params
    const searchParams = request.nextUrl.searchParams;
    const params = {
      // ... parse params
    };

    // 5. Fetch from Harvest
    const client = createHarvestClient(accessToken);
    const data = await client.getResource(params);

    // 6. Apply manager filtering if needed
    if (isManager(session) && !isAdmin(session)) {
      // ... filter data
    }

    // 7. Return response
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to fetch resource') },
      { status: 500 }
    );
  }
}
```

#### React Query Hook Template

```ts
// src/hooks/use-harvest.ts
export function useAdminResource(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: harvestKeys.adminResource(),
    queryFn: async () => {
      const { data } = await axios.get('/api/harvest/admin/resource');
      return data;
    },
    staleTime: 30 * 1000, // 30 seconds for admin data
    enabled: options?.enabled,
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateResourceInput) => {
      const { data } = await axios.post('/api/harvest/admin/resource', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: harvestKeys.adminResource() });
      toast.success('Resource created successfully');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to create resource'));
    },
  });
}
```

#### Component Template (Admin Page)

```tsx
// src/app/dashboard/admin/resource/page.tsx
'use client';

import { useSession } from '@/lib/auth-client';
import { useAdminResource } from '@/hooks/use-harvest';
import { isAdmin, isManager } from '@/lib/admin-utils';
import { redirect } from 'next/navigation';

export default function AdminResourcePage() {
  const { data: session } = useSession();

  // Role guard
  if (!session) {
    return <div>Loading...</div>;
  }

  if (!isAdmin(session) && !isManager(session)) {
    redirect('/dashboard');
  }

  const { data, isLoading } = useAdminResource();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Resource Management</h1>
      {/* ... component content */}
    </div>
  );
}
```

---

## Questions & Decisions

### Open Questions

1. **Rejection Workflow**: Should we add a "rejected" approval status, or use notes field?
   - **Decision**: Use notes field for rejection reason. Status goes back to "unsubmitted".

2. **Manager Team View**: Should managers see a list of their assigned teammates?
   - **Decision**: Yes, add a "My Team" section in the manager view (separate from admin team management).

3. **Bulk Approvals**: Should we allow approving all pending items at once?
   - **Decision**: Yes, with a confirmation modal showing count of items to be approved.

4. **Export Functionality**: What formats should we support (CSV, Excel, PDF)?
   - **Decision**: Start with CSV (easiest), add Excel/PDF later if needed.

5. **Real-time Updates**: Should admin views auto-refresh when data changes?
   - **Decision**: Use React Query's `refetchInterval` for critical views (pending approvals), but keep it conservative (5 minutes).

### Design Decisions

1. **Card vs. Table Layout for Projects/Clients**
   - **Decision**: Use cards for better scannability and to show more info at a glance.

2. **Admin Navigation Placement**
   - **Decision**: Add a separate "Management" section in sidebar, below member navigation items.

3. **Manager Data Fetching Strategy**
   - **Decision**: Fetch all data from Harvest, then filter client-side (simpler implementation). If performance issues arise, move filtering to server-side.

4. **Approval Actions Location**
   - **Decision**: Both inline actions (per row) and bulk actions (toolbar) for flexibility.

---

## Appendix

### Useful Harvest API Endpoints

```
# Users
GET    /v2/users
POST   /v2/users
GET    /v2/users/{USER_ID}
PATCH  /v2/users/{USER_ID}
DELETE /v2/users/{USER_ID}

# Clients
GET    /v2/clients
POST   /v2/clients
GET    /v2/clients/{CLIENT_ID}
PATCH  /v2/clients/{CLIENT_ID}
DELETE /v2/clients/{CLIENT_ID}

# Projects
GET    /v2/projects
POST   /v2/projects
GET    /v2/projects/{PROJECT_ID}
PATCH  /v2/projects/{PROJECT_ID}
DELETE /v2/projects/{PROJECT_ID}

# User Assignments
GET    /v2/projects/{PROJECT_ID}/user_assignments
POST   /v2/projects/{PROJECT_ID}/user_assignments
GET    /v2/projects/{PROJECT_ID}/user_assignments/{USER_ASSIGNMENT_ID}
PATCH  /v2/projects/{PROJECT_ID}/user_assignments/{USER_ASSIGNMENT_ID}
DELETE /v2/projects/{PROJECT_ID}/user_assignments/{USER_ASSIGNMENT_ID}

# Time Entries
GET    /v2/time_entries
POST   /v2/time_entries
GET    /v2/time_entries/{TIME_ENTRY_ID}
PATCH  /v2/time_entries/{TIME_ENTRY_ID}
DELETE /v2/time_entries/{TIME_ENTRY_ID}

# Expenses
GET    /v2/expenses
POST   /v2/expenses
GET    /v2/expenses/{EXPENSE_ID}
PATCH  /v2/expenses/{EXPENSE_ID}
DELETE /v2/expenses/{EXPENSE_ID}
```

### Key Query Parameters

- `is_active`: Filter by active/archived status
- `updated_since`: ISO 8601 datetime (get changes since last fetch)
- `page`, `per_page`: Pagination (max per_page varies by endpoint)
- `from`, `to`: Date range (YYYY-MM-DD)
- `user_id`, `project_id`, `client_id`: Filter by related entity

### Example API Calls

```bash
# List all users
curl "https://api.harvestapp.com/v2/users" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $ACCOUNT_ID"

# Create a project
curl "https://api.harvestapp.com/v2/projects" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $ACCOUNT_ID" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"client_id":123,"name":"New Project","code":"NP-2024"}'

# Update time entry approval status
curl "https://api.harvestapp.com/v2/time_entries/456" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Harvest-Account-Id: $ACCOUNT_ID" \
  -X PATCH \
  -H "Content-Type: application/json" \
  -d '{"approval_status":"approved"}'
```

---

## Resources

- [Harvest API v2 Documentation](https://help.getharvest.com/api-v2/)
- [Better Auth Documentation](https://better-auth.com/docs)
- [TanStack Query v5 Documentation](https://tanstack.com/query/latest)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Recharts Documentation](https://recharts.org/)

---

**End of Implementation Plan**
