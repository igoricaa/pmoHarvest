import {
	SidebarProvider,
	SidebarInset,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ErrorBoundary } from "@/components/error-boundary";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className="flex min-h-screen flex-col">
				{/* Header with Sidebar Toggle */}
				<header className="h-21 sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
					<SidebarTrigger />
				</header>

				{/* Main Content */}
				<main className="flex-1 p-6">
					<ErrorBoundary>{children}</ErrorBoundary>
				</main>

				{/* Footer */}
				<footer className="border-t py-6 pr-6 h-16.5">
					<p className="text-center text-sm text-muted-foreground md:text-right">
						© {new Date().getFullYear()} PMO Hive. All rights reserved.
					</p>
				</footer>
			</SidebarInset>
		</SidebarProvider>
	);
}
