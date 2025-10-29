'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExpenseForm } from '@/components/expense-form';

interface ExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpenseModal({ open, onOpenChange }: ExpenseModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Expense</DialogTitle>
          <DialogDescription>Enter your expense details for a project</DialogDescription>
        </DialogHeader>
        <ExpenseForm
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
          showCancelButton={true}
        />
      </DialogContent>
    </Dialog>
  );
}
