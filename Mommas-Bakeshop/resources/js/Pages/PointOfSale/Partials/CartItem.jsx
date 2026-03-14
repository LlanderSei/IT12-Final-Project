import React from "react";
import { Button } from "@/Components/ui/button";
import { Minus, Plus, Trash2, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;

export default function CartItem({ item, onIncrement, onDecrement, onRemove, onEdit }) {
	return (
		<div className="group relative flex flex-col gap-3 p-3 rounded-lg border border-border/50 bg-card hover:border-primary/30 hover:bg-accent/5 transition-all shadow-sm">
			<div className="flex justify-between items-start gap-2">
				<div className="min-w-0">
					<h5 className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">
						{item.ProductName}
					</h5>
					<p className="text-[11px] text-muted-foreground mt-0.5">
						{currency(item.pricePerUnit)} / unit
					</p>
				</div>
				<Button 
					variant="ghost" 
					size="icon" 
					className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0" 
					onClick={() => onRemove(item.ID)}
				>
					<Trash2 className="h-3.5 w-3.5" />
				</Button>
			</div>

			<div className="flex items-center justify-between mt-1">
				<div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-md border border-border/50">
					<Button 
						variant="ghost" 
						size="icon" 
						className="h-6 w-6 rounded-sm bg-background hover:bg-primary-soft hover:text-primary border border-border/50 shadow-sm"
						onClick={() => onDecrement(item.ID)}
					>
						<Minus className="h-3 w-3" />
					</Button>
					
					<div 
						className="min-w-[32px] text-center text-xs font-bold cursor-pointer hover:text-primary select-none px-1"
						onClick={() => onEdit(item)}
					>
						{item.quantity}
					</div>

					<Button 
						variant="ghost" 
						size="icon" 
						className="h-6 w-6 rounded-sm bg-background hover:bg-primary-soft hover:text-primary border border-border/50 shadow-sm"
						onClick={() => onIncrement(item.ID)}
						disabled={item.quantity >= item.maxQuantity}
					>
						<Plus className="h-3 w-3" />
					</Button>
				</div>
				
				<div className="flex flex-col items-end">
					<span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Subtotal</span>
					<span className="text-sm font-bold text-foreground">
						{currency(item.pricePerUnit * item.quantity)}
					</span>
				</div>
			</div>
			
			<Button 
				variant="ghost" 
				size="sm" 
				className="absolute -top-1 -right-1 h-6 px-1.5 bg-background border border-border/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full shadow-sm text-[10px]"
				onClick={() => onEdit(item)}
			>
				<Edit2 className="h-2.5 w-2.5 mr-1" />
				Edit Qty
			</Button>
		</div>
	);
}
