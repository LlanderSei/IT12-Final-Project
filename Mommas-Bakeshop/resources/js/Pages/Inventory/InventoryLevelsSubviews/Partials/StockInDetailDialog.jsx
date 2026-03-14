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
import { Calendar, User, Truck, Receipt, FileText, Package } from "lucide-react";

const formatCurrency = (value) => `PHP ${Number(value || 0).toFixed(2)}`;

const formatDate = (value) => {
	if (!value) return "n/a";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "n/a";
	return parsed.toLocaleDateString();
};

const formatDateTime = (value) => {
	if (!value) return "n/a";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "n/a";
	return parsed.toLocaleString();
};

export default function StockInDetailDialog({ open, onOpenChange, record }) {
	if (!record) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col overflow-hidden">
				<DialogHeader>
					<DialogTitle>Stock-In Details</DialogTitle>
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
									<p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Added By</p>
									<p className="text-sm font-medium">{record.user?.FullName || "Unknown"}</p>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<Truck className="h-4 w-4 text-muted-foreground mt-0.5" />
								<div>
									<p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Supplier</p>
									<p className="text-sm font-medium">{record.Supplier || "-"}</p>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
								<div>
									<p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Purchase Date</p>
									<p className="text-sm font-medium">{formatDate(record.PurchaseDate)}</p>
								</div>
							</div>
						</div>

						<div className="space-y-4">
							<div className="flex items-start gap-3">
								<Receipt className="h-4 w-4 text-muted-foreground mt-0.5" />
								<div>
									<p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Reference Numbers</p>
									<div className="text-xs space-y-1">
										<p><span className="text-muted-foreground">Receipt:</span> {record.ReceiptNumber || "n/a"}</p>
										<p><span className="text-muted-foreground">Invoice:</span> {record.InvoiceNumber || "n/a"}</p>
									</div>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<Package className="h-4 w-4 text-muted-foreground mt-0.5" />
								<div>
									<p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Summary</p>
									<div className="text-xs space-y-1">
										<p><span className="text-muted-foreground">Total Quantity:</span> {record.TotalQuantity}</p>
										<p><span className="text-muted-foreground font-bold">Total Amount:</span> <span className="text-primary font-bold">{formatCurrency(record.TotalAmount)}</span></p>
									</div>
								</div>
							</div>
						</div>
					</div>

					{record.AdditionalDetails && (
						<div className="bg-muted/30 p-3 rounded-lg flex items-start gap-3">
							<FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
							<div>
								<p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Additional Details</p>
								<p className="text-sm italic text-muted-foreground">{record.AdditionalDetails}</p>
							</div>
						</div>
					)}

					<div className="space-y-3">
						<h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Items Purchased</h4>
						<div className="rounded-xl border overflow-hidden">
							<table className="min-w-full text-sm">
								<thead className="bg-muted/50">
									<tr>
										<th className="px-4 py-2 text-left text-[10px] font-bold uppercase text-muted-foreground">Item Name</th>
										<th className="px-4 py-2 text-left text-[10px] font-bold uppercase text-muted-foreground">Type</th>
										<th className="px-4 py-2 text-center text-[10px] font-bold uppercase text-muted-foreground">Qty</th>
										<th className="px-4 py-2 text-right text-[10px] font-bold uppercase text-muted-foreground">Unit Cost</th>
										<th className="px-4 py-2 text-right text-[10px] font-bold uppercase text-muted-foreground">Subtotal</th>
									</tr>
								</thead>
								<tbody className="divide-y bg-background">
									{(record.ItemsPurchased || []).map((item, idx) => (
										<tr key={idx} className="hover:bg-muted/30 transition-colors">
											<td className="px-4 py-3 font-medium">{item.ItemName || "-"}</td>
											<td className="px-4 py-3 text-xs text-muted-foreground">{item.ItemType || "-"}</td>
											<td className="px-4 py-3 text-center">{item.QuantityAdded ?? 0}</td>
											<td className="px-4 py-3 text-right text-xs text-muted-foreground">{formatCurrency(item.UnitCost)}</td>
											<td className="px-4 py-3 text-right font-bold text-primary">{formatCurrency(item.SubAmount)}</td>
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
