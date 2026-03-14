import React from "react";
import { Database } from "lucide-react";
import { cn } from "@/lib/utils";

export default function EmptyState({
	icon: Icon = Database,
	title = "No data found",
	description = "There are no items to display at this time.",
	action,
	className,
}) {
	return (
		<div
			className={cn(
				"flex min-h-[300px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center animate-in fade-in duration-500",
				className,
			)}
		>
			<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
				<Icon className="h-6 w-6 text-muted-foreground" />
			</div>
			<h3 className="mt-4 text-lg font-semibold">{title}</h3>
			<p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
				{description}
			</p>
			{action && <div className="mt-6">{action}</div>}
		</div>
	);
}
