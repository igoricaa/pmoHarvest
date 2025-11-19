"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	Clock,
	Receipt,
	LayoutDashboard,
	Users,
	Briefcase,
	DollarSign,
	BarChart,
} from "lucide-react";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UserButton } from "@/components/user-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useIsAdmin, useIsAdminOrManager } from "@/lib/admin-utils-client";
import Logo from "./Logo";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const navigation = [
	{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
	{ name: "Time Entries", href: "/dashboard/time", icon: Clock },
	{ name: "Expenses", href: "/dashboard/expenses", icon: Receipt },
];

const adminNavigation = [
	{ name: "Admin Dashboard", href: "/dashboard/admin", icon: BarChart },
	// { name: 'Approvals', href: '/dashboard/admin/approvals', icon: CheckSquare },
	{ name: "Time Management", href: "/dashboard/admin/time", icon: Clock },
	{
		name: "Expense Management",
		href: "/dashboard/admin/expenses",
		icon: Receipt,
	},
	{
		name: "Projects",
		href: "/dashboard/admin/projects",
		icon: Briefcase,
	},
	{
		name: "Clients",
		href: "/dashboard/admin/clients",
		icon: DollarSign,
		adminOnly: true,
	},
	{ name: "Team", href: "/dashboard/admin/team", icon: Users, adminOnly: true },
];

export function AppSidebar() {
	const pathname = usePathname();
	const isAdminOrManager = useIsAdminOrManager();
	const isAdmin = useIsAdmin();
	const { resolvedTheme, theme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Determine the actual theme to use
	const currentTheme = mounted ? resolvedTheme || theme || "light" : "light"; // Default during SSR/hydration

	return (
		<Sidebar>
			<SidebarHeader className="border-b p-4 h-21">
				<Link href="/dashboard">
					<Logo theme={currentTheme} />
				</Link>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Main</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{navigation.map((item) => {
								const isActive = pathname === item.href;
								return (
									<SidebarMenuItem key={item.name}>
										<SidebarMenuButton asChild isActive={isActive}>
											<Link href={item.href}>
												<item.icon className="h-4 w-4" />
												<span>{item.name}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				{isAdminOrManager && (
					<SidebarGroup>
						<SidebarGroupLabel>Administration</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{adminNavigation
									.filter((item) => !item.adminOnly || isAdmin)
									.map((item) => {
										const isActive =
											pathname === item.href ||
											pathname.startsWith(item.href + "/");
										return (
											<SidebarMenuItem key={item.name}>
												<SidebarMenuButton asChild isActive={isActive}>
													<Link href={item.href}>
														<item.icon className="h-4 w-4" />
														<span>{item.name}</span>
													</Link>
												</SidebarMenuButton>
											</SidebarMenuItem>
										);
									})}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				)}
			</SidebarContent>
			<SidebarFooter className="border-t p-4 h-16.5">
				<div className="flex items-center justify-between gap-2">
					<UserButton />
					<ThemeSwitcher />
				</div>
			</SidebarFooter>
		</Sidebar>
	);
}
