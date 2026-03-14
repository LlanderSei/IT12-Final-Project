import React, { useMemo, useState } from "react";
import { useForm } from "@inertiajs/react";
import DataTable from "@/Components/DataTable";
import PageHeader from "@/Components/PageHeader";
import StatusBadge from "@/Components/StatusBadge";
import { Button } from "@/Components/ui/button";
import { 
	Eye, 
	Printer, 
	CheckCircle, 
	XCircle, 
	Search, 
	ArrowUpDown,
	Filter,
	History
} from "lucide-react";
import { exportJobOrderPdf } from "@/utils/saleDocuments";
import usePermissions from "@/hooks/usePermissions";

// Partials
import JobOrderDetailDialog from "./Partials/JobOrderDetailDialog";
import DeliverJobOrderDialog from "./Partials/DeliverJobOrderDialog";
import ConfirmationModal from "@/Components/ConfirmationModal";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;
const formatDateTime = (v) => v ? new Date(v).toLocaleString() : "-";

const plusThirtyDaysISO = () => {
	const date = new Date();
	date.setDate(date.getDate() + 30);
	return date.toISOString().split("T")[0];
};

export default function PendingJobOrders({ rows = [] }) {
	const { requirePermission } = usePermissions();
	
	// Modal States
	const [viewOrder, setViewOrder] = useState(null);
	const [deliverTarget, setDeliverTarget] = useState(null);
	const [cancelTarget, setCancelTarget] = useState(null);

	const deliverForm = useForm({
		paymentSelection: "pay_later",
		paymentType: "full",
		paidAmount: "",
		paymentMethod: "Cash",
		additionalDetails: "",
		dueDate: plusThirtyDaysISO(),
	});

	const cancelForm = useForm({});

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
					<Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary-soft/50" onClick={() => setViewOrder(row.original)}>
						<Eye className="h-4 w-4" />
					</Button>
					<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-accent" onClick={() => {
						if (!requirePermission("CanPrintJobOrders")) return;
						exportJobOrderPdf(row.original);
					}}>
						<Printer className="h-4 w-4" />
					</Button>
					<Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-50" onClick={() => {
						if (!requirePermission("CanProcessSalesJobOrders")) return;
						setDeliverTarget(row.original);
						deliverForm.setData({
							paymentSelection: "pay_later",
							paymentType: "full",
							paidAmount: "",
							paymentMethod: "Cash",
							additionalDetails: "",
							dueDate: plusThirtyDaysISO(),
						});
					}}>
						<CheckCircle className="h-4 w-4" />
					</Button>
					<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => {
						if (!requirePermission("CanCancelJobOrders")) return;
						setCancelTarget(row.original);
					}}>
						<XCircle className="h-4 w-4" />
					</Button>
				</div>
			)
		},
	];

	const submitDeliver = (e) => {
		e.preventDefault();
		if (!deliverTarget) return;
		
		deliverForm.transform((data) => ({
			...data,
			paidAmount: data.paymentSelection === "pay_now" && data.paymentType === "partial" 
				? Number(data.paidAmount) 
				: (data.paymentSelection === "pay_now" ? Number(deliverTarget.TotalAmount) : null),
		}));

		deliverForm.post(route("pos.job-orders.deliver", deliverTarget.ID), {
			onSuccess: () => setDeliverTarget(null),
		});
	};

	const submitCancel = () => {
		if (!cancelTarget) return;
		cancelForm.post(route("pos.job-orders.cancel", cancelTarget.ID), {
			onSuccess: () => setCancelTarget(null),
		});
	};

	return (
		<div className="space-y-6">
			<PageHeader 
				title="Pending Job Orders" 
				description={`${rows.length} orders awaiting delivery.`}
				variant="accent"
				showActions={false}
			/>

			<div className="bg-card rounded-xl border shadow-sm overflow-hidden p-1">
				<DataTable 
					columns={columns} 
					data={rows} 
					searchPlaceholder="Search customer or order no..."
					searchKey="customer.CustomerName"
				/>
			</div>

			<JobOrderDetailDialog 
				open={Boolean(viewOrder)} 
				onOpenChange={() => setViewOrder(null)} 
				order={viewOrder} 
			/>

			<DeliverJobOrderDialog 
				open={Boolean(deliverTarget)} 
				onOpenChange={() => setDeliverTarget(null)} 
				form={deliverForm} 
				total={deliverTarget?.TotalAmount} 
				onConfirm={submitDeliver} 
			/>

			<ConfirmationModal 
				show={Boolean(cancelTarget)} 
				onClose={() => setCancelTarget(null)} 
				onConfirm={submitCancel} 
				title={`Cancel Order #${cancelTarget?.ID}?`}
				message="This will mark the job order as cancelled. This action cannot be undone."
				confirmText="Cancel Order"
				variant="destructive"
				processing={cancelForm.processing}
			/>
		</div>
	);
}
