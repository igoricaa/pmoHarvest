"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { useIsAdmin, useIsAdminOrManager } from "@/lib/admin-utils-client";
import { useExpenses, useManagedProjects } from "@/hooks/use-harvest";
import { groupExpensesByUserAndWeek } from "@/lib/timesheet-utils";
import { PendingTimesheetsList } from "@/components/admin/pending-timesheets-list";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PendingExpensesPage() {
	const router = useRouter();
	const { data: session } = useSession();
	const isAdminOrManager = useIsAdminOrManager();
	const isAdmin = useIsAdmin();

	// Data hooks
	const { data: managedProjectIds } = useManagedProjects();
	const { data: expensesData, isLoading } = useExpenses({
		approval_status: "submitted",
	});

	// Filter expenses based on manager's projects
	const filteredExpenses = useMemo(() => {
		if (!expensesData?.expenses) return [];

		let expenses = expensesData.expenses;

		// Apply manager filtering
		if (!isAdmin && isAdminOrManager && managedProjectIds) {
			expenses = expenses.filter((expense) =>
				managedProjectIds.includes(expense.project.id),
			);
		}

		return expenses;
	}, [expensesData, isAdmin, isAdminOrManager, managedProjectIds]);

	// Group by user and week
	const expenseSheets = useMemo(() => {
		return groupExpensesByUserAndWeek(filteredExpenses);
	}, [filteredExpenses]);

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

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<div className="flex items-center gap-3">
						<Button variant="ghost" size="icon" asChild>
							<Link href="/dashboard/admin/approvals">
								<ArrowLeft className="h-4 w-4" />
							</Link>
						</Button>
						<div>
							<h1 className="text-3xl font-bold tracking-tight">
								Pending Expense Approvals
							</h1>
							<p className="text-muted-foreground">
								{isAdmin
									? "All team expense reports"
									: "Expense reports for your managed projects"}
							</p>
						</div>
					</div>
				</div>
			</div>

			<PendingTimesheetsList
				expenseSheets={expenseSheets}
				isLoading={isLoading}
				type="expense"
			/>
		</div>
	);
}
