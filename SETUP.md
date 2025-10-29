# Setup Guide

## Prerequisites

- Node.js 20+
- pnpm
- Neon PostgreSQL account (free tier)
- Harvest account with OAuth app access

## 1. Database

1. Create account at [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string
4. Add to `.env.local`: `DATABASE_URL=postgresql://...`

## 2. Harvest OAuth App

1. Go to [id.getharvest.com/oauth2_clients](https://id.getharvest.com/oauth2_clients)
2. Create new OAuth2 application:
   - **Name**: PMO Harvest Portal
   - **Redirect URI**: `http://localhost:3000/api/auth/callback/harvest`
   - Production: `https://yourdomain.com/api/auth/callback/harvest`
3. Copy Client ID and Client Secret

## 3. Environment Variables

```bash
cp .env.local.example .env.local
```

Configure `.env.local`:

```bash
BETTER_AUTH_SECRET=              # openssl rand -base64 32
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://...    # From Neon
HARVEST_OAUTH_CLIENT_ID=         # From OAuth app
HARVEST_OAUTH_CLIENT_SECRET=     # From OAuth app
HARVEST_ACCOUNT_ID=              # From id.getharvest.com/developers (numeric)
```

## 4. Install & Run

```bash
pnpm install
pnpm dev
```

Visit `http://localhost:3000` → redirects to sign-in → "Sign in with Harvest"

Database schema auto-created on first run.

## Multi-User Setup

Each consultant:

1. Must have Harvest account in **your organization** (PMO Hive)
2. Signs in with **their own** credentials
3. Gets **their own** OAuth token
4. Sees **only their data**

**To add new consultant**:

1. Add user to Harvest org at [harvest.com/users](https://id.getharvest.com/users)
2. Assign role (administrator/manager/member)
3. Share app URL
4. They sign in with their Harvest credentials

**Important**: All users must be in same Harvest organization. The `HARVEST_ACCOUNT_ID` is shared (org ID).

## Production Deployment

1. Create production Neon database
2. Update Harvest OAuth redirect URI to production URL
3. Set environment variables in deployment platform
4. Deploy (Vercel/Netlify/etc)

## Troubleshooting

**"No Harvest access token found"**

- Sign out and sign in again
- Check database connection

**"Failed to fetch user info from Harvest"**

- Verify `HARVEST_ACCOUNT_ID` is correct (numeric)
- Confirm user is in your Harvest organization
- Check user is not deactivated

**OAuth errors (access_denied, invalid_state)**

- User must approve access when signing in
- Clear cookies and retry
- Verify redirect URI matches exactly

**Token refresh failed**

- User needs to sign in again (refresh tokens can expire)

## Database Inspection

```sql
-- View users
SELECT id, email, name FROM user;

-- View OAuth accounts
SELECT userId, providerId FROM account;

-- Reset user token (forces re-auth)
DELETE FROM account WHERE userId = 'user_id' AND providerId = 'harvest';
```
