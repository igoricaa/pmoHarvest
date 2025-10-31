'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { formatWeekRange } from '@/lib/timesheet-utils';
import type { HarvestExpense } from '@/types/harvest';
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
import { ArrowLeft, CheckCircle, XCircle, Loader2, Paperclip, Info, ExternalLink } from 'lucide-react';

interface ExpenseTimesheetTableProps {
  expenses: HarvestExpense[];
  weekStart: string;
  userName: string;
  onApprove?: () => Promise<void>;
  onReject?: (reason: string) => Promise<void>;
  onBack: () => void;
  isProcessing?: boolean;
  readOnly?: boolean;
}

export function ExpenseTimesheetTable({
  expenses,
  weekStart,
  userName,
  onApprove,
  onReject,
  onBack,
  isProcessing = false,
  readOnly = false,
}: ExpenseTimesheetTableProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const totalCost = expenses.reduce((sum, expense) => sum + expense.total_cost, 0);

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
            ${totalCost.toFixed(2)} total
          </Badge>
        </div>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Expenses</CardTitle>
          <CardDescription>
            {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'} submitted for approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Receipt</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map(expense => (
                  <TableRow key={expense.id}>
                    <TableCell>{format(new Date(expense.spent_date), 'PP')}</TableCell>
                    <TableCell className="font-medium">{expense.project.name}</TableCell>
                    <TableCell>{expense.expense_category.name}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">${expense.total_cost.toFixed(2)}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {expense.receipt ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(expense.receipt!.url, '_blank')}
                          title={`View receipt: ${expense.receipt.file_name}`}
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">No receipt</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {expense.notes ? (
                        <span className="text-sm">{expense.notes}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Total row */}
                <TableRow className="border-t-2 font-semibold bg-muted/30">
                  <TableCell colSpan={3} className="text-right">
                    Total
                  </TableCell>
                  <TableCell className="text-right text-lg">
                    ${totalCost.toFixed(2)}
                  </TableCell>
                  <TableCell colSpan={2} />
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
              Expenses must be approved in the Harvest web interface. This view is for review purposes only.
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
                  Reject Expenses
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
                      Approve Expenses
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Card className="w-[400px]">
                <CardHeader>
                  <CardTitle className="text-lg">Reject Expenses</CardTitle>
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
