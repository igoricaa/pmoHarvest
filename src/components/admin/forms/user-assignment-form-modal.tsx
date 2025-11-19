"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	useUsers,
	useProjectUserAssignments,
	useCreateUserAssignment,
	useUpdateUserAssignment,
	useProjects,
} from "@/hooks/use-harvest";
import { toast } from "sonner";

const userAssignmentFormSchema = z.object({
	user_id: z.string().min(1, "User is required"),
	is_active: z.boolean().default(true),
	is_project_manager: z.boolean().default(false),
	use_default_rates: z.boolean().default(true),
	hourly_rate: z.string().optional(),
	budget: z.string().optional(),
});

type UserAssignmentFormData = z.infer<typeof userAssignmentFormSchema>;

interface UserAssignmentFormModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	projectId: number;
	assignmentId?: number;
}

export function UserAssignmentFormModal({
	open,
	onOpenChange,
	projectId,
	assignmentId,
}: UserAssignmentFormModalProps) {
	const isEditMode = !!assignmentId;
	const { data: usersData, isLoading: isLoadingUsers } = useUsers({
		is_active: true,
	});
	const { data: assignmentsData, isLoading: isLoadingAssignments } =
		useProjectUserAssignments(projectId);
	const { data: projectsData } = useProjects();
	const project = projectsData?.projects.find((p) => p.id === projectId);
	const createMutation = useCreateUserAssignment(projectId);
	const updateMutation = useUpdateUserAssignment(projectId, assignmentId!);

	const form = useForm<UserAssignmentFormData>({
		resolver: zodResolver(userAssignmentFormSchema) as any,
		defaultValues: {
			user_id: "",
			is_active: true,
			is_project_manager: false,
			use_default_rates: true,
			hourly_rate: "",
			budget: "",
		},
	});

	const useDefaultRates = form.watch("use_default_rates");

	// Pre-populate form in edit mode
	useEffect(() => {
		if (isEditMode && assignmentsData && open) {
			const assignment = assignmentsData.user_assignments.find(
				(a) => a.id === assignmentId,
			);
			if (assignment) {
				const hasCustomRate = assignment.hourly_rate !== null;
				form.reset({
					user_id: assignment.user.id.toString(),
					is_active: assignment.is_active,
					is_project_manager: assignment.is_project_manager,
					use_default_rates: !hasCustomRate,
					hourly_rate: assignment.hourly_rate?.toString() || "",
					budget: assignment.budget?.toString() || "",
				});
			}
		} else if (!isEditMode && open) {
			form.reset({
				user_id: "",
				is_active: true,
				is_project_manager: false,
				use_default_rates: true,
				hourly_rate: "",
				budget: "",
			});
		}
	}, [assignmentsData, assignmentId, isEditMode, open, form]);

	// Check if budget field should be shown (only when budget_by is "person")
	const showBudgetField = project?.budget_by === "person";

	const onSubmit = async (data: UserAssignmentFormData) => {
		try {
			const payload: any = {
				is_active: data.is_active,
				is_project_manager: data.is_project_manager,
				use_default_rates: data.use_default_rates,
			};

			if (!isEditMode) {
				payload.user_id = Number.parseInt(data.user_id);
			}

			if (!data.use_default_rates && data.hourly_rate) {
				payload.hourly_rate = Number.parseFloat(data.hourly_rate);
			}

			// Only include budget if project's budget_by is "person"
			if (showBudgetField && data.budget && data.budget.trim() !== "") {
				const budgetValue = Number.parseFloat(data.budget);
				if (!Number.isNaN(budgetValue) && budgetValue > 0) {
					payload.budget = budgetValue;
				}
			}

			if (isEditMode) {
				await updateMutation.mutateAsync(payload);
				toast.success("Assignment updated successfully");
			} else {
				await createMutation.mutateAsync(payload);
				toast.success("User assigned successfully");
			}
			onOpenChange(false);
		} catch (error) {
			toast.error(
				isEditMode ? "Failed to update assignment" : "Failed to assign user",
			);
		}
	};

	const isLoading = createMutation.isPending || updateMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>
						{isEditMode ? "Edit User Assignment" : "Assign User to Project"}
					</DialogTitle>
					<DialogDescription>
						{isEditMode
							? "Update user assignment details"
							: "Assign a team member to this project"}
					</DialogDescription>
				</DialogHeader>

				{isEditMode && isLoadingAssignments ? (
					<div className="flex items-center justify-center p-8">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				) : (
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="user_id"
								render={({ field }) => {
									// In edit mode, show read-only user name
									if (isEditMode) {
										const assignment = assignmentsData?.user_assignments.find(
											(a) => a.id === assignmentId,
										);
										const userName = assignment?.user.name || "Unknown User";

										return (
											<FormItem>
												<FormLabel>User</FormLabel>
												<div className="px-3 py-2 border rounded-md bg-muted text-sm">
													{userName}
												</div>
												<FormMessage />
											</FormItem>
										);
									}

									// In create mode, show select
									return (
										<FormItem>
											<FormLabel>User</FormLabel>
											<Select
												onValueChange={field.onChange}
												value={field.value}
												disabled={isLoadingUsers}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select user" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{usersData?.users.map((user) => (
														<SelectItem
															key={user.id}
															value={user.id.toString()}
														>
															{user.first_name} {user.last_name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									);
								}}
							/>

							<FormField
								control={form.control}
								name="is_active"
								render={({ field }) => (
									<FormItem className="flex items-center justify-between rounded-lg border p-3">
										<div>
											<FormLabel className="text-base">Active</FormLabel>
											<FormDescription className="text-sm">
												Inactive assignments cannot log time
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

							<FormField
								control={form.control}
								name="is_project_manager"
								render={({ field }) => (
									<FormItem className="flex items-center justify-between rounded-lg border p-3">
										<div>
											<FormLabel className="text-base">
												Project Manager
											</FormLabel>
											<FormDescription className="text-sm">
												Manager can view team time and expenses
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

							<FormField
								control={form.control}
								name="use_default_rates"
								render={({ field }) => (
									<FormItem className="flex items-center justify-between rounded-lg border p-3">
										<div>
											<FormLabel className="text-base">
												Use Default Rates
											</FormLabel>
											<FormDescription className="text-sm">
												Use the user's default hourly rate
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

							{!useDefaultRates && (
								<FormField
									control={form.control}
									name="hourly_rate"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Custom Hourly Rate</FormLabel>
											<FormControl>
												<Input
													type="number"
													placeholder="150.00"
													step="0.01"
													{...field}
													disabled={useDefaultRates}
												/>
											</FormControl>
											<FormDescription>
												Override the user's default rate
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}

							{showBudgetField && (
								<FormField
									control={form.control}
									name="budget"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Budget (Optional)</FormLabel>
											<FormControl>
												<Input
													type="number"
													placeholder="10000"
													step="0.01"
													{...field}
												/>
											</FormControl>
											<FormDescription>
												Budget allocated for this user on this project
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}

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
									{isLoading && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									{isEditMode ? "Update" : "Assign"}
								</Button>
							</div>
						</form>
					</Form>
				)}
			</DialogContent>
		</Dialog>
	);
}
