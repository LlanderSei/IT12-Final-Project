import React, { useEffect } from "react";
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
import { Textarea } from "@/Components/ui/textarea";

export default function InventoryItemModal({ 
	open, 
	onOpenChange, 
	itemForm, 
	editingItem, 
	onSubmit,
	onDelete,
	canDelete = false
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>{editingItem ? "Edit Inventory Item" : "Add New Inventory Item"}</DialogTitle>
					<DialogDescription>
						{editingItem ? "Update the details of this item." : "Create a new item in the inventory list."}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={onSubmit} className="space-y-6 py-4">
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="item-name">Item Name *</Label>
							<Input 
								id="item-name"
								value={itemForm.data.ItemName}
								onChange={(e) => itemForm.setData("ItemName", e.target.value)}
								required
								placeholder="e.g. All-Purpose Flour"
								className="font-semibold"
							/>
						</div>
						
						<div className="space-y-2">
							<Label htmlFor="item-description">Description</Label>
							<Textarea 
								id="item-description"
								value={itemForm.data.ItemDescription}
								onChange={(e) => itemForm.setData("ItemDescription", e.target.value)}
								rows={2}
								placeholder="Optional details about this item..."
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="item-type">Type *</Label>
								<Select 
									value={itemForm.data.ItemType} 
									onValueChange={(val) => itemForm.setData("ItemType", val)}
								>
									<SelectTrigger id="item-type">
										<SelectValue placeholder="Select Type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="Raw Material">Raw Material</SelectItem>
										<SelectItem value="Supplies">Supplies</SelectItem>
										<SelectItem value="Packaging">Packaging</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="item-measurement">Unit *</Label>
								<Input 
									id="item-measurement"
									value={itemForm.data.Measurement}
									onChange={(e) => itemForm.setData("Measurement", e.target.value)}
									placeholder="e.g. kg, pcs, L"
									required
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="low-threshold">Low Stock Threshold *</Label>
							<div className="relative">
								<Input 
									id="low-threshold"
									type="number"
									value={itemForm.data.LowCountThreshold}
									onChange={(e) => itemForm.setData("LowCountThreshold", e.target.value)}
									min="0"
									required
								/>
								<span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase">
									{itemForm.data.Measurement || 'units'}
								</span>
							</div>
							<p className="text-[10px] text-muted-foreground italic">You will be alerted when stock falls below this level.</p>
						</div>
					</div>

					<DialogFooter className="gap-2 sm:gap-0">
						<div className="flex-1 flex justify-start">
							{editingItem && (
								<Button 
									type="button" 
									variant="destructive" 
									onClick={onDelete}
									disabled={!canDelete || itemForm.processing}
								>
									Delete
								</Button>
							)}
						</div>
						<div className="flex gap-2">
							<Button 
								type="button" 
								variant="outline" 
								onClick={() => onOpenChange(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={itemForm.processing}>
								{editingItem ? "Update Item" : "Create Item"}
							</Button>
						</div>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
