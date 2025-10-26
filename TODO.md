# PMO Harvest Portal - Roadmap & TODO

## Current Status: Core Features Complete ✅

The authentication system, API integration, and basic time/expense tracking are fully functional. This document outlines recommended features and improvements for the future.

---

## Phase 1: Admin Dashboard Features 👑

### 1.1 Admin Overview Dashboard
**Priority: HIGH** | **Effort: Medium**

Create a dedicated admin dashboard showing organization-wide metrics:

- [ ] Total consultants overview
- [ ] Active time entries across all users
- [ ] Pending expense approvals count
- [ ] Weekly/monthly hours summary
- [ ] Top projects by hours
- [ ] Utilization rates by consultant
- [ ] Recent activity feed

**Files to create:**
- `src/app/admin/page.tsx` - Admin dashboard
- `src/app/api/admin/overview/route.ts` - Admin metrics API
- `src/components/admin/dashboard-stats.tsx` - Stats cards
- `src/components/admin/activity-feed.tsx` - Activity feed

**Implementation notes:**
- Check for `administrator` role in middleware
- Use Harvest's reporting API for aggregated data
- Cache metrics with 5-minute stale time

### 1.2 User Management
**Priority: HIGH** | **Effort: Medium**

View and manage all consultants in the organization:

- [ ] List all users with their roles
- [ ] View user details (capacity, rates, contractor status)
- [ ] Filter by role (admin/manager/member)
- [ ] Search users by name/email
- [ ] View user's current projects
- [ ] See user's time tracking stats
- [ ] Deactivate/reactivate users (if possible via Harvest API)

**Files to create:**
- `src/app/admin/users/page.tsx` - User list
- `src/app/admin/users/[id]/page.tsx` - User detail
- `src/app/api/admin/users/route.ts` - Users API
- `src/components/admin/user-table.tsx` - User table component
- `src/components/admin/user-filters.tsx` - Filter controls

**API endpoints needed:**
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/:id` - User details
- `GET /api/admin/users/:id/stats` - User statistics

### 1.3 Project Management
**Priority: MEDIUM** | **Effort: Medium**

Manage projects and assignments:

- [ ] View all projects in organization
- [ ] See project budgets and actuals
- [ ] View assigned consultants per project
- [ ] Project health indicators (budget vs actual)
- [ ] Add/remove task assignments
- [ ] Project timeline view
- [ ] Filter by active/archived projects

**Files to create:**
- `src/app/admin/projects/page.tsx` - Projects list
- `src/app/admin/projects/[id]/page.tsx` - Project detail
- `src/app/api/admin/projects/route.ts` - Projects API
- `src/components/admin/project-card.tsx` - Project card
- `src/components/admin/project-budget-chart.tsx` - Budget visualization

---

## Phase 2: Manager Approval Workflows 📋

### 2.1 Expense Approval System
**Priority: HIGH** | **Effort: High**

Implement expense approval workflow for managers:

- [ ] Expense approval queue (pending expenses)
- [ ] Bulk approve/reject functionality
- [ ] Review expense details with receipt
- [ ] Add approval notes/comments
- [ ] Email notifications for approvers
- [ ] Email notifications for submitters
- [ ] Approval history tracking
- [ ] Filter by date, amount, category, user

**Files to create:**
- `src/app/approvals/expenses/page.tsx` - Approval queue
- `src/app/api/approvals/expenses/[id]/approve/route.ts` - Approve endpoint
- `src/app/api/approvals/expenses/[id]/reject/route.ts` - Reject endpoint
- `src/components/approvals/expense-approval-card.tsx` - Approval card
- `src/components/approvals/bulk-actions.tsx` - Bulk actions toolbar
- `src/lib/notifications/email.ts` - Email notification utilities

**Implementation notes:**
- Check for `approve` permission in `expenses`
- Use Harvest API for approval status updates
- Consider adding comments/notes to rejections

### 2.2 Time Entry Review
**Priority: MEDIUM** | **Effort: Medium**

Allow managers to review team time entries:

- [ ] View team time entries by week/month
- [ ] Flag suspicious entries (unusual hours, etc.)
- [ ] Compare against project budgets
- [ ] Export time reports for payroll
- [ ] Send reminders for missing time entries
- [ ] Weekly summary emails to managers

**Files to create:**
- `src/app/manager/time-review/page.tsx` - Time review dashboard
- `src/app/api/manager/time-entries/route.ts` - Team time entries
- `src/components/manager/time-entry-table.tsx` - Time entries table
- `src/lib/validations/time-entry-rules.ts` - Validation rules

---

## Phase 3: Reporting & Analytics 📊

### 3.1 Advanced Reports
**Priority: MEDIUM** | **Effort: High**

Build comprehensive reporting features:

- [ ] Utilization report (billable vs non-billable)
- [ ] Project profitability analysis
- [ ] Consultant performance metrics
- [ ] Time & expense trends (weekly/monthly/yearly)
- [ ] Budget vs actual comparison
- [ ] Custom date range selection
- [ ] Export to PDF/Excel
- [ ] Scheduled report emails

**Files to create:**
- `src/app/reports/page.tsx` - Reports hub
- `src/app/reports/utilization/page.tsx` - Utilization report
- `src/app/reports/profitability/page.tsx` - Profitability report
- `src/app/api/reports/[type]/route.ts` - Report generation API
- `src/components/reports/chart-builder.tsx` - Chart components
- `src/lib/reports/generators.ts` - Report generation logic
- `src/lib/reports/export.ts` - PDF/Excel export

**Technologies to consider:**
- `recharts` or `chart.js` for visualizations
- `react-pdf` for PDF generation
- `xlsx` for Excel export

### 3.2 Dashboard Widgets
**Priority: LOW** | **Effort: Medium**

Customizable dashboard for each user role:

- [ ] Drag-and-drop widget layout
- [ ] Widget library (hours, expenses, projects, etc.)
- [ ] Save dashboard preferences per user
- [ ] Role-specific default dashboards
- [ ] Real-time data updates

**Files to create:**
- `src/app/dashboard/customize/page.tsx` - Dashboard customizer
- `src/components/dashboard/widget-library.tsx` - Available widgets
- `src/components/dashboard/grid-layout.tsx` - Drag-drop grid
- `src/lib/dashboard/widget-registry.ts` - Widget definitions

**Technologies to consider:**
- `react-grid-layout` for drag-drop
- Local storage for preferences

---

## Phase 4: Team Collaboration 👥

### 4.1 Team Calendar
**Priority: MEDIUM** | **Effort: Medium**

Visual calendar for team scheduling:

- [ ] Calendar view of all team time entries
- [ ] See who's working on what project
- [ ] PTO/vacation tracking
- [ ] Capacity planning view
- [ ] Drag-drop time entry creation
- [ ] Multiple calendar views (day/week/month)

**Files to create:**
- `src/app/team/calendar/page.tsx` - Team calendar
- `src/components/calendar/team-calendar.tsx` - Calendar component
- `src/lib/calendar/utils.ts` - Calendar utilities

**Technologies to consider:**
- `react-big-calendar` or `FullCalendar`

### 4.2 Project Comments & Notes
**Priority: LOW** | **Effort: Medium**

Internal commenting system:

- [ ] Add notes to time entries
- [ ] Project-level comments
- [ ] @mention team members
- [ ] Comment threading
- [ ] Email notifications for mentions

**Files to create:**
- `src/app/api/comments/route.ts` - Comments API
- `src/components/comments/comment-thread.tsx` - Comment UI
- `src/lib/comments/mentions.ts` - Mention parser

**Database changes:**
- New `comments` table

---

## Phase 5: Automation & Integrations 🤖

### 5.1 Automated Reminders
**Priority: MEDIUM** | **Effort: Medium**

Email reminders and notifications:

- [ ] Daily reminder to log time (if no entries)
- [ ] Weekly summary emails
- [ ] Expense approval pending notifications
- [ ] Project budget warnings (80%, 90%, 100%)
- [ ] End-of-week time entry summary
- [ ] Customizable notification preferences

**Files to create:**
- `src/lib/cron/daily-reminders.ts` - Daily job
- `src/lib/cron/weekly-summary.ts` - Weekly job
- `src/lib/notifications/templates/` - Email templates
- `src/app/api/cron/reminders/route.ts` - Cron endpoints

**Technologies to consider:**
- Vercel Cron Jobs
- Resend or SendGrid for emails
- React Email for templates

### 5.2 Slack Integration
**Priority: LOW** | **Effort: High**

Slack bot for time tracking:

- [ ] Log time via Slack commands
- [ ] Daily reminders in Slack
- [ ] Expense submission via Slack
- [ ] Approval workflows in Slack
- [ ] Weekly summary in Slack

**Files to create:**
- `src/app/api/integrations/slack/` - Slack API handlers
- `src/lib/integrations/slack/` - Slack SDK wrapper

**Setup required:**
- Slack App creation
- OAuth for Slack workspace
- Slash commands setup

### 5.3 Webhooks & API
**Priority: LOW** | **Effort: Medium**

Public API for integrations:

- [ ] REST API for time entries
- [ ] REST API for expenses
- [ ] API authentication (API keys)
- [ ] Rate limiting
- [ ] Webhook subscriptions
- [ ] OpenAPI documentation

**Files to create:**
- `src/app/api/v1/` - Versioned API
- `src/lib/api/auth.ts` - API key auth
- `src/lib/api/rate-limit.ts` - Rate limiting

---

## Phase 6: UX Improvements 🎨

### 6.1 Mobile Responsiveness
**Priority: HIGH** | **Effort: Medium**

Ensure all features work on mobile:

- [ ] Responsive navigation
- [ ] Mobile-optimized forms
- [ ] Touch-friendly interactions
- [ ] Mobile calendar picker
- [ ] Swipe gestures for actions

### 6.2 Keyboard Shortcuts
**Priority: LOW** | **Effort: Low**

Power user keyboard shortcuts:

- [ ] Quick add time entry (Ctrl+T)
- [ ] Quick add expense (Ctrl+E)
- [ ] Navigate to dashboard (Ctrl+D)
- [ ] Open search (Ctrl+K)
- [ ] Keyboard shortcuts help modal

**Files to create:**
- `src/hooks/use-keyboard-shortcuts.ts` - Shortcuts hook
- `src/components/keyboard-shortcuts-modal.tsx` - Help modal

### 6.3 Offline Support
**Priority: LOW** | **Effort: High**

Progressive Web App features:

- [ ] Service worker for offline
- [ ] Cache time entries offline
- [ ] Sync when back online
- [ ] Offline indicator
- [ ] PWA manifest

**Files to create:**
- `public/service-worker.js` - Service worker
- `public/manifest.json` - PWA manifest

---

## Phase 7: Security & Performance 🔒

### 7.1 Security Enhancements
**Priority: HIGH** | **Effort: Medium**

Additional security measures:

- [ ] Encrypt OAuth tokens in database
- [ ] Audit log for admin actions
- [ ] Session timeout warnings
- [ ] Two-factor authentication (2FA)
- [ ] IP allowlist for admin access
- [ ] Security headers (CSP, HSTS, etc.)

**Files to create:**
- `src/lib/security/encryption.ts` - Token encryption
- `src/lib/audit/logger.ts` - Audit logging
- `src/app/api/admin/audit-log/route.ts` - Audit log API

### 7.2 Performance Optimization
**Priority: MEDIUM** | **Effort: Medium**

Improve app performance:

- [ ] Image optimization
- [ ] Code splitting
- [ ] Lazy loading components
- [ ] Database query optimization
- [ ] Redis caching for frequent queries
- [ ] CDN for static assets

**Technologies to consider:**
- Vercel Edge Cache
- Redis (Upstash for serverless)

### 7.3 Monitoring & Logging
**Priority: MEDIUM** | **Effort: Low**

Observability and error tracking:

- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] API request logging
- [ ] User analytics
- [ ] Uptime monitoring

**Services to integrate:**
- Sentry for errors
- Vercel Analytics
- LogRocket or similar

---

## Quick Wins 🚀

These can be implemented quickly for immediate value:

1. **Add loading skeletons** (1 hour)
   - Better UX while data loads
   - Files: `src/components/ui/skeleton.tsx` (already exists!)

2. **Improve error messages** (2 hours)
   - User-friendly error handling
   - Toast notifications for all actions

3. **Add search functionality** (3 hours)
   - Search time entries
   - Search expenses
   - Search projects

4. **Export to CSV** (2 hours)
   - Export time entries to CSV
   - Export expenses to CSV

5. **Time entry templates** (4 hours)
   - Save frequent time entries as templates
   - Quick add from templates

6. **Dark mode polish** (2 hours)
   - Test all pages in dark mode
   - Fix any contrast issues

---

## Technical Debt 🛠️

Items to address for code quality:

- [ ] Add unit tests (Jest + React Testing Library)
- [ ] Add E2E tests (Playwright)
- [ ] Set up CI/CD pipeline
- [ ] Add TypeScript strict mode
- [ ] Document API routes with OpenAPI
- [ ] Create Storybook for components
- [ ] Performance benchmarking
- [ ] Accessibility audit (WCAG 2.1 AA)

---

## Admin Features - Detailed Breakdown

### Essential Admin Features (MVP)

**1. User Management Dashboard**
```
┌─────────────────────────────────────────────┐
│ 👥 Users (24 active consultants)           │
├─────────────────────────────────────────────┤
│ Search: [____________] Role: [All ▼]        │
├──────────┬──────────┬──────────┬────────────┤
│ Name     │ Role     │ Hours    │ Projects   │
├──────────┼──────────┼──────────┼────────────┤
│ Alice    │ Admin    │ 160h     │ 3 active   │
│ Bob      │ Manager  │ 145h     │ 2 active   │
│ Carol    │ Member   │ 168h     │ 1 active   │
└──────────┴──────────┴──────────┴────────────┘
```

**2. Approval Queue**
```
┌─────────────────────────────────────────────┐
│ 💰 Pending Approvals (8 expenses)          │
├─────────────────────────────────────────────┤
│ [Approve All] [Reject Selected]             │
├──────────┬──────────┬──────────┬────────────┤
│ ☐ User   │ Date     │ Amount   │ Category   │
├──────────┼──────────┼──────────┼────────────┤
│ ☐ Alice  │ 10/24    │ $125.00  │ Travel     │
│ ☐ Bob    │ 10/23    │ $45.00   │ Meals      │
└──────────┴──────────┴──────────┴────────────┘
```

**3. Analytics Dashboard**
```
┌─────────────────────────────────────────────┐
│ 📊 Organization Metrics                     │
├─────────────────────────────────────────────┤
│  Total Hours (This Month): 3,456           │
│  Billable %: 87%                            │
│  Top Project: Project Alpha (856h)          │
│  Avg Utilization: 92%                       │
└─────────────────────────────────────────────┘
```

---

## Priority Matrix

| Feature | Priority | Effort | Impact | Timeline |
|---------|----------|--------|--------|----------|
| Admin Dashboard | HIGH | Medium | HIGH | Week 1-2 |
| User Management | HIGH | Medium | HIGH | Week 2-3 |
| Expense Approvals | HIGH | High | HIGH | Week 3-5 |
| Mobile UX | HIGH | Medium | HIGH | Week 5-6 |
| Reports & Analytics | MEDIUM | High | MEDIUM | Week 7-9 |
| Team Calendar | MEDIUM | Medium | MEDIUM | Week 10-11 |
| Security Enhancements | HIGH | Medium | CRITICAL | Ongoing |
| Slack Integration | LOW | High | LOW | Future |

---

## Getting Started

To begin implementing admin features:

1. Start with **Admin Overview Dashboard** (Phase 1.1)
2. Then **User Management** (Phase 1.2)
3. Then **Expense Approval System** (Phase 2.1)

Each feature is designed to build upon the existing authentication and permission system already in place.

---

**Last Updated:** 2024-10-26
**Maintained By:** PMO Hive Development Team
