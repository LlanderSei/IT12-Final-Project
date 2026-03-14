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
	AlertTriangle,
	TrendingDown,
	CheckCircle2,
	XCircle,
	AlertCircle
} from "lucide-react";
import { Separator } from "@/Components/ui/separator";
import { Button } from "@/Components/ui/button";

export default function ShrinkageDetailDialog({ open, onOpenChange, record }) {
	if (!record) return null;

	const dateObj = new Date(record.DateAdded);
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

	const statusColor = {
		'Pending': 'bg-orange-500',
		'Verified': 'bg-emerald-500',
		'Rejected': 'bg-destructive'
	}[record.VerificationStatus || 'Pending'];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl">
				<DialogHeader className="px-8 py-8 bg-card border-b relative">
					<div className="absolute top-0 right-0 p-8 opacity-5">
						<AlertTriangle className="h-24 w-24" />
					</div>
					<div className="flex items-center gap-4 mb-4">
						<Badge variant="secondary" className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white border-none ${statusColor}`}>
							{record.VerificationStatus || 'Pending Approval'}
						</Badge>
						<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">Archive #{record.ID}</span>
					</div>
					<DialogTitle className="text-3xl font-black italic uppercase tracking-tighter leading-none">
						Shrinkage Detail
					</DialogTitle>
					<DialogDescription className="text-muted-foreground font-medium mt-2">
						Historical record of inventory loss for auditing and accounting purposes.
					</DialogDescription>
				</DialogHeader>

				<div className="p-0 bg-background">
					<div className="grid grid-cols-2 md:grid-cols-4 border-b">
						<div className="p-6 border-r flex flex-col gap-2">
							<div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5 leading-none">
								<Calendar className="h-3 w-3" /> Date
							</div>
							<div className="text-sm font-bold truncate leading-tight">{formattedDate}</div>
						</div>
						<div className="p-6 border-r flex flex-col gap-2">
							<div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5 leading-none">
								<Clock className="h-3 w-3" /> Time
							</div>
							<div className="text-sm font-bold truncate leading-tight">{formattedTime}</div>
						</div>
						<div className="p-6 border-r flex flex-col gap-2 bg-muted/20">
							<div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5 leading-none">
								<Hash className="h-3 w-3" /> Units
							</div>
							<div className="text-xl font-black italic text-foreground leading-none">{record.Quantity}</div>
						</div>
						<div className="p-6 flex flex-col gap-2 bg-primary/5">
							<div className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-1.5 leading-none">
								<TrendingDown className="h-3 w-3" /> Loss
							</div>
							<div className="text-xl font-black italic text-primary leading-none">₱{Number(record.TotalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
						</div>
					</div>

					<div className="p-6 border-b grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/10">
						<div className="flex items-center gap-4">
							<div className="h-10 w-10 rounded-xl bg-foreground/10 flex items-center justify-center text-foreground">
								<User className="h-5 w-5" />
							</div>
							<div>
								<div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Recorded By</div>
								<div className="text-sm font-bold italic leading-tight">{record.CreatedBy || "System Admin"}</div>
							</div>
						</div>
						<div className="flex items-center gap-4">
							<div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600">
								<AlertCircle className="h-5 w-5" />
							</div>
							<div>
								<div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Attestation Reason</div>
								<div className="text-sm font-bold uppercase tracking-tight text-orange-700 leading-tight">{record.Reason}</div>
							</div>
						</div>
					</div>

					<div className="p-8">
						<div className="flex items-center justify-between mb-6">
							<h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
								<Package className="h-3 w-3" /> Itemized Loss List
							</h4>
							<Badge variant="outline" className="font-black text-[10px] uppercase">{record.items?.length || 0} Affected SKUs</Badge>
						</div>

						<div className="rounded-2xl border overflow-hidden">
							<ScrollArea className="h-[250px]">
								<table className="min-w-full divide-y divide-muted border-collapse">
									<thead className="bg-muted/30 sticky top-0 z-10 backdrop-blur-sm">
										<tr>
											<th className="px-5 py-3 text-left text-[10px] font-black uppercase text-muted-foreground tracking-widest">Product</th>
											<th className="px-5 py-3 text-center text-[10px] font-black uppercase text-muted-foreground tracking-widest">Qty</th>
											<th className="px-5 py-3 text-right text-[10px] font-black uppercase text-muted-foreground tracking-widest">Subtotal</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-muted/50">
										{(record.items || []).map((line, idx) => (
											<tr key={idx} className="hover:bg-muted/10 transition-colors group">
												<td className="px-5 py-4">
													<div className="text-sm font-bold uppercase tracking-tight group-hover:text-primary transition-colors">{line.ProductName}</div>
													<div className="text-[9px] font-black text-muted-foreground/40 mt-0.5">COST REF: ₱{Number(line.PricePerUnit || 0).toFixed(2)}/EA</div>
												</td>
												<td className="px-5 py-4 text-center">
													<div className="text-sm font-black text-foreground">{line.Quantity}</div>
												</td>
												<td className="px-5 py-4 text-right">
													<div className="text-sm font-black text-primary italic">₱{Number(line.SubAmount || 0).toFixed(2)}</div>
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
					<Button variant="outline" onClick={() => onOpenChange(false)} className="px-12 h-12 font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-sm border-2">
						Dismiss Audit
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

const ClipboardList = ({ className }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" height="24" viewBox="0 0 24 24" 
        fill="none" stroke="currentColor" strokeWidth="2" 
        strokeLinecap="round" strokeLinejoin="round" 
        className={className}
    >
        <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
        <path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>
    </svg>
);
