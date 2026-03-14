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
import { ScrollArea } from "@/Components/ui/scroll-area";
import { AlertCircle } from "lucide-react";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;

export function EditQtyDialog({ open, onOpenChange, item, value, onChange, error, onSave }) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Edit Quantity</DialogTitle>
					<DialogDescription>
						Update the quantity for <strong>{item?.ProductName}</strong>.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="grid gap-2">
						<Label htmlFor="qty">Quantity (Max: {item?.maxQuantity})</Label>
						<Input 
							id="qty" 
							type="number" 
							value={value} 
							onChange={(e) => onChange(e.target.value)}
							autoFocus
						/>
						{error && (
							<p className="text-xs font-medium text-destructive flex items-center gap-1">
								<AlertCircle className="h-3 w-3" /> {error}
							</p>
						)}
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
					<Button onClick={onSave}>Save Changes</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function WalkInCheckoutDialog({ open, onOpenChange, form, items, total, change, error, onSubmit }) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>Walk-In Checkout</DialogTitle>
					<DialogDescription>Review order and process payment.</DialogDescription>
				</DialogHeader>
				
				<div className="flex-1 overflow-y-auto pr-2 py-4 space-y-6">
					<div className="rounded-lg border bg-muted/30">
						<div className="p-3 border-b bg-muted/50 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
							Order Summary
						</div>
						<div className="divide-y max-h-[200px] overflow-y-auto">
							{items.map((item) => (
								<div key={item.ID} className="p-3 flex justify-between text-sm">
									<div className="flex flex-col">
										<span className="font-medium text-foreground">{item.ProductName}</span>
										<span className="text-[11px] text-muted-foreground">{currency(item.pricePerUnit)} x {item.quantity}</span>
									</div>
									<span className="font-semibold text-foreground">{currency(item.pricePerUnit * item.quantity)}</span>
								</div>
							))}
						</div>
						<div className="p-4 bg-muted/50 border-t flex flex-col gap-2">
							<div className="flex justify-between items-center">
								<span className="text-sm text-muted-foreground font-medium">Total Amount Due</span>
								<span className="text-xl font-bold text-primary-hex">{currency(total)}</span>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-3">
							<Label htmlFor="paid">Amount Paid</Label>
							<div className="relative">
								<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">P</span>
								<Input 
									id="paid" 
									className="pl-7 h-11 text-base font-bold"
									type="number" 
									step="0.01"
									value={form.data.paidAmount} 
									onChange={(e) => form.setData("paidAmount", e.target.value)} 
								/>
							</div>
							{form.errors.paidAmount && <p className="text-xs text-destructive">{form.errors.paidAmount}</p>}
						</div>
						<div className="space-y-3">
							<Label htmlFor="method">Payment Method</Label>
							<Select value={form.data.paymentMethod} onValueChange={(v) => form.setData("paymentMethod", v)}>
								<SelectTrigger className="h-11">
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
					</div>

					<div className="space-y-3">
						<Label htmlFor="details">Additional Details (Optional)</Label>
						<Input 
							id="details" 
							placeholder="Reference number, notes..."
							value={form.data.additionalDetails} 
							onChange={(e) => form.setData("additionalDetails", e.target.value)} 
						/>
					</div>

					<div className="p-4 rounded-lg bg-primary-soft/50 border border-primary/20 flex justify-between items-center text-primary-hex">
						<span className="text-sm font-semibold uppercase tracking-wider">Change to give</span>
						<span className="text-xl font-black">{currency(change)}</span>
					</div>

					{error && (
						<div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex gap-2 items-center">
							<AlertCircle className="h-4 w-4 shrink-0" />
							{error}
						</div>
					)}
				</div>

				<DialogFooter className="pt-4 border-t">
					<Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
					<Button className="px-8" onClick={onSubmit} disabled={form.processing}>
						{form.processing ? "Processing..." : "Complete Sale"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function ShrinkageCheckoutDialog({ open, onOpenChange, form, items, total, error, onSubmit, canUseAdvanced }) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
				<DialogHeader>
					<DialogTitle className="text-destructive flex items-center gap-2">
						Record Shrinkage
					</DialogTitle>
					<DialogDescription>Deduct stock without a sale (spoilage, loss, theft).</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto pr-2 py-4 space-y-6">
					<div className="rounded-lg border bg-destructive/5">
						<div className="p-3 border-b bg-destructive/10 font-semibold text-xs uppercase tracking-wider text-destructive/80">
							Stock Items
						</div>
						<div className="divide-y max-h-[200px] overflow-y-auto">
							{items.map((item) => (
								<div key={item.ID} className="p-3 flex justify-between text-sm">
									<span className="font-medium text-foreground">{item.ProductName} x {item.quantity}</span>
									<span className="font-semibold text-muted-foreground">{currency(item.pricePerUnit * item.quantity)}</span>
								</div>
							))}
						</div>
						<div className="p-4 bg-destructive/5 border-t flex justify-between items-center">
							<span className="text-sm text-muted-foreground font-medium">Total Resource Loss</span>
							<span className="text-xl font-bold text-destructive">{currency(total)}</span>
						</div>
					</div>

					<div className="space-y-3">
						<Label>Shrinkage Reason</Label>
						<Select value={form.data.reason} onValueChange={(v) => form.setData("reason", v)}>
							<SelectTrigger className="h-11">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="Spoiled">Spoilage / Expired</SelectItem>
								{canUseAdvanced && (
									<>
										<SelectItem value="Theft">Internal/External Theft</SelectItem>
										<SelectItem value="Lost">Unaccounted Loss</SelectItem>
									</>
								)}
							</SelectContent>
						</Select>
						{form.errors.reason && <p className="text-xs text-destructive">{form.errors.reason}</p>}
					</div>

					{error && (
						<div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex gap-2 items-center">
							<AlertCircle className="h-4 w-4 shrink-0" />
							{error}
						</div>
					)}
				</div>

				<DialogFooter className="pt-4 border-t">
					<Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
					<Button variant="destructive" className="px-8" onClick={onSubmit} disabled={form.processing}>
						{form.processing ? "Saving..." : "Record Loss"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
