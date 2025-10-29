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

### React Query Patterns

**File**: [src/hooks/use-harvest.ts](src/hooks/use-harvest.ts)

**Query Keys**:

```typescript
harvestKeys = {
  all: ['harvest'],
  timeEntries: (params?) => ['harvest', 'time-entries', params],
  expenses: (params?) => ['harvest', 'expenses', params],
  projects: () => ['harvest', 'projects'],
  tasks: projectId => ['harvest', 'tasks', projectId],
  expenseCategories: () => ['harvest', 'expense-categories'],
  currentUser: () => ['harvest', 'current-user'],
};
```

**Stale Times**:

- Time entries/expenses: 0ms (always fresh)
- Projects/tasks: 5min
- Expense categories: 10min
- Current user: 30min

**Mutations**: Invalidate related queries in `onSuccess`

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
7. [src/components/app-sidebar.tsx](src/components/app-sidebar.tsx) - Sidebar navigation
8. [src/components/time-entry-modal.tsx](src/components/time-entry-modal.tsx) - Time entry modal
9. [src/components/expense-modal.tsx](src/components/expense-modal.tsx) - Expense modal

## Common Patterns

### New API Route

1. Create in `src/app/api/harvest/`
2. Follow pattern: session → accessToken → client → Harvest API
3. Use `getErrorMessage()` from `@/lib/api-utils`
4. Return NextResponse with proper status codes

### New React Query Hook

1. Add query key to `harvestKeys`
2. Use `useQuery` or `useMutation`
3. Invalidate related queries in `onSuccess`
4. Set appropriate `staleTime`

### Role-Based UI

```typescript
const { data: session } = useSession();
const isAdmin = session?.user?.accessRoles?.includes('administrator');
const canApprove = session?.user?.permissions?.expenses?.includes('approve');
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

## Gotchas

1. **Access Token**: Always user-specific OAuth token, never shared PAT
2. **Account ID**: Shared org ID from env var
3. **Token Expiration**: 14 days, auto-refresh on 401
4. **Proxy File**: Named `src/proxy.ts` with `proxy` export (Next.js 16)
5. **Session Cookie**: HTTP uses `better-auth.session_token`, HTTPS uses `__Secure-` prefix
6. **Data Isolation**: Enforced by Harvest API via user-specific tokens
