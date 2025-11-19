"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
	useTimeEntries,
	useDeleteTimeEntry,
	useProjects,
	useUserProjectAssignments,
} from "@/hooks/use-harvest";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { TimeEntryForm } from "@/components/time-entry-form";
import { useIsAdmin } from "@/lib/admin-utils-client";

export default function TimeEntriesPage() {
	const [showForm, setShowForm] = useState(true);
	const isAdmin = useIsAdmin();

	const { data: allProjectsData, isLoading: isLoadingAllProjects } =
		useProjects({
			enabled: isAdmin === true,
		});
	const { data: userProjectsData, isLoading: isLoadingUserProjects } =
		useUserProjectAssignments({
			enabled: isAdmin !== true,
		});

	const projectsData = isAdmin ? allProjectsData : userProjectsData;
	const isLoadingProjects = isAdmin
		? isLoadingAllProjects
		: isLoadingUserProjects;

	// Get data from last 30 days
	const from = format(
		new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
		"yyyy-MM-dd",
	);
	const to = format(new Date(), "yyyy-MM-dd");

	const {
		data: timeEntriesData,
		isLoading: isLoadingEntries,
		refetch: refetchTimeEntries,
		isFetching: isFetchingTimeEntries,
	} = useTimeEntries({ from, to });
	const deleteMutation = useDeleteTimeEntry();

	// Show empty state if no projects assigned
	if (!isLoadingProjects && projectsData?.projects?.length === 0) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-muted-foreground text-lg">
					You have no projects assigned
				</p>
			</div>
		);
	}

	const handleDelete = async (id: number) => {
		if (!confirm("Are you sure you want to delete this time entry?")) return;

		try {
			await deleteMutation.mutateAsync(id);
			toast.success("Time entry deleted successfully");
		} catch (error) {
			toast.error("Failed to delete time entry");
		}
	};

	const totalHours =
		timeEntriesData?.time_entries.reduce(
			(sum, entry) => sum + entry.hours,
			0,
		) || 0;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Time Entries</h1>
					<p className="text-muted-foreground">
						Log your hours and track your time
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							refetchTimeEntries().then((result) => {
								if (result.isError) {
									toast.error("Failed to refresh time entries");
								} else {
									toast.success("Time entries refreshed");
								}
							});
						}}
						disabled={isFetchingTimeEntries}
					>
						<RefreshCw
							className={cn(
								"mr-2 h-4 w-4",
								isFetchingTimeEntries && "animate-spin",
							)}
						/>
						{isFetchingTimeEntries ? "Refreshing..." : "Refresh"}
					</Button>
					<Button
						variant={showForm ? "outline" : "default"}
						onClick={() => setShowForm(!showForm)}
					>
						{showForm ? "Hide Form" : "Log Time"}
					</Button>
				</div>
			</div>

			{showForm && (
				<Card>
					<CardHeader>
						<CardTitle>Log Time Entry</CardTitle>
						<CardDescription>
							Enter your time for a project and task
						</CardDescription>
					</CardHeader>
					<CardContent>
						<TimeEntryForm showCancelButton={false} />
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
										<TableHead>Member</TableHead>
										<TableHead>Project</TableHead>
										<TableHead>Task</TableHead>
										<TableHead>Hours</TableHead>
										<TableHead>Notes</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{timeEntriesData?.time_entries.map((entry) => (
										<TableRow key={entry.id}>
											<TableCell>
												{format(new Date(entry.spent_date), "PP")}
											</TableCell>
											<TableCell>{entry.user.name}</TableCell>
											<TableCell className="font-medium">
												{entry.project.name}
											</TableCell>
											<TableCell>{entry.task.name}</TableCell>
											<TableCell>
												<Badge variant="secondary">{entry.hours}h</Badge>
											</TableCell>
											<TableCell className="max-w-xs truncate">
												{entry.notes || "—"}
											</TableCell>
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
