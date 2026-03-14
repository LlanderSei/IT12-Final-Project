import React, { useEffect, useMemo, useState } from "react";
import DataTable from "@/Components/DataTable";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { 
	Search, 
	RotateCcw, 
	ChevronRight, 
	Camera, 
	User as UserIcon,
	Calendar as CalendarIcon,
	TrendingUp,
	Package
} from "lucide-react";
import { Badge } from "@/Components/ui/badge";
import { 
	Select, 
	SelectContent, 
	SelectItem, 
	SelectTrigger, 
	SelectValue 
} from "@/Components/ui/select";
import ProductSnapshotDetailDialog from "./Partials/ProductSnapshotDetailDialog";

export default function Snapshots({
	snapshots = [],
	onHeaderMetaChange,
	canViewDetails = true,
}) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedSnapshot, setSelectedSnapshot] = useState(null);
	const [isDetailOpen, setIsDetailOpen] = useState(false);
	const [creatorFilter, setCreatorFilter] = useState("all");

	// Filters
	const creatorOptions = useMemo(() => 
		[...new Set((snapshots || []).map(s => s.user?.FullName).filter(Boolean))],
	[snapshots]);

	const filteredSnapshots = useMemo(() => {
		let items = [...(snapshots || [])];
		const query = searchQuery.toLowerCase().trim();
		
		if (query) {
			items = items.filter(s => 
				s.user?.FullName?.toLowerCase().includes(query) ||
				s.Leftovers?.some(l => l.ItemName?.toLowerCase().includes(query))
			);
		}
		if (creatorFilter !== "all") items = items.filter(s => s.user?.FullName === creatorFilter);
		
		return items;
	}, [snapshots, searchQuery, creatorFilter]);

	// Columns
	const columns = [
		{
			header: "Snapshot Log",
			accessorKey: "ID",
			cell: (row) => (
				<div className="flex items-center gap-4 py-1">
					<div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground/30 border-2 border-dashed">
						<Camera className="h-6 w-6" />
					</div>
					<div>
						<div className="font-black text-xs uppercase tracking-widest text-muted-foreground opacity-50 mb-1">Log Reference</div>
						<div className="font-bold text-gray-900">Archive #{row.ID}</div>
					</div>
				</div>
			),
			sortable: true
		},
		{
			header: "Inventory Levels",
			id: "levels",
			cell: (row) => (
				<div className="flex gap-2">
					<Badge variant="outline" className="font-black text-[10px] h-6 flex items-center gap-1.5 px-3 border-primary/20 text-primary uppercase">
						<Package className="h-3 w-3" /> {row.TotalItems} SKUs
					</Badge>
					<Badge className="font-black text-[10px] h-6 flex items-center gap-1.5 px-3 uppercase bg-foreground">
						{row.TotalLeftovers} Items
					</Badge>
				</div>
			),
			sortable: true
		},
		{
			header: "Valuation",
			accessorKey: "TotalAmount",
			cell: (row) => (
				<div className="flex flex-col">
					<div className="flex items-center gap-1 font-black text-primary italic">
						<span className="text-[10px] opacity-70 not-italic">₱</span>
						{Number(row.TotalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
					</div>
					<div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-30">Market Value</div>
				</div>
			),
			sortable: true
		},
		{
			header: "Captured By",
			accessorKey: "user.FullName",
			cell: (row) => (
				<div className="flex items-center gap-3">
					<div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center text-primary border shadow-sm">
						<UserIcon className="h-4 w-4" />
					</div>
					<div className="text-sm font-bold text-gray-700">{row.user?.FullName || 'Administrator'}</div>
				</div>
			),
			sortable: true
		},
		{
			header: "Timestamp",
			accessorKey: "SnapshotTime",
			cell: (row) => {
				const d = new Date(row.SnapshotTime);
				return (
					<div className="flex flex-col">
						<div className="text-sm font-bold text-gray-900">{d.toLocaleDateString()}</div>
						<div className="text-[10px] font-black uppercase text-muted-foreground opacity-50">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
					</div>
				);
			},
			sortable: true
		},
		{
			header: "Actions",
			id: "actions",
			cell: (row) => (
				<Button 
					variant="ghost" 
					className="h-9 px-4 gap-2 font-black uppercase tracking-widest text-[9px] hover:bg-foreground hover:text-white transition-all rounded-xl border border-transparent hover:border-foreground shadow-sm active:scale-95"
					onClick={() => { setSelectedSnapshot(row); setIsDetailOpen(true); }}
					disabled={!canViewDetails}
				>
					Review Log <ChevronRight className="h-3 w-3" />
				</Button>
			),
			className: "text-right"
		}
	];

	// Sync
	useEffect(() => {
		onHeaderMetaChange?.({ subtitle: "Snapshot Archive", countLabel: `${filteredSnapshots.length} Logs` });
	}, [filteredSnapshots.length]);

	return (
		<div className="flex flex-col flex-1 overflow-hidden min-h-0 bg-white p-6 rounded-3xl">
			<div className="flex flex-col md:flex-row gap-4 mb-8 pt-2">
				<div className="relative flex-1 max-w-md">
					<Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
					<Input 
						placeholder="Search archives by creator or item..." 
						className="pl-11 h-12 bg-muted/20 border-transparent focus-visible:ring-primary font-medium rounded-2xl"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
				<div className="flex flex-wrap gap-2 items-center">
					<div className="flex items-center gap-2 bg-muted/40 p-2 rounded-2xl border shadow-inner">
						<Select value={creatorFilter} onValueChange={setCreatorFilter}>
							<SelectTrigger className="w-44 border-none bg-transparent h-8 font-black text-[10px] uppercase tracking-widest">
								<SelectValue placeholder="All Creators" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Every Staff Member</SelectItem>
								{creatorOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
							</SelectContent>
						</Select>
					</div>
					<Button 
						variant="ghost" 
						size="icon" 
						className="h-12 w-12 text-muted-foreground hover:text-primary transition-all bg-muted/20 hover:bg-primary/5 rounded-2xl border border-transparent hover:border-primary/20"
						onClick={() => { setSearchQuery(""); setCreatorFilter("all"); }}
					>
						<RotateCcw className="h-5 w-5" />
					</Button>
				</div>
			</div>

			<DataTable 
				columns={columns} 
				data={filteredSnapshots} 
				pagination={true} 
				itemsPerPage={25}
			/>

			<ProductSnapshotDetailDialog 
				open={isDetailOpen}
				onOpenChange={setIsDetailOpen}
				snapshot={selectedSnapshot}
			/>
		</div>
	);
}
