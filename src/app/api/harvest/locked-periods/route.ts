import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createHarvestClient } from '@/lib/harvest';
import { getErrorMessage } from '@/lib/api-utils';
import { logError } from '@/lib/logger';
import { startOfWeek, endOfWeek, format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user-specific Harvest token
    const { accessToken } = await auth.api.getAccessToken({
      body: { providerId: 'harvest' },
      headers: request.headers,
    });

    if (!accessToken) {
      return NextResponse.json({ error: 'No Harvest access token found' }, { status: 401 });
    }

    const harvestClient = createHarvestClient(accessToken);

    // Fetch locked time entries and expenses (go back 1 year to catch all locked periods)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const fromDate = oneYearAgo.toISOString().split('T')[0];

    const [timeEntries, expenses] = await Promise.all([
      harvestClient.getTimeEntries({
        from: fromDate,
        per_page: 100,
      }),
      harvestClient.getExpenses({
        from: fromDate,
        per_page: 100,
      }),
    ]);

    // Group locked entries by ISO week (Monday-Sunday)
    // Harvest locks entire weeks, not individual dates
    const lockedWeeks = new Map<string, { weekStart: string; weekEnd: string }>();

    // Process locked time entries
    timeEntries.time_entries
      .filter(entry => entry.is_locked)
      .forEach(entry => {
        const date = new Date(entry.spent_date);
        const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 }); // Sunday
        const key = format(weekStart, 'yyyy-MM-dd');

        if (!lockedWeeks.has(key)) {
          lockedWeeks.set(key, {
            weekStart: format(weekStart, 'yyyy-MM-dd'),
            weekEnd: format(weekEnd, 'yyyy-MM-dd'),
          });
        }
      });

    // Process locked expenses
    expenses.expenses
      .filter(expense => expense.is_locked)
      .forEach(expense => {
        const date = new Date(expense.spent_date);
        const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 }); // Sunday
        const key = format(weekStart, 'yyyy-MM-dd');

        if (!lockedWeeks.has(key)) {
          lockedWeeks.set(key, {
            weekStart: format(weekStart, 'yyyy-MM-dd'),
            weekEnd: format(weekEnd, 'yyyy-MM-dd'),
          });
        }
      });

    // Convert to array and sort by weekStart
    const sortedLockedWeeks = Array.from(lockedWeeks.values()).sort(
      (a, b) => a.weekStart.localeCompare(b.weekStart)
    );

    return NextResponse.json({ locked_weeks: sortedLockedWeeks });
  } catch (error) {
    logError('Failed to fetch locked periods', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to fetch locked periods') },
      { status: 500 }
    );
  }
}
