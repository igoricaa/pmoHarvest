# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
pnpm dev              # Dev server with Turbopack
pnpm build            # Production build with Turbopack
pnpm start            # Production server (requires build)
pnpm lint             # Biome linter
pnpm format           # Biome formatter
```

## Authentication Architecture

### Better Auth + Harvest OAuth

- **Single source of truth**: Harvest (users, roles, permissions)
- **Database purpose**: PostgreSQL stores ONLY OAuth tokens and sessions, NO user data
- **Token model**: Each user has their own Harvest OAuth token (not shared PAT)
- **Session enrichment**: User roles and permissions from Harvest included in session
- **Multi-user support**: Each consultant authenticates with their own Harvest account
- **Organization scope**: All users must be in the same Harvest organization (PMO Hive)

### OAuth Flow

1. User → clicks "Sign in with Harvest" → redirected to Harvest OAuth
2. User authenticates with their Harvest credentials
3. Harvest OAuth returns authorization code
4. Better Auth exchanges code for access token + refresh token
5. Tokens stored in PostgreSQL
6. User profile fetched from Harvest API (`/users/me`)
7. Session created with Harvest data (roles: `administrator`, `manager`, `member`)
8. User redirected to dashboard

### Token Lifecycle

- **Access Token Expiration**: 14 days (1,209,600 seconds)
- **Refresh Token**: Used to obtain new access tokens
- **Token Refresh**: Automatic via `/api/auth/refresh-harvest-token`
- **Token Storage**: PostgreSQL `account` table (Better Auth)
- **Token Update**: Use `harvestClient.updateAccessToken(newToken)` after refresh

### Session Structure

Session available via `useSession()` from `@/lib/auth-client`:

```typescript
session.user = {
  id, email, name, firstName, lastName, image,
  harvestUserId: number,
  accessRoles: string[],        // ['administrator', 'manager', 'member']
  harvestRoles: string[],       // Custom roles
  primaryRole: string,          // First access role
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

### Middleware

[src/middleware.ts](src/middleware.ts):
- Checks `better-auth.session_token` cookie
- Redirects to `/sign-in` if missing
- Public routes: `/sign-in`, `/api/auth/*`

## API Route Pattern

All Harvest API routes in [src/app/api/harvest/](src/app/api/harvest/) follow this pattern:

```typescript
// 1. Verify session
const session = await auth.api.getSession({ headers: request.headers });
if (!session?.user) return 401;

// 2. Get user's Harvest OAuth token
const { accessToken } = await auth.api.getAccessToken({
  body: { providerId: 'harvest' },
  headers: request.headers,
});

// 3. Create client with user's token
const harvestClient = createHarvestClient(accessToken);

// 4. Call Harvest API
const data = await harvestClient.getTimeEntries(params);
```

**Critical**: `accessToken` is user-specific from OAuth, not a shared PAT. `HARVEST_ACCOUNT_ID` is shared from env.

## Harvest Client

[src/lib/harvest/client.ts](src/lib/harvest/client.ts)

### Factory

```typescript
createHarvestClient(accessToken: string): HarvestClient
```

- Creates axios instance for Harvest API v2
- Sets `Authorization: Bearer ${accessToken}` (user-specific)
- Sets `Harvest-Account-ID` from `process.env.HARVEST_ACCOUNT_ID` (shared)
- Error interceptor converts to `HarvestAPIError` with statusCode and response

### Error Handling

All errors → `HarvestAPIError` with message, statusCode, optional response data.

## React Query

[src/hooks/use-harvest.ts](src/hooks/use-harvest.ts)

### Query Keys

```typescript
harvestKeys = {
  all: ['harvest'],
  timeEntries: (params?) => ['harvest', 'time-entries', params],
  expenses: (params?) => ['harvest', 'expenses', params],
  projects: () => ['harvest', 'projects'],
  tasks: (projectId) => ['harvest', 'tasks', projectId],
  expenseCategories: () => ['harvest', 'expense-categories'],
  currentUser: () => ['harvest', 'current-user'],
}
```

### Cache Invalidation

Mutations invalidate related queries:
- Create/update/delete time entry → `['harvest', 'time-entries']`
- Create/update/delete expense → `['harvest', 'expenses']`

### Stale Times

- Time entries/expenses: 0ms (always fresh)
- Projects/tasks: 5 min
- Expense categories: 10 min
- Current user: 30 min

## Environment Variables

Required:

```bash
BETTER_AUTH_SECRET=              # openssl rand -base64 32
NEXT_PUBLIC_APP_URL=             # http://localhost:3000 or production
DATABASE_URL=                    # PostgreSQL (Neon)
HARVEST_OAUTH_CLIENT_ID=         # OAuth app
HARVEST_OAUTH_CLIENT_SECRET=     # OAuth app
HARVEST_ACCOUNT_ID=              # Harvest account
```

Optional:

```bash
UPLOADTHING_SECRET=              # Receipt uploads
UPLOADTHING_APP_ID=              # Receipt uploads
```

## Tech Stack

- Next.js 15 (App Router, Turbopack)
- Better Auth (generic OAuth plugin for Harvest)
- PostgreSQL (Neon) - tokens only
- TanStack React Query v5
- React Hook Form + Zod
- shadcn/ui + Radix UI
- Tailwind CSS v4
- Biome (linting/formatting)

## Key Files

1. [src/lib/auth.ts](src/lib/auth.ts) - Better Auth config with Harvest OAuth
2. [src/lib/harvest/client.ts](src/lib/harvest/client.ts) - Harvest client
3. [src/middleware.ts](src/middleware.ts) - Session protection
4. [src/app/api/harvest/time-entries/route.ts](src/app/api/harvest/time-entries/route.ts) - API pattern reference
5. [src/hooks/use-harvest.ts](src/hooks/use-harvest.ts) - Query hooks

## Common Patterns

### New API Route

1. Create in `src/app/api/harvest/`
2. Follow: session → accessToken → client → Harvest API
3. Use `getErrorMessage()` from `@/lib/api-utils`
4. Return NextResponse with status codes

### New React Query Hook

1. Add query key to `harvestKeys`
2. Use `useQuery` or `useMutation`
3. Mutations: invalidate related queries in `onSuccess`
4. Set `staleTime` based on data volatility

### Role-Based UI

```typescript
const { data: session } = useSession();
const isAdmin = session?.user?.accessRoles?.includes('administrator');
const canApprove = session?.user?.permissions?.expenses?.includes('approve');
```

## Testing OAuth Locally

1. Create OAuth app at id.getharvest.com/oauth2_clients
2. Redirect URI: `http://localhost:3000/api/auth/callback/harvest`
3. Add credentials to `.env.local`
4. Run `pnpm dev` → `/sign-in` → "Sign in with Harvest"

## Token Refresh

### How It Works

Access tokens expire after 14 days. The app automatically refreshes them:

1. API route detects 401 error from Harvest
2. Calls `/api/auth/refresh-harvest-token`
3. Uses refresh token to get new access token
4. Updates Harvest client with new token
5. Retries original request

### Manual Refresh

```typescript
import { refreshUserHarvestToken } from '@/lib/auth-utils';

const newToken = await refreshUserHarvestToken();
if (newToken) {
  // Token refreshed successfully
} else {
  // Refresh failed - user needs to re-authenticate
}
```

### Refresh Token Rotation

Harvest provides a NEW refresh token with each refresh. Better Auth automatically handles rotation.

## Troubleshooting

### Common Issues

**"No Harvest access token found"**
- User's OAuth token is missing
- Solution: Re-authenticate via `/sign-in`

**"Token refresh failed"**
- Refresh token expired or invalid
- Solution: User must sign in again

**"Failed to fetch user info from Harvest"**
- Invalid `HARVEST_ACCOUNT_ID`
- User not in the organization
- Solution: Check env vars and user permissions

**OAuth errors (access_denied, invalid_state)**
- User denied access
- OAuth state mismatch
- Solution: Redirected to `/auth-error` with details

**401 from Harvest API**
- Access token expired
- Invalid token
- Solution: Should auto-refresh, or re-authenticate

### Debug Mode

Enable detailed logging:

```typescript
// In API route
console.log('Access token:', accessToken.substring(0, 10) + '...');
console.log('Harvest Account ID:', process.env.HARVEST_ACCOUNT_ID);
```

### OAuth Configuration Checklist

- [ ] `HARVEST_OAUTH_CLIENT_ID` set correctly
- [ ] `HARVEST_OAUTH_CLIENT_SECRET` set correctly
- [ ] `HARVEST_ACCOUNT_ID` set correctly (numeric ID)
- [ ] Redirect URI matches in Harvest OAuth app settings
- [ ] User has active account in Harvest organization
- [ ] Database connection working (`DATABASE_URL`)
- [ ] `BETTER_AUTH_SECRET` generated and set

## Security Best Practices

1. **Token Encryption**: Consider encrypting OAuth tokens at rest in production
2. **Secure Headers**: CSP, HSTS, X-Frame-Options configured
3. **Rate Limiting**: Add rate limiting to API routes
4. **Audit Logging**: Log admin actions
5. **Token Rotation**: Refresh tokens are automatically rotated
6. **Session Security**: Sessions expire after 7 days
7. **HTTPS Only**: Always use HTTPS in production

## Multi-User Architecture

### How Multiple Consultants Work

Each consultant has:
- **Own Harvest account** in PMO Hive organization
- **Own OAuth tokens** (access + refresh)
- **Own session** in the app
- **Isolated data** (see only their time entries/expenses)

Shared resources:
- **Harvest Account ID** (`HARVEST_ACCOUNT_ID` env var)
- **OAuth Client** (same Client ID/Secret for all users)
- **Database** (separate rows per user)

### User Onboarding

1. Add consultant to Harvest organization (PMO Hive)
2. Assign appropriate role (administrator/manager/member)
3. Share app URL with consultant
4. Consultant signs in with their Harvest credentials
5. OAuth flow creates their account in app database
6. Consultant can now track time/expenses

### Role-Based Access

- **Member** (Consultant): Create/read/update/delete own time/expenses
- **Manager**: Same as member + approve expenses + read team data
- **Administrator**: Full access + user management + reports
