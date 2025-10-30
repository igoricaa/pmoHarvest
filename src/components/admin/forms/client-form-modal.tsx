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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClient, useCreateClient, useUpdateClient } from '@/hooks/use-harvest';
import { toast } from 'sonner';

const clientFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  currency: z.string().min(1, 'Currency is required'),
  is_active: z.boolean().default(true),
  address: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientFormSchema>;

interface ClientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: number;
}

const CURRENCIES = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'CHF', label: 'CHF - Swiss Franc' },
];

export function ClientFormModal({ open, onOpenChange, clientId }: ClientFormModalProps) {
  const isEditMode = !!clientId;
  const { data: clientData, isLoading: isLoadingClient } = useClient(clientId!);
  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient(clientId!);

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema) as any,
    defaultValues: {
      name: '',
      currency: 'USD',
      is_active: true,
      address: '',
    },
  });

  // Pre-populate form in edit mode
  useEffect(() => {
    if (isEditMode && clientData && open) {
      form.reset({
        name: clientData.name,
        currency: clientData.currency,
        is_active: clientData.is_active,
        address: clientData.address || '',
      });
    } else if (!isEditMode && open) {
      form.reset({
        name: '',
        currency: 'USD',
        is_active: true,
        address: '',
      });
    }
  }, [clientData, isEditMode, open, form]);

  const onSubmit = async (data: ClientFormData) => {
    try {
      if (isEditMode) {
        await updateMutation.mutateAsync(data);
        toast.success('Client updated successfully');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Client created successfully');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditMode ? 'Failed to update client' : 'Failed to create client');
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Client' : 'Create Client'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update client details' : 'Add a new client to your organization'}
          </DialogDescription>
        </DialogHeader>

        {isEditMode && isLoadingClient ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Client name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCIES.map(currency => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel className="text-base">Active</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Inactive clients cannot be assigned to new projects
                      </p>
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

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Client address"
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
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
