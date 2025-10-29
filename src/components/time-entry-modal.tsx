'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TimeEntryForm } from '@/components/time-entry-form';

interface TimeEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TimeEntryModal({ open, onOpenChange }: TimeEntryModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Time Entry</DialogTitle>
          <DialogDescription>Enter your time for a project and task</DialogDescription>
        </DialogHeader>
        <TimeEntryForm
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
          showCancelButton={true}
        />
      </DialogContent>
    </Dialog>
  );
}
