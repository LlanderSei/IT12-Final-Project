import React from "react";
import { Link } from "@inertiajs/react";
import { cn } from "@/lib/utils";
import {
	LayoutDashboard,
	ShoppingCart,
	FileText,
	ChartSpline,
	Package,
	Boxes,
	ChartColumn,
	Database,
	Users,
	LogOut,
} from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/Components/ui/tooltip";

const icons = {
	dashboard: LayoutDashboard,
	cashier: ShoppingCart,
	jobOrders: FileText,
	saleHistory: ChartSpline,
	inventory: Package,
	products: Boxes,
	reports: ChartColumn,
	database: Database,
	users: Users,
	audits: FileText,
	logout: LogOut,
};

export default function SidebarItem({ item, isActive, isExpanded }) {
	const Icon = icons[item.icon];

	const content = (
		<Link
			href={item.href}
			className={cn(
				"group flex items-center h-10 px-3 transition-all duration-200 rounded-md mx-2",
				isActive
					? "bg-primary-soft text-primary font-semibold border-r-4 border-primary"
					: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
				!isExpanded && "justify-center px-0 mx-4",
			)}
		>
			<div className={cn("flex-shrink-0 flex items-center justify-center", !isExpanded && "w-10 h-10")}>
				{Icon && <Icon className={cn("size-5", isActive ? "text-primary" : "text-muted-foreground group-hover:text-accent-foreground")} />}
			</div>
			{isExpanded && (
				<span className="ml-3 text-sm truncate">{item.label}</span>
			)}
		</Link>
	);

	if (!isExpanded) {
		return (
			<TooltipProvider>
				<Tooltip delayDuration={0}>
					<TooltipTrigger asChild>{content}</TooltipTrigger>
					<TooltipContent side="right">
						{item.label}
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		);
	}

	return content;
}
