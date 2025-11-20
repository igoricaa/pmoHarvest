"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { useIsAdmin, useIsAdminOrManager } from "@/lib/admin-utils-client";
import { useTimeEntries, useManagedProjects } from "@/hooks/use-harvest";
import { groupTimeEntriesByUserAndWeek } from "@/lib/timesheet-utils";
import { PendingTimesheetsList } from "@/components/admin/pending-timesheets-list";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PendingTimeEntriesPage() {
	const router = useRouter();
	const { data: session } = useSession();
	const isAdminOrManager = useIsAdminOrManager();
	const isAdmin = useIsAdmin();

	// Data hooks
	const { data: managedProjectIds } = useManagedProjects();
	const { data: timeEntriesData, isLoading } = useTimeEntries({
		approval_status: "submitted",
	});

	// Filter time entries based on manager's projects
	const filteredTimeEntries = (() => {
		if (!timeEntriesData?.time_entries) return [];

		let entries = timeEntriesData.time_entries;

		// Apply manager filtering
		if (!isAdmin && isAdminOrManager && managedProjectIds) {
			entries = entries.filter((entry) =>
				managedProjectIds.includes(entry.project.id),
			);
		}

		return entries;
	})();

	// Group by user and week
	const timesheets = groupTimeEntriesByUserAndWeek(filteredTimeEntries);

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
								Pending Time Entry Approvals
							</h1>
							<p className="text-muted-foreground">
								{isAdmin
									? "All team timesheets"
									: "Timesheets for your managed projects"}
							</p>
						</div>
					</div>
				</div>
			</div>

			<PendingTimesheetsList
				timesheets={timesheets}
				isLoading={isLoading}
				type="time"
			/>
		</div>
	);
}
