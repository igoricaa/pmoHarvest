"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
	Loader2,
	Trash2,
	RefreshCw,
	Paperclip,
	Lock,
	AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";
import { useIsAdmin, useIsAdminOrManager } from "@/lib/admin-utils-client";
import {
	useExpenses,
	useDeleteExpense,
	useManagedProjects,
} from "@/hooks/use-harvest";
import { ApprovalStatusBadge } from "@/components/admin/approval-status-badge";
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

export default function AdminExpensesPage() {
	const router = useRouter();
	const { data: session } = useSession();
	const isAdminOrManager = useIsAdminOrManager();
	const isAdmin = useIsAdmin();

	// Filters
	const [searchQuery, setSearchQuery] = useState("");
	const [approvalFilter, setApprovalFilter] = useState<
		"all" | "unsubmitted" | "submitted" | "approved"
	>("all");

	// Data hooks must be called before early returns
	const { data: managedProjectIds } = useManagedProjects();

	// Get data from last 30 days (must be before early returns)
	const from = format(
		new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
		"yyyy-MM-dd",
	);
	const to = format(new Date(), "yyyy-MM-dd");

	const {
		data: expensesData,
		isLoading: isLoadingExpenses,
		refetch: refetchExpenses,
		isFetching: isFetchingExpenses,
	} = useExpenses({
		from,
		to,
		approval_status: approvalFilter === "all" ? undefined : approvalFilter,
	});
	const deleteMutation = useDeleteExpense();

	// Filter expenses based on manager's projects (must be before early returns)
	const filteredExpenses = (() => {
		if (!expensesData?.expenses) return [];

		let expenses = expensesData.expenses;

		// Apply manager filtering
		if (!isAdmin && isAdminOrManager && managedProjectIds) {
			expenses = expenses.filter((expense) =>
				managedProjectIds.includes(expense.project.id),
			);
		}

		// Apply search query
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			expenses = expenses.filter(
				(expense) =>
					expense.project.name.toLowerCase().includes(query) ||
					expense.user.name.toLowerCase().includes(query) ||
					expense.expense_category.name.toLowerCase().includes(query) ||
					expense.notes?.toLowerCase().includes(query),
			);
		}

		return expenses;
	})();

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
		if (!confirm("Are you sure you want to delete this expense?")) return;

		try {
			await deleteMutation.mutateAsync(id);
			toast.success("Expense deleted successfully");
		} catch (error) {
			toast.error("Failed to delete expense");
		}
	};

	// Group expenses by currency and calculate totals
	const expensesByCurrency = (() => {
		const grouped = new Map<string, number>();
		filteredExpenses.forEach((expense) => {
			const currency = expense.client.currency;
			const existing = grouped.get(currency) || 0;
			grouped.set(currency, existing + expense.total_cost);
		});
		return Array.from(grouped.entries())
			.map(([currency, total]) => ({ currency, total }))
			.sort((a, b) => b.total - a.total);
	})();

	const pendingCount = filteredExpenses.filter(
		(e) => e.approval_status === "submitted",
	).length;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						Expense Management
					</h1>
					<p className="text-muted-foreground">
						{isAdmin
							? "All team expenses"
							: "Expenses for your managed projects"}
					</p>
				</div>

				<div className="flex items-center gap-3">
					{pendingCount > 0 && (
						<Button asChild variant="outline">
							<Link href="/dashboard/admin/approvals/expenses">
								<AlertCircle className="mr-2 h-4 w-4" />
								{pendingCount} Pending Approval{pendingCount !== 1 ? "s" : ""}
							</Link>
						</Button>
					)}

					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							refetchExpenses().then((result) => {
								if (result.isError) {
									toast.error("Failed to refresh expenses");
								} else {
									toast.success("Expenses refreshed");
								}
							});
						}}
						disabled={isFetchingExpenses}
					>
						<RefreshCw
							className={cn(
								"mr-2 h-4 w-4",
								isFetchingExpenses && "animate-spin",
							)}
						/>
						{isFetchingExpenses ? "Refreshing..." : "Refresh"}
					</Button>
				</div>
			</div>

			{/* Filters */}
			<Card>
				<CardContent className="pt-6">
					<div className="flex flex-wrap gap-4">
						<div className="flex-1 min-w-[200px]">
							<Input
								type="text"
								placeholder="Search by project, member, category, or notes..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
						</div>

						<Select
							value={approvalFilter}
							onValueChange={(
								v: "all" | "unsubmitted" | "submitted" | "approved",
							) => setApprovalFilter(v)}
						>
							<SelectTrigger className="w-[180px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Statuses</SelectItem>
								<SelectItem value="unsubmitted">Unsubmitted</SelectItem>
								<SelectItem value="submitted">Pending Approval</SelectItem>
								<SelectItem value="approved">Approved</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{/* Expenses Table */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Expenses</CardTitle>
							<CardDescription>Last 30 days</CardDescription>
						</div>
						<div className="text-right">
							{expensesByCurrency.length === 0 ? (
								<>
									<div className="text-2xl font-bold">0.00</div>
									<div className="text-sm text-muted-foreground">
										Total expenses
									</div>
								</>
							) : expensesByCurrency.length === 1 ? (
								<>
									<div className="text-sm text-muted-foreground">
										Total expenses
									</div>
									<div className="text-2xl font-bold">
										{expensesByCurrency[0].total.toFixed(2)}{" "}
										{expensesByCurrency[0].currency}
									</div>
								</>
							) : (
								<div className="space-y-1">
									<div className="text-sm text-muted-foreground pt-1">
										Total expenses
									</div>
									{expensesByCurrency.map(({ currency, total }) => (
										<div
											key={currency}
											className="flex items-baseline gap-2 justify-end"
										>
											<span className="text-2xl font-bold">
												{total.toFixed(2)}
											</span>
											<span className="text-lg font-bold">{currency}</span>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{isLoadingExpenses ? (
						<div className="flex items-center justify-center p-8">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
					) : filteredExpenses.length === 0 ? (
						<div className="text-center p-8 text-muted-foreground">
							No expenses found in the last 30 days.
						</div>
					) : (
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Date</TableHead>
										<TableHead>Project</TableHead>
										<TableHead>Category</TableHead>
										<TableHead>Amount</TableHead>
										<TableHead>Member</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Notes</TableHead>
										<TableHead className="text-center">Receipt</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredExpenses.map((expense) => (
										<TableRow key={expense.id}>
											<TableCell>
												{format(new Date(expense.spent_date), "PP")}
											</TableCell>
											<TableCell className="font-medium">
												{expense.project.name}
											</TableCell>
											<TableCell>{expense.expense_category.name}</TableCell>
											<TableCell>
												<Badge variant="secondary">
													{expense.total_cost.toFixed(2)}{" "}
													{expense.client.currency}
												</Badge>
											</TableCell>
											<TableCell>{expense.user.name}</TableCell>
											<TableCell>
												<ApprovalStatusBadge status={expense.approval_status} />
											</TableCell>
											<TableCell className="max-w-xs truncate">
												{expense.notes || "—"}
											</TableCell>
											<TableCell className="text-center">
												{expense.receipt ? (
													<Button
														variant="ghost"
														size="icon"
														onClick={() =>
															window.open(expense.receipt!.url, "_blank")
														}
														title={`View receipt: ${expense.receipt.file_name}`}
													>
														<Paperclip className="h-4 w-4" />
													</Button>
												) : (
													<span className="text-muted-foreground">—</span>
												)}
											</TableCell>
											<TableCell className="text-right">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleDelete(expense.id)}
													disabled={
														deleteMutation.isPending || expense.is_locked
													}
													title={
														expense.is_locked
															? "Expense is locked"
															: "Delete expense"
													}
												>
													{expense.is_locked ? (
														<Lock className="h-4 w-4" />
													) : (
														<Trash2 className="h-4 w-4" />
													)}
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
