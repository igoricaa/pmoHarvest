"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Edit, Trash2, Check, X, Plus } from "lucide-react";
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
import { useClients, useDeleteClient } from "@/hooks/use-harvest";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/admin/data-table";
import { ClientFormModal } from "@/components/admin/forms/client-form-modal";
import type { HarvestClient } from "@/types/harvest";

export default function AdminClientsPage() {
	const router = useRouter();
	const { data: session } = useSession();
	const isAdminOrManager = useIsAdminOrManager();
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [editClientId, setEditClientId] = useState<number>();
	const [searchQuery, setSearchQuery] = useState("");
	const [activeFilter, setActiveFilter] = useState<
		"all" | "active" | "archived"
	>("active");

	// Data hooks must be called before early returns
	const { data: clientsData, isLoading } = useClients();
	const deleteMutation = useDeleteClient();

	// Filter clients (must be before early returns)
	const filteredClients = useMemo(() => {
		if (!clientsData?.clients) return [];

		let clients = clientsData.clients;

		// Apply active filter
		if (activeFilter === "active") {
			clients = clients.filter((c) => c.is_active);
		} else if (activeFilter === "archived") {
			clients = clients.filter((c) => !c.is_active);
		}

		// Apply search query
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			clients = clients.filter(
				(c) =>
					c.name.toLowerCase().includes(query) ||
					c.currency.toLowerCase().includes(query),
			);
		}

		return clients;
	}, [clientsData, activeFilter, searchQuery]);

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
		if (!confirm("Are you sure you want to delete this client?")) return;

		try {
			await deleteMutation.mutateAsync(id);
			toast.success("Client deleted successfully");
		} catch (error) {
			toast.error("Failed to delete client");
		}
	};

	const columns: Column<HarvestClient>[] = [
		{
			header: "Name",
			accessor: (c) => <span className="font-medium">{c.name}</span>,
		},
		{
			header: "Currency",
			accessor: (c) => c.currency,
		},
		{
			header: "Address",
			accessor: (c) => (
				<span className="text-sm text-muted-foreground max-w-xs truncate block">
					{c.address || "—"}
				</span>
			),
		},
		{
			header: "Status",
			accessor: (c) =>
				c.is_active ? (
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
			accessor: (c) => (
				<div className="flex gap-2 justify-end">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setEditClientId(c.id)}
						title="Edit client"
					>
						<Edit className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => handleDelete(c.id)}
						disabled={deleteMutation.isPending}
						title="Delete client"
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
					<h1 className="text-3xl font-bold tracking-tight">Clients</h1>
					<p className="text-muted-foreground">
						Manage clients and customer organizations
					</p>
				</div>
				<Button onClick={() => setIsCreateModalOpen(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Create Client
				</Button>
			</div>

			{/* Filters */}
			<Card>
				<CardContent className="pt-6">
					<div className="flex flex-wrap gap-4">
						<div className="flex-1 min-w-[200px]">
							<input
								type="text"
								placeholder="Search by name..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full px-3 py-2 border rounded-md"
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

			{/* Clients Table */}
			<Card>
				<CardHeader>
					<CardTitle>All Clients</CardTitle>
					<CardDescription>
						{filteredClients.length} client
						{filteredClients.length !== 1 ? "s" : ""} found
					</CardDescription>
				</CardHeader>
				<CardContent>
					<DataTable
						data={filteredClients}
						columns={columns}
						isLoading={isLoading}
						emptyMessage="No clients found. Create your first client to get started."
					/>
				</CardContent>
			</Card>

			{/* Modals */}
			<ClientFormModal
				open={isCreateModalOpen}
				onOpenChange={setIsCreateModalOpen}
			/>
			<ClientFormModal
				open={!!editClientId}
				onOpenChange={() => setEditClientId(undefined)}
				clientId={editClientId}
			/>
		</div>
	);
}
