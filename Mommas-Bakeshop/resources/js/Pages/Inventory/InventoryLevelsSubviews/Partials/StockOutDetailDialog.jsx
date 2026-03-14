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
import { Calendar, User, FileText, Package, AlertTriangle } from "lucide-react";

const formatDateTime = (value) => {
	if (!value) return "n/a";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "n/a";
	return parsed.toLocaleString();
};

export default function StockOutDetailDialog({ open, onOpenChange, record }) {
	if (!record) return null;

	const [reasonType, reasonNote] = (record.Reason || "").split(" | ");

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden">
				<DialogHeader>
					<DialogTitle>Stock-Out Details</DialogTitle>
					<DialogDescription>
						Batch ID: #{record.ID} • Created on {formatDateTime(record.DateAdded)}
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto pr-2 space-y-6 py-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-4">
							<div className="flex items-start gap-3">
								<User className="h-4 w-4 text-muted-foreground mt-0.5" />
								<div>
									<p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Used By</p>
									<p className="text-sm font-medium">{record.user?.FullName || "Unknown"}</p>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5" />
								<div>
									<p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Reason Type</p>
									<p className="text-sm font-medium">{reasonType || "-"}</p>
								</div>
							</div>
						</div>

						<div className="space-y-4">
							<div className="flex items-start gap-3">
								<Package className="h-4 w-4 text-muted-foreground mt-0.5" />
								<div>
									<p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Total Quantity</p>
									<p className="text-xl font-black text-primary">{record.TotalQuantity}</p>
								</div>
							</div>
						</div>
					</div>

					{reasonNote && (
						<div className="bg-muted/30 p-3 rounded-lg flex items-start gap-3">
							<FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
							<div>
								<p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Reason Details</p>
								<p className="text-sm italic text-muted-foreground">{reasonNote}</p>
							</div>
						</div>
					)}

					<div className="space-y-3">
						<h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Items Removed</h4>
						<div className="rounded-xl border overflow-hidden">
							<table className="min-w-full text-sm">
								<thead className="bg-muted/50">
									<tr>
										<th className="px-4 py-2 text-left text-[10px] font-bold uppercase text-muted-foreground">Item Name</th>
										<th className="px-4 py-2 text-left text-[10px] font-bold uppercase text-muted-foreground">Type</th>
										<th className="px-4 py-2 text-center text-[10px] font-bold uppercase text-muted-foreground">Qty Removed</th>
									</tr>
								</thead>
								<tbody className="divide-y bg-background">
									{(record.ItemsUsed || []).map((item, idx) => (
										<tr key={idx} className="hover:bg-muted/30 transition-colors">
											<td className="px-4 py-3 font-medium">{item.ItemName || "-"}</td>
											<td className="px-4 py-3 text-xs text-muted-foreground">{item.ItemType || "-"}</td>
											<td className="px-4 py-3 text-center font-bold text-destructive">-{item.QuantityRemoved ?? 0}</td>
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
