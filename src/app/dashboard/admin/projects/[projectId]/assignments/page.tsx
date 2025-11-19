"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";
import { useIsAdminOrManager } from "@/lib/admin-utils";
import {
	useProjectUserAssignments,
	useDeleteUserAssignment,
} from "@/hooks/use-harvest";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/admin/data-table";
import { UserAssignmentFormModal } from "@/components/admin/forms/user-assignment-form-modal";
import type { HarvestUserAssignment } from "@/types/harvest";
import { Badge } from "@/components/ui/badge";

export default function ProjectAssignmentsPage() {
	const router = useRouter();
	const params = useParams();
	const projectId = parseInt(params.projectId as string);
	const { data: session } = useSession();
	const isAdminOrManager = useIsAdminOrManager();
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

	// Data hooks must be called before early returns
	const { data: assignmentsData, isLoading: isLoadingAssignments } =
		useProjectUserAssignments(projectId);
	const deleteMutation = useDeleteUserAssignment(projectId);

	// Get project data from the first assignment (must be before early returns)
	const projectData = assignmentsData?.user_assignments[0]?.project;

	// Redirect if not admin or manager (using useEffect to avoid React render error)
	useEffect(() => {
		if (session && isAdminOrManager === false) {
			router.push("/dashboard");
		}
	}, [session, isAdminOrManager, router]);

	// Show loading state while session is loading or redirecting
	if (!session || isAdminOrManager === undefined) {
		return null;
	}

	// Show nothing if redirecting
	if (isAdminOrManager === false) {
		return null;
	}

	const handleDelete = async (id: number) => {
		if (!confirm("Are you sure you want to remove this user assignment?"))
			return;

		try {
			await deleteMutation.mutateAsync(id);
			toast.success("Assignment removed successfully");
		} catch (error) {
			toast.error("Failed to remove assignment");
		}
	};

	const columns: Column<HarvestUserAssignment>[] = [
		{
			header: "User",
			accessor: (a) => (
				<div>
					<div className="font-medium">{a.user.name}</div>
					<div className="text-sm text-muted-foreground">ID: {a.user.id}</div>
				</div>
			),
		},
		{
			header: "Billable Rate",
			accessor: (a) => (
				<span className="text-sm">
					{a.use_default_rates ? (
						<span className="text-muted-foreground">Default rate</span>
					) : (
						`$${a.hourly_rate?.toFixed(2)}/h`
					)}
				</span>
			),
		},
		{
			header: "Budget",
			accessor: (a) => (
				<span className="text-sm">
					{a.budget ? (
						`${a.budget}h`
					) : (
						<span className="text-muted-foreground">No limit</span>
					)}
				</span>
			),
		},
		{
			header: "Manager",
			accessor: (a) =>
				a.is_project_manager ? (
					<span className="flex items-center gap-1 text-green-600">
						<Check className="h-4 w-4" />
						Yes
					</span>
				) : (
					<span className="flex items-center gap-1 text-muted-foreground">
						<X className="h-4 w-4" />
						No
					</span>
				),
		},
		{
			header: "Status",
			accessor: (a) =>
				a.is_active ? (
					<Badge variant="default">Active</Badge>
				) : (
					<Badge variant="secondary">Inactive</Badge>
				),
		},
		{
			header: "Actions",
			accessor: (a) => (
				<div className="flex gap-2 justify-end">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => handleDelete(a.id)}
						disabled={deleteMutation.isPending}
						title="Remove assignment"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			),
			className: "text-right",
		},
	];

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" onClick={() => router.back()}>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div className="flex-1">
					{isLoadingAssignments ? (
						<div className="h-8 w-48 bg-muted animate-pulse rounded" />
					) : (
						<>
							<h1 className="text-3xl font-bold tracking-tight">
								{projectData?.name || "Project"} - Assignments
							</h1>
							<p className="text-muted-foreground">
								Manage team member assignments for this project
							</p>
						</>
					)}
				</div>
				<Button onClick={() => setIsCreateModalOpen(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Add Assignment
				</Button>
			</div>

			{/* Project Info */}
			{projectData && (
				<Card>
					<CardHeader>
						<CardTitle>Project Details</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<div className="text-sm text-muted-foreground">
									Project Name
								</div>
								<div className="font-medium">{projectData.name}</div>
							</div>
							<div>
								<div className="text-sm text-muted-foreground">Code</div>
								<div className="font-medium">{projectData.code || "—"}</div>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Assignments Table */}
			<Card>
				<CardHeader>
					<CardTitle>Team Assignments</CardTitle>
					<CardDescription>
						{assignmentsData?.user_assignments.length || 0} team member
						{assignmentsData?.user_assignments.length !== 1 ? "s" : ""} assigned
					</CardDescription>
				</CardHeader>
				<CardContent>
					<DataTable
						data={assignmentsData?.user_assignments || []}
						columns={columns}
						isLoading={isLoadingAssignments}
						emptyMessage="No team members assigned to this project. Add assignments to get started."
					/>
				</CardContent>
			</Card>

			{/* Modals */}
			<UserAssignmentFormModal
				open={isCreateModalOpen}
				onOpenChange={setIsCreateModalOpen}
				projectId={projectId}
			/>
		</div>
	);
}
