# Admin Pages Refactoring Plan (Optional - Future Enhancement)

## Overview

Refactor 5 admin pages to eliminate 80%+ code duplication by extracting common patterns into shared components.

## Current State

These 5 pages share nearly identical structure:

1. `/dashboard/admin/projects/page.tsx` (~300 lines)
2. `/dashboard/admin/team/page.tsx` (~280 lines)
3. `/dashboard/admin/clients/page.tsx` (~270 lines)
4. `/dashboard/admin/time/page.tsx` (~290 lines)
5. `/dashboard/admin/expenses/page.tsx` (~285 lines)

### Duplicate Patterns

Every page has:
- Same hooks setup (session, role checks, state management)
- Same redirect logic for non-admin users
- Same loading states
- Same Card layout with header
- Same search input implementation
- Same status filter buttons (Active/Archived/All)
- Same DataTable integration
- Same modal pattern

## Proposed Solution

Create 3 shared components to eliminate duplication:

### 1. AdminPageLayout Component

**File**: `src/components/admin/admin-page-layout.tsx`

```typescript
interface AdminPageLayoutProps {
  title: string;
  description: string;
  action?: ReactNode; // "Create New" button, etc.
  children: ReactNode;
}

export function AdminPageLayout({
  title,
  description,
  action,
  children
}: AdminPageLayoutProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {action}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
```

**Usage**:
```typescript
<AdminPageLayout
  title="Projects"
  description="Manage client projects and budgets"
  action={
    <Button onClick={() => setIsCreateModalOpen(true)}>
      <Plus className="mr-2 h-4 w-4" />
      Create Project
    </Button>
  }
>
  {/* Search, filters, table */}
</AdminPageLayout>
```

### 2. SearchFilter Component

**File**: `src/components/admin/search-filter.tsx`

```typescript
interface SearchFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchFilter({
  value,
  onChange,
  placeholder = "Search...",
  className
}: SearchFilterProps) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  // Debounce the search input
  useEffect(() => {
    const timer = setTimeout(() => onChange(debouncedValue), 300);
    return () => clearTimeout(timer);
  }, [debouncedValue, onChange]);

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={debouncedValue}
        onChange={e => setDebouncedValue(e.target.value)}
        className="pl-9"
      />
    </div>
  );
}
```

**Usage**:
```typescript
<SearchFilter
  value={searchQuery}
  onChange={setSearchQuery}
  placeholder="Search projects by name or code..."
/>
```

### 3. StatusFilter Component

**File**: `src/components/admin/status-filter.tsx`

```typescript
type FilterValue = 'all' | 'active' | 'archived' | 'inactive';

interface StatusFilterProps {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
  labels?: {
    all?: string;
    active?: string;
    inactive?: string;
  };
  className?: string;
}

export function StatusFilter({
  value,
  onChange,
  labels,
  className
}: StatusFilterProps) {
  const defaultLabels = {
    all: labels?.all || 'All',
    active: labels?.active || 'Active',
    inactive: labels?.inactive || 'Inactive',
  };

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={v => onChange(v as FilterValue)}
      className={className}
    >
      <ToggleGroupItem value="all" aria-label="Show all">
        {defaultLabels.all}
      </ToggleGroupItem>
      <ToggleGroupItem value="active" aria-label="Show active">
        {defaultLabels.active}
      </ToggleGroupItem>
      <ToggleGroupItem value="archived" aria-label="Show inactive">
        {defaultLabels.inactive}
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
```

**Usage**:
```typescript
<StatusFilter
  value={activeFilter}
  onChange={setActiveFilter}
  labels={{ inactive: 'Archived' }}
/>
```

## Implementation Steps

### Phase 1: Create Shared Components (30 min)

1. Create `src/components/admin/admin-page-layout.tsx`
2. Create `src/components/admin/search-filter.tsx`
3. Create `src/components/admin/status-filter.tsx`
4. Test each component in Storybook/isolation
5. Verify TypeScript types compile

### Phase 2: Refactor Admin Pages (1-2 hours)

For each admin page:

1. Import new components
2. Replace Card/CardHeader/CardContent with `<AdminPageLayout>`
3. Replace search input with `<SearchFilter>`
4. Replace status toggle buttons with `<StatusFilter>`
5. Test functionality (search, filter, CRUD operations)
6. Verify no regressions

**Order of refactoring** (start with simplest):
1. Clients page (simplest - only name/status)
2. Team page (similar to clients)
3. Projects page (more complex - budgets, dates)
4. Time entries page (filtering, approval states)
5. Expenses page (receipts, approval states)

### Phase 3: Documentation (10 min)

Update CLAUDE.md with:
```markdown
### Admin Page Pattern

All admin pages use shared components:

\`\`\`typescript
import { AdminPageLayout } from '@/components/admin/admin-page-layout';
import { SearchFilter } from '@/components/admin/search-filter';
import { StatusFilter } from '@/components/admin/status-filter';

export default function AdminPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('active');

  return (
    <AdminPageLayout
      title="Page Title"
      description="Page description"
      action={<Button>Create New</Button>}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <SearchFilter value={searchQuery} onChange={setSearchQuery} />
          <StatusFilter value={statusFilter} onChange={setStatusFilter} />
        </div>

        <DataTable data={filteredData} columns={columns} />
      </div>
    </AdminPageLayout>
  );
}
\`\`\`
```

## Expected Benefits

### Code Reduction
- **Before**: ~1,425 lines total (5 pages × ~285 lines average)
- **After**: ~900 lines total (5 pages × ~180 lines + 3 shared components × ~100 lines)
- **Savings**: ~525 lines (37% reduction)

### Maintainability
- ✅ Single source of truth for layout
- ✅ Single source of truth for search implementation
- ✅ Single source of truth for filters
- ✅ Easier to update all admin pages at once
- ✅ Consistent UX across all admin pages
- ✅ Reduced testing surface area

### Future-Proofing
- ✅ Easy to add new admin pages
- ✅ Easy to add features (e.g., export buttons, bulk actions)
- ✅ Centralized place for admin-specific features

## Testing Strategy

For each refactored page, verify:

1. **Search functionality**
   - Debouncing works (300ms delay)
   - Filters correct data
   - Case-insensitive matching

2. **Status filtering**
   - All/Active/Archived toggles work
   - Correct data shown for each state
   - Works with search simultaneously

3. **CRUD operations**
   - Create modal opens/closes
   - Create operation succeeds
   - Update operation succeeds
   - Delete operation succeeds
   - Optimistic updates work

4. **Permissions**
   - Non-admins redirected
   - Managers see correct data (projects only)

5. **Edge cases**
   - Empty states render correctly
   - Loading states work
   - Error states display properly

## Risks & Mitigation

### Risk 1: Breaking existing functionality
**Mitigation**:
- Refactor one page at a time
- Test thoroughly before moving to next page
- Keep git commits separate per page

### Risk 2: Design inconsistencies
**Mitigation**:
- Match existing shadcn/ui patterns
- Use existing Tailwind classes
- Compare side-by-side before/after

### Risk 3: TypeScript errors
**Mitigation**:
- Run `pnpm build` after each page
- Use strict TypeScript throughout
- Leverage existing type definitions

## When to Execute

**Good time to refactor**:
- After completing other priority work
- Before adding new admin pages
- During a dedicated refactoring sprint
- When admin UX needs updating

**Not a good time**:
- During active feature development
- Right before a deadline
- When stability is critical
- If admin pages are rarely touched

## Alternative: Do Nothing

The current implementation is perfectly valid:
- ✅ Code works correctly
- ✅ Follows React best practices
- ✅ Well-documented patterns
- ✅ Only 5 pages (manageable duplication)

The refactoring is a **nice-to-have, not a must-have**.
