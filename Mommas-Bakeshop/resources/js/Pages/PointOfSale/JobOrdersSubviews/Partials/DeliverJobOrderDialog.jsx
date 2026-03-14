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
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { 
	Select, 
	SelectContent, 
	SelectItem, 
	SelectTrigger, 
	SelectValue 
} from "@/Components/ui/select";
import { Separator } from "@/Components/ui/separator";
import { Truck, Wallet, Calendar, FileText, AlertCircle } from "lucide-react";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;

export default function DeliverJobOrderDialog({ open, onOpenChange, form, total, onConfirm }) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Truck className="h-5 w-5 text-primary" /> Mark Order as Delivered
					</DialogTitle>
					<DialogDescription>Record payment and completion details for this job order.</DialogDescription>
				</DialogHeader>

				<form onSubmit={onConfirm} className="space-y-6 pt-2">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label className="text-xs uppercase font-bold text-muted-foreground">Payment Selection</Label>
							<Select 
								value={form.data.paymentSelection} 
								onValueChange={v => form.setData("paymentSelection", v)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="pay_later">Pay Later</SelectItem>
									<SelectItem value="pay_now">Pay Now</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{form.data.paymentSelection === "pay_now" && (
							<div className="space-y-2">
								<Label className="text-xs uppercase font-bold text-muted-foreground">Payment Type</Label>
								<Select 
									value={form.data.paymentType} 
									onValueChange={v => form.setData("paymentType", v)}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="full">Full Payment</SelectItem>
										<SelectItem value="partial">Partial Payment</SelectItem>
									</SelectContent>
								</Select>
							</div>
						)}
					</div>

					{form.data.paymentSelection === "pay_now" && form.data.paymentType === "partial" && (
						<div className="space-y-2">
							<Label className="flex items-center gap-1.5 text-xs uppercase font-bold text-muted-foreground">
								<Wallet className="h-3 w-3" /> Amount Paid
							</Label>
							<Input 
								type="number" 
								step="0.01"
								value={form.data.paidAmount}
								onChange={e => form.setData("paidAmount", e.target.value)}
								placeholder="0.00"
							/>
							{form.errors.paidAmount && <p className="text-xs text-destructive">{form.errors.paidAmount}</p>}
						</div>
					)}

					{(form.data.paymentSelection === "pay_later" || (form.data.paymentSelection === "pay_now" && form.data.paymentType === "partial")) && (
						<div className="space-y-2">
							<Label className="flex items-center gap-1.5 text-xs uppercase font-bold text-muted-foreground">
								<Calendar className="h-3 w-3" /> Balance Due Date
							</Label>
							<Input 
								type="date"
								value={form.data.dueDate}
								onChange={e => form.setData("dueDate", e.target.value)}
							/>
							{form.errors.dueDate && <p className="text-xs text-destructive">{form.errors.dueDate}</p>}
						</div>
					)}

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label className="text-xs uppercase font-bold text-muted-foreground">Payment Method</Label>
							<Select 
								value={form.data.paymentMethod} 
								onValueChange={v => form.setData("paymentMethod", v)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="Cash">Cash</SelectItem>
									<SelectItem value="GCash">GCash</SelectItem>
									<SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
									<SelectItem value="Card">Card</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label className="text-xs uppercase font-bold text-muted-foreground">Total to Clear</Label>
							<p className="text-lg font-black text-primary-hex pt-1">{currency(total)}</p>
						</div>
					</div>

					<div className="space-y-2">
						<Label className="flex items-center gap-1.5 text-xs uppercase font-bold text-muted-foreground">
							<FileText className="h-3 w-3" /> Additional Details
						</Label>
						<Input 
							placeholder="Ref no., check serial, etc. (optional)"
							value={form.data.additionalDetails}
							onChange={e => form.setData("additionalDetails", e.target.value)}
						/>
					</div>

					<DialogFooter className="gap-2 sm:gap-0">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
						<Button type="submit" disabled={form.processing} className="px-6 font-bold">
							{form.processing ? "Processing..." : "Confirm Delivery"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
