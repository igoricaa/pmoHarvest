"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeSwitcher() {
	const { theme, setTheme, resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const toggleTheme = () => {
		const currentTheme = resolvedTheme || theme || "light";
		setTheme(currentTheme === "dark" ? "light" : "dark");
	};

	if (!mounted) {
		return (
			<Button variant="outline" size="icon" className="h-8 w-8">
				<Sun className="h-4 w-4" />
				<span className="sr-only">Toggle theme</span>
			</Button>
		);
	}

	const isDark =
		resolvedTheme === "dark" || (theme === "dark" && !resolvedTheme);

	return (
		<Button
			variant="outline"
			size="icon"
			className="h-8 w-8"
			onClick={toggleTheme}
		>
			{isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
			<span className="sr-only">Toggle theme</span>
		</Button>
	);
}
