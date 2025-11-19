"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
	useCreateTimeEntry,
	useProjects,
	useUserProjectAssignments,
	useTaskAssignments,
	useLockedPeriods,
} from "@/hooks/use-harvest";
import { useIsAdmin } from "@/lib/admin-utils-client";
import { useNumericInput } from "@/hooks/use-numeric-input";
import { formatLockedPeriodError } from "@/lib/error-utils";
import { isDateInLockedWeek } from "@/lib/locked-period-utils";
import { toast } from "sonner";

const timeEntrySchema = z.object({
	project_id: z.string().min(1, "Project is required"),
	task_id: z.string().min(1, "Task is required"),
	spent_date: z.date({ message: "Date is required" }),
	hours: z
		.string()
		.min(1, "Hours is required")
		.refine(
			(val) => {
				const num = Number.parseFloat(val);
				return !Number.isNaN(num) && num > 0 && num <= 24;
			},
			{ message: "Hours must be between 0 and 24" },
		)
		.refine((val) => /^\d+(\.\d{1,2})?$/.test(val), {
			message: "Hours must be a valid number (e.g., 8 or 8.5)",
		}),
	notes: z.string().optional(),
});

type TimeEntryFormData = z.infer<typeof timeEntrySchema>;

interface TimeEntryFormProps {
	onSuccess?: () => void;
	onCancel?: () => void;
	showCancelButton?: boolean;
	submitButtonText?: string;
}

export function TimeEntryForm({
	onSuccess,
	onCancel,
	showCancelButton = true,
	submitButtonText = "Log Time",
}: TimeEntryFormProps) {
	const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
		null,
	);
	const isAdmin = useIsAdmin();
	const numericHandlers = useNumericInput(2);

	// Fetch locked week ranges (Harvest locks entire weeks, not individual dates)
	const { data: lockedWeeks = [] } = useLockedPeriods();

	const { data: allProjectsData, isLoading: isLoadingAllProjects } =
		useProjects({
			enabled: isAdmin === true,
		});
	const { data: userProjectsData, isLoading: isLoadingUserProjects } =
		useUserProjectAssignments({
			enabled: isAdmin !== true,
		});

	// Use all projects for admins only, user projects for managers and members
	const projectsData = isAdmin ? allProjectsData : userProjectsData;
	const isLoadingProjects = isAdmin
		? isLoadingAllProjects
		: isLoadingUserProjects;

	const { data: tasksData, isLoading: isLoadingTasks } = useTaskAssignments(
		selectedProjectId,
		{
			isAdmin,
		},
	);

	const createMutation = useCreateTimeEntry();

	const form = useForm<TimeEntryFormData>({
		resolver: zodResolver(timeEntrySchema),
		defaultValues: {
			project_id: "",
			task_id: "",
			spent_date: new Date(),
			hours: "",
			notes: "",
		},
	});

	const onSubmit = async (data: TimeEntryFormData) => {
		try {
			await createMutation.mutateAsync({
				project_id: Number(data.project_id),
				task_id: Number(data.task_id),
				spent_date: format(data.spent_date, "yyyy-MM-dd"),
				hours: Number.parseFloat(data.hours),
				notes: data.notes || undefined,
			});

			toast.success("Time entry created successfully");
			form.reset({
				project_id: "",
				task_id: "",
				spent_date: new Date(),
				hours: "",
				notes: "",
			});
			setSelectedProjectId(null);
			onSuccess?.();
		} catch (error: any) {
			const errorMessage =
				error?.response?.data?.error || "Failed to create time entry";
			const cleanMessage = formatLockedPeriodError(errorMessage);
			toast.error(cleanMessage);
		}
	};

	const projectId = form.watch("project_id");

	// Update selected project when form value changes (moved to useEffect to avoid render-phase side effects)
	useEffect(() => {
		if (projectId && Number(projectId) !== selectedProjectId) {
			setSelectedProjectId(Number(projectId));
			form.setValue("task_id", ""); // Reset task when project changes
		}
	}, [projectId, selectedProjectId, form]);

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
								<FormItem className="flex flex-col relative">
									<FormLabel>Date</FormLabel>
									<Popover open={isOpen} onOpenChange={setIsOpen}>
										<PopoverTrigger asChild>
											<FormControl>
												<Button
													variant="outline"
													className={cn(
														"w-full pl-3 text-left font-normal",
														!field.value && "text-muted-foreground",
													)}
												>
													{field.value ? (
														format(field.value, "PPP")
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
												onSelect={(date) => {
													field.onChange(date);
													setIsOpen(false);
												}}
												disabled={(date) =>
													date > new Date() ||
													date < new Date("1900-01-01") ||
													isDateInLockedWeek(date, lockedWeeks)
												}
												initialFocus
											/>
										</PopoverContent>
									</Popover>
									<FormMessage />
									{lockedWeeks.length > 0 && (
										<p className="absolute top-full mt-1 text-xs text-muted-foreground">
											Locked weeks cannot be selected
										</p>
									)}
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
										onKeyDown={numericHandlers.onKeyDown}
										onChange={(e) =>
											numericHandlers.onChange(e, field.onChange)
										}
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
											projectsData?.projects.map((project) => (
												<SelectItem
													key={project.id}
													value={project.id.toString()}
												>
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
													selectedProjectId
														? "Select a task"
														: "Select a project first"
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
											tasksData?.task_assignments.map((assignment) => (
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
						{createMutation.isPending && (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						)}
						{submitButtonText}
					</Button>
				</div>
			</form>
		</Form>
	);
}
