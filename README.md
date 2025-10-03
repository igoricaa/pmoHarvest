# PMO Harvest Portal

An internal consultant portal for PMO Hive that integrates with Harvest API for time and expense tracking.

## Features

- 🔐 **Secure Authentication** - Clerk-based authentication with SSO support
- ⏰ **Time Entry** - Simple interface to log hours against projects and tasks
- 💰 **Expense Tracking** - Submit expenses with project association
- 📊 **Personal Dashboard** - View statistics and recent activity
- 🎨 **Modern UI** - Built with shadcn/ui and Tailwind CSS
- ⚡ **Real-time Updates** - React Query for efficient data fetching and caching

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Authentication**: Clerk
- **State Management**: TanStack React Query
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS v4
- **Forms**: React Hook Form + Zod
- **API Integration**: Harvest API v2

## Prerequisites

Before you begin, ensure you have:

1. **Node.js 18+** installed
2. **pnpm** package manager
3. **Clerk Account** - Get your keys from [https://dashboard.clerk.com](https://dashboard.clerk.com)
4. **Harvest Account** - Get your Account ID and Personal Access Token from [https://id.getharvest.com/developers](https://id.getharvest.com/developers)

## Getting Started

### 1. Clone and Install Dependencies

```bash
# Install dependencies
pnpm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your credentials:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Harvest API
HARVEST_ACCOUNT_ID=your_account_id_here
HARVEST_ACCESS_TOKEN=your_personal_access_token_here
```

### 3. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── api/harvest/          # API routes for Harvest integration
│   ├── dashboard/            # Protected dashboard routes
│   │   ├── time/            # Time entry page
│   │   ├── expenses/        # Expense tracking page
│   │   └── page.tsx         # Main dashboard
│   ├── sign-in/             # Clerk sign-in page
│   ├── sign-up/             # Clerk sign-up page
│   └── layout.tsx           # Root layout with providers
├── components/
│   ├── ui/                  # shadcn/ui components
│   └── providers.tsx        # React Query provider
├── lib/
│   ├── harvest/             # Harvest API client
│   └── utils.ts             # Utility functions
├── types/
│   └── harvest.ts           # TypeScript type definitions
├── hooks/
│   └── use-harvest.ts       # React Query hooks
└── middleware.ts            # Clerk authentication middleware
```

## Key Features Explained

### Time Entry
- Log hours against projects and tasks
- Select date, project, task, and hours
- Add optional notes
- View and delete recent entries
- See total hours for the period

### Expense Tracking
- Submit expenses with amount and category
- Associate expenses with projects
- Track expense status (Pending/Locked/Billed)
- View recent expenses with filtering

### Dashboard
- Weekly and monthly hours summary
- Monthly expense totals
- Pending expenses count
- Recent activity feed
- Quick action buttons

## API Routes

The app uses Next.js API routes as a secure proxy to the Harvest API:

- `GET /api/harvest/time-entries` - List time entries
- `POST /api/harvest/time-entries` - Create time entry
- `PATCH /api/harvest/time-entries/[id]` - Update time entry
- `DELETE /api/harvest/time-entries/[id]` - Delete time entry
- `GET /api/harvest/expenses` - List expenses
- `POST /api/harvest/expenses` - Create expense
- `GET /api/harvest/projects` - List active projects
- `GET /api/harvest/projects/[id]/tasks` - Get project tasks
- `GET /api/harvest/expense-categories` - List expense categories

## Development

```bash
# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint

# Format code
pnpm format
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

Make sure to set all environment variables from `.env.local.example` in your deployment platform.

## Security Notes

- ✅ Harvest API keys are server-side only (never exposed to client)
- ✅ All API routes are protected with Clerk authentication
- ✅ Clerk middleware protects all dashboard routes
- ✅ TypeScript ensures type safety across the application

## Future Enhancements

- [ ] Receipt upload for expenses (UploadThing integration ready)
- [ ] Manager view for approving timesheets and expenses
- [ ] Advanced filtering and search
- [ ] Export data to CSV/Excel
- [ ] Weekly/monthly email summaries
- [ ] Mobile app (React Native)

## Support

For issues or questions:
- Check Harvest API docs: [https://help.getharvest.com/api-v2/](https://help.getharvest.com/api-v2/)
- Check Clerk docs: [https://clerk.com/docs](https://clerk.com/docs)
- Check Next.js docs: [https://nextjs.org/docs](https://nextjs.org/docs)

## License

Private - PMO Hive Internal Use Only
# pmoHarvest
