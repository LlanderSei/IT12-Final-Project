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
import StatusBadge from "@/Components/StatusBadge";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { Separator } from "@/Components/ui/separator";
import { Calendar, User, Tag, FileText, Package, Wand2 } from "lucide-react";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;
const formatDateTime = (v) => v ? new Date(v).toLocaleString() : "-";

export default function JobOrderDetailDialog({ open, onOpenChange, order }) {
	if (!order) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
				<DialogHeader className="p-6 pb-0">
					<div className="flex justify-between items-start">
						<div>
							<DialogTitle className="text-xl font-black flex items-center gap-2">
								Order <span className="text-primary-hex">#{order.ID}</span>
							</DialogTitle>
							<DialogDescription>Detailed view of job order items and status.</DialogDescription>
						</div>
						<StatusBadge status={order.Status} />
					</div>
				</DialogHeader>

				<ScrollArea className="flex-1 px-6 py-4">
					<div className="space-y-6 pb-6">
						{/* Metadata Grid */}
						<div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-accent/5 border border-border/50">
							<div className="space-y-1">
								<p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
									<User className="h-3 w-3" /> Customer
								</p>
								<p className="text-sm font-semibold">{order.customer?.CustomerName || "Walk-in"}</p>
							</div>
							<div className="space-y-1">
								<p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
									<Calendar className="h-3 w-3" /> Delivery At
								</p>
								<p className="text-sm font-semibold">{formatDateTime(order.DeliveryAt)}</p>
							</div>
						</div>

						{order.Notes && (
							<div className="space-y-2">
								<p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
									<FileText className="h-3 w-3" /> Notes
								</p>
								<p className="text-sm p-3 rounded-md border bg-muted/20 italic text-muted-foreground">
									"{order.Notes}"
								</p>
							</div>
						)}

						{/* Products Table */}
						<div className="space-y-3">
							<h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
								<Package className="h-3.5 w-3.5" /> Products
							</h4>
							<div className="rounded-md border overflow-hidden">
								<table className="w-full text-xs">
									<thead className="bg-muted/50">
										<tr className="border-b">
											<th className="text-left p-2.5 font-bold">Product</th>
											<th className="text-center p-2.5 font-bold">Qty</th>
											<th className="text-right p-2.5 font-bold">Subtotal</th>
										</tr>
									</thead>
									<tbody className="divide-y">
										{(order.items || []).map(item => (
											<tr key={item.ID}>
												<td className="p-2.5 font-medium">{item.ProductName}</td>
												<td className="p-2.5 text-center">{item.Quantity}</td>
												<td className="p-2.5 text-right font-semibold">{currency(item.SubAmount)}</td>
											</tr>
										))}
										{(order.items || []).length === 0 && (
											<tr><td colSpan={3} className="p-4 text-center text-muted-foreground italic">No standard products.</td></tr>
										)}
									</tbody>
								</table>
							</div>
						</div>

						{/* Custom Items Table */}
						<div className="space-y-3">
							<h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 text-primary">
								<Wand2 className="h-3.5 w-3.5" /> Custom Items
							</h4>
							<div className="rounded-md border border-primary/10 overflow-hidden bg-primary-soft/5">
								<table className="w-full text-xs">
									<thead className="bg-primary/5 uppercase text-[10px]">
										<tr className="border-b border-primary/10">
											<th className="text-left p-2.5 font-bold">Description</th>
											<th className="text-center p-2.5 font-bold">Qty</th>
											<th className="text-right p-2.5 font-bold">Subtotal</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-primary/10">
										{(order.custom_items || []).map(item => (
											<tr key={item.ID}>
												<td className="p-2.5 font-medium">{item.CustomOrderDescription}</td>
												<td className="p-2.5 text-center">{item.Quantity}</td>
												<td className="p-2.5 text-right font-semibold">
													{currency(Number(item.Quantity || 0) * Number(item.PricePerUnit || 0))}
												</td>
											</tr>
										))}
										{(order.custom_items || []).length === 0 && (
											<tr><td colSpan={3} className="p-4 text-center text-muted-foreground italic">No custom items.</td></tr>
										)}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</ScrollArea>

				<DialogFooter className="p-6 border-t bg-accent/5">
					<div className="flex-1 flex justify-between items-center mr-6">
						<span className="text-[10px] uppercase font-bold text-muted-foreground">Total Amount</span>
						<span className="text-xl font-black text-primary-hex">{currency(order.TotalAmount)}</span>
					</div>
					<Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
