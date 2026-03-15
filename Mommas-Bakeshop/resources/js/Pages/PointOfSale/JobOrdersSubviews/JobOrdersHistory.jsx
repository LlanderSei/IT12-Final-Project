import React, { useMemo, useState, useEffect } from "react";
import DataTable from "@/Components/DataTable";
import PageHeader from "@/Components/PageHeader";
import StatusBadge from "@/Components/StatusBadge";
import { Button } from "@/Components/ui/button";
import { Eye, Printer, RotateCcw } from "lucide-react";
import { exportJobOrderPdf } from "@/utils/saleDocuments";
import usePermissions from "@/hooks/usePermissions";
import { formatCountLabel } from "@/utils/countLabel";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/Components/ui/select";

// Partials
import JobOrderDetailDialog from "./Partials/JobOrderDetailDialog";

const currency = (value) => `₱${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const formatDateTime = (v) => v ? new Date(v).toLocaleString() : "-";

export default function JobOrdersHistory({ rows = [], onHeaderMetaChange }) {
	const { requirePermission } = usePermissions();
	const [viewOrder, setViewOrder] = useState(null);
	const [statusFilter, setStatusFilter] = useState("all");

	const filteredRows = useMemo(() => {
		if (statusFilter === "all") return rows;
		return rows.filter(row => row.Status === statusFilter);
	}, [rows, statusFilter]);

	useEffect(() => {
		if (typeof onHeaderMetaChange === "function") {
			onHeaderMetaChange({
				subtitle: "Job Order History",
				countLabel: formatCountLabel(filteredRows.length, "archived order"),
			});
		}
	}, [filteredRows.length, onHeaderMetaChange]);

	const columns = [
		{ 
			header: "Order ID", 
			accessorKey: "ID",
			cell: ({ row }) => <span className="font-bold text-primary-hex">#{row.original.ID}</span>
		},
		{ 
			header: "Customer", 
			accessorKey: "customer.CustomerName",
			accumulate: true, // For searching nested property
			cell: ({ row }) => <span className="font-medium text-foreground">{row.original.customer?.CustomerName || "-"}</span>
		},
		{ 
			header: "Delivery Date", 
			accessorKey: "DeliveryAt",
			cell: ({ row }) => <span className="text-muted-foreground">{formatDateTime(row.original.DeliveryAt)}</span>
		},
		{ 
			header: "Total Amount", 
			accessorKey: "TotalAmount",
			cell: ({ row }) => <span className="font-bold text-foreground">{currency(row.original.TotalAmount)}</span>
		},
		{ 
			header: "Status", 
			accessorKey: "Status",
			cell: ({ row }) => <StatusBadge status={row.original.Status} />
		},
		{ 
			id: "actions",
			header: () => <div className="text-right">Actions</div>,
			cell: ({ row }) => (
				<div className="flex justify-end gap-1">
					<Button 
						variant="ghost" 
						size="icon" 
						className="h-8 w-8 text-primary hover:bg-primary-soft/50" 
						onClick={() => setViewOrder(row.original)}
					>
						<Eye className="h-4 w-4" />
					</Button>
					<Button 
						variant="ghost" 
						size="icon" 
						className="h-8 w-8 text-muted-foreground hover:bg-accent" 
						onClick={() => {
							if (!requirePermission("CanPrintJobOrders")) return;
							exportJobOrderPdf(row.original);
						}}
					>
						<Printer className="h-4 w-4" />
					</Button>
				</div>
			)
		},
	];

	return (
		<div className="space-y-6">
			<PageHeader 
				title="Job Order History" 
				description={`${rows.length} archived orders and completions.`}
				variant="accent"
				showActions={false}
			>
				<div className="flex items-center gap-2 bg-muted/40 p-2 rounded-2xl border shadow-inner">
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="w-44 border-none bg-transparent h-8 font-black text-[10px] uppercase tracking-widest">
							<SelectValue placeholder="All Statuses" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Statuses</SelectItem>
							<SelectItem value="Delivered">Delivered</SelectItem>
							<SelectItem value="Cancelled">Cancelled</SelectItem>
						</SelectContent>
					</Select>
					<Button 
						variant="ghost" 
						size="icon" 
						className="h-8 w-8 text-muted-foreground hover:text-primary transition-all rounded-lg"
						onClick={() => setStatusFilter("all")}
					>
						<RotateCcw className="h-4 w-4" />
					</Button>
				</div>
			</PageHeader>

			<div className="bg-card rounded-xl border shadow-sm overflow-hidden p-1">
				<DataTable 
					columns={columns} 
					data={filteredRows} 
					searchPlaceholder="Search archived orders..."
					searchKey="customer.CustomerName"
				/>
			</div>

			<JobOrderDetailDialog 
				open={Boolean(viewOrder)} 
				onOpenChange={() => setViewOrder(null)} 
				order={viewOrder} 
			/>
		</div>
	);
}
