/**
 * Utility functions for handling locked time periods
 *
 * Harvest locks entire weeks (Monday-Sunday), not individual dates.
 * When a timesheet is approved, all dates in that week become locked.
 */

/**
 * Represents a locked week range in Harvest
 */
export interface LockedWeek {
  weekStart: string; // YYYY-MM-DD format (Monday)
  weekEnd: string; // YYYY-MM-DD format (Sunday)
}

/**
 * Check if a specific date falls within any locked week
 *
 * @param date - The date to check
 * @param lockedWeeks - Array of locked week ranges
 * @returns True if the date falls within a locked week
 *
 * @example
 * const lockedWeeks = [{ weekStart: '2024-01-15', weekEnd: '2024-01-21' }];
 * isDateInLockedWeek(new Date('2024-01-17'), lockedWeeks); // true (Wed in locked week)
 * isDateInLockedWeek(new Date('2024-01-22'), lockedWeeks); // false (next week)
 */
export function isDateInLockedWeek(date: Date, lockedWeeks: LockedWeek[]): boolean {
  const dateStr = formatDateForComparison(date);

  return lockedWeeks.some(week => {
    return dateStr >= week.weekStart && dateStr <= week.weekEnd;
  });
}

/**
 * Format a Date object to YYYY-MM-DD string for comparison
 *
 * @param date - Date to format
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateForComparison(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
