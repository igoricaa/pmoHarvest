# PMO Harvest Portal

Internal time and expense tracking portal for PMO Hive consultants, integrating with Harvest API.

## Tech Stack

- **Framework**: Next.js 15 (App Router, Turbopack)
- **Auth**: Better Auth + Harvest OAuth (SSO)
- **Database**: PostgreSQL (Neon) - OAuth tokens only
- **State**: TanStack React Query
- **UI**: shadcn/ui + Tailwind CSS v4
- **Forms**: React Hook Form + Zod
- **Linting**: Biome

## Quick Start

```bash
# Install
pnpm install

# Setup environment (see .env.local.example)
cp .env.local.example .env.local

# Configure:
# - Better Auth secret
# - Neon PostgreSQL database
# - Harvest OAuth app credentials
# - Harvest Account ID

# Run
pnpm dev
```

## Environment Variables

```bash
BETTER_AUTH_SECRET=              # openssl rand -base64 32
NEXT_PUBLIC_APP_URL=             # http://localhost:3000
DATABASE_URL=                    # PostgreSQL from neon.tech
HARVEST_OAUTH_CLIENT_ID=         # From id.getharvest.com/oauth2_clients
HARVEST_OAUTH_CLIENT_SECRET=     # From OAuth app
HARVEST_ACCOUNT_ID=              # From id.getharvest.com/developers
```

## Architecture

- **Auth**: Harvest OAuth → Better Auth → PostgreSQL (tokens only)
- **User data**: Sourced from Harvest API, not stored locally
- **API Routes**: Next.js routes proxy to Harvest API with user-specific OAuth tokens
- **Sessions**: Include Harvest roles (`administrator`, `manager`, `member`) and permissions

See [CLAUDE.md](CLAUDE.md) for detailed architecture and [SETUP.md](SETUP.md) for setup instructions.

## Commands

```bash
pnpm dev        # Dev server
pnpm build      # Production build
pnpm start      # Production server
pnpm lint       # Biome linter
pnpm format     # Biome formatter
```

## License

Private - PMO Hive Internal Use Only
