'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, DollarSign, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
  useCreateExpense,
  useProjects,
  useUserProjectAssignments,
  useExpenseCategories,
} from '@/hooks/use-harvest';
import { useSession } from '@/lib/auth-client';
import { toast } from 'sonner';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];

const expenseSchema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  expense_category_id: z.string().min(1, 'Category is required'),
  spent_date: z.date({ message: 'Date is required' }),
  total_cost: z
    .string()
    .min(1, 'Amount is required')
    .refine(
      val => {
        const num = Number.parseFloat(val);
        return !Number.isNaN(num) && num > 0;
      },
      { message: 'Amount must be greater than 0' }
    )
    .refine(val => /^\d+(\.\d{1,2})?$/.test(val), {
      message: 'Amount must be a valid number (e.g., 100 or 100.50)',
    }),
  notes: z.string().optional(),
  receipt: z
    .instanceof(File)
    .optional()
    .refine(file => !file || file.size <= MAX_FILE_SIZE, {
      message: 'Receipt must be less than 10MB',
    })
    .refine(file => !file || ACCEPTED_FILE_TYPES.includes(file.type), {
      message: 'Receipt must be a JPEG, PNG, GIF, or PDF file',
    }),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  showCancelButton?: boolean;
  submitButtonText?: string;
}

export function ExpenseForm({
  onSuccess,
  onCancel,
  showCancelButton = true,
  submitButtonText = 'Submit Expense',
}: ExpenseFormProps) {
  const { data: session } = useSession();

  // Use appropriate endpoint based on user role
  const isAdminOrManager = session?.user?.accessRoles?.some(
    role => role === 'administrator' || role === 'manager'
  );

  const { data: allProjectsData, isLoading: isLoadingAllProjects } = useProjects({
    enabled: !!session && isAdminOrManager,
  });
  const { data: userProjectsData, isLoading: isLoadingUserProjects } = useUserProjectAssignments({
    enabled: !!session && !isAdminOrManager,
  });

  // Use all projects for admins/managers, user projects for members
  const projectsData = isAdminOrManager ? allProjectsData : userProjectsData;
  const isLoadingProjects = isAdminOrManager ? isLoadingAllProjects : isLoadingUserProjects;

  const { data: categoriesData, isLoading: isLoadingCategories } = useExpenseCategories();

  const createMutation = useCreateExpense();

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      project_id: '',
      expense_category_id: '',
      spent_date: new Date(),
      total_cost: '',
      notes: '',
      receipt: undefined,
    },
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      await createMutation.mutateAsync({
        project_id: Number(data.project_id),
        expense_category_id: Number(data.expense_category_id),
        spent_date: format(data.spent_date, 'yyyy-MM-dd'),
        total_cost: Number.parseFloat(data.total_cost),
        notes: data.notes || undefined,
        receipt: data.receipt,
      });

      toast.success('Expense created successfully');
      form.reset({
        project_id: '',
        expense_category_id: '',
        spent_date: new Date(),
        total_cost: '',
        notes: '',
        receipt: undefined,
      });
      setSelectedFile(null);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to create expense');
    }
  };

  return (
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
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
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
                      categoriesData?.expense_categories.map(category => (
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

        <FormField
          control={form.control}
          name="receipt"
          render={({ field: { value, onChange, ...field } }) => (
            <FormItem>
              <FormLabel>Receipt (optional)</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.pdf"
                      {...field}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          onChange(file);
                        }
                      }}
                      className="cursor-pointer"
                    />
                  </div>
                  {selectedFile && (
                    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 p-2">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 text-sm truncate">{selectedFile.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setSelectedFile(null);
                          onChange(undefined);
                          // Reset the file input
                          const input = document.querySelector(
                            'input[type="file"]'
                          ) as HTMLInputElement;
                          if (input) input.value = '';
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          {showCancelButton && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitButtonText}
          </Button>
        </div>
      </form>
    </Form>
  );
}
