import React from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/Components/ui/dialog";
import { Badge } from "@/Components/ui/badge";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { 
	Calendar, 
	User, 
	Package, 
	Hash, 
	FileText, 
	Clock,
	ChefHat,
	ArrowRight
} from "lucide-react";
import { Separator } from "@/Components/ui/separator";

export default function ProductionBatchDetailDialog({ open, onOpenChange, batch }) {
	if (!batch) return null;

	const dateObj = new Date(batch.DateAdded);
	const formattedDate = dateObj.toLocaleDateString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});
	const formattedTime = dateObj.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl">
				<DialogHeader className="px-8 py-8 bg-card border-b relative">
					<div className="absolute top-0 right-0 p-8 opacity-5">
						<ChefHat className="h-24 w-24" />
					</div>
					<div className="flex items-center gap-4 mb-4">
						<Badge variant="secondary" className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border-none">
							Batch Log
						</Badge>
						<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">Reference: #{batch.ID}</span>
					</div>
					<DialogTitle className="text-3xl font-black italic uppercase tracking-tighter leading-none">
						Production Run
					</DialogTitle>
					<DialogDescription className="text-muted-foreground font-medium mt-2">
						Consolidated production log for finished goods.
					</DialogDescription>
				</DialogHeader>

				<div className="p-0 bg-background">
					<div className="grid grid-cols-2 border-b">
						<div className="p-6 border-r flex items-center gap-4">
							<div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
								<Calendar className="h-5 w-5" />
							</div>
							<div>
								<div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Date</div>
								<div className="text-sm font-bold">{formattedDate}</div>
							</div>
						</div>
						<div className="p-6 flex items-center gap-4">
							<div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
								<Clock className="h-5 w-5" />
							</div>
							<div>
								<div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Time</div>
								<div className="text-sm font-bold">{formattedTime}</div>
							</div>
						</div>
					</div>

					<div className="p-6 border-b flex items-center gap-4 bg-muted/10">
						<div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
							<User className="h-5 w-5" />
						</div>
						<div>
							<div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Recorded By</div>
							<div className="text-sm font-bold">{batch.user?.FullName || "System User"}</div>
						</div>
					</div>

					<div className="p-8">
						<div className="flex items-center justify-between mb-6">
							<h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
								<Package className="h-3 w-3" /> Produced Items
							</h4>
							<Badge className="font-black text-[10px]">{batch.TotalQuantity} Units Total</Badge>
						</div>

						<ScrollArea className="h-[250px] pr-4 -mr-4">
							<div className="space-y-3">
								{batch.ItemsProduced?.map((item, idx) => (
									<div key={idx} className="flex items-center justify-between p-4 rounded-2xl border bg-card hover:border-primary/30 transition-colors group">
										<div className="flex items-center gap-4">
											<div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/5 transition-colors">
												<Hash className="h-4 w-4 text-muted-foreground opacity-50 group-hover:text-primary transition-colors" />
											</div>
											<div>
												<div className="text-sm font-bold uppercase tracking-tight group-hover:text-primary transition-colors">{item.ItemName}</div>
												<div className="text-[10px] font-medium text-muted-foreground opacity-60">SKU Ref: {item.ProductID || 'GEN'}</div>
											</div>
										</div>
										<div className="flex items-center gap-3">
											<ArrowRight className="h-4 w-4 text-muted-foreground opacity-20" />
											<div className="text-xl font-black text-primary italic">+{item.QuantityProduced}</div>
										</div>
									</div>
								))}
							</div>
						</ScrollArea>

						{batch.BatchDescription && (
							<div className="mt-8 p-6 rounded-2xl bg-muted/30 border-2 border-dashed">
								<div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-3 flex items-center gap-2">
									<FileText className="h-3 w-3" /> Batch Notes
								</div>
								<p className="text-sm font-medium text-foreground leading-relaxed italic">
									"{batch.BatchDescription}"
								</p>
							</div>
						)}
					</div>
				</div>

				<div className="p-6 bg-card border-t flex justify-end">
					<Button variant="outline" onClick={() => onOpenChange(false)} className="px-10 h-11 font-black uppercase tracking-widest text-[10px] rounded-xl">
						Dismiss
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
