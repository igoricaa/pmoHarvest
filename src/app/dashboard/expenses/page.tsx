'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, Loader2, Trash2, DollarSign } from 'lucide-react';
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
  useExpenses,
  useCreateExpense,
  useDeleteExpense,
  useProjects,
  useExpenseCategories,
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

const expenseSchema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  expense_category_id: z.string().min(1, 'Category is required'),
  spent_date: z.date({ message: 'Date is required' }),
  total_cost: z
    .string()
    .min(1, 'Amount is required')
    .refine(
      (val) => {
        const num = Number.parseFloat(val);
        return !Number.isNaN(num) && num > 0;
      },
      { message: 'Amount must be greater than 0' },
    )
    .refine(
      (val) => /^\d+(\.\d{1,2})?$/.test(val),
      { message: 'Amount must be a valid number (e.g., 100 or 100.50)' },
    ),
  notes: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

export default function ExpensesPage() {
  const [showForm, setShowForm] = useState(true);

  // Get data from last 30 days
  const from = format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
  const to = format(new Date(), 'yyyy-MM-dd');

  const { data: expensesData, isLoading: isLoadingExpenses } = useExpenses({ from, to });
  const { data: projectsData, isLoading: isLoadingProjects } = useProjects();
  const { data: categoriesData, isLoading: isLoadingCategories } = useExpenseCategories();

  const createMutation = useCreateExpense();
  const deleteMutation = useDeleteExpense();

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      project_id: '',
      expense_category_id: '',
      spent_date: new Date(),
      total_cost: '',
      notes: '',
    },
  });

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      await createMutation.mutateAsync({
        project_id: Number(data.project_id),
        expense_category_id: Number(data.expense_category_id),
        spent_date: format(data.spent_date, 'yyyy-MM-dd'),
        total_cost: Number.parseFloat(data.total_cost),
        notes: data.notes || undefined,
      });

      toast.success('Expense created successfully');
      form.reset({
        project_id: '',
        expense_category_id: '',
        spent_date: new Date(),
        total_cost: '',
        notes: '',
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to create expense');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Expense deleted successfully');
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  };

  const totalCost =
    expensesData?.expenses.reduce((sum, expense) => sum + expense.total_cost, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">Submit and track your expenses</p>
        </div>
        <Button
          variant={showForm ? 'outline' : 'default'}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Hide Form' : 'Add Expense'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Submit Expense</CardTitle>
            <CardDescription>Enter your expense details for a project</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="spent_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground',
                                )}
                              >
                                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="total_cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              inputMode="decimal"
                              placeholder="100.00"
                              className="pl-9"
                              {...field}
                              onKeyDown={(e) => {
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
                              onChange={(e) => {
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
                          </div>
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
                              projectsData?.projects.map((project) => (
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
                    name="expense_category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingCategories ? (
                              <div className="p-2 text-center text-sm text-muted-foreground">
                                Loading categories...
                              </div>
                            ) : (
                              categoriesData?.expense_categories.map((category) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                  {category.name}
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
                          placeholder="Describe the expense..."
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
                  Submit Expense
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
              <CardTitle>Recent Expenses</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Total expenses</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingExpenses ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : expensesData?.expenses.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No expenses found. Start submitting your expenses!
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expensesData?.expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{format(new Date(expense.spent_date), 'PP')}</TableCell>
                      <TableCell className="font-medium">{expense.project.name}</TableCell>
                      <TableCell>{expense.expense_category.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">${expense.total_cost.toFixed(2)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            expense.is_billed
                              ? 'default'
                              : expense.is_locked
                                ? 'outline'
                                : 'secondary'
                          }
                        >
                          {expense.is_billed ? 'Billed' : expense.is_locked ? 'Locked' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{expense.notes || '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(expense.id)}
                          disabled={deleteMutation.isPending || expense.is_locked}
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
