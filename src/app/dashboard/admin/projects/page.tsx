"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Edit, Trash2, Check, X, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";
import { useIsAdmin, useIsAdminOrManager } from "@/lib/admin-utils-client";
import {
	useProjects,
	useDeleteProject,
	useManagedProjects,
	useUserProjectAssignments,
} from "@/hooks/use-harvest";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/admin/data-table";
import { ProjectFormModal } from "@/components/admin/forms/project-form-modal";
import type { HarvestProject } from "@/types/harvest";
import { Badge } from "@/components/ui/badge";

export default function AdminProjectsPage() {
	const router = useRouter();
	const { data: session } = useSession();
	const isAdminOrManager = useIsAdminOrManager();
	const isAdmin = useIsAdmin();
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [editProjectId, setEditProjectId] = useState<number>();
	const [searchQuery, setSearchQuery] = useState("");
	const [activeFilter, setActiveFilter] = useState<
		"all" | "active" | "archived"
	>("active");

	const { data: managedProjectIds } = useManagedProjects();

	// Conditional query pattern - admin gets all projects, manager gets user assignments
	const { data: allProjectsData, isLoading: isLoadingAllProjects } =
		useProjects({
			enabled: !!session && isAdmin,
		});

	const { data: userAssignmentsData, isLoading: isLoadingUserAssignments } =
		useUserProjectAssignments({
			enabled: !!session && !isAdmin && isAdminOrManager,
		});

	const deleteMutation = useDeleteProject();

	// Determine which data to use and loading state (must be before early returns)
	const projectsData = isAdmin ? allProjectsData : userAssignmentsData;

	const isLoading = isAdmin ? isLoadingAllProjects : isLoadingUserAssignments;

	// Filter projects
	const filteredProjects = (() => {
		if (!projectsData?.projects) return [];

		let projects = projectsData.projects;

		// Apply manager filtering
		if (!isAdmin && isAdminOrManager && managedProjectIds) {
			projects = projects.filter((p) => managedProjectIds.includes(p.id));
		}

		// Apply active filter
		if (activeFilter === "active") {
			projects = projects.filter((p) => p.is_active);
		} else if (activeFilter === "archived") {
			projects = projects.filter((p) => !p.is_active);
		}

		// Apply search query
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			projects = projects.filter(
				(p) =>
					p.name.toLowerCase().includes(query) ||
					p.code?.toLowerCase().includes(query) ||
					p.client.name.toLowerCase().includes(query),
			);
		}

		return projects;
	})();

	// Redirect if not admin or manager
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
		if (!confirm("Are you sure you want to delete this project?")) return;

		try {
			await deleteMutation.mutateAsync(id);
			toast.success("Project deleted successfully");
		} catch {
			toast.error("Failed to delete project");
		}
	};

	const columns: Column<HarvestProject>[] = [
		{
			header: "Project",
			accessor: (p) => (
				<div>
					<div className="font-medium">{p.name}</div>
					<div className="text-sm text-muted-foreground">{p.client.name}</div>
				</div>
			),
		},
		{
			header: "Code",
			accessor: (p) => <span className="text-sm">{p.code || "—"}</span>,
		},
		{
			header: "Type",
			accessor: (p) => (
				<Badge variant={p.is_billable ? "default" : "secondary"}>
					{p.is_billable ? "Billable" : "Non-billable"}
				</Badge>
			),
		},
		{
			header: "Budget",
			accessor: (p) => {
				const isCostBased =
					p.budget_by === "project_cost" || p.budget_by === "task_fees";
				const isHoursBased =
					p.budget_by === "project" ||
					p.budget_by === "task" ||
					p.budget_by === "person";

				const budgetValue = isCostBased ? p.cost_budget : p.budget;

				if (!budgetValue) {
					return <span className="text-sm text-muted-foreground">—</span>;
				}

				return (
					<span className="text-sm">
						{isCostBased && "$"}
						{budgetValue}
						{isHoursBased && "h"}
					</span>
				);
			},
		},
		{
			header: "Dates",
			accessor: (p) => (
				<div className="text-sm">
					{p.starts_on && p.ends_on ? (
						<>
							<div>{format(new Date(p.starts_on), "PP")}</div>
							<div className="text-muted-foreground">
								{format(new Date(p.ends_on), "PP")}
							</div>
						</>
					) : (
						<span className="text-muted-foreground">—</span>
					)}
				</div>
			),
		},
		{
			header: "Status",
			accessor: (p) =>
				p.is_active ? (
					<span className="flex items-center gap-1 text-green-600">
						<Check className="h-4 w-4" />
						Active
					</span>
				) : (
					<span className="flex items-center gap-1 text-muted-foreground">
						<X className="h-4 w-4" />
						Archived
					</span>
				),
		},
		{
			header: "Actions",
			accessor: (p) => (
				<div className="flex gap-2 justify-end">
					<Button
						variant="ghost"
						size="icon"
						onClick={() =>
							router.push(`/dashboard/admin/projects/${p.id}/assignments`)
						}
						title="Manage assignments"
					>
						<Users className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setEditProjectId(p.id)}
						title="Edit project"
					>
						<Edit className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => handleDelete(p.id)}
						disabled={deleteMutation.isPending}
						title="Delete project"
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
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Projects</h1>
					<p className="text-muted-foreground">
						{isAdmin ? "Manage all projects" : "Manage your assigned projects"}
					</p>
				</div>
				{isAdmin && (
					<Button onClick={() => setIsCreateModalOpen(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Create Project
					</Button>
				)}
			</div>

			{/* Filters */}
			<Card>
				<CardContent className="pt-6">
					<div className="flex flex-wrap gap-4">
						<div className="flex-1 min-w-[200px]">
							<Input
								type="text"
								placeholder="Search by name, code, or client..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
						</div>
						<div className="flex gap-2">
							<Button
								variant={activeFilter === "all" ? "default" : "outline"}
								onClick={() => setActiveFilter("all")}
							>
								All
							</Button>
							<Button
								variant={activeFilter === "active" ? "default" : "outline"}
								onClick={() => setActiveFilter("active")}
							>
								Active
							</Button>
							<Button
								variant={activeFilter === "archived" ? "default" : "outline"}
								onClick={() => setActiveFilter("archived")}
							>
								Archived
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Projects Table */}
			<Card>
				<CardHeader>
					<CardTitle>All Projects</CardTitle>
					<CardDescription>
						{filteredProjects.length} project
						{filteredProjects.length !== 1 ? "s" : ""} found
					</CardDescription>
				</CardHeader>
				<CardContent>
					<DataTable
						data={filteredProjects}
						columns={columns}
						isLoading={isLoading}
						emptyMessage="No projects found. Create your first project to get started."
					/>
				</CardContent>
			</Card>

			{/* Modals */}
			<ProjectFormModal
				open={isCreateModalOpen}
				onOpenChange={setIsCreateModalOpen}
			/>
			<ProjectFormModal
				open={!!editProjectId}
				onOpenChange={() => setEditProjectId(undefined)}
				projectId={editProjectId}
			/>
		</div>
	);
}
