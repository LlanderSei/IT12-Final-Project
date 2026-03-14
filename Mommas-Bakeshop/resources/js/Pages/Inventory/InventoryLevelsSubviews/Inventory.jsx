import React, { useMemo, useState, useEffect } from "react";
import DataTable from "@/Components/DataTable";
import StatusBadge from "@/Components/StatusBadge";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { 
	Select, 
	SelectContent, 
	SelectItem, 
	SelectTrigger, 
	SelectValue 
} from "@/Components/ui/select";
import { Search, RotateCcw, Edit2 } from "lucide-react";
import { formatCountLabel } from "@/utils/countLabel";

export default function Inventory({ inventory, onEdit, getStatus, onHeaderMetaChange, canEdit = false }) {
	const [searchQuery, setSearchQuery] = useState("");
	const [typeFilter, setTypeFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [measurementFilter, setMeasurementFilter] = useState("all");
	const [minQty, setMinQty] = useState("");
	const [maxQty, setMaxQty] = useState("");

	const resetFilters = () => {
		setSearchQuery("");
		setTypeFilter("all");
		setStatusFilter("all");
		setMeasurementFilter("all");
		setMinQty("");
		setMaxQty("");
	};

	const typeOptions = useMemo(
		() => [...new Set((inventory || []).map((item) => item.ItemType).filter(Boolean))],
		[inventory],
	);

	const measurementOptions = useMemo(
		() => [...new Set((inventory || []).map((item) => item.Measurement).filter(Boolean))],
		[inventory],
	);

	const filteredItems = useMemo(() => {
		let items = [...(inventory || [])];

		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			items = items.filter((item) => {
				const status = getStatus(item).toLowerCase();
				return (
					item.ItemName.toLowerCase().includes(query) ||
					(item.ItemDescription && item.ItemDescription.toLowerCase().includes(query)) ||
					item.ItemType.toLowerCase().includes(query) ||
					item.Measurement.toLowerCase().includes(query) ||
					status.includes(query)
				);
			});
		}

		if (typeFilter !== "all") {
			items = items.filter((item) => item.ItemType === typeFilter);
		}

		if (measurementFilter !== "all") {
			items = items.filter((item) => item.Measurement === measurementFilter);
		}

		if (statusFilter !== "all") {
			items = items.filter((item) => {
				const status = getStatus(item);
				if (statusFilter === "on_stock") return status === "On Stock";
				if (statusFilter === "low_stock") return status === "Low Stock";
				if (statusFilter === "no_stock") return status === "No Stock";
				return true;
			});
		}

		const min = Number(minQty);
		const max = Number(maxQty);
		if (String(minQty).trim() !== "" && !Number.isNaN(min)) {
			items = items.filter((item) => Number(item.Quantity) >= min);
		}
		if (String(maxQty).trim() !== "" && !Number.isNaN(max)) {
			items = items.filter((item) => Number(item.Quantity) <= max);
		}

		return items;
	}, [inventory, searchQuery, typeFilter, statusFilter, measurementFilter, minQty, maxQty, getStatus]);

	const countLabel = formatCountLabel(filteredItems.length, "item");

	useEffect(() => {
		onHeaderMetaChange?.({
			subtitle: "Raw Materials & Supplies",
			countLabel,
		});
	}, [onHeaderMetaChange, countLabel]);

	const columns = [
		{ 
			header: "Item Name", 
			accessorKey: "ItemName",
			className: "font-semibold text-foreground uppercase tracking-tight"
		},
		{ 
			header: "Description", 
			accessorKey: "ItemDescription",
			cell: ({ row }) => <span className="text-muted-foreground truncate max-w-[200px] block">{row.original.ItemDescription || "-"}</span>
		},
		{ header: "Type", accessorKey: "ItemType" },
		{ header: "Unit", accessorKey: "Measurement" },
		{ 
			header: "Low Threshold", 
			accessorKey: "LowCountThreshold",
			className: "text-center"
		},
		{ 
			header: "Quantity", 
			accessorKey: "Quantity",
			className: "text-center",
			cell: ({ row }) => <span className="font-bold text-base">{row.original.Quantity}</span>
		},
		{ 
			header: "Status", 
			cell: ({ row }) => <StatusBadge status={getStatus(row.original)} />
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
						onClick={() => onEdit(row.original)}
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
			<div className="flex flex-wrap items-center gap-3 bg-card p-4 rounded-xl border shadow-sm">
				<div className="relative flex-1 min-w-[240px]">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input 
						placeholder="Search by name, type, description..." 
						className="pl-9"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Select value={typeFilter} onValueChange={setTypeFilter}>
						<SelectTrigger className="w-[140px]">
							<SelectValue placeholder="All Types" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Types</SelectItem>
							{typeOptions.map(type => (
								<SelectItem key={type} value={type}>{type}</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select value={measurementFilter} onValueChange={setMeasurementFilter}>
						<SelectTrigger className="w-[120px]">
							<SelectValue placeholder="All Units" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Units</SelectItem>
							{measurementOptions.map(m => (
								<SelectItem key={m} value={m}>{m}</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="w-[140px]">
							<SelectValue placeholder="All Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Status</SelectItem>
							<SelectItem value="on_stock">On Stock</SelectItem>
							<SelectItem value="low_stock">Low Stock</SelectItem>
							<SelectItem value="no_stock">No Stock</SelectItem>
						</SelectContent>
					</Select>

					<div className="flex items-center gap-1 border rounded-md px-2 bg-background">
						<span className="text-[10px] uppercase font-bold text-muted-foreground">Qty</span>
						<Input 
							type="number" 
							placeholder="Min" 
							className="w-16 h-8 border-none bg-transparent text-xs p-1 focus-visible:ring-0" 
							value={minQty}
							onChange={e => setMinQty(e.target.value)}
						/>
						<span className="text-muted-foreground">-</span>
						<Input 
							type="number" 
							placeholder="Max" 
							className="w-16 h-8 border-none bg-transparent text-xs p-1 focus-visible:ring-0" 
							value={maxQty}
							onChange={e => setMaxQty(e.target.value)}
						/>
					</div>

					<Button variant="outline" size="icon" onClick={resetFilters}>
						<RotateCcw className="h-4 w-4" />
					</Button>
				</div>
			</div>

			<div className="flex-1 min-h-0 bg-card rounded-xl border shadow-sm overflow-hidden p-1">
				<DataTable 
					columns={columns} 
					data={filteredItems} 
					searchKey="ItemName"
					showSearch={false}
				/>
			</div>
		</div>
	);
}
