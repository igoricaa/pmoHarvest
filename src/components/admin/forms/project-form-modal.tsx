"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	useClients,
	useProjects,
	useCreateProject,
	useUpdateProject,
} from "@/hooks/use-harvest";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "@/lib/admin-utils";

const projectFormSchema = z
	.object({
		client_id: z.string().min(1, "Client is required"),
		name: z.string().min(1, "Project name is required"),
		code: z.string().min(1, "Project code is required"),
		is_billable: z.boolean().default(true),
		bill_by: z.enum(["Project", "Tasks", "People", "None"]).default("Project"),
		budget_by: z
			.enum(["project", "project_cost", "task", "task_fees", "person", "none"])
			.default("none"),
		budget_amount: z.string().optional(),
		starts_on: z.date().optional(),
		ends_on: z.date().optional(),
		is_active: z.boolean().default(true),
	})
	.refine(
		(data) => {
			if (data.starts_on && data.ends_on) {
				return data.ends_on >= data.starts_on;
			}
			return true;
		},
		{
			message: "End date must be on or after start date",
			path: ["ends_on"],
		},
	);

type ProjectFormData = z.input<typeof projectFormSchema>;

interface ProjectFormModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	projectId?: number;
}

const BILL_BY_OPTIONS = [
	{ value: "Project", label: "Project" },
	{ value: "Tasks", label: "Tasks" },
	{ value: "People", label: "People" },
	{ value: "None", label: "None" },
];

const BUDGET_BY_OPTIONS = [
	{ value: "project", label: "Project" },
	{ value: "project_cost", label: "Project Cost" },
	{ value: "task", label: "Task" },
	{ value: "task_fees", label: "Task Fees" },
	{ value: "person", label: "Person" },
	{ value: "none", label: "None" },
];

export function ProjectFormModal({
	open,
	onOpenChange,
	projectId,
}: ProjectFormModalProps) {
	const isEditMode = !!projectId;
	const isAdmin = useIsAdmin();

	// Only fetch clients if admin (managers can't access clients API)
	const { data: clientsData, isLoading: isLoadingClients } = useClients(
		undefined,
		{ enabled: isAdmin === true },
	);
	const { data: projectsData, isLoading: isLoadingProjects } = useProjects();
	const createMutation = useCreateProject();
	const updateMutation = useUpdateProject(projectId!);

	// Extract unique clients from projects for managers
	const managerClients = (() => {
		if (isAdmin || !projectsData?.projects) return [];
		const clientMap = new Map<
			number,
			{ id: number; name: string; is_active: boolean }
		>();
		projectsData.projects.forEach((p) => {
			if (!clientMap.has(p.client.id)) {
				clientMap.set(p.client.id, {
					id: p.client.id,
					name: p.client.name,
					is_active: true, // Assume active if project exists
				});
			}
		});
		return Array.from(clientMap.values());
	})();

	// Determine which client list to use
	const availableClients = isAdmin ? clientsData?.clients : managerClients;

	const form = useForm<ProjectFormData>({
		resolver: zodResolver(projectFormSchema),
		defaultValues: {
			client_id: "",
			name: "",
			code: "",
			is_billable: true,
			bill_by: "Project",
			budget_by: "none",
			budget_amount: "",
			is_active: true,
		},
	});

	// Pre-populate form in edit mode
	useEffect(() => {
		if (isEditMode && projectsData && open) {
			const project = projectsData.projects.find((p) => p.id === projectId);
			if (project) {
				// Read from correct budget field based on budget_by type
				const isCostBasedBudget =
					project.budget_by === "project_cost" ||
					project.budget_by === "task_fees";
				const budgetValue = isCostBasedBudget
					? project.cost_budget?.toString() || ""
					: project.budget?.toString() || "";

				form.reset({
					client_id: project.client.id.toString(),
					name: project.name,
					code: project.code || "",
					is_billable: project.is_billable,
					bill_by: project.bill_by,
					budget_by: project.budget_by,
					budget_amount: budgetValue,
					starts_on: project.starts_on
						? new Date(project.starts_on)
						: undefined,
					ends_on: project.ends_on ? new Date(project.ends_on) : undefined,
					is_active: project.is_active,
				});
			}
		} else if (!isEditMode && open) {
			form.reset({
				client_id: "",
				name: "",
				code: "",
				is_billable: true,
				bill_by: "Project",
				budget_by: "none",
				budget_amount: "",
				is_active: true,
			});
		}
	}, [projectsData, projectId, isEditMode, open, form]);

	const onSubmit = async (data: ProjectFormData) => {
		try {
			const isCostBasedBudget =
				data.budget_by === "project_cost" || data.budget_by === "task_fees";
			const isHoursBasedBudget =
				data.budget_by === "project" ||
				data.budget_by === "task" ||
				data.budget_by === "person";

			const payload: any = {
				client_id: Number.parseInt(data.client_id),
				name: data.name,
				code: data.code,
				is_billable: data.is_billable,
				bill_by: data.bill_by,
				budget_by: data.budget_by,
				// Send correct budget field based on budget_by type
				...(isCostBasedBudget && data.budget_amount
					? { cost_budget: Number.parseFloat(data.budget_amount) }
					: {}),
				...(isHoursBasedBudget && data.budget_amount
					? { budget: Number.parseFloat(data.budget_amount) }
					: {}),
				starts_on: data.starts_on
					? format(data.starts_on, "yyyy-MM-dd")
					: undefined,
				ends_on: data.ends_on ? format(data.ends_on, "yyyy-MM-dd") : undefined,
			};

			if (isEditMode) {
				await updateMutation.mutateAsync(payload);
				toast.success("Project updated successfully");
			} else {
				await createMutation.mutateAsync(payload);
				toast.success("Project created successfully");
			}
			onOpenChange(false);
		} catch (error) {
			toast.error(
				isEditMode ? "Failed to update project" : "Failed to create project",
			);
		}
	};

	const isLoading = createMutation.isPending || updateMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEditMode ? "Edit Project" : "Create Project"}
					</DialogTitle>
					<DialogDescription>
						{isEditMode
							? "Update project details"
							: "Add a new project to your organization"}
					</DialogDescription>
				</DialogHeader>

				{!isEditMode && isAdmin === false && (
					<div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
						<p className="text-sm text-blue-800 dark:text-blue-200">
							You can create projects using clients from your managed projects.
							If you need to create a project with a new client, please contact
							an administrator.
						</p>
					</div>
				)}

				{isEditMode && isLoadingProjects ? (
					<div className="flex items-center justify-center p-8">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				) : (
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="client_id"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Client</FormLabel>
										{isAdmin || !isEditMode ? (
											<Select
												onValueChange={field.onChange}
												value={field.value}
												disabled={
													isLoadingClients ||
													(isAdmin === false && isLoadingProjects)
												}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select client" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{availableClients
														?.filter((c) => c.is_active)
														.map((client) => (
															<SelectItem
																key={client.id}
																value={client.id.toString()}
															>
																{client.name}
															</SelectItem>
														))}
													{availableClients?.length === 0 && (
														<div className="px-2 py-1.5 text-sm text-muted-foreground">
															No clients available
														</div>
													)}
												</SelectContent>
											</Select>
										) : (
											// Managers editing: show read-only client name
											<div className="px-3 py-2 border rounded-md bg-muted text-sm">
												{projectsData?.projects.find((p) => p.id === projectId)
													?.client.name || "N/A"}
											</div>
										)}
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Project Name</FormLabel>
											<FormControl>
												<Input placeholder="Project name" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="code"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Project Code</FormLabel>
											<FormControl>
												<Input placeholder="PRJ-001" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="bill_by"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Bill By</FormLabel>
											<Select
												onValueChange={field.onChange}
												value={field.value}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{BILL_BY_OPTIONS.map((option) => (
														<SelectItem key={option.value} value={option.value}>
															{option.label}
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
									name="budget_by"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Budget By</FormLabel>
											<Select
												onValueChange={field.onChange}
												value={field.value}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{BUDGET_BY_OPTIONS.map((option) => (
														<SelectItem key={option.value} value={option.value}>
															{option.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="budget_amount"
								render={({ field }) => {
									const budgetBy = form.watch("budget_by");
									const isCostBased =
										budgetBy === "project_cost" || budgetBy === "task_fees";
									const label = isCostBased
										? "Budget (Cost)"
										: "Budget (Hours)";

									return (
										<FormItem>
											<FormLabel>{label} (Optional)</FormLabel>
											<FormControl>
												<Input
													type="number"
													placeholder={isCostBased ? "10000" : "500"}
													step="0.01"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									);
								}}
							/>

							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="starts_on"
									render={({ field }) => {
										const [isOpen, setIsOpen] = useState(false);
										return (
											<FormItem className="flex flex-col">
												<FormLabel>Start Date (Optional)</FormLabel>
												<Popover open={isOpen} onOpenChange={setIsOpen}>
													<PopoverTrigger asChild>
														<FormControl>
															<Button
																variant="outline"
																className={cn(
																	"pl-3 text-left font-normal",
																	!field.value && "text-muted-foreground",
																)}
															>
																{field.value ? (
																	format(field.value, "PP")
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
									name="ends_on"
									render={({ field }) => {
										const [isOpen, setIsOpen] = useState(false);
										return (
											<FormItem className="flex flex-col">
												<FormLabel>End Date (Optional)</FormLabel>
												<Popover open={isOpen} onOpenChange={setIsOpen}>
													<PopoverTrigger asChild>
														<FormControl>
															<Button
																variant="outline"
																className={cn(
																	"pl-3 text-left font-normal",
																	!field.value && "text-muted-foreground",
																)}
															>
																{field.value ? (
																	format(field.value, "PP")
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
															initialFocus
														/>
													</PopoverContent>
												</Popover>
												<FormMessage />
											</FormItem>
										);
									}}
								/>
							</div>

							<div className="flex gap-4">
								<FormField
									control={form.control}
									name="is_billable"
									render={({ field }) => (
										<FormItem className="flex items-center gap-2">
											<FormControl>
												<input
													type="checkbox"
													className="h-4 w-4"
													checked={field.value}
													onChange={field.onChange}
												/>
											</FormControl>
											<FormLabel className="!mt-0">Billable</FormLabel>
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="is_active"
									render={({ field }) => (
										<FormItem className="flex items-center gap-2">
											<FormControl>
												<input
													type="checkbox"
													className="h-4 w-4"
													checked={field.value}
													onChange={field.onChange}
												/>
											</FormControl>
											<FormLabel className="!mt-0">Active</FormLabel>
										</FormItem>
									)}
								/>
							</div>

							<div className="flex gap-2 justify-end">
								<Button
									type="button"
									variant="outline"
									onClick={() => onOpenChange(false)}
									disabled={isLoading}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={
										isLoading ||
										(!isEditMode &&
											isAdmin === false &&
											(!availableClients || availableClients.length === 0))
									}
								>
									{isLoading && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									{isEditMode ? "Update" : "Create"}
								</Button>
							</div>
						</form>
					</Form>
				)}
			</DialogContent>
		</Dialog>
	);
}
