import React from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { Separator } from "@/Components/ui/separator";
import { Calendar, User, List, Package } from "lucide-react";

const formatDateTime = (value) => {
	if (!value) return "n/a";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "n/a";
	return parsed.toLocaleString();
};

export default function SnapshotDetailDialog({ open, onOpenChange, snapshot }) {
	if (!snapshot) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col overflow-hidden">
				<DialogHeader>
					<DialogTitle>Inventory Snapshot Details</DialogTitle>
					<DialogDescription>
						Taken on {formatDateTime(snapshot.SnapshotTime)}
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto pr-2 space-y-6 py-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-4">
							<div className="flex items-start gap-3">
								<User className="h-4 w-4 text-muted-foreground mt-0.5" />
								<div>
									<p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Created By</p>
									<p className="text-sm font-medium">{snapshot.user?.FullName || "Unknown"}</p>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
								<div>
									<p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Timestamp</p>
									<p className="text-sm font-medium">{formatDateTime(snapshot.SnapshotTime)}</p>
								</div>
							</div>
						</div>

						<div className="space-y-4">
							<div className="flex items-start gap-3">
								<List className="h-4 w-4 text-muted-foreground mt-0.5" />
								<div>
									<p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Item Counts</p>
									<div className="text-xs space-y-1">
										<p><span className="text-muted-foreground">Total Items:</span> {snapshot.TotalItems}</p>
										<p><span className="text-muted-foreground">Total Leftovers:</span> {snapshot.TotalLeftovers}</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					<div className="space-y-3">
						<h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Snapshot Data</h4>
						<div className="rounded-xl border overflow-hidden">
							<table className="min-w-full text-sm">
								<thead className="bg-muted/50">
									<tr>
										<th className="px-4 py-2 text-left text-[10px] font-bold uppercase text-muted-foreground">Item Name</th>
										<th className="px-4 py-2 text-left text-[10px] font-bold uppercase text-muted-foreground">Type</th>
										<th className="px-4 py-2 text-left text-[10px] font-bold uppercase text-muted-foreground">Unit</th>
										<th className="px-4 py-2 text-center text-[10px] font-bold uppercase text-muted-foreground">Leftover Qty</th>
									</tr>
								</thead>
								<tbody className="divide-y bg-background">
									{(snapshot.Leftovers || []).map((line, idx) => (
										<tr key={idx} className="hover:bg-muted/30 transition-colors">
											<td className="px-4 py-3 font-medium">{line.ItemName}</td>
											<td className="px-4 py-3 text-xs text-muted-foreground">{line.ItemType || "-"}</td>
											<td className="px-4 py-3 text-xs text-muted-foreground">{line.Measurement || "-"}</td>
											<td className="px-4 py-3 text-center font-bold text-primary">{line.LeftoverQuantity}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>

				<DialogFooter className="pt-4 border-t">
					<Button onClick={() => onOpenChange(false)} variant="outline">Close</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
