'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatWeekRange } from '@/lib/timesheet-utils';
import type { WeeklyTimesheet, WeeklyExpenseSheet } from '@/lib/timesheet-utils';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PendingTimesheetsListProps {
  timesheets: WeeklyTimesheet[];
  isLoading?: boolean;
  type: 'time' | 'expense';
}

interface PendingExpensesListProps {
  expenseSheets: WeeklyExpenseSheet[];
  isLoading?: boolean;
  type: 'expense';
}

type Props = PendingTimesheetsListProps | PendingExpensesListProps;

export function PendingTimesheetsList(props: Props) {
  const router = useRouter();
  const [userFilter, setUserFilter] = useState<string>('all');

  // Extract unique users for filter dropdown
  const uniqueUsers = useMemo(() => {
    if (props.type === 'time') {
      const users = new Map<number, string>();
      (props as PendingTimesheetsListProps).timesheets.forEach(ts => {
        users.set(ts.userId, ts.userName);
      });
      return Array.from(users.entries()).map(([id, name]) => ({ id, name }));
    } else {
      const users = new Map<number, string>();
      (props as PendingExpensesListProps).expenseSheets.forEach(es => {
        users.set(es.userId, es.userName);
      });
      return Array.from(users.entries()).map(([id, name]) => ({ id, name }));
    }
  }, [props]);

  // Filter timesheets/expenses by selected user
  const filteredData = useMemo(() => {
    if (userFilter === 'all') {
      return props.type === 'time'
        ? (props as PendingTimesheetsListProps).timesheets
        : (props as PendingExpensesListProps).expenseSheets;
    }

    const userId = parseInt(userFilter);
    if (props.type === 'time') {
      return (props as PendingTimesheetsListProps).timesheets.filter(ts => ts.userId === userId);
    } else {
      return (props as PendingExpensesListProps).expenseSheets.filter(es => es.userId === userId);
    }
  }, [props, userFilter]);

  const handleViewTimesheet = (userId: number, weekStart: string) => {
    if (props.type === 'time') {
      router.push(`/dashboard/admin/approvals/time/${userId}/${weekStart}`);
    } else {
      router.push(`/dashboard/admin/approvals/expenses/${userId}/${weekStart}`);
    }
  };

  if (props.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const dataToShow = filteredData as (WeeklyTimesheet | WeeklyExpenseSheet)[];

  if (dataToShow.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        {userFilter === 'all'
          ? `No pending ${props.type === 'time' ? 'timesheets' : 'expense sheets'} for approval.`
          : 'No pending submissions for this user.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      {uniqueUsers.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Filter by user:</label>
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-[250px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users ({dataToShow.length})</SelectItem>
              {uniqueUsers.map(user => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Week</TableHead>
              {props.type === 'time' ? (
                <>
                  <TableHead className="text-right">Total Hours</TableHead>
                  <TableHead className="text-right">Entries</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                </>
              )}
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dataToShow.map((item, index) => {
              const isTime = 'totalHours' in item;
              return (
                <TableRow key={`${item.userId}-${item.weekStart}-${index}`}>
                  <TableCell className="font-medium">{item.userName}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{formatWeekRange(item.weekStart)}</div>
                      <div className="text-xs text-muted-foreground">
                        Week {item.weekNumber}, {item.year}
                      </div>
                    </div>
                  </TableCell>
                  {isTime ? (
                    <>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{item.totalHours.toFixed(1)}h</Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.entryCount} {item.entryCount === 1 ? 'entry' : 'entries'}
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-right">
                        <Badge variant="secondary">
                          ${(item as WeeklyExpenseSheet).totalCost.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {(item as WeeklyExpenseSheet).expenseCount}{' '}
                        {(item as WeeklyExpenseSheet).expenseCount === 1 ? 'expense' : 'expenses'}
                      </TableCell>
                    </>
                  )}
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => handleViewTimesheet(item.userId, item.weekStart)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
