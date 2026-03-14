import React, { useEffect, useMemo, useState } from "react";
import DataTable from "@/Components/DataTable";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Search, RotateCcw, Eye } from "lucide-react";
import { formatCountLabel } from "@/utils/countLabel";
import SnapshotDetailDialog from "./Partials/SnapshotDetailDialog";

const formatDateTime = (value) => {
	if (!value) return "n/a";
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? "n/a" : d.toLocaleString();
};

export default function Snapshots({
	snapshots = [],
	onHeaderMetaChange,
	canViewDetails = true,
}) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedSnapshot, setSelectedSnapshot] = useState(null);

	const filteredSnapshots = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		return (snapshots || []).filter((snapshot) => {
			if (!query) return true;
			return (
				String(snapshot.user?.FullName || "").toLowerCase().includes(query) ||
				String(snapshot.SnapshotTime || "").toLowerCase().includes(query) ||
				(snapshot.Leftovers || []).some((line) =>
					String(line.ItemName || "").toLowerCase().includes(query),
				)
			);
		});
	}, [snapshots, searchQuery]);

	const countLabel = formatCountLabel(filteredSnapshots.length, "record");

	useEffect(() => {
		onHeaderMetaChange?.({
			subtitle: "Snapshot History",
			countLabel,
		});
	}, [onHeaderMetaChange, countLabel]);

	const columns = [
		{ 
			header: "Created By", 
			accessorKey: "user.FullName",
			cell: ({ row }) => <span className="font-medium">{row.original.user?.FullName || "Unknown"}</span>
		},
		{ 
			header: "Total Items", 
			accessorKey: "TotalItems",
			className: "text-center"
		},
		{ 
			header: "Total Leftovers", 
			accessorKey: "TotalLeftovers",
			className: "text-center font-bold"
		},
		{ 
			header: "Snapshot Time", 
			accessorKey: "SnapshotTime",
			cell: ({ row }) => <span className="text-muted-foreground">{formatDateTime(row.original.SnapshotTime)}</span>
		},
		{ 
			id: "actions",
			header: () => <div className="text-right">Actions</div>,
			cell: ({ row }) => (
				<div className="flex justify-end gap-1">
					<Button 
						variant="ghost" 
						size="icon" 
						className="h-8 w-8 text-primary hover:bg-primary-soft" 
						onClick={() => setSelectedSnapshot(row.original)}
						disabled={!canViewDetails}
					>
						<Eye className="h-4 w-4" />
					</Button>
				</div>
			)
		},
	];

	return (
		<div className="flex flex-col flex-1 overflow-hidden space-y-4">
			<div className="flex flex-wrap items-center gap-3 bg-card p-4 rounded-xl border shadow-sm">
				<div className="relative flex-1 min-w-[280px]">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input 
						placeholder="Search by creator, date, or item..." 
						className="pl-9"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
				<Button variant="outline" size="icon" onClick={() => setSearchQuery("")}>
					<RotateCcw className="h-4 w-4" />
				</Button>
			</div>

			<div className="flex-1 min-h-0 bg-card rounded-xl border shadow-sm overflow-hidden p-1">
				<DataTable 
					columns={columns} 
					data={filteredSnapshots} 
					searchKey="user.FullName"
					showSearch={false}
				/>
			</div>

			<SnapshotDetailDialog 
				open={Boolean(selectedSnapshot)} 
				onOpenChange={(open) => !open && setSelectedSnapshot(null)} 
				snapshot={selectedSnapshot} 
			/>
		</div>
	);
}
