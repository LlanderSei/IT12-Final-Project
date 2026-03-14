import React, { useState } from "react";
import DataTable from "@/Components/DataTable";
import PageHeader from "@/Components/PageHeader";
import StatusBadge from "@/Components/StatusBadge";
import { Button } from "@/Components/ui/button";
import { Eye, Printer, History } from "lucide-react";
import { exportJobOrderPdf } from "@/utils/saleDocuments";
import usePermissions from "@/hooks/usePermissions";

// Partials
import JobOrderDetailDialog from "./Partials/JobOrderDetailDialog";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;
const formatDateTime = (v) => v ? new Date(v).toLocaleString() : "-";

export default function JobOrdersHistory({ rows = [] }) {
	const { requirePermission } = usePermissions();
	const [viewOrder, setViewOrder] = useState(null);

	const columns = [
		{ 
			header: "Order ID", 
			accessorKey: "ID",
			cell: ({ row }) => <span className="font-bold text-primary-hex">#{row.original.ID}</span>
		},
		{ 
			header: "Customer", 
			accessorKey: "customer.CustomerName",
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
			/>

			<div className="bg-card rounded-xl border shadow-sm overflow-hidden p-1">
				<DataTable 
					columns={columns} 
					data={rows} 
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
