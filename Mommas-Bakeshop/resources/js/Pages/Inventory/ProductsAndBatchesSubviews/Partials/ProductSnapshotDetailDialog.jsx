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
	Camera,
	DollarSign,
	TrendingUp
} from "lucide-react";
import { Separator } from "@/Components/ui/separator";

export default function ProductSnapshotDetailDialog({ open, onOpenChange, snapshot }) {
	if (!snapshot) return null;

	const dateObj = new Date(snapshot.SnapshotTime);
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
			<DialogContent className="sm:max-w-[750px] p-0 overflow-hidden border-none shadow-2xl">
				<DialogHeader className="px-8 py-8 bg-card border-b relative">
					<div className="absolute top-0 right-0 p-8 opacity-5">
						<Camera className="h-24 w-24" />
					</div>
					<div className="flex items-center gap-4 mb-4">
						<Badge variant="secondary" className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border-none">
							Product Image
						</Badge>
						<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">Log ID: {snapshot.ID}</span>
					</div>
					<DialogTitle className="text-3xl font-black italic uppercase tracking-tighter leading-none">
						Inventory Snapshot
					</DialogTitle>
					<DialogDescription className="text-muted-foreground font-medium mt-2">
						Historical record of finished goods stock levels at a specific moment.
					</DialogDescription>
				</DialogHeader>

				<div className="p-0 bg-background">
					<div className="grid grid-cols-1 md:grid-cols-3 border-b">
						<div className="p-6 border-r flex items-center gap-4">
							<div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
								<Calendar className="h-5 w-5" />
							</div>
							<div>
								<div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Date</div>
								<div className="text-sm font-bold">{formattedDate}</div>
							</div>
						</div>
						<div className="p-6 border-r flex items-center gap-4">
							<div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
								<Clock className="h-5 w-5" />
							</div>
							<div>
								<div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Time</div>
								<div className="text-sm font-bold">{formattedTime}</div>
							</div>
						</div>
						<div className="p-6 flex items-center gap-4 bg-primary/5">
							<div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
								<TrendingUp className="h-5 w-5" />
							</div>
							<div>
								<div className="text-[10px] font-black uppercase text-primary tracking-widest">Total Valuation</div>
								<div className="text-sm font-black text-primary">₱{Number(snapshot.TotalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
							</div>
						</div>
					</div>

					<div className="p-6 border-b flex items-center gap-4 bg-muted/10">
						<div className="h-10 w-10 rounded-xl bg-foreground/10 flex items-center justify-center text-foreground">
							<User className="h-5 w-5" />
						</div>
						<div>
							<div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Captured By</div>
							<div className="text-sm font-bold">{snapshot.user?.FullName || "System Administrator"}</div>
						</div>
					</div>

					<div className="p-8">
						<div className="flex items-center justify-between mb-6">
							<h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
								<Package className="h-3 w-3" /> Snapshot Data
							</h4>
							<div className="flex gap-2">
								<Badge variant="outline" className="font-black text-[10px] uppercase">{snapshot.TotalItems} SKUs</Badge>
								<Badge className="font-black text-[10px] uppercase bg-foreground">{snapshot.TotalLeftovers} Total Qty</Badge>
							</div>
						</div>

						<div className="rounded-2xl border overflow-hidden">
							<ScrollArea className="h-[300px]">
								<table className="min-w-full divide-y divide-muted border-collapse">
									<thead className="bg-muted/30 sticky top-0 z-10 backdrop-blur-sm">
										<tr>
											<th className="px-5 py-3 text-left text-[10px] font-black uppercase text-muted-foreground tracking-widest">Item Name</th>
											<th className="px-5 py-3 text-left text-[10px] font-black uppercase text-muted-foreground tracking-widest">Category</th>
											<th className="px-5 py-3 text-right text-[10px] font-black uppercase text-muted-foreground tracking-widest">Price</th>
											<th className="px-5 py-3 text-center text-[10px] font-black uppercase text-muted-foreground tracking-widest">Stock</th>
											<th className="px-5 py-3 text-right text-[10px] font-black uppercase text-muted-foreground tracking-widest">Valuation</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-muted/50">
										{(snapshot.Leftovers || []).map((line, idx) => (
											<tr key={idx} className="hover:bg-muted/10 transition-colors group">
												<td className="px-5 py-4">
													<div className="text-sm font-bold uppercase tracking-tight group-hover:text-primary transition-colors">{line.ItemName}</div>
												</td>
												<td className="px-5 py-4">
													<Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest opacity-70 border-none">{line.CategoryName || 'N/A'}</Badge>
												</td>
												<td className="px-5 py-4 text-right">
													<div className="text-xs font-black text-muted-foreground/60">₱{Number(line.PerUnitAmount || 0).toFixed(2)}</div>
												</td>
												<td className="px-5 py-4 text-center">
													<div className="text-sm font-black text-foreground">{line.LeftoverQuantity}</div>
												</td>
												<td className="px-5 py-4 text-right">
													<div className="text-sm font-black text-primary italic">₱{Number(line.LineAmount || 0).toFixed(2)}</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</ScrollArea>
						</div>
					</div>
				</div>

				<div className="p-8 bg-card border-t flex justify-end">
					<Button variant="outline" onClick={() => onOpenChange(false)} className="px-12 h-12 font-black uppercase tracking-widest text-[10px] rounded-[1rem] shadow-sm">
						Dismiss Detail
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
