"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useIsAdminOrManager } from "@/lib/admin-utils-client";
import { useTimeEntries } from "@/hooks/use-harvest";
import { TimesheetGrid } from "@/components/admin/timesheet-grid";
import { Loader2 } from "lucide-react";

export default function TimesheetDetailPage() {
	const router = useRouter();
	const params = useParams();
	const { data: session } = useSession();
	const isAdminOrManager = useIsAdminOrManager();

	const userId = parseInt(params.userId as string);
	const weekStart = params.weekStart as string;

	// Calculate week end (Sunday)
	const weekEndDate = new Date(weekStart);
	weekEndDate.setDate(weekEndDate.getDate() + 6);
	const weekEnd = weekEndDate.toISOString().split("T")[0];

	const { data: timeEntriesData, isLoading } = useTimeEntries({
		user_id: userId,
		from: weekStart,
		to: weekEnd,
		approval_status: "submitted",
	});

	// Redirect if not admin or manager
	useEffect(() => {
		if (session && isAdminOrManager === false) {
			router.push("/dashboard");
		}
	}, [session, isAdminOrManager, router]);

	const handleBack = () => {
		router.push("/dashboard/admin/approvals/time");
	};

	// Show loading state while session is loading or redirecting
	if (!session || isAdminOrManager === undefined) {
		return null;
	}

	// Show nothing if redirecting
	if (isAdminOrManager === false) {
		return null;
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (
		!timeEntriesData?.time_entries ||
		timeEntriesData.time_entries.length === 0
	) {
		return (
			<div className="text-center p-8">
				<h2 className="text-2xl font-bold mb-2">No Timesheet Found</h2>
				<p className="text-muted-foreground mb-4">
					This timesheet may have already been approved or withdrawn.
				</p>
				<button onClick={handleBack} className="text-primary hover:underline">
					Return to Pending List
				</button>
			</div>
		);
	}

	const userName = timeEntriesData.time_entries[0].user.name;

	return (
		<TimesheetGrid
			entries={timeEntriesData.time_entries}
			weekStart={weekStart}
			userName={userName}
			onBack={handleBack}
			readOnly={true}
		/>
	);
}
