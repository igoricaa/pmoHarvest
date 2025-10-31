'use client';

import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Clock, DollarSign, Briefcase, Users, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '@/lib/auth-client';
import { useIsAdmin, useIsAdminOrManager } from '@/lib/admin-utils';
import {
  useTimeEntries,
  useExpenses,
  useProjects,
  useUserProjectAssignments,
  useUsers,
  useManagedProjects,
} from '@/hooks/use-harvest';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdminOrManager = useIsAdminOrManager();
  const isAdmin = useIsAdmin();

  // Get managed project IDs for managers (MUST be before early returns)
  const { data: managedProjectIds } = useManagedProjects();

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

  // Get data from last 30 days
  const from = format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
  const to = format(new Date(), 'yyyy-MM-dd');

  const { data: timeEntriesData } = useTimeEntries({ from, to });
  const { data: expensesData } = useExpenses({ from, to });

  // Conditional queries for projects
  const { data: allProjectsData } = useProjects({
    enabled: !!session && isAdmin,
  });
  const { data: userAssignmentsData } = useUserProjectAssignments({
    enabled: !!session && !isAdmin && isAdminOrManager,
  });
  const projectsData = isAdmin ? allProjectsData : userAssignmentsData;

  // Only admin sees all users
  const { data: usersData } = useUsers({ enabled: !!session && isAdmin });

  // Filter data based on manager's projects
  const filteredTimeEntries = useMemo(() => {
    if (!timeEntriesData?.time_entries) return [];
    if (isAdmin || !managedProjectIds) return timeEntriesData.time_entries;
    return timeEntriesData.time_entries.filter(entry =>
      managedProjectIds.includes(entry.project.id)
    );
  }, [timeEntriesData, isAdmin, managedProjectIds]);

  const filteredExpenses = useMemo(() => {
    if (!expensesData?.expenses) return [];
    if (isAdmin || !managedProjectIds) return expensesData.expenses;
    return expensesData.expenses.filter(expense => managedProjectIds.includes(expense.project.id));
  }, [expensesData, isAdmin, managedProjectIds]);

  // Calculate stats
  const totalHours = filteredTimeEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.total_cost, 0);
  const activeProjects = projectsData?.projects.filter(p => p.is_active).length || 0;
  const activeUsers = usersData?.users.filter(u => u.is_active).length || 0;

  // Group time entries by project
  const projectHours = useMemo(() => {
    const grouped = new Map<string, { name: string; hours: number }>();
    filteredTimeEntries.forEach(entry => {
      const existing = grouped.get(entry.project.name) || { name: entry.project.name, hours: 0 };
      grouped.set(entry.project.name, {
        name: entry.project.name,
        hours: existing.hours + entry.hours,
      });
    });
    return Array.from(grouped.values())
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5);
  }, [filteredTimeEntries]);

  // Group expenses by project
  const projectExpenses = useMemo(() => {
    const grouped = new Map<string, { name: string; cost: number }>();
    filteredExpenses.forEach(expense => {
      const existing = grouped.get(expense.project.name) || {
        name: expense.project.name,
        cost: 0,
      };
      grouped.set(expense.project.name, {
        name: expense.project.name,
        cost: existing.cost + expense.total_cost,
      });
    });
    return Array.from(grouped.values())
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);
  }, [filteredExpenses]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          {isAdmin ? 'Overview of all team activity' : 'Overview of your managed projects'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjects}</div>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? 'All projects' : 'Your projects'}
            </p>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeUsers}</div>
              <p className="text-xs text-muted-foreground">Team members</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Projects by Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Top Projects by Hours</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {projectHours.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">No time entries found</div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectHours.map((project, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{project.name}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{project.hours.toFixed(1)}h</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Projects by Expenses */}
        <Card>
          <CardHeader>
            <CardTitle>Top Projects by Expenses</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {projectExpenses.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">No expenses found</div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectExpenses.map((project, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{project.name}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">${project.cost.toFixed(2)}</Badge>
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

      {/* Recent Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Summary</CardTitle>
          <CardDescription>Last 30 days overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Total time entries</span>
              </div>
              <span className="font-semibold">{filteredTimeEntries.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Total expense submissions</span>
              </div>
              <span className="font-semibold">{filteredExpenses.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Average hours per day</span>
              </div>
              <span className="font-semibold">
                {filteredTimeEntries.length > 0 ? (totalHours / 30).toFixed(1) : '0'}h
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
