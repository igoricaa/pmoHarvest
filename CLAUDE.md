# PMO Harvest Portal - Claude Reference

Quick reference for working with this codebase.

## Tech Stack

- **Next.js 16.0.1** (App Router, Turbopack default)
- **React 19.1.0**
- **Better Auth 1.3.26** (Harvest OAuth)
- **PostgreSQL** (Neon) - tokens/sessions only
- **TanStack Query v5** - server state
- **React Hook Form + Zod** - forms
- **shadcn/ui + Tailwind v4** - UI
- **TypeScript 5+**
- **pnpm** - package manager

## Commands

```bash
pnpm dev              # Dev server (Turbopack default)
pnpm build            # Production build
pnpm start            # Production server
```

## Architecture Essentials

### Auth Flow (Better Auth + Harvest OAuth)

1. User → Sign in with Harvest → OAuth → Better Auth
2. Tokens stored in PostgreSQL (per-user OAuth tokens)
3. Session enriched with Harvest user data + roles + permissions
4. User data sourced from Harvest API (not stored locally)

**Key Point**: Each user has their own OAuth token. `HARVEST_ACCOUNT_ID` is shared (org ID).

### Session Structure

```typescript
session.user = {
  id, email, name, firstName, lastName, image,
  harvestUserId: number,
  accessRoles: ['administrator' | 'manager' | 'member'],
  primaryRole: string,
  isContractor: boolean,
  permissions: {
    timeEntries: string[],
    expenses: string[],
    projects: string[],
    users: string[],
    reports: string[]
  }
}
```

Access: `useSession()` from `@/lib/auth-client`

### Layout Structure

**Dashboard**: [src/app/dashboard/layout.tsx](src/app/dashboard/layout.tsx)

- Collapsible sidebar navigation (shadcn/ui Sidebar)
- Keyboard shortcut: Cmd/Ctrl+B to toggle
- Mobile responsive (opens as sheet)
- Component: [AppSidebar](src/components/app-sidebar.tsx)

### Proxy (Authentication)

**File**: [src/proxy.ts](src/proxy.ts)

- Checks `better-auth.session_token` cookie
- Redirects to `/sign-in` if missing
- Public routes: `/sign-in`, `/api/auth/*`, `/auth-error`

### API Route Pattern

**Location**: [src/app/api/harvest/](src/app/api/harvest/)

```typescript
// Standard pattern for all Harvest API routes
const session = await auth.api.getSession({ headers: request.headers });
if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

const { accessToken } = await auth.api.getAccessToken({
  body: { providerId: 'harvest' },
  headers: request.headers,
});

const harvestClient = createHarvestClient(accessToken);
const data = await harvestClient.getTimeEntries(params);
```

**Critical**: `accessToken` is user-specific (OAuth), not a shared PAT.

### Harvest Client

**File**: [src/lib/harvest/client.ts](src/lib/harvest/client.ts)

```typescript
createHarvestClient(accessToken: string): HarvestClient
```

- Axios instance with Harvest API v2
- `Authorization: Bearer ${accessToken}` (user-specific)
- `Harvest-Account-ID: ${process.env.HARVEST_ACCOUNT_ID}` (shared org ID)
- Error interceptor → `HarvestAPIError`
- Supports file uploads via multipart/form-data (receipt attachments)

### React Query Patterns

**File**: [src/hooks/use-harvest.ts](src/hooks/use-harvest.ts)

**Query Keys**:

```typescript
harvestKeys = {
  all: ['harvest'],
  timeEntries: (params?) => ['harvest', 'time-entries', normalizeParams(params)],
  expenses: (params?) => ['harvest', 'expenses', normalizeParams(params)],
  projects: () => ['harvest', 'projects'],
  tasks: projectId => ['harvest', 'tasks', projectId],
  expenseCategories: () => ['harvest', 'expense-categories'],
  currentUser: () => ['harvest', 'current-user'],
};
```

**Query Normalization**: `normalizeParams()` sorts object keys to prevent duplicate cache entries:
```typescript
// These create the SAME cache key:
harvestKeys.timeEntries({ to: '2024-01-31', from: '2024-01-01' })
harvestKeys.timeEntries({ from: '2024-01-01', to: '2024-01-31' })
```

**Stale Times**:

- Time entries/expenses: 0ms (always fresh)
- Projects/tasks: 5min
- Expense categories: 10min
- Current user: 30min

**Mutations**: Use wildcard `invalidateQueries()` to match all param variations:
```typescript
// ✅ CORRECT - Invalidates all time entry queries regardless of params
queryClient.invalidateQueries({
  queryKey: [...harvestKeys.all, 'time-entries']
});

// ❌ WRONG - Only invalidates exact match
queryClient.setQueryData(harvestKeys.timeEntries(), ...)
```

### Role-Based Data Access

**Harvest API Permissions**:

| Endpoint | Admin/Manager | Member |
|----------|---------------|--------|
| `/projects` | ✅ | ❌ 403 |
| `/projects/{id}/task_assignments` | ✅ | ❌ 403 |
| `/users/me/project_assignments` | ✅ | ✅ |
| `/time_entries` | ✅ (all) | ✅ (own) |
| `/expenses` | ✅ (all) | ✅ (own) |

**App Endpoints** (internal API routes):
- `/api/harvest/projects` → `/projects` (admin/manager only)
- `/api/harvest/user-project-assignments` → `/users/me/project_assignments` (all users)
- `/api/harvest/projects/{id}/tasks` → `/projects/{id}/task_assignments` (admin/manager only)
- `/api/harvest/user-task-assignments?projectId={id}` → `/users/me/project_assignments` (all users)

**Conditional Query Pattern**:

```typescript
const { data: session } = useSession();

// Compute role (undefined on first render until session loads)
const isAdminOrManager = session?.user?.accessRoles?.some(
  role => role === 'administrator' || role === 'manager'
);

// CRITICAL: Use !!session && to prevent query execution before session loads
const { data: allProjectsData } = useProjects({
  enabled: !!session && isAdminOrManager, // Waits for session, then checks role
});

const { data: userProjectsData } = useUserProjectAssignments({
  enabled: !!session && !isAdminOrManager,
});

// Use role-appropriate data
const projectsData = isAdminOrManager ? allProjectsData : userProjectsData;
```

**Why `!!session &&` is Required**:

```typescript
// ❌ WRONG - Causes 403 errors for members
enabled: isAdminOrManager  // undefined on first render → truthy → query runs immediately!

// ✅ CORRECT - Waits for session to load
enabled: !!session && isAdminOrManager  // false until session loads
```

**TanStack Query `enabled` Behavior**:
- `undefined` → Query runs (treated as truthy!)
- `false` → Query disabled
- `!!session &&` → Ensures explicit `false` until session loads

### Admin/Manager Permission Architecture

**Server-Side Permission Strategy (SIMPLIFIED)**:

Our API routes use a **trust Harvest API** approach for manager permissions:

```typescript
// All admin/manager routes follow this pattern:
export async function PATCH(request: NextRequest, { params }) {
  // 1. Auth check
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. Role check (admin OR manager allowed)
  if (!isAdminOrManager(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 3. Get user's access token
  const { accessToken } = await auth.api.getAccessToken({
    body: { providerId: 'harvest' },
    headers: request.headers,
  });

  // 4. Call Harvest API - it handles manager permissions via OAuth token
  const client = createHarvestClient(accessToken);
  const result = await client.updateProject(projectId, body);
  // ✅ Harvest returns 403 if manager tries to access unmanaged project

  return NextResponse.json(result);
}
```

**Why This Works**:
- ✅ Harvest API enforces permissions via OAuth tokens
- ✅ Manager tokens can only access projects they manage
- ✅ No redundant permission checks needed (avoids N+1 queries)
- ✅ Simpler code, fewer API calls, better performance

**Manager Filtering (Client-Side)**:

For queries that need manager-specific filtering, use `useManagedProjects()` hook:

```typescript
const { data: session } = useSession();
const { data: managedProjectIds } = useManagedProjects(); // Only runs for managers

const isManager = session?.user?.accessRoles?.includes('manager');
const isAdmin = session?.user?.accessRoles?.includes('administrator');

// Filter data client-side for managers
const filteredData = useMemo(() => {
  if (!data || isAdmin) return data; // Admins see all
  if (isManager && managedProjectIds) {
    return data.filter(item => managedProjectIds.includes(item.project.id));
  }
  return data;
}, [data, isManager, isAdmin, managedProjectIds]);
```

**useManagedProjects() Hook**:
- Fetches `/api/harvest/user-project-assignments?raw=true`
- Filters for `is_project_manager === true`
- Returns array of managed project IDs
- Enabled only for managers (not admins or members)
- 10min staleTime for performance

### Token Refresh

Access tokens expire after 14 days. Auto-refresh via:

1. API detects 401 from Harvest
2. Calls `/api/auth/refresh-harvest-token`
3. Uses refresh token → new access token
4. Retries request

Manual refresh: `refreshUserHarvestToken()` from `@/lib/auth-utils`

## Environment Variables

```bash
# Required
BETTER_AUTH_SECRET=              # openssl rand -base64 32
NEXT_PUBLIC_APP_URL=             # http://localhost:3000
DATABASE_URL=                    # PostgreSQL (Neon)
HARVEST_OAUTH_CLIENT_ID=         # OAuth app
HARVEST_OAUTH_CLIENT_SECRET=     # OAuth app
HARVEST_ACCOUNT_ID=              # Numeric org ID

# Optional
UPLOADTHING_SECRET=              # Receipt uploads
UPLOADTHING_APP_ID=              # Receipt uploads
```

## Key Files

1. [src/lib/auth.ts](src/lib/auth.ts) - Better Auth config
2. [src/lib/harvest/client.ts](src/lib/harvest/client.ts) - Harvest client factory
3. [src/proxy.ts](src/proxy.ts) - Auth proxy (Next.js 16)
4. [src/app/api/harvest/time-entries/route.ts](src/app/api/harvest/time-entries/route.ts) - API pattern reference
5. [src/hooks/use-harvest.ts](src/hooks/use-harvest.ts) - React Query hooks
6. [src/lib/auth-utils.ts](src/lib/auth-utils.ts) - Auth utilities
7. [src/lib/admin-utils.ts](src/lib/admin-utils.ts) - Admin role checks and utilities
8. [src/components/app-sidebar.tsx](src/components/app-sidebar.tsx) - Sidebar navigation
9. [src/components/time-entry-modal.tsx](src/components/time-entry-modal.tsx) - Time entry modal
10. [src/components/expense-modal.tsx](src/components/expense-modal.tsx) - Expense modal
11. [src/components/expense-form.tsx](src/components/expense-form.tsx) - Reusable expense form
12. [src/components/time-entry-form.tsx](src/components/time-entry-form.tsx) - Reusable time entry form
13. [src/components/admin/forms/project-form-modal.tsx](src/components/admin/forms/project-form-modal.tsx) - Project form with budget field handling

## Common Patterns

### New API Route

1. Create in `src/app/api/harvest/`
2. Follow pattern: session → accessToken → **validation** → client → Harvest API
3. Validate request body using Zod schemas (see Server-Side Validation below)
4. Use `logError()` from `@/lib/logger` for sanitized error logging
5. Return NextResponse with proper status codes (400 for validation errors, 401 for auth, 500 for server errors)

### New React Query Hook

1. Add query key to `harvestKeys`
2. Use `useQuery` or `useMutation`
3. Invalidate related queries in `onSuccess`
4. Set appropriate `staleTime`

### Role-Based UI

**Client-side (in components):**

```typescript
import { useIsAdminOrManager } from '@/lib/admin-utils';

// Use hook for cleaner code (recommended)
const isAdminOrManager = useIsAdminOrManager();

// Or check session directly
const { data: session } = useSession();
const isAdmin = session?.user?.accessRoles?.includes('administrator');
const canApprove = session?.user?.permissions?.expenses?.includes('approve');
```

**Server-side (in API routes):**

```typescript
import { isAdminOrManager } from '@/lib/admin-utils';

// Check roles (admin OR manager allowed)
if (!isAdminOrManager(session)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// No need for canManageProject() checks - Harvest API handles this via OAuth tokens
// Manager tokens can only access projects they manage (Harvest returns 403 otherwise)
```

### Modal Pattern

Reusable modals with Dialog component:

```typescript
// Component
export function MyModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}>...</Dialog>
}

// Usage
const [open, setOpen] = useState(false);
<Button onClick={() => setOpen(true)}>Open</Button>
<MyModal open={open} onOpenChange={setOpen} />
```

See [TimeEntryModal](src/components/time-entry-modal.tsx) and [ExpenseModal](src/components/expense-modal.tsx)

### Reusable Form Components

**Pattern**: Extract complex forms into reusable components for modals and inline pages.

**Benefits**:
- Single source of truth (update once)
- Consistent validation and behavior
- Easier testing and maintenance
- Smaller modal files (~90% size reduction)

**Example Components**:

#### ExpenseForm
[src/components/expense-form.tsx](src/components/expense-form.tsx)
- Used by: ExpenseModal, expenses page
- Features: Receipt upload (10MB max, JPEG/PNG/GIF/PDF), role-based projects, validation
- Props: `onSuccess`, `onCancel`, `showCancelButton`, `submitButtonText`
- **Uses `useIsAdminOrManager()` hook** for role-based project fetching

#### TimeEntryForm
[src/components/time-entry-form.tsx](src/components/time-entry-form.tsx)
- Used by: TimeEntryModal, time entries page
- Features: Project-task cascade, role-based projects, hours validation (0-24)
- Props: `onSuccess`, `onCancel`, `showCancelButton`, `submitButtonText`
- **Uses `useIsAdminOrManager()` hook** for role-based project/task fetching

**Usage**:
```typescript
// Modal wrapper
<ExpenseModal open={open} onOpenChange={setOpen} />

// Inline usage
<ExpenseForm showCancelButton={false} />
```

## Multi-User Architecture

Each consultant has:

- Own Harvest account in PMO Hive org
- Own OAuth tokens (access + refresh)
- Own session
- Isolated data (enforced by Harvest API)

Shared:

- `HARVEST_ACCOUNT_ID` (org ID)
- OAuth client credentials
- Database (separate rows per user)

## React Patterns & Common Pitfalls

### Rules of Hooks - Admin Pages Pattern

**CRITICAL**: All hooks MUST be called before early returns to avoid conditional execution.

**Correct Pattern**:
```typescript
export default function AdminPage() {
  // 1. All hooks at top (session, role checks, state)
  const { data: session } = useSession();
  const isAdminOrManager = useIsAdminOrManager();
  const [state, setState] = useState();

  // 2. Data hooks (queries, mutations)
  const { data } = useData();
  const mutation = useMutation();

  // 3. Computed values (useMemo)
  const filtered = useMemo(() => {...}, [deps]);

  // 4. Side effects (useEffect)
  useEffect(() => { router.push('/dashboard'); }, [deps]);

  // 5. Early returns AFTER all hooks
  if (!session) return null;

  // 6. Rest of component
  return <div>...</div>;
}
```

**Files Following This Pattern**:
- [src/app/dashboard/admin/projects/page.tsx](src/app/dashboard/admin/projects/page.tsx)
- [src/app/dashboard/admin/team/page.tsx](src/app/dashboard/admin/team/page.tsx)
- [src/app/dashboard/admin/clients/page.tsx](src/app/dashboard/admin/clients/page.tsx)
- [src/app/dashboard/admin/time/page.tsx](src/app/dashboard/admin/time/page.tsx)
- [src/app/dashboard/admin/expenses/page.tsx](src/app/dashboard/admin/expenses/page.tsx)

### Server-Side Validation

All POST/PATCH API routes validate request bodies using Zod schemas:

```typescript
import { validateRequest } from '@/lib/validation/validate-request';
import { timeEntryCreateSchema } from '@/lib/validation/harvest-schemas';

const body = await request.json();

// Validate request body
const validation = validateRequest(timeEntryCreateSchema, body);
if (!validation.success) {
  return NextResponse.json(
    { error: validation.message, errors: validation.errors },
    { status: 400 }
  );
}

// Use validation.data (type-safe!)
const result = await harvestClient.createTimeEntry(validation.data);
```

**Available Schemas**: See [src/lib/validation/harvest-schemas.ts](src/lib/validation/harvest-schemas.ts)

### Numeric Input Hook

For decimal inputs (hours, costs), use `useNumericInput()` hook:

```typescript
import { useNumericInput } from '@/hooks/use-numeric-input';

const numericHandlers = useNumericInput(2); // 2 decimal places

<Input
  inputMode="decimal"
  placeholder="8.0"
  {...field}
  onKeyDown={numericHandlers.onKeyDown}
  onChange={e => numericHandlers.onChange(e, field.onChange)}
/>
```

### Error Boundaries

Error boundaries wrap layouts to prevent white screens:

```typescript
import { ErrorBoundary } from '@/components/error-boundary';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

**Reference**: [src/components/error-boundary.tsx](src/components/error-boundary.tsx)

### Calendar Popover Pattern

Use state management to close calendar on selection:

```typescript
<FormField
  render={({ field }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <Calendar
          onSelect={date => {
            field.onChange(date);
            setIsOpen(false); // Close on selection
          }}
        />
      </Popover>
    );
  }}
/>
```

**Reference**: [src/components/time-entry-form.tsx](src/components/time-entry-form.tsx:146-181)

### Harvest Budget Fields

**CRITICAL**: Harvest has TWO budget fields:

1. **`budget`** (number) - Hours-based (budget_by = "project", "task", "person")
2. **`cost_budget`** (number) - Monetary (budget_by = "project_cost", "task_fees")

**Form Submission**:
```typescript
const isCostBased = budget_by === 'project_cost' || budget_by === 'task_fees';
const payload = {
  budget_by,
  ...(isCostBased ? { cost_budget: value } : { budget: value })
};
```

**Display Logic**:
```typescript
const budgetValue = isCostBased ? project.cost_budget : project.budget;
return budgetValue ? `${isCostBased ? '$' : ''}${budgetValue}${isHoursBased ? 'h' : ''}` : '—';
```

**Reference**:
- [src/components/admin/forms/project-form-modal.tsx](src/components/admin/forms/project-form-modal.tsx:153-173)
- [src/app/dashboard/admin/projects/page.tsx](src/app/dashboard/admin/projects/page.tsx:136-156)

## Gotchas

1. **Access Token**: Always user-specific OAuth token, never shared PAT
2. **Account ID**: Shared org ID from env var
3. **Token Expiration**: 14 days, auto-refresh on 401
4. **Proxy File**: Named `src/proxy.ts` with `proxy` export (Next.js 16)
5. **Session Cookie**: HTTP uses `better-auth.session_token`, HTTPS uses `__Secure-` prefix
6. **Data Isolation**: Enforced by Harvest API via user-specific tokens
