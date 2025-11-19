"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Edit, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";
import { useIsAdmin } from "@/lib/admin-utils-client";
import { useUsers } from "@/hooks/use-harvest";
import { DataTable, type Column } from "@/components/admin/data-table";
import { UserFormModal } from "@/components/admin/forms/user-form-modal";
import type { HarvestUser } from "@/types/harvest";
import { Badge } from "@/components/ui/badge";
import { secondsToHours } from "@/lib/harvest/utils";

function formatRoleName(role: string): string {
	return role
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(" ");
}

export default function AdminTeamPage() {
	const router = useRouter();
	const { data: session } = useSession();
	const isAdmin = useIsAdmin();
	const [editUserId, setEditUserId] = useState<number>();
	const [searchQuery, setSearchQuery] = useState("");
	const [roleFilter, setRoleFilter] = useState<string>("all");
	const [activeFilter, setActiveFilter] = useState<
		"all" | "active" | "inactive"
	>("active");

	// Data hooks must be called before early returns
	const { data: usersData, isLoading } = useUsers();

	// Extract unique roles from all users
	const availableRoles = useMemo(() => {
		if (!usersData?.users) return [];
		const rolesSet = new Set<string>();
		usersData.users.forEach((user) => {
			user.roles?.forEach((role) => rolesSet.add(role));
		});
		return Array.from(rolesSet).sort();
	}, [usersData]);

	// Filter users (must be before early returns)
	const filteredUsers = useMemo(() => {
		if (!usersData?.users) return [];

		let users = usersData.users;

		// Apply active filter
		if (activeFilter === "active") {
			users = users.filter((u) => u.is_active);
		} else if (activeFilter === "inactive") {
			users = users.filter((u) => !u.is_active);
		}

		// Apply role filter (job titles)
		if (roleFilter !== "all") {
			users = users.filter((u) => u.roles?.includes(roleFilter));
		}

		// Apply search query
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			users = users.filter(
				(u) =>
					u.first_name?.toLowerCase().includes(query) ||
					u.last_name?.toLowerCase().includes(query) ||
					u.email?.toLowerCase().includes(query),
			);
		}

		return users;
	}, [usersData, activeFilter, roleFilter, searchQuery]);

	// Redirect if not admin (using useEffect to avoid React render error)
	useEffect(() => {
		if (session && !isAdmin) {
			router.push("/dashboard");
		}
	}, [session, isAdmin, router]);

	// Show loading state while session is loading or redirecting
	if (!session || isAdmin === undefined) {
		return null;
	}

	// Show nothing if redirecting
	if (!isAdmin) {
		return null;
	}

	const columns: Column<HarvestUser>[] = [
		{
			header: "Name",
			accessor: (u) => (
				<div>
					<div className="font-medium">
						{u.first_name} {u.last_name}
					</div>
					<div className="text-sm text-muted-foreground">{u.email}</div>
				</div>
			),
		},
		{
			header: "Job Title(s)",
			accessor: (u) => (
				<div className="flex gap-1 flex-wrap">
					{u.roles && u.roles.length > 0 ? (
						u.roles.map((role) => (
							<Badge key={role} variant="outline">
								{role}
							</Badge>
						))
					) : (
						<span className="text-muted-foreground">—</span>
					)}
				</div>
			),
		},
		{
			header: "Access Level",
			accessor: (u) => (
				<div className="flex gap-1 flex-wrap">
					{u.access_roles && u.access_roles.length > 0 ? (
						u.access_roles.map((role) => (
							<Badge
								key={role}
								variant={
									role === "administrator"
										? "default"
										: role === "manager"
											? "secondary"
											: "outline"
								}
							>
								{formatRoleName(role)}
							</Badge>
						))
					) : (
						<span className="text-muted-foreground">—</span>
					)}
				</div>
			),
		},
		{
			header: "Type",
			accessor: (u) => (
				<Badge variant={u.is_contractor ? "secondary" : "default"}>
					{u.is_contractor ? "Contractor" : "Employee"}
				</Badge>
			),
		},
		{
			header: "Capacity",
			accessor: (u) => (
				<span className="text-sm">
					{u.weekly_capacity
						? `${secondsToHours(u.weekly_capacity)}h/week`
						: "—"}
				</span>
			),
		},
		{
			header: "Status",
			accessor: (u) =>
				u.is_active ? (
					<span className="flex items-center gap-1 text-green-600">
						<Check className="h-4 w-4" />
						Active
					</span>
				) : (
					<span className="flex items-center gap-1 text-muted-foreground">
						<X className="h-4 w-4" />
						Inactive
					</span>
				),
		},
		{
			header: "Actions",
			accessor: (u) => (
				<div className="flex gap-2 justify-end">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setEditUserId(u.id)}
						title="Edit team member"
					>
						<Edit className="h-4 w-4" />
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
					<h1 className="text-3xl font-bold tracking-tight">Team</h1>
					<p className="text-muted-foreground">
						Manage team members and their roles
					</p>
				</div>
			</div>

			{/* Filters */}
			<Card>
				<CardContent className="pt-6">
					<div className="flex flex-wrap gap-4">
						<div className="flex-1 min-w-[200px]">
							<input
								type="text"
								placeholder="Search by name or email..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full px-3 py-2 border rounded-md"
							/>
						</div>
						<div className="flex gap-2">
							<Button
								variant={activeFilter === "all" ? "default" : "outline"}
								onClick={() => setActiveFilter("all")}
								size="sm"
							>
								All
							</Button>
							<Button
								variant={activeFilter === "active" ? "default" : "outline"}
								onClick={() => setActiveFilter("active")}
								size="sm"
							>
								Active
							</Button>
							<Button
								variant={activeFilter === "inactive" ? "default" : "outline"}
								onClick={() => setActiveFilter("inactive")}
								size="sm"
							>
								Inactive
							</Button>
						</div>
						{availableRoles && availableRoles.length > 0 && (
							<div className="flex gap-2 flex-wrap">
								<Button
									variant={roleFilter === "all" ? "default" : "outline"}
									onClick={() => setRoleFilter("all")}
									size="sm"
								>
									All Roles
								</Button>
								{availableRoles.map((role) => (
									<Button
										key={role}
										variant={roleFilter === role ? "default" : "outline"}
										onClick={() => setRoleFilter(role)}
										size="sm"
									>
										{role}
									</Button>
								))}
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Team Table */}
			<Card>
				<CardHeader>
					<CardTitle>Team Members</CardTitle>
					<CardDescription>
						{filteredUsers.length} member{filteredUsers.length !== 1 ? "s" : ""}{" "}
						found
					</CardDescription>
				</CardHeader>
				<CardContent>
					<DataTable
						data={filteredUsers}
						columns={columns}
						isLoading={isLoading}
						emptyMessage="No team members found."
					/>
				</CardContent>
			</Card>

			{/* Edit Modal */}
			<UserFormModal
				open={!!editUserId}
				onOpenChange={() => setEditUserId(undefined)}
				userId={editUserId}
			/>
		</div>
	);
}
