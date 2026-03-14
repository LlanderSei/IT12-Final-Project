import React from "react";
import { Card, CardContent } from "@/Components/ui/card";
import { Badge } from "@/Components/ui/badge";
import { cn } from "@/lib/utils";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;

export default function ProductCard({ product, onAdd, disabled }) {
	const isLowStock = Number(product.Quantity) <= 10;
	const isOutOfStock = Number(product.Quantity) === 0;

	return (
		<Card 
			className={cn(
				"group overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer h-full flex flex-col border-border/50 bg-card/50",
				isOutOfStock && "opacity-60 grayscale cursor-not-allowed",
				!isOutOfStock && "hover:border-primary/50"
			)}
			onClick={() => !disabled && !isOutOfStock && onAdd(product)}
		>
			<div className="relative aspect-square overflow-hidden bg-muted flex items-center justify-center shrink-0">
				{product.ProductImageUrl ? (
					<img
						src={product.ProductImageUrl}
						alt={product.ProductName}
						className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
					/>
				) : (
					<div className="flex flex-col items-center gap-1 text-muted-foreground">
						<span className="text-xs">No image</span>
					</div>
				)}
				<div className="absolute top-2 right-2 flex flex-col gap-1">
					{isOutOfStock ? (
						<Badge variant="destructive">Out of Stock</Badge>
					) : isLowStock && (
						<Badge variant="warning" className="bg-amber-500 text-white border-none">Low Stock</Badge>
					)}
				</div>
			</div>
			
			<CardContent className="p-3 flex flex-col flex-1">
				<div className="flex-1 min-h-0">
					<h4 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
						{product.ProductName}
					</h4>
					<p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
						{product.ProductDescription || "No description provided."}
					</p>
				</div>
				
				<div className="mt-3 flex items-center justify-between pt-2 border-t border-border/50">
					<div className="flex flex-col">
						<span className="text-xs text-muted-foreground">Price</span>
						<span className="font-bold text-primary-hex text-sm">{currency(product.Price)}</span>
					</div>
					<div className="flex flex-col items-end">
						<span className="text-xs text-muted-foreground">Available</span>
						<span className={cn(
							"text-xs font-semibold",
							isLowStock ? "text-amber-600" : "text-foreground"
						)}>
							{product.Quantity}
						</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
