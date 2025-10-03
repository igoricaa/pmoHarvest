'use client';

import { format, startOfWeek, startOfMonth, endOfWeek, endOfMonth } from 'date-fns';
import { Clock, Receipt, TrendingUp, Activity } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTimeEntries, useExpenses } from '@/hooks/use-harvest';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DashboardPage() {
  const today = new Date();

  // Week calculations
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  // Month calculations
  const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');

  const { data: weekTimeEntries, isLoading: isLoadingWeekTime } = useTimeEntries({
    from: weekStart,
    to: weekEnd,
  });

  const { data: monthTimeEntries, isLoading: isLoadingMonthTime } = useTimeEntries({
    from: monthStart,
    to: monthEnd,
  });

  const { data: monthExpenses, isLoading: isLoadingMonthExpenses } = useExpenses({
    from: monthStart,
    to: monthEnd,
  });

  // Calculate stats
  const weekHours = weekTimeEntries?.time_entries.reduce((sum, entry) => sum + entry.hours, 0) || 0;
  const monthHours =
    monthTimeEntries?.time_entries.reduce((sum, entry) => sum + entry.hours, 0) || 0;
  const monthExpenseTotal =
    monthExpenses?.expenses.reduce((sum, expense) => sum + expense.total_cost, 0) || 0;
  const pendingExpenses =
    monthExpenses?.expenses.filter((e) => !e.is_billed && !e.is_locked).length || 0;

  // Recent entries (last 5)
  const recentTimeEntries = monthTimeEntries?.time_entries.slice(0, 5) || [];
  const recentExpenses = monthExpenses?.expenses.slice(0, 5) || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your time and expenses.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours This Week</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoadingWeekTime ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{weekHours.toFixed(1)}h</div>
            )}
            <p className="text-xs text-muted-foreground">
              {format(startOfWeek(today, { weekStartsOn: 1 }), 'MMM d')} -{' '}
              {format(endOfWeek(today, { weekStartsOn: 1 }), 'MMM d')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoadingMonthTime ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{monthHours.toFixed(1)}h</div>
            )}
            <p className="text-xs text-muted-foreground">{format(today, 'MMMM yyyy')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses This Month</CardTitle>
            <Receipt className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoadingMonthExpenses ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">${monthExpenseTotal.toFixed(2)}</div>
            )}
            <p className="text-xs text-muted-foreground">{format(today, 'MMMM yyyy')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Expenses</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoadingMonthExpenses ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{pendingExpenses}</div>
            )}
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to get you started</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button asChild>
            <Link href="/dashboard/time">
              <Clock className="mr-2 h-4 w-4" />
              Log Time
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/expenses">
              <Receipt className="mr-2 h-4 w-4" />
              Add Expense
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest time entries and expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="time" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="time">Time Entries</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
            </TabsList>

            <TabsContent value="time" className="space-y-4">
              {isLoadingMonthTime ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : recentTimeEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No time entries yet. Start logging your time!
                </div>
              ) : (
                <div className="space-y-4">
                  {recentTimeEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{entry.project.name}</p>
                          <Badge variant="secondary">{entry.task.name}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {entry.notes || 'No notes'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.spent_date), 'PPP')}
                        </p>
                      </div>
                      <Badge variant="outline" className="ml-4">
                        {entry.hours}h
                      </Badge>
                    </div>
                  ))}
                  {recentTimeEntries.length >= 5 && (
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/dashboard/time">View All Time Entries</Link>
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="expenses" className="space-y-4">
              {isLoadingMonthExpenses ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : recentExpenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No expenses yet. Start submitting your expenses!
                </div>
              ) : (
                <div className="space-y-4">
                  {recentExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{expense.project.name}</p>
                          <Badge variant="secondary">{expense.expense_category.name}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {expense.notes || 'No notes'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(expense.spent_date), 'PPP')}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <Badge variant="outline">${expense.total_cost.toFixed(2)}</Badge>
                        <Badge
                          variant={
                            expense.is_billed
                              ? 'default'
                              : expense.is_locked
                                ? 'outline'
                                : 'secondary'
                          }
                        >
                          {expense.is_billed ? 'Billed' : expense.is_locked ? 'Locked' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {recentExpenses.length >= 5 && (
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/dashboard/expenses">View All Expenses</Link>
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
