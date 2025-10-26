# PMO Harvest Portal - Setup

## Prerequisites

- Node.js 18+
- pnpm
- Neon PostgreSQL account (free tier works)
- Harvest account with OAuth app

## 1. Database Setup

1. Go to [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string
4. Add to `.env.local`: `DATABASE_URL=postgresql://...`

## 2. Harvest OAuth App

1. Go to [id.getharvest.com/oauth2_clients](https://id.getharvest.com/oauth2_clients)
2. Create new OAuth2 application:
   - **Name**: PMO Harvest Portal
   - **Redirect URI**: `http://localhost:3000/api/auth/callback/harvest`
   - Production: `https://yourdomain.com/api/auth/callback/harvest`
3. Copy **Client ID** and **Client Secret**

## 3. Environment Variables

Create `.env.local`:

```bash
cp .env.local.example .env.local
```

Configure:

```bash
# Better Auth
BETTER_AUTH_SECRET=              # Run: openssl rand -base64 32
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://...    # From Neon

# Harvest OAuth
HARVEST_OAUTH_CLIENT_ID=         # From OAuth app
HARVEST_OAUTH_CLIENT_SECRET=     # From OAuth app
HARVEST_ACCOUNT_ID=              # From id.getharvest.com/developers

# Optional: Receipt uploads
UPLOADTHING_SECRET=
UPLOADTHING_APP_ID=
```

## 4. Install & Run

```bash
pnpm install
pnpm dev
```

Navigate to `http://localhost:3000` → redirects to `/sign-in` → "Sign in with Harvest"

## Production Deployment

1. Create production Neon database
2. Update Harvest OAuth app redirect URI to production URL
3. Set environment variables in deployment platform
4. Deploy (Vercel/Netlify/etc)

Database schema auto-created on first run.

## Multi-User Setup

This portal supports multiple consultants! Each consultant:

1. Must have a Harvest account in **your organization** (PMO Hive)
2. Signs in with **their own** Harvest credentials
3. Gets **their own** OAuth token (not shared)
4. Sees **only their own** data (time entries, expenses)

### Adding New Consultants

1. Add user to your Harvest organization at [harvest.com](https://id.getharvest.com/users)
2. Assign appropriate role (administrator/manager/member)
3. Share app URL with them
4. They sign in with their Harvest email/password
5. Done! They now have access

### Important Notes

- All consultants must be in the **same Harvest organization**
- The `HARVEST_ACCOUNT_ID` in `.env.local` is **shared** (your org ID)
- Each consultant's OAuth token is **unique** to them
- Data isolation is enforced by Harvest API (user-specific tokens)

## Troubleshooting

### "No Harvest access token found"

**Cause**: User's session exists but OAuth token is missing

**Solution**:
1. Sign out and sign in again
2. Check that Better Auth database tables exist
3. Verify `DATABASE_URL` is correct

### "Failed to fetch user info from Harvest"

**Cause**: Invalid account ID or user not in organization

**Solution**:
1. Verify `HARVEST_ACCOUNT_ID` in `.env.local` (should be numeric)
2. Confirm user has account in your Harvest organization
3. Check user is not deactivated in Harvest

### OAuth Errors (access_denied, invalid_state)

**Cause**: User denied access or OAuth state mismatch

**Solution**:
1. User should approve access when signing in
2. Clear cookies and try again
3. Check redirect URI matches exactly in Harvest OAuth app

### Database Connection Errors

**Cause**: Invalid `DATABASE_URL` or network issue

**Solution**:
1. Test connection string from Neon dashboard
2. Ensure SSL mode is included: `?sslmode=require`
3. Check firewall/network settings

### Token Refresh Failed

**Cause**: Refresh token expired or invalid

**Solution**:
1. User needs to sign in again (refresh tokens can expire)
2. Check OAuth app is still active in Harvest
3. Verify client secret hasn't changed

## Development Tips

### Test with Multiple Users

1. Create multiple Harvest test accounts in your org
2. Use different browsers/incognito windows
3. Sign in as different users
4. Verify data isolation

### Database Inspection

View Better Auth tables:

```sql
-- View users
SELECT id, email, name FROM user;

-- View OAuth accounts
SELECT userId, providerId, accessToken FROM account;

-- View sessions
SELECT userId, expiresAt FROM session;
```

### Reset User Token

If a user's token gets corrupted:

```sql
-- Delete user's OAuth account (forces re-auth)
DELETE FROM account WHERE userId = 'user_id_here' AND providerId = 'harvest';
```

User will need to sign in again.

## Security Checklist

Before going to production:

- [ ] Generate strong `BETTER_AUTH_SECRET` (32+ characters)
- [ ] Use HTTPS for all URLs (never HTTP in production)
- [ ] Update OAuth redirect URI to production domain
- [ ] Set `NODE_ENV=production`
- [ ] Enable database backups (Neon auto-backups)
- [ ] Review Harvest OAuth app permissions
- [ ] Test token refresh flow
- [ ] Verify error handling works
- [ ] Check all consultants can sign in
- [ ] Test role-based access control
