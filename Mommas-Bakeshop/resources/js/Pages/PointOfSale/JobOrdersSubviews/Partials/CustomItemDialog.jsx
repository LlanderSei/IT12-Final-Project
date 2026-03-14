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

export default function CustomItemDialog({ open, onOpenChange, draft, onChange, error, onSave, isEditing }) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{isEditing ? "Edit Custom Item" : "Add Custom Item"}</DialogTitle>
					<DialogDescription>
						Specify details for a product not in the standard catalog.
					</DialogDescription>
				</DialogHeader>
				
				<div className="grid gap-4 py-4">
					<div className="grid gap-2">
						<Label htmlFor="desc">Description</Label>
						<Textarea 
							id="desc" 
							placeholder="e.g., Chocolate Cake with custom icing name..." 
							value={draft.description}
							onChange={e => onChange("description", e.target.value)}
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="grid gap-2">
							<Label htmlFor="qty">Quantity</Label>
							<Input 
								id="qty" 
								type="number" 
								value={draft.quantity}
								onChange={e => onChange("quantity", e.target.value)}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="price">Price Per Unit</Label>
							<div className="relative">
								<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">P</span>
								<Input 
									id="price" 
									type="number" 
									step="0.01"
									className="pl-7"
									value={draft.pricePerUnit}
									onChange={e => onChange("pricePerUnit", e.target.value)}
								/>
							</div>
						</div>
					</div>
					{error && <p className="text-xs font-medium text-destructive">{error}</p>}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
					<Button onClick={onSave}>{isEditing ? "Save Changes" : "Add Item"}</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
