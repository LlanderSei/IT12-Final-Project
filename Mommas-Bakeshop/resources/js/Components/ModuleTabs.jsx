import React from "react";
import { Link } from "@inertiajs/react";
import { cn } from "@/lib/utils";

/**
 * A standardized tab component for module-level navigation.
 * 
 * @param {Array} tabs - Array of { label, href, active } objects.
 */
export default function ModuleTabs({ tabs }) {
	return (
		<div className="bg-card border-b mt-0 sticky top-0 z-10 w-full overflow-hidden">
			<div className="mx-auto px-4 overflow-x-auto no-scrollbar">
				<nav className="-mb-px flex gap-1" aria-label="Tabs">
					{tabs.map((tab, idx) => (
						<Link
							key={tab.label + idx}
							href={tab.href}
							className={cn(
								"relative whitespace-nowrap py-3 px-5 border-b-2 font-medium text-sm transition-all duration-200 rounded-t-lg",
								tab.active
									? "border-primary bg-primary-soft text-primary-hex shadow-sm"
									: "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50 hover:border-border"
							)}
						>
							{tab.label}
							{Number(tab.badgeCount || 0) > 0 && (
								<span className="absolute -bottom-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground shadow-sm ring-2 ring-background">
									{tab.badgeCount}
								</span>
							)}
						</Link>
					))}
				</nav>
			</div>
		</div>
	);
}
