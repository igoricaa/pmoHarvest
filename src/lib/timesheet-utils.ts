import { startOfWeek, endOfWeek, getISOWeek, getISOWeekYear, format, eachDayOfInterval } from 'date-fns';
import type { HarvestTimeEntry, HarvestExpense } from '@/types/harvest';

/**
 * Represents a weekly timesheet (grouped time entries)
 */
export interface WeeklyTimesheet {
  userId: number;
  userName: string;
  weekStart: string; // ISO date string
  weekEnd: string; // ISO date string
  weekNumber: number; // ISO week number
  year: number; // ISO week year
  entries: HarvestTimeEntry[];
  totalHours: number;
  entryCount: number;
}

/**
 * Represents a weekly expense sheet (grouped expenses)
 */
export interface WeeklyExpenseSheet {
  userId: number;
  userName: string;
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  year: number;
  expenses: HarvestExpense[];
  totalCost: number;
  expenseCount: number;
}

/**
 * Represents hours worked per day for a specific task
 */
export interface TaskDayHours {
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
}

/**
 * Represents a task row in the timesheet grid
 */
export interface TimesheetGridTask {
  id: number;
  name: string;
  hoursPerDay: TaskDayHours;
  totalHours: number;
  entries: HarvestTimeEntry[]; // For displaying notes in tooltips
}

/**
 * Represents a project section in the timesheet grid
 */
export interface TimesheetGridProject {
  id: number;
  name: string;
  code: string;
  tasks: TimesheetGridTask[];
  totalHours: number;
}

/**
 * Represents the complete timesheet grid structure
 */
export interface TimesheetGrid {
  projects: TimesheetGridProject[];
  dailyTotals: TaskDayHours & { total: number };
  weekStart: string;
  weekEnd: string;
  days: Array<{ date: string; dayOfWeek: string; dayName: string }>;
}

/**
 * Group time entries by user and ISO week
 */
export function groupTimeEntriesByUserAndWeek(entries: HarvestTimeEntry[]): WeeklyTimesheet[] {
  const groups = new Map<string, HarvestTimeEntry[]>();

  entries.forEach(entry => {
    const date = new Date(entry.spent_date);
    const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday start
    const weekNumber = getISOWeek(date);
    const year = getISOWeekYear(date);
    const key = `${entry.user.id}-${year}-W${weekNumber}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(entry);
  });

  return Array.from(groups.values()).map(entries => {
    const firstDate = new Date(entries[0].spent_date);
    const weekStartDate = startOfWeek(firstDate, { weekStartsOn: 1 });
    const weekEndDate = endOfWeek(firstDate, { weekStartsOn: 1 });

    return {
      userId: entries[0].user.id,
      userName: entries[0].user.name,
      weekStart: format(weekStartDate, 'yyyy-MM-dd'),
      weekEnd: format(weekEndDate, 'yyyy-MM-dd'),
      weekNumber: getISOWeek(firstDate),
      year: getISOWeekYear(firstDate),
      entries,
      totalHours: entries.reduce((sum, e) => sum + e.hours, 0),
      entryCount: entries.length,
    };
  });
}

/**
 * Group expenses by user and ISO week
 */
export function groupExpensesByUserAndWeek(expenses: HarvestExpense[]): WeeklyExpenseSheet[] {
  const groups = new Map<string, HarvestExpense[]>();

  expenses.forEach(expense => {
    const date = new Date(expense.spent_date);
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekNumber = getISOWeek(date);
    const year = getISOWeekYear(date);
    const key = `${expense.user.id}-${year}-W${weekNumber}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(expense);
  });

  return Array.from(groups.values()).map(expenses => {
    const firstDate = new Date(expenses[0].spent_date);
    const weekStartDate = startOfWeek(firstDate, { weekStartsOn: 1 });
    const weekEndDate = endOfWeek(firstDate, { weekStartsOn: 1 });

    return {
      userId: expenses[0].user.id,
      userName: expenses[0].user.name,
      weekStart: format(weekStartDate, 'yyyy-MM-dd'),
      weekEnd: format(weekEndDate, 'yyyy-MM-dd'),
      weekNumber: getISOWeek(firstDate),
      year: getISOWeekYear(firstDate),
      expenses,
      totalCost: expenses.reduce((sum, e) => sum + e.total_cost, 0),
      expenseCount: expenses.length,
    };
  });
}

/**
 * Create timesheet grid structure from time entries for a specific week
 */
export function createTimesheetGrid(entries: HarvestTimeEntry[], weekStart: string): TimesheetGrid {
  const weekStartDate = new Date(weekStart);
  const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 });

  // Generate days array for column headers
  const days = eachDayOfInterval({ start: weekStartDate, end: weekEndDate }).map(date => ({
    date: format(date, 'yyyy-MM-dd'),
    dayOfWeek: format(date, 'EEE').toLowerCase() as keyof TaskDayHours, // mon, tue, etc.
    dayName: format(date, 'EEE d'), // "Mon 23"
  }));

  // Group entries by project and task
  const projectMap = new Map<number, Map<number, HarvestTimeEntry[]>>();

  entries.forEach(entry => {
    if (!projectMap.has(entry.project.id)) {
      projectMap.set(entry.project.id, new Map());
    }
    const taskMap = projectMap.get(entry.project.id)!;
    if (!taskMap.has(entry.task.id)) {
      taskMap.set(entry.task.id, []);
    }
    taskMap.get(entry.task.id)!.push(entry);
  });

  // Build grid structure
  const projects: TimesheetGridProject[] = [];
  const dailyTotals: TaskDayHours = { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 };

  projectMap.forEach((taskMap, projectId) => {
    const firstEntry = Array.from(taskMap.values())[0][0];
    const tasks: TimesheetGridTask[] = [];
    let projectTotalHours = 0;

    taskMap.forEach((taskEntries, taskId) => {
      const hoursPerDay: TaskDayHours = { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 };

      taskEntries.forEach(entry => {
        const date = new Date(entry.spent_date);
        const dayOfWeek = format(date, 'EEE').toLowerCase() as keyof TaskDayHours;
        hoursPerDay[dayOfWeek] += entry.hours;
        dailyTotals[dayOfWeek] += entry.hours;
      });

      const taskTotalHours = Object.values(hoursPerDay).reduce((sum, h) => sum + h, 0);
      projectTotalHours += taskTotalHours;

      tasks.push({
        id: taskId,
        name: taskEntries[0].task.name,
        hoursPerDay,
        totalHours: taskTotalHours,
        entries: taskEntries,
      });
    });

    projects.push({
      id: projectId,
      name: firstEntry.project.name,
      code: firstEntry.project.code,
      tasks,
      totalHours: projectTotalHours,
    });
  });

  const grandTotal = Object.values(dailyTotals).reduce((sum, h) => sum + h, 0);

  return {
    projects,
    dailyTotals: { ...dailyTotals, total: grandTotal },
    weekStart: format(weekStartDate, 'yyyy-MM-dd'),
    weekEnd: format(weekEndDate, 'yyyy-MM-dd'),
    days,
  };
}

/**
 * Format week range for display
 */
export function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart);
  const end = endOfWeek(start, { weekStartsOn: 1 });
  return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
}
