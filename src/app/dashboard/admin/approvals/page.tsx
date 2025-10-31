'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/lib/auth-client';
import { useIsAdminOrManager } from '@/lib/admin-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Receipt, ArrowRight } from 'lucide-react';

export default function ApprovalsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdminOrManager = useIsAdminOrManager();

  // Redirect if not admin or manager
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pending Timesheets</h1>
        <p className="text-muted-foreground">
          Review timesheets and expense reports submitted by your team
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Time Entries Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <CardTitle>Time Entry Review</CardTitle>
                <CardDescription>
                  View pending weekly timesheets
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View timesheets organized by week with detailed breakdowns of hours per project and task.
            </p>
            <Button asChild className="w-full gap-2">
              <Link href="/dashboard/admin/approvals/time">
                View Pending Timesheets
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Expenses Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <Receipt className="h-6 w-6 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <CardTitle>Expense Review</CardTitle>
                <CardDescription>
                  View pending expense reports
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View expense reports organized by week with receipts and detailed breakdowns.
            </p>
            <Button asChild className="w-full gap-2">
              <Link href="/dashboard/admin/approvals/expenses">
                View Pending Expenses
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
        <CardHeader>
          <CardTitle className="text-base">Important: Approvals Must Be Done in Harvest</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            • This view allows you to review pending timesheets and expenses organized by week
          </p>
          <p>
            • Click "View" to see detailed breakdowns of time entries and expense reports
          </p>
          <p>
            • <strong>Actual approvals must be submitted via the Harvest web interface</strong>
          </p>
          <p>
            • Use the "Open Harvest" button on detail pages to approve timesheets in Harvest
          </p>
          <p className="pt-2">
            <Button asChild size="sm" variant="outline">
              <a
                href="https://app.getharvest.com/time/approvals"
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2"
              >
                Go to Harvest Approvals →
              </a>
            </Button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
