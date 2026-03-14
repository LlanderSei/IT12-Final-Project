import React, { useMemo, useState, useEffect } from "react";
import DataTable from "@/Components/DataTable";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { 
	Select, 
	SelectContent, 
	SelectItem, 
	SelectTrigger, 
	SelectValue 
} from "@/Components/ui/select";
import { Search, RotateCcw, Eye, Edit2, Calendar as CalendarIcon } from "lucide-react";
import { formatCountLabel } from "@/utils/countLabel";
import StockOutDetailDialog from "./Partials/StockOutDetailDialog";

const formatDateTime = (value) => {
	if (!value) return "n/a";
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? "n/a" : d.toLocaleString();
};

export default function StockOut({ stockOuts, onEdit, onHeaderMetaChange, canEdit = false }) {
	const [searchQuery, setSearchQuery] = useState("");
	const [usedByFilter, setUsedByFilter] = useState("all");
	const [reasonFilter, setReasonFilter] = useState("all");
	const [itemTypeFilter, setItemTypeFilter] = useState("all");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [minQty, setMinQty] = useState("");
	const [maxQty, setMaxQty] = useState("");
	const [selectedRecord, setSelectedRecord] = useState(null);

	const records = stockOuts || [];

	const usedByOptions = useMemo(
		() => [...new Set(records.map((r) => r.user?.FullName).filter(Boolean))],
		[records],
	);

	const reasonOptions = useMemo(
		() => [...new Set(records.map((r) => (r.Reason || "").split(" | ")[0].trim()).filter(Boolean))],
		[records],
	);

	const resetFilters = () => {
		setSearchQuery("");
		setUsedByFilter("all");
		setReasonFilter("all");
		setItemTypeFilter("all");
		setDateFrom("");
		setDateTo("");
		setMinQty("");
		setMaxQty("");
	};

	const filteredStockOuts = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		const from = dateFrom ? new Date(dateFrom) : null;
		const to = dateTo ? new Date(dateTo) : null;
		if (to) to.setHours(23, 59, 59, 999);

		return records.filter((record) => {
			if (query) {
				const matchesQuery =
					record.user?.FullName?.toLowerCase().includes(query) ||
					String(record.Reason || "").toLowerCase().includes(query) ||
					record.ItemsUsed?.some((item) => item.ItemName?.toLowerCase().includes(query));
				if (!matchesQuery) return false;
			}

			if (usedByFilter !== "all" && record.user?.FullName !== usedByFilter) return false;
			
			if (reasonFilter !== "all") {
				const reasonType = String(record.Reason || "").split(" | ")[0].trim();
				if (reasonType !== reasonFilter) return false;
			}

			if (itemTypeFilter !== "all") {
				const hasType = (record.ItemsUsed || []).some(
					(item) => item.ItemType === itemTypeFilter,
				);
				if (!hasType) return false;
			}

			const created = new Date(record.DateAdded);
			if (from && created < from) return false;
			if (to && created > to) return false;

			const totalQty = Number(record.TotalQuantity || 0);
			if (minQty && totalQty < Number(minQty)) return false;
			if (maxQty && totalQty > Number(maxQty)) return false;

			return true;
		});
	}, [records, searchQuery, usedByFilter, reasonFilter, itemTypeFilter, dateFrom, dateTo, minQty, maxQty]);

	const countLabel = formatCountLabel(filteredStockOuts.length, "record");

	useEffect(() => {
		onHeaderMetaChange?.({
			subtitle: "Stock-Out History",
			countLabel,
		});
	}, [onHeaderMetaChange, countLabel]);

	const columns = [
		{ 
			header: "Used By", 
			accessorKey: "user.FullName",
			cell: ({ row }) => <span className="font-medium">{row.original.user?.FullName || "Unknown"}</span>
		},
		{ 
			header: "Items Used", 
			cell: ({ row }) => (
				<div className="text-xs space-y-0.5">
					{(row.original.ItemsUsed || []).slice(0, 2).map((item, idx) => (
						<div key={idx}>{item.ItemName} <span className="text-muted-foreground">x{item.QuantityRemoved}</span></div>
					))}
					{(row.original.ItemsUsed || []).length > 2 && (
						<div className="text-primary font-bold">+ {(row.original.ItemsUsed || []).length - 2} more items</div>
					)}
				</div>
			)
		},
		{ 
			header: "Total Qty", 
			accessorKey: "TotalQuantity",
			className: "text-center font-bold"
		},
		{ 
			header: "Reason", 
			accessorKey: "Reason",
			cell: ({ row }) => {
				const [type, note] = (row.original.Reason || "").split(" | ");
				return (
					<div className="text-xs">
						<span className="font-bold">{type || "-"}</span>
						{note && <p className="text-muted-foreground italic truncate max-w-[150px]">{note}</p>}
					</div>
				);
			}
		},
		{ 
			header: "Date Used", 
			accessorKey: "DateAdded",
			cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDateTime(row.original.DateAdded)}</span>
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
						onClick={() => setSelectedRecord(row.original)}
					>
						<Eye className="h-4 w-4" />
					</Button>
					<Button 
						variant="ghost" 
						size="icon" 
						className="h-8 w-8 text-primary hover:bg-primary-soft" 
						onClick={() => onEdit?.(row.original)}
						disabled={!canEdit}
					>
						<Edit2 className="h-4 w-4" />
					</Button>
				</div>
			)
		},
	];

	return (
		<div className="flex flex-col flex-1 overflow-hidden space-y-4">
			<div className="flex flex-col gap-4 bg-card p-4 rounded-xl border shadow-sm">
				<div className="flex flex-wrap items-center gap-3">
					<div className="relative flex-1 min-w-[280px]">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input 
							placeholder="Search item, user, reason..." 
							className="pl-9"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Select value={usedByFilter} onValueChange={setUsedByFilter}>
							<SelectTrigger className="w-[160px]">
								<SelectValue placeholder="All Used By" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Used By</SelectItem>
								{usedByOptions.map(name => (
									<SelectItem key={name} value={name}>{name}</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select value={reasonFilter} onValueChange={setReasonFilter}>
							<SelectTrigger className="w-[160px]">
								<SelectValue placeholder="All Reasons" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Reasons</SelectItem>
								{reasonOptions.map(r => (
									<SelectItem key={r} value={r}>{r}</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
							<SelectTrigger className="w-[140px]">
								<SelectValue placeholder="All Item Types" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Item Types</SelectItem>
								<SelectItem value="Inventory">Inventory</SelectItem>
								<SelectItem value="Product">Product</SelectItem>
							</SelectContent>
						</Select>

						<Button variant="outline" size="icon" onClick={resetFilters}>
							<RotateCcw className="h-4 w-4" />
						</Button>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-3 border-t pt-4">
					<div className="flex items-center gap-2">
						<CalendarIcon className="h-4 w-4 text-muted-foreground" />
						<Input type="date" className="w-[140px] h-9 text-xs" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
						<span className="text-muted-foreground">~</span>
						<Input type="date" className="w-[140px] h-9 text-xs" value={dateTo} onChange={e => setDateTo(e.target.value)} />
					</div>
					<div className="h-6 w-px bg-border hidden sm:block" />
					<div className="flex items-center gap-2">
						<span className="text-[10px] uppercase font-bold text-muted-foreground">Quantity</span>
						<Input 
							type="number" 
							placeholder="Min" 
							className="w-20 h-9 text-xs" 
							value={minQty}
							onChange={e => setMinQty(e.target.value)}
						/>
						<Input 
							type="number" 
							placeholder="Max" 
							className="w-20 h-9 text-xs" 
							value={maxQty}
							onChange={e => setMaxQty(e.target.value)}
						/>
					</div>
				</div>
			</div>

			<div className="flex-1 min-h-0 bg-card rounded-xl border shadow-sm overflow-hidden p-1">
				<DataTable 
					columns={columns} 
					data={filteredStockOuts} 
					searchKey="UsedBy"
					showSearch={false}
				/>
			</div>

			<StockOutDetailDialog 
				open={Boolean(selectedRecord)} 
				onOpenChange={(open) => !open && setSelectedRecord(null)} 
				record={selectedRecord} 
			/>
		</div>
	);
}
