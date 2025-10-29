'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, Loader2, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  useTimeEntries,
  useCreateTimeEntry,
  useDeleteTimeEntry,
  useProjects,
  useTaskAssignments,
} from '@/hooks/use-harvest';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const timeEntrySchema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  task_id: z.string().min(1, 'Task is required'),
  spent_date: z.date({ message: 'Date is required' }),
  hours: z
    .string()
    .min(1, 'Hours is required')
    .refine(
      val => {
        const num = Number.parseFloat(val);
        return !Number.isNaN(num) && num > 0 && num <= 24;
      },
      { message: 'Hours must be between 0 and 24' }
    )
    .refine(val => /^\d+(\.\d{1,2})?$/.test(val), {
      message: 'Hours must be a valid number (e.g., 8 or 8.5)',
    }),
  notes: z.string().optional(),
});

type TimeEntryFormData = z.infer<typeof timeEntrySchema>;

export default function TimeEntriesPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(true);

  // Get data from last 30 days
  const from = format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
  const to = format(new Date(), 'yyyy-MM-dd');

  const { data: timeEntriesData, isLoading: isLoadingEntries } = useTimeEntries({ from, to });
  const { data: projectsData, isLoading: isLoadingProjects } = useProjects();
  const { data: tasksData, isLoading: isLoadingTasks } = useTaskAssignments(selectedProjectId);

  const createMutation = useCreateTimeEntry();
  const deleteMutation = useDeleteTimeEntry();

  const form = useForm<TimeEntryFormData>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      project_id: '',
      task_id: '',
      spent_date: new Date(),
      hours: '',
      notes: '',
    },
  });

  const onSubmit = async (data: TimeEntryFormData) => {
    try {
      await createMutation.mutateAsync({
        project_id: Number(data.project_id),
        task_id: Number(data.task_id),
        spent_date: format(data.spent_date, 'yyyy-MM-dd'),
        hours: Number.parseFloat(data.hours),
        notes: data.notes || undefined,
      });

      toast.success('Time entry created successfully');
      form.reset({
        project_id: '',
        task_id: '',
        spent_date: new Date(),
        hours: '',
        notes: '',
      });
      setSelectedProjectId(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to create time entry');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this time entry?')) return;

    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Time entry deleted successfully');
    } catch (error) {
      toast.error('Failed to delete time entry');
    }
  };

  const projectId = form.watch('project_id');

  // Update selected project when form value changes
  if (projectId && Number(projectId) !== selectedProjectId) {
    setSelectedProjectId(Number(projectId));
    form.setValue('task_id', ''); // Reset task when project changes
  }

  const totalHours =
    timeEntriesData?.time_entries.reduce((sum, entry) => sum + entry.hours, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Time Entries</h1>
          <p className="text-muted-foreground">Log your hours and track your time</p>
        </div>
        <Button variant={showForm ? 'outline' : 'default'} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Hide Form' : 'Log Time'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Log Time Entry</CardTitle>
            <CardDescription>Enter your time for a project and task</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="spent_date"
                    render={({ field }) => {
                      const [isOpen, setIsOpen] = useState(false);
                      return (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date</FormLabel>
                          <Popover open={isOpen} onOpenChange={setIsOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'w-full pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, 'PPP')
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={date => {
                                  field.onChange(date);
                                  setIsOpen(false);
                                }}
                                disabled={date => date > new Date() || date < new Date('1900-01-01')}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hours</FormLabel>
                        <FormControl>
                          <Input
                            inputMode="decimal"
                            placeholder="8.0"
                            {...field}
                            onKeyDown={e => {
                              // Allow: backspace, delete, tab, escape, enter, decimal point
                              if (
                                [46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !== -1 ||
                                // Allow: Ctrl/Cmd+A, Ctrl/Cmd+C, Ctrl/Cmd+V, Ctrl/Cmd+X
                                (e.keyCode === 65 && (e.ctrlKey === true || e.metaKey === true)) ||
                                (e.keyCode === 67 && (e.ctrlKey === true || e.metaKey === true)) ||
                                (e.keyCode === 86 && (e.ctrlKey === true || e.metaKey === true)) ||
                                (e.keyCode === 88 && (e.ctrlKey === true || e.metaKey === true)) ||
                                // Allow: home, end, left, right
                                (e.keyCode >= 35 && e.keyCode <= 39)
                              ) {
                                return;
                              }
                              // Ensure that it's a number and stop the keypress if not
                              if (
                                (e.shiftKey || e.keyCode < 48 || e.keyCode > 57) &&
                                (e.keyCode < 96 || e.keyCode > 105)
                              ) {
                                e.preventDefault();
                              }
                            }}
                            onChange={e => {
                              const value = e.target.value;
                              // Allow empty string
                              if (value === '') {
                                field.onChange(value);
                                return;
                              }
                              // Remove any non-numeric characters except decimal point
                              const sanitized = value.replace(/[^\d.]/g, '');
                              // Ensure only one decimal point
                              const parts = sanitized.split('.');
                              const cleaned =
                                parts.length > 2
                                  ? parts[0] + '.' + parts.slice(1).join('')
                                  : sanitized;
                              // Limit to 2 decimal places
                              const limited =
                                parts.length === 2 && parts[1].length > 2
                                  ? parts[0] + '.' + parts[1].slice(0, 2)
                                  : cleaned;
                              field.onChange(limited);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="project_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingProjects ? (
                              <div className="p-2 text-center text-sm text-muted-foreground">
                                Loading projects...
                              </div>
                            ) : (
                              projectsData?.projects.map(project => (
                                <SelectItem key={project.id} value={project.id.toString()}>
                                  {project.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="task_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!selectedProjectId}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  selectedProjectId ? 'Select a task' : 'Select a project first'
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingTasks ? (
                              <div className="p-2 text-center text-sm text-muted-foreground">
                                Loading tasks...
                              </div>
                            ) : (
                              tasksData?.task_assignments.map(assignment => (
                                <SelectItem
                                  key={assignment.id}
                                  value={assignment.task.id.toString()}
                                >
                                  {assignment.task.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What did you work on?"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Log Time
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Time Entries</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{totalHours.toFixed(2)}h</div>
              <div className="text-sm text-muted-foreground">Total hours</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingEntries ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : timeEntriesData?.time_entries.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No time entries found. Start logging your time!
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeEntriesData?.time_entries.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell>{format(new Date(entry.spent_date), 'PP')}</TableCell>
                      <TableCell className="font-medium">{entry.project.name}</TableCell>
                      <TableCell>{entry.task.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{entry.hours}h</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{entry.notes || '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(entry.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
  );
}
