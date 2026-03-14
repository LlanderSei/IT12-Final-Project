import React from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/Components/ui/table";
import { cn } from "@/lib/utils";

export default function ProfileModal({ open, onOpenChange, user, roleMeta }) {
	const avatarInitials = user.name
		? user.name.substring(0, 2).toUpperCase()
		: "MB";
	const recentAudits = Array.isArray(user.recentAudits) ? user.recentAudits : [];

	const formatAuditDateTime = (value) => {
		if (!value) return "-";
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) return "-";
		return parsed.toLocaleString();
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>My Profile</DialogTitle>
				</DialogHeader>
				
				<div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 mt-4">
					<div className="space-y-1">
						<p className="font-semibold text-muted-foreground">Full Name</p>
						<p className="font-medium text-foreground">{user.name || "-"}</p>
					</div>
					<div className="space-y-1">
						<p className="font-semibold text-muted-foreground">Email</p>
						<p className="font-medium text-foreground">{user.email || "-"}</p>
					</div>
					<div className="space-y-1">
						<p className="font-semibold text-muted-foreground">Role</p>
						<div 
							className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
							style={{ backgroundColor: roleMeta.bg, color: roleMeta.color }}
						>
							{roleMeta.label}
						</div>
					</div>
					<div className="space-y-1">
						<p className="font-semibold text-muted-foreground">Recent Actions</p>
						<p className="font-medium text-foreground">{recentAudits.length}</p>
					</div>
				</div>

				<div className="mt-6">
					<h4 className="text-sm font-semibold mb-3">Recent Actions (Application)</h4>
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-[180px]">Date</TableHead>
									<TableHead>Action</TableHead>
									<TableHead>Table</TableHead>
									<TableHead>Changes</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{recentAudits.map((audit) => (
									<TableRow key={audit.ID}>
										<TableCell className="font-medium">
											{formatAuditDateTime(audit.DateAdded)}
										</TableCell>
										<TableCell>{audit.Action || "-"}</TableCell>
										<TableCell>{audit.TableEdited || "-"}</TableCell>
										<TableCell className="max-w-[300px] truncate" title={audit.ReadableChanges}>
											{audit.ReadableChanges || "-"}
										</TableCell>
									</TableRow>
								))}
								{recentAudits.length === 0 && (
									<TableRow>
										<TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
											No recent application actions found.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</div>

				<DialogFooter className="mt-6">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
