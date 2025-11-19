"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Trash2, RefreshCw, Paperclip } from "lucide-react";
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
	useExpenses,
	useDeleteExpense,
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
import { ExpenseForm } from "@/components/expense-form";
import { useIsAdmin } from "@/lib/admin-utils-client";

export default function ExpensesPage() {
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
		data: expensesData,
		isLoading: isLoadingExpenses,
		refetch: refetchExpenses,
		isFetching: isFetchingExpenses,
	} = useExpenses({ from, to });
	const deleteMutation = useDeleteExpense();

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
		if (!confirm("Are you sure you want to delete this expense?")) return;

		try {
			await deleteMutation.mutateAsync(id);
			toast.success("Expense deleted successfully");
		} catch (error) {
			toast.error("Failed to delete expense");
		}
	};

	const totalCost =
		expensesData?.expenses.reduce(
			(sum, expense) => sum + expense.total_cost,
			0,
		) || 0;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
					<p className="text-muted-foreground">
						Submit and track your expenses
					</p>
				</div>
				<div className="flex items-center gap-2">
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
					<Button
						variant={showForm ? "outline" : "default"}
						onClick={() => setShowForm(!showForm)}
					>
						{showForm ? "Hide Form" : "Add Expense"}
					</Button>
				</div>
			</div>

			{showForm && (
				<Card>
					<CardHeader>
						<CardTitle>Submit Expense</CardTitle>
						<CardDescription>
							Enter your expense details for a project
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ExpenseForm showCancelButton={false} />
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Recent Expenses</CardTitle>
							<CardDescription>Last 30 days</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{isLoadingExpenses ? (
						<div className="flex items-center justify-center p-8">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
					) : expensesData?.expenses.length === 0 ? (
						<div className="text-center p-8 text-muted-foreground">
							No expenses found. Start submitting your expenses!
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
									{expensesData?.expenses.map((expense) => (
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
												<Badge
													variant={
														expense.is_billed
															? "default"
															: expense.is_locked
																? "outline"
																: "secondary"
													}
												>
													{expense.is_billed
														? "Billed"
														: expense.is_locked
															? "Locked"
															: "Pending"}
												</Badge>
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
