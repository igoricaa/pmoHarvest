# PMO Harvest Portal

Internal time and expense tracking portal for PMO Hive consultants, integrating with Harvest API.

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **Better Auth** (Harvest OAuth SSO)
- **PostgreSQL** (Neon) - OAuth tokens only
- **TanStack Query** - server state
- **shadcn/ui + Tailwind v4** - UI
- **React Hook Form + Zod** - forms

## Quick Start

```bash
# Install
pnpm install

# Setup environment
cp .env.local.example .env.local
# Configure: Better Auth secret, Neon PostgreSQL, Harvest OAuth credentials

# Run
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) → Sign in with Harvest

## Environment Setup

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
- **User Data**: Sourced from Harvest API (not stored locally)
- **Multi-User**: Each consultant has their own OAuth token
- **API Routes**: Proxy to Harvest API with user-specific tokens
- **Sessions**: Include Harvest roles and permissions

See [CLAUDE.md](CLAUDE.md) for technical details and [SETUP.md](SETUP.md) for setup guide.

## Commands

```bash
pnpm dev        # Dev server
pnpm build      # Production build
pnpm start      # Production server
```

## License

Private - PMO Hive Internal Use Only
