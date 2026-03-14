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
import { Textarea } from "@/Components/ui/textarea";
import { 
	Select, 
	SelectContent, 
	SelectItem, 
	SelectTrigger, 
	SelectValue 
} from "@/Components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/Components/ui/radio-group";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { Separator } from "@/Components/ui/separator";
import { Search, UserPlus, Calendar, Clock, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;

export default function JobOrderCheckoutDialog({ 
	open, 
	onOpenChange, 
	form, 
	customers, 
	customerSearch, 
	setCustomerSearch, 
	cartItems, 
	customOrders, 
	total, 
	error, 
	onSubmit 
}) {
	const filteredCustomers = customers.filter(c => {
		const q = customerSearch.toLowerCase();
		return c.CustomerName.toLowerCase().includes(q) || (c.ContactDetails && c.ContactDetails.toLowerCase().includes(q));
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col overflow-hidden">
				<DialogHeader>
					<DialogTitle>Job Order Checkout</DialogTitle>
					<DialogDescription>Complete customer and delivery details for this order.</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto pr-2 py-4 space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Left: Customer Info */}
						<div className="space-y-4">
							<div className="space-y-3">
								<Label>Customer Selection</Label>
								<RadioGroup 
									value={form.data.customerMode} 
									onValueChange={v => form.setData("customerMode", v)}
									className="flex gap-4"
								>
									<div className="flex items-center space-x-2">
										<RadioGroupItem value="existing" id="existing" />
										<Label htmlFor="existing" className="font-normal">Existing</Label>
									</div>
									<div className="flex items-center space-x-2">
										<RadioGroupItem value="new" id="new" />
										<Label htmlFor="new" className="font-normal text-primary font-medium flex items-center gap-1">
											<UserPlus className="h-3 w-3" /> New Customer
										</Label>
									</div>
								</RadioGroup>
							</div>

							{form.data.customerMode === "existing" ? (
								<div className="space-y-3">
									<div className="relative">
										<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
										<Input 
											placeholder="Search customers..." 
											className="pl-8 h-9 text-xs"
											value={customerSearch}
											onChange={e => setCustomerSearch(e.target.value)}
										/>
									</div>
									<ScrollArea className="h-[180px] rounded-md border bg-muted/20">
										<div className="p-2 space-y-1">
											{filteredCustomers.map(c => (
												<div 
													key={c.ID}
													className={cn(
														"p-2 rounded-md cursor-pointer text-xs transition-colors",
														form.data.CustomerID === c.ID ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-accent"
													)}
													onClick={() => form.setData("CustomerID", c.ID)}
												>
													<p className="font-bold">{c.CustomerName}</p>
													<p className={cn("text-[10px]", form.data.CustomerID === c.ID ? "text-primary-foreground/70" : "text-muted-foreground")}>
														{c.ContactDetails || "No contact info"}
													</p>
												</div>
											))}
											{filteredCustomers.length === 0 && (
												<p className="text-center py-8 text-muted-foreground text-xs italic">No customers found.</p>
											)}
										</div>
									</ScrollArea>
									{form.errors.CustomerID && <p className="text-xs text-destructive">{form.errors.CustomerID}</p>}
								</div>
							) : (
								<div className="space-y-3 border rounded-lg p-3 bg-primary-soft/10 border-primary/10">
									<div className="grid gap-2">
										<Label htmlFor="newName" className="text-[10px] uppercase text-muted-foreground">Full Name</Label>
										<Input 
											id="newName" 
											className="h-8 text-xs"
											value={form.data.newCustomer.CustomerName}
											onChange={e => form.setData("newCustomer", { ...form.data.newCustomer, CustomerName: e.target.value })}
										/>
									</div>
									<div className="grid gap-2">
										<Label htmlFor="newContact" className="text-[10px] uppercase text-muted-foreground">Contact Details</Label>
										<Input 
											id="newContact" 
											className="h-8 text-xs"
											value={form.data.newCustomer.ContactDetails}
											onChange={e => form.setData("newCustomer", { ...form.data.newCustomer, ContactDetails: e.target.value })}
										/>
									</div>
									<div className="grid gap-2">
										<Label htmlFor="newAddr" className="text-[10px] uppercase text-muted-foreground">Address</Label>
										<Textarea 
											id="newAddr" 
											className="min-h-[60px] text-xs"
											value={form.data.newCustomer.Address}
											onChange={e => form.setData("newCustomer", { ...form.data.newCustomer, Address: e.target.value })}
										/>
									</div>
								</div>
							)}
						</div>

						{/* Right: Delivery Info */}
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label className="flex items-center gap-1.5 text-xs">
										<Calendar className="h-3 w-3" /> Delivery Date
									</Label>
									<Input 
										type="date" 
										className="h-9 text-xs"
										value={form.data.deliveryDate}
										onChange={e => form.setData("deliveryDate", e.target.value)}
									/>
									{form.errors.deliveryDate && <p className="text-xs text-destructive">{form.errors.deliveryDate}</p>}
								</div>
								<div className="space-y-2">
									<Label className="flex items-center gap-1.5 text-xs">
										<Clock className="h-3 w-3" /> Time (HH:MM)
									</Label>
									<Input 
										type="time" 
										className="h-9 text-xs"
										value={form.data.deliveryTime}
										onChange={e => form.setData("deliveryTime", e.target.value)}
									/>
									{form.errors.deliveryTime && <p className="text-xs text-destructive">{form.errors.deliveryTime}</p>}
								</div>
							</div>

							<div className="space-y-2">
								<Label className="flex items-center gap-1.5 text-xs">
									<FileText className="h-3 w-3" /> Delivery Notes
								</Label>
								<Textarea 
									placeholder="e.g., Surprise delivery, gate code 1234..."
									className="min-h-[100px] text-xs"
									value={form.data.notes}
									onChange={e => form.setData("notes", e.target.value)}
								/>
							</div>

							<div className="p-4 rounded-lg border bg-muted/30">
								<div className="flex justify-between items-center text-sm font-bold">
									<span className="text-muted-foreground uppercase tracking-tight text-[10px]">Grand Total</span>
									<span className="text-xl text-primary-hex font-black">{currency(total)}</span>
								</div>
							</div>
						</div>
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
					<Button className="px-8 font-bold" onClick={onSubmit} disabled={form.processing}>
						{form.processing ? "Processing..." : "Create Job Order"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
