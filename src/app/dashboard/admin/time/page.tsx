'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Loader2, Trash2, RefreshCw, Lock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useSession } from '@/lib/auth-client';
import { useIsAdmin, useIsAdminOrManager } from '@/lib/admin-utils';
import { useTimeEntries, useDeleteTimeEntry, useManagedProjects } from '@/hooks/use-harvest';
import { ApprovalStatusBadge } from '@/components/admin/approval-status-badge';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AdminTimePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdminOrManager = useIsAdminOrManager();
  const isAdmin = useIsAdmin();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [approvalFilter, setApprovalFilter] = useState<
    'all' | 'unsubmitted' | 'submitted' | 'approved'
  >('all');

  // Data hooks must be called before early returns
  const { data: managedProjectIds } = useManagedProjects();

  // Get data from last 30 days (must be before early returns)
  const from = format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
  const to = format(new Date(), 'yyyy-MM-dd');

  const {
    data: timeEntriesData,
    isLoading: isLoadingTimeEntries,
    refetch: refetchTimeEntries,
    isFetching: isFetchingTimeEntries,
  } = useTimeEntries({
    from,
    to,
    approval_status: approvalFilter === 'all' ? undefined : approvalFilter,
  });
  const deleteMutation = useDeleteTimeEntry();

  // Filter time entries based on manager's projects (must be before early returns)
  const filteredTimeEntries = useMemo(() => {
    if (!timeEntriesData?.time_entries) return [];

    let entries = timeEntriesData.time_entries;

    // Apply manager filtering
    if (!isAdmin && isAdminOrManager && managedProjectIds) {
      entries = entries.filter(entry => managedProjectIds.includes(entry.project.id));
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      entries = entries.filter(
        entry =>
          entry.project.name.toLowerCase().includes(query) ||
          entry.user.name.toLowerCase().includes(query) ||
          entry.notes?.toLowerCase().includes(query)
      );
    }

    return entries;
  }, [timeEntriesData, isAdmin, isAdminOrManager, managedProjectIds, searchQuery]);

  // Redirect if not admin or manager (using useEffect to avoid React render error)
  useEffect(() => {
    if (session && isAdminOrManager === false) {
      router.push('/dashboard');
    }
  }, [session, isAdminOrManager, router]);

  // Show loading state while session is loading or redirecting
  if (!session || isAdminOrManager === undefined) {
    return null;
  }

  // Show nothing if redirecting
  if (isAdminOrManager === false) {
    return null;
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this time entry?')) return;

    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Time entry deleted successfully');
    } catch (error) {
      toast.error('Failed to delete time entry');
    }
  };

  const totalHours = filteredTimeEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const pendingCount = filteredTimeEntries.filter(e => e.approval_status === 'submitted').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Time Management</h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'All team time entries' : 'Time entries for your managed projects'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <Button asChild variant="outline">
              <Link href="/dashboard/admin/approvals/time">
                <AlertCircle className="mr-2 h-4 w-4" />
                {pendingCount} Pending Approval{pendingCount !== 1 ? 's' : ''}
              </Link>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchTimeEntries().then(result => {
                if (result.isError) {
                  toast.error('Failed to refresh time entries');
                } else {
                  toast.success('Time entries refreshed');
                }
              });
            }}
            disabled={isFetchingTimeEntries}
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', isFetchingTimeEntries && 'animate-spin')} />
            {isFetchingTimeEntries ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search by project, member, or notes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <Select
              value={approvalFilter}
              onValueChange={(v: 'all' | 'unsubmitted' | 'submitted' | 'approved') =>
                setApprovalFilter(v)
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="unsubmitted">Unsubmitted</SelectItem>
                <SelectItem value="submitted">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Time Entries Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Time Entries</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{totalHours.toFixed(2)}h</div>
              <div className="text-sm text-muted-foreground">Total hours</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingTimeEntries ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTimeEntries.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No time entries found in the last 30 days.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTimeEntries.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell>{format(new Date(entry.spent_date), 'PP')}</TableCell>
                      <TableCell className="font-medium">{entry.project.name}</TableCell>
                      <TableCell>{entry.task.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{entry.hours}h</Badge>
                      </TableCell>
                      <TableCell>{entry.user.name}</TableCell>
                      <TableCell>
                        <ApprovalStatusBadge status={entry.approval_status} />
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{entry.notes || '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(entry.id)}
                          disabled={deleteMutation.isPending || entry.is_locked}
                          title={entry.is_locked ? 'Entry is locked' : 'Delete entry'}
                        >
                          {entry.is_locked ? (
                            <Lock className="h-4 w-4" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
