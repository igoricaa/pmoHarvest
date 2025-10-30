'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useUsers, useCreateUser, useUpdateUser } from '@/hooks/use-harvest';
import { toast } from 'sonner';
import { hoursToSeconds, secondsToHours } from '@/lib/harvest/utils';

const userFormSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  roles: z.string().optional(), // Free-text job title (e.g., "Senior Developer")
  access_roles: z.array(z.string()).min(1, 'At least one access role is required'),
  is_contractor: z.boolean().default(false),
  weekly_capacity: z
    .string()
    .min(1, 'Weekly capacity is required')
    .refine(
      val => {
        const num = Number.parseFloat(val);
        return !Number.isNaN(num) && num > 0 && num <= 168;
      },
      { message: 'Weekly capacity must be between 0 and 168 hours' }
    ),
  default_hourly_rate: z.string().optional(),
  cost_rate: z.string().optional(),
});

type UserFormData = z.infer<typeof userFormSchema>;

interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: number;
}

const ACCESS_ROLES = [
  { value: 'administrator', label: 'Administrator' },
  { value: 'manager', label: 'Manager' },
  { value: 'member', label: 'Member' },
];

export function UserFormModal({ open, onOpenChange, userId }: UserFormModalProps) {
  const isEditMode = !!userId;
  const { data: usersData, isLoading: isLoadingUsers } = useUsers();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser(userId!);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema) as any,
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      roles: '',
      access_roles: ['member'],
      is_contractor: false,
      weekly_capacity: '40',
      default_hourly_rate: '',
      cost_rate: '',
    },
  });

  // Pre-populate form in edit mode
  useEffect(() => {
    if (isEditMode && usersData && open) {
      const user = usersData.users.find(u => u.id === userId);
      if (user) {
        form.reset({
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          roles: user.roles?.join(', ') || '',
          access_roles: user.access_roles || ['member'],
          is_contractor: user.is_contractor,
          weekly_capacity: user.weekly_capacity
            ? secondsToHours(user.weekly_capacity).toString()
            : '40',
          default_hourly_rate: user.default_hourly_rate?.toString() || '',
          cost_rate: user.cost_rate?.toString() || '',
        });
      }
    } else if (!isEditMode && open) {
      form.reset({
        first_name: '',
        last_name: '',
        email: '',
        roles: '',
        access_roles: ['member'],
        is_contractor: false,
        weekly_capacity: '40',
        default_hourly_rate: '',
        cost_rate: '',
      });
    }
  }, [usersData, userId, isEditMode, open, form]);

  const onSubmit = async (data: UserFormData) => {
    try {
      const payload: any = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        roles: data.roles
          ? data.roles
              .split(',')
              .map(r => r.trim())
              .filter(r => r.length > 0)
          : [],
        access_roles: data.access_roles,
        is_contractor: data.is_contractor,
        weekly_capacity: hoursToSeconds(Number.parseFloat(data.weekly_capacity)),
        default_hourly_rate: data.default_hourly_rate
          ? Number.parseFloat(data.default_hourly_rate)
          : undefined,
        cost_rate: data.cost_rate ? Number.parseFloat(data.cost_rate) : undefined,
      };

      if (isEditMode) {
        await updateMutation.mutateAsync(payload);
        toast.success('User updated successfully');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('User created successfully');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditMode ? 'Failed to update user' : 'Failed to create user');
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit User' : 'Create User'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update user details' : 'Add a new team member to your organization'}
          </DialogDescription>
        </DialogHeader>

        {isEditMode && isLoadingUsers ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john.doe@example.com"
                        {...field}
                        disabled={isEditMode}
                      />
                    </FormControl>
                    {isEditMode && (
                      <FormDescription>Email cannot be changed after creation</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title(s) (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Senior Developer, Product Manager"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter job title(s), separated by commas. Used for filtering and reports.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="access_roles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Roles</FormLabel>
                    <div className="space-y-2">
                      {ACCESS_ROLES.map(role => (
                        <div key={role.value} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={role.value}
                            className="h-4 w-4"
                            checked={field.value.includes(role.value)}
                            onChange={e => {
                              const checked = e.target.checked;
                              const newRoles = checked
                                ? [...field.value, role.value]
                                : field.value.filter(r => r !== role.value);
                              field.onChange(newRoles);
                            }}
                          />
                          <label
                            htmlFor={role.value}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {role.label}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormDescription>
                      Select at least one access role. Determines user permissions.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weekly_capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weekly Capacity (hours)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="40" step="0.5" {...field} />
                    </FormControl>
                    <FormDescription>
                      Standard full-time capacity is 40 hours per week
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="default_hourly_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Hourly Rate (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="150.00" step="0.01" {...field} />
                      </FormControl>
                      <FormDescription>Billable rate</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cost_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost Rate (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="75.00" step="0.01" {...field} />
                      </FormControl>
                      <FormDescription>Internal cost</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="is_contractor"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel className="text-base">Contractor</FormLabel>
                      <FormDescription className="text-sm">
                        Mark as contractor (not employee)
                      </FormDescription>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditMode ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
