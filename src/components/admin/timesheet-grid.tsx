'use client';

import { useMemo, useState } from 'react';
import { createTimesheetGrid, formatWeekRange } from '@/lib/timesheet-utils';
import type { HarvestTimeEntry } from '@/types/harvest';
import type { TimesheetGrid as TimesheetGridType } from '@/lib/timesheet-utils';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, CheckCircle, XCircle, Loader2, Info, ExternalLink } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface TimesheetGridProps {
  entries: HarvestTimeEntry[];
  weekStart: string;
  userName: string;
  onApprove?: () => Promise<void>;
  onReject?: (reason: string) => Promise<void>;
  onBack: () => void;
  isProcessing?: boolean;
  readOnly?: boolean;
}

export function TimesheetGrid({
  entries,
  weekStart,
  userName,
  onApprove,
  onReject,
  onBack,
  isProcessing = false,
  readOnly = false,
}: TimesheetGridProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const grid: TimesheetGridType = useMemo(() => {
    return createTimesheetGrid(entries, weekStart);
  }, [entries, weekStart]);

  const handleReject = async () => {
    if (!onReject) return;
    await onReject(rejectReason.trim());
    setShowRejectDialog(false);
    setRejectReason('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} disabled={isProcessing}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{userName}</h1>
              <p className="text-muted-foreground">Week of {formatWeekRange(weekStart)}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {grid.dailyTotals.total.toFixed(1)} hours total
          </Badge>
        </div>
      </div>

      {/* Timesheet Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Timesheet</CardTitle>
          <CardDescription>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} across {grid.projects.length} {grid.projects.length === 1 ? 'project' : 'projects'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px] sticky left-0 bg-background z-10">
                    Project / Task
                  </TableHead>
                  {grid.days.map(day => (
                    <TableHead key={day.date} className="text-center min-w-[80px]">
                      {day.dayName}
                    </TableHead>
                  ))}
                  <TableHead className="text-right font-semibold min-w-[100px]">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grid.projects.map(project => (
                  <>
                    {/* Project header row */}
                    <TableRow key={`project-${project.id}`} className="bg-muted/50">
                      <TableCell className="font-semibold sticky left-0 bg-muted/50 z-10">
                        {project.name}
                        {project.code && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({project.code})
                          </span>
                        )}
                      </TableCell>
                      {grid.days.map(day => (
                        <TableCell key={day.date} className="text-center" />
                      ))}
                      <TableCell className="text-right font-semibold">
                        {project.totalHours.toFixed(1)}h
                      </TableCell>
                    </TableRow>

                    {/* Task rows */}
                    {project.tasks.map(task => (
                      <TableRow key={`task-${task.id}`}>
                        <TableCell className="pl-8 sticky left-0 bg-background z-10">
                          {task.name}
                        </TableCell>
                        {grid.days.map(day => {
                          const hours = task.hoursPerDay[day.dayOfWeek as keyof typeof task.hoursPerDay];
                          const dayEntries = task.entries.filter(e => e.spent_date === day.date);

                          if (hours === 0) {
                            return (
                              <TableCell key={day.date} className="text-center text-muted-foreground">
                                —
                              </TableCell>
                            );
                          }

                          return (
                            <TableCell key={day.date} className="text-center">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    className={cn(
                                      'px-2 py-1 rounded hover:bg-accent transition-colors',
                                      dayEntries.some(e => e.billable)
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-foreground'
                                    )}
                                  >
                                    {hours.toFixed(1)}h
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">{day.dayName}</h4>
                                    {dayEntries.map((entry, idx) => (
                                      <div key={idx} className="text-sm space-y-1 border-t pt-2">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium">{entry.hours}h</span>
                                          {entry.billable && (
                                            <Badge variant="outline" className="text-xs">
                                              Billable
                                            </Badge>
                                          )}
                                        </div>
                                        {entry.notes && (
                                          <p className="text-muted-foreground">{entry.notes}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right">{task.totalHours.toFixed(1)}h</TableCell>
                      </TableRow>
                    ))}
                  </>
                ))}

                {/* Daily totals row */}
                <TableRow className="border-t-2 font-semibold bg-muted/30">
                  <TableCell className="sticky left-0 bg-muted/30 z-10">Daily Total</TableCell>
                  {grid.days.map(day => {
                    const total = grid.dailyTotals[day.dayOfWeek as keyof typeof grid.dailyTotals];
                    return (
                      <TableCell key={day.date} className="text-center">
                        {total > 0 ? `${total.toFixed(1)}h` : '—'}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right text-lg">
                    {grid.dailyTotals.total.toFixed(1)}h
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons or Read-Only Message */}
      {readOnly ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Timesheets must be approved in the Harvest web interface. This view is for review purposes only.
            </span>
            <Button asChild size="sm" variant="outline" className="ml-4">
              <a
                href="https://app.getharvest.com/time/approvals"
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open Harvest
              </a>
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack} disabled={isProcessing}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Pending List
          </Button>

          <div className="flex items-center gap-3">
            {!showRejectDialog ? (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={isProcessing}
                  className="gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Reject Timesheet
                </Button>
                <Button
                  onClick={onApprove}
                  disabled={isProcessing}
                  size="lg"
                  className="gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Approve Timesheet
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Card className="w-[400px]">
                <CardHeader>
                  <CardTitle className="text-lg">Reject Timesheet</CardTitle>
                  <CardDescription>
                    Optionally provide a reason for rejection
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <textarea
                    className="w-full px-3 py-2 border rounded-md min-h-[100px]"
                    placeholder="Reason for rejection (optional)..."
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    disabled={isProcessing}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowRejectDialog(false);
                        setRejectReason('');
                      }}
                      disabled={isProcessing}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleReject}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Rejecting...
                        </>
                      ) : (
                        'Confirm Rejection'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
