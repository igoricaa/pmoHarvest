# PMO Harvest Portal - Setup Guide

## Quick Start

### 1. Environment Setup

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your credentials:

#### Clerk (Authentication)
1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Create a new application or use an existing one
3. Navigate to **API Keys** in the sidebar
4. Copy your keys:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

#### Harvest (Time & Expense API)
1. Go to [https://id.getharvest.com/developers](https://id.getharvest.com/developers)
2. Create a new Personal Access Token
3. Copy your Account ID and Access Token:

```env
HARVEST_ACCOUNT_ID=1234567
HARVEST_ACCESS_TOKEN=your_token_here
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features Overview

### ✅ Authentication
- Secure login with Clerk
- SSO support ready
- Protected routes via middleware

### ✅ Time Entry
- **Route:** `/dashboard/time`
- Log hours against projects and tasks
- Date picker for selecting work date
- Project and task dropdowns (dynamically loaded from Harvest)
- Hours input with decimal support
- Optional notes field
- View recent time entries (last 30 days)
- Delete time entries
- See total hours logged

### ✅ Expense Tracking
- **Route:** `/dashboard/expenses`
- Submit expenses with amount and category
- Associate with projects
- Optional notes
- View recent expenses (last 30 days)
- Track status (Pending/Locked/Billed)
- Delete pending expenses
- See total expense amount

### ✅ Dashboard
- **Route:** `/dashboard`
- Weekly hours summary
- Monthly hours summary
- Monthly expense total
- Pending expenses count
- Recent activity feed (time & expenses)
- Quick action buttons

## Project Structure

```
src/
├── app/
│   ├── api/harvest/              # Secure API proxy to Harvest
│   │   ├── time-entries/        # Time entry CRUD
│   │   ├── expenses/            # Expense CRUD
│   │   ├── projects/            # Project listings
│   │   └── expense-categories/  # Expense categories
│   ├── dashboard/               # Main app pages
│   │   ├── time/               # Time entry page
│   │   ├── expenses/           # Expense page
│   │   └── page.tsx            # Dashboard home
│   ├── sign-in/                # Clerk sign-in
│   └── sign-up/                # Clerk sign-up
├── components/
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── harvest/                # Harvest API client
│   └── api-utils.ts            # API utilities
├── hooks/
│   └── use-harvest.ts          # React Query hooks
└── types/
    └── harvest.ts              # TypeScript types
```

## API Routes

All API routes are authenticated via Clerk and proxy requests to Harvest:

- `GET /api/harvest/time-entries` - List time entries
- `POST /api/harvest/time-entries` - Create time entry
- `PATCH /api/harvest/time-entries/[id]` - Update time entry
- `DELETE /api/harvest/time-entries/[id]` - Delete time entry
- `GET /api/harvest/expenses` - List expenses
- `POST /api/harvest/expenses` - Create expense
- `GET /api/harvest/projects` - List projects
- `GET /api/harvest/projects/[id]/tasks` - Get project tasks
- `GET /api/harvest/expense-categories` - List expense categories
- `GET /api/harvest/users/me` - Get current user

## Development Commands

```bash
# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server (after build)
pnpm start

# Lint code
pnpm lint

# Format code
pnpm format
```

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import repository in [Vercel](https://vercel.com)
3. Add all environment variables from `.env.local`
4. Deploy!

### Other Platforms

The app works on any platform that supports Next.js 15:
- Netlify
- Railway
- Render
- AWS Amplify
- Self-hosted

**Important:** Make sure to set all environment variables in your deployment platform.

## Security

- ✅ Harvest API keys are server-side only
- ✅ All API routes protected with Clerk authentication
- ✅ Clerk middleware protects dashboard routes
- ✅ TypeScript for type safety
- ✅ Input validation with Zod
- ✅ No sensitive data in client bundle

## Troubleshooting

### Build Fails with Missing publishableKey

This means Clerk environment variables aren't set. Add them to `.env.local`.

### "Unauthorized" errors

Make sure you're signed in and your Clerk session is valid.

### No projects/tasks showing up

1. Check Harvest credentials in `.env.local`
2. Make sure you have active projects in Harvest
3. Check browser console for API errors

### Time entries not saving

1. Verify Harvest API token has write permissions
2. Check that the project and task are active
3. Look for errors in the browser console

## Next Steps

- [ ] Add receipt upload for expenses (UploadThing ready)
- [ ] Add manager approval workflow
- [ ] Add filtering and search
- [ ] Add export to CSV/Excel
- [ ] Add email notifications
- [ ] Add mobile app

## Support

- **Harvest API Docs:** [https://help.getharvest.com/api-v2/](https://help.getharvest.com/api-v2/)
- **Clerk Docs:** [https://clerk.com/docs](https://clerk.com/docs)
- **Next.js Docs:** [https://nextjs.org/docs](https://nextjs.org/docs)
