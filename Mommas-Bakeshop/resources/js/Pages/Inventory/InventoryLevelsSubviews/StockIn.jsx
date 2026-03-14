import React, { useEffect, useMemo, useState } from "react";
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
import StockInDetailDialog from "./Partials/StockInDetailDialog";

const formatCurrency = (value) => `PHP ${Number(value || 0).toFixed(2)}`;

const formatDate = (value) => {
	if (!value) return "n/a";
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? "n/a" : d.toLocaleDateString();
};

const formatDateTime = (value) => {
	if (!value) return "n/a";
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? "n/a" : d.toLocaleString();
};

export default function StockIn({ stockIns, onEdit, onHeaderMetaChange, canEdit = false }) {
	const [searchQuery, setSearchQuery] = useState("");
	const [addedByFilter, setAddedByFilter] = useState("all");
	const [supplierFilter, setSupplierFilter] = useState("all");
	const [itemTypeFilter, setItemTypeFilter] = useState("all");
	const [hasPurchaseDateFilter, setHasPurchaseDateFilter] = useState("all");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [minAmount, setMinAmount] = useState("");
	const [maxAmount, setMaxAmount] = useState("");
	const [selectedRecord, setSelectedRecord] = useState(null);

	const records = stockIns || [];

	const addedByOptions = useMemo(
		() => [...new Set(records.map((r) => r.user?.FullName).filter(Boolean))],
		[records],
	);

	const supplierOptions = useMemo(
		() => [...new Set(records.map((r) => r.Supplier).filter(Boolean))],
		[records],
	);

	const resetFilters = () => {
		setSearchQuery("");
		setAddedByFilter("all");
		setSupplierFilter("all");
		setItemTypeFilter("all");
		setHasPurchaseDateFilter("all");
		setDateFrom("");
		setDateTo("");
		setMinAmount("");
		setMaxAmount("");
	};

	const filteredStockIns = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		const from = dateFrom ? new Date(dateFrom) : null;
		const to = dateTo ? new Date(dateTo) : null;
		if (to) to.setHours(23, 59, 59, 999);

		return records.filter((record) => {
			if (query) {
				const matchesQuery =
					record.user?.FullName?.toLowerCase().includes(query) ||
					record.Supplier?.toLowerCase().includes(query) ||
					(record.AdditionalDetails || "").toLowerCase().includes(query) ||
					record.ItemsPurchased?.some((item) =>
						item.ItemName?.toLowerCase().includes(query),
					);
				if (!matchesQuery) return false;
			}

			if (addedByFilter !== "all" && record.user?.FullName !== addedByFilter) return false;
			if (supplierFilter !== "all" && record.Supplier !== supplierFilter) return false;
			
			if (itemTypeFilter !== "all") {
				const hasType = (record.ItemsPurchased || []).some(
					(item) => item.ItemType === itemTypeFilter,
				);
				if (!hasType) return false;
			}

			if (hasPurchaseDateFilter === "with" && !record.PurchaseDate) return false;
			if (hasPurchaseDateFilter === "without" && record.PurchaseDate) return false;

			const created = new Date(record.DateAdded);
			if (from && created < from) return false;
			if (to && created > to) return false;

			const total = Number(record.TotalAmount || 0);
			if (minAmount && total < Number(minAmount)) return false;
			if (maxAmount && total > Number(maxAmount)) return false;

			return true;
		});
	}, [records, searchQuery, addedByFilter, supplierFilter, itemTypeFilter, hasPurchaseDateFilter, dateFrom, dateTo, minAmount, maxAmount]);

	const countLabel = formatCountLabel(filteredStockIns.length, "record");

	useEffect(() => {
		onHeaderMetaChange?.({
			subtitle: "Stock-In History",
			countLabel,
		});
	}, [onHeaderMetaChange, countLabel]);

	const columns = [
		{ 
			header: "Added By", 
			accessorKey: "user.FullName",
			cell: ({ row }) => <span className="font-medium">{row.original.user?.FullName || "Unknown"}</span>
		},
		{ 
			header: "Supplier", 
			accessorKey: "Supplier",
			cell: ({ row }) => <span className="text-muted-foreground">{row.original.Supplier || "-"}</span>
		},
		{ 
			header: "Purchase Date", 
			accessorKey: "PurchaseDate",
			cell: ({ row }) => formatDate(row.original.PurchaseDate)
		},
		{ 
			header: "Reference", 
			cell: ({ row }) => (
				<div className="text-[10px] space-y-0.5 uppercase text-muted-foreground">
					<p>RCP: {row.original.ReceiptNumber || "n/a"}</p>
					<p>INV: {row.original.InvoiceNumber || "n/a"}</p>
				</div>
			)
		},
		{ 
			header: "Qty", 
			accessorKey: "TotalQuantity",
			className: "text-center"
		},
		{ 
			header: "Total Amount", 
			accessorKey: "TotalAmount",
			className: "text-right",
			cell: ({ row }) => <span className="font-bold text-primary">{formatCurrency(row.original.TotalAmount)}</span>
		},
		{ 
			header: "Created", 
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
							placeholder="Search item, supplier, user, notes..." 
							className="pl-9"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Select value={addedByFilter} onValueChange={setAddedByFilter}>
							<SelectTrigger className="w-[160px]">
								<SelectValue placeholder="All Added By" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Added By</SelectItem>
								{addedByOptions.map(name => (
									<SelectItem key={name} value={name}>{name}</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select value={supplierFilter} onValueChange={setSupplierFilter}>
							<SelectTrigger className="w-[160px]">
								<SelectValue placeholder="All Suppliers" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Suppliers</SelectItem>
								{supplierOptions.map(s => (
									<SelectItem key={s} value={s}>{s}</SelectItem>
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
						<span className="text-[10px] uppercase font-bold text-muted-foreground">Amount</span>
						<Input 
							type="number" 
							placeholder="Min" 
							className="w-20 h-9 text-xs" 
							value={minAmount}
							onChange={e => setMinAmount(e.target.value)}
						/>
						<Input 
							type="number" 
							placeholder="Max" 
							className="w-20 h-9 text-xs" 
							value={maxAmount}
							onChange={e => setMaxAmount(e.target.value)}
						/>
					</div>
					<div className="h-6 w-px bg-border hidden sm:block" />
					<Select value={hasPurchaseDateFilter} onValueChange={setHasPurchaseDateFilter}>
						<SelectTrigger className="w-[180px] h-9 text-xs">
							<SelectValue placeholder="Purchase Date: Any" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Purchase Date: Any</SelectItem>
							<SelectItem value="with">With Purchase Date</SelectItem>
							<SelectItem value="without">Without Purchase Date</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="flex-1 min-h-0 bg-card rounded-xl border shadow-sm overflow-hidden p-1">
				<DataTable 
					columns={columns} 
					data={filteredStockIns} 
					searchKey="Supplier"
					showSearch={false}
				/>
			</div>

			<StockInDetailDialog 
				open={Boolean(selectedRecord)} 
				onOpenChange={(open) => !open && setSelectedRecord(null)} 
				record={selectedRecord} 
			/>
		</div>
	);
}
