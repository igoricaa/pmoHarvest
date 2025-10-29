# Roadmap

Potential features and improvements for future development.

## Phase 1: Admin Features

### User Management

- [ ] User list with roles and stats
- [ ] User detail pages
- [ ] Activity tracking

### Project Management

- [ ] Project overview dashboard
- [ ] Budget vs actual tracking
- [ ] Team assignments

### Analytics

- [ ] Organization metrics dashboard
- [ ] Utilization reports
- [ ] Time tracking trends

## Phase 2: Approvals

### Expense Approvals

- [ ] Approval queue for managers
- [ ] Bulk approve/reject
- [ ] Approval notifications

### Time Entry Review

- [ ] Team time entry dashboard
- [ ] Weekly summaries
- [ ] Missing time alerts

## Phase 3: Reporting

- [ ] Utilization reports (billable vs non-billable)
- [ ] Project profitability analysis
- [ ] Custom date range exports
- [ ] PDF/Excel export


## Quick Wins

These can be implemented quickly:

- [ ] Add loading skeletons (improve perceived performance)
- [ ] Search functionality (time entries, expenses, projects)
- [ ] CSV export (time entries, expenses)
- [ ] Time entry templates (save frequent entries)
- [ ] Dark mode polish

## Technical Improvements

### Data Fetching & Caching Optimization

**Current State**: App fetches from Harvest API frequently
- Time entries/expenses: Every mount + window focus
- Projects/tasks: Every 5-10 minutes

**Future State** (if app becomes self-contained):

If we move to a model where:
- All CRUD operations go through our API (not directly to Harvest)
- Harvest is synced in background (not on-demand)
- Data changes only when users update via our app

Then we should optimize caching to:

#### Recommended Configuration

```typescript
// For ALL queries:
staleTime: Infinity,           // Data never stale (we control mutations)
refetchOnWindowFocus: true,    // Still check for updates from other users/tabs
refetchOnMount: false,         // Don't refetch on every mount
refetchOnReconnect: true,      // Refetch after internet reconnection
```

#### Mutation-Based Invalidation

Instead of time-based staleness, invalidate caches on mutations:

```typescript
// When creating/updating/deleting:
onSuccess: () => {
  // Invalidate related queries (manual control)
  queryClient.invalidateQueries({ queryKey: ['time-entries'] });
  queryClient.invalidateQueries({ queryKey: ['projects'] });
}
```

#### Benefits

✅ **Drastically reduced API calls**:
- No refetches on mount (was causing multiple calls per page)
- No time-based refetches (5-10 min intervals)
- Only refetch on window focus (other users' changes) and mutations

✅ **Fresh data guaranteed**:
- Mutations invalidate relevant queries immediately
- Window focus refetches catch changes from other tabs/users
- Reconnect refetches catch offline changes

✅ **Better UX**:
- Instant updates (optimistic updates + invalidation)
- No loading states on navigation
- Faster page loads

✅ **Lower server load**:
- From ~100 requests/hour → ~10 requests/hour (90% reduction)
- Only fetch when actually needed

#### Implementation Notes

- Keep optimistic updates for instant UX
- Consider WebSocket/SSE for real-time multi-user updates
- Add manual refresh button for paranoid users
- Monitor cache memory usage (set gcTime if needed)

**Estimated Impact**:
- API calls: 90% reduction
- Page load time: 50% faster
- Perceived performance: Instant (cached data)

---

**Note**: This optimization only makes sense when:
1. App is the single source of truth (not Harvest)
2. Background sync handles Harvest integration
3. Multi-user concurrent editing is handled (locking/conflict resolution)

---

### Other Technical Improvements

- [ ] Performance optimization (Redis caching)
- [ ] Error tracking (Sentry)

---

**Note**: Features built based on user needs and priorities.
