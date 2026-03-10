import React, { useMemo, useState } from "react";
import { useForm } from "@inertiajs/react";
import Modal from "@/Components/Modal";
import usePermissions from "@/hooks/usePermissions";
import { exportJobOrderPdf } from "@/utils/saleDocuments";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value) => {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString();
};

const plusThirtyDaysISO = () => {
	const date = new Date();
	date.setDate(date.getDate() + 30);
	return date.toISOString().split("T")[0];
};

export default function PendingJobOrders({ rows = [] }) {
	const { requirePermission } = usePermissions();
	const [selectedJobOrder, setSelectedJobOrder] = useState(null);
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

	const totalAmount = useMemo(() => {
		if (!deliverTarget) return 0;
		return Number(deliverTarget.TotalAmount || 0);
	}, [deliverTarget]);

	const openDeliverModal = (jobOrder) => {
		if (!requirePermission("CanProcessSalesJobOrders")) return;
		setDeliverTarget(jobOrder);
		deliverForm.setData({
			paymentSelection: "pay_later",
			paymentType: "full",
			paidAmount: "",
			paymentMethod: "Cash",
			additionalDetails: "",
			dueDate: plusThirtyDaysISO(),
		});
		deliverForm.clearErrors();
	};

	const closeDeliverModal = () => {
		setDeliverTarget(null);
	};

	const submitDeliver = (e) => {
		e.preventDefault();
		if (!deliverTarget) return;
		if (!requirePermission("CanProcessSalesJobOrders")) return;

		deliverForm.transform((data) => ({
			...data,
			paidAmount:
				data.paymentSelection === "pay_now" && data.paymentType === "partial"
					? Number(data.paidAmount)
					: data.paymentSelection === "pay_now"
						? Number(totalAmount)
						: null,
		}));
		deliverForm.post(route("pos.job-orders.deliver", deliverTarget.ID), {
			preserveScroll: true,
			onSuccess: () => {
				closeDeliverModal();
			},
		});
	};

	const openCancelModal = (jobOrder) => {
		if (!requirePermission("CanCancelJobOrders")) return;
		setCancelTarget(jobOrder);
		cancelForm.clearErrors();
	};

	const closeCancelModal = () => {
		setCancelTarget(null);
	};

	const submitCancel = () => {
		if (!cancelTarget) return;
		if (!requirePermission("CanCancelJobOrders")) return;
		cancelForm.post(route("pos.job-orders.cancel", cancelTarget.ID), {
			preserveScroll: true,
			onSuccess: () => {
				closeCancelModal();
			},
		});
	};

	return (
		<div className="h-full bg-white rounded-lg border border-gray-200 p-4 md:p-6">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-base font-semibold text-gray-800">
					Pending Job Orders
				</h3>
				<div className="text-sm text-gray-500">{rows.length} pending</div>
			</div>

			<div className="border rounded-lg border-gray-200 overflow-x-auto">
				<table className="min-w-full text-sm">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
								ID
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
								Customer
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
								Delivery
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
								Total
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
								Status
							</th>
							<th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-200 bg-white">
						{rows.map((row) => (
							<tr key={row.ID}>
								<td className="px-3 py-2 text-gray-700">#{row.ID}</td>
								<td className="px-3 py-2 text-gray-700">
									{row.customer?.CustomerName || "-"}
								</td>
								<td className="px-3 py-2 text-gray-700">
									{formatDateTime(row.DeliveryAt)}
								</td>
								<td className="px-3 py-2 text-gray-700">
									{currency(row.TotalAmount)}
								</td>
								<td className="px-3 py-2 text-gray-700">{row.Status}</td>
								<td className="px-3 py-2 text-right">
									<div className="inline-flex gap-2">
										<button
											type="button"
											onClick={() => setSelectedJobOrder(row)}
											className="rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
										>
											View
										</button>
										<button
											type="button"
											onClick={() => {
												if (!requirePermission("CanPrintJobOrders")) return;
												exportJobOrderPdf(row);
											}}
											className="rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
										>
											Print Invoice
										</button>
										<button
											type="button"
											onClick={() => openDeliverModal(row)}
											className="rounded bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-hover"
										>
											Mark Delivered
										</button>
										<button
											type="button"
											onClick={() => openCancelModal(row)}
											className="rounded border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
										>
											Cancel
										</button>
									</div>
								</td>
							</tr>
						))}
						{rows.length === 0 && (
							<tr>
								<td colSpan="6" className="px-4 py-6 text-center text-gray-500">
									No pending job orders.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			<Modal
				show={Boolean(selectedJobOrder)}
				onClose={() => setSelectedJobOrder(null)}
				maxWidth="2xl"
			>
				{selectedJobOrder && (
					<div className="p-6 max-h-[80vh] overflow-y-auto">
						<h3 className="text-lg font-semibold text-gray-900 mb-2">
							Job Order #{selectedJobOrder.ID}
						</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
							<div>
								<span className="font-semibold text-gray-700">Customer:</span>{" "}
								{selectedJobOrder.customer?.CustomerName || "-"}
							</div>
							<div>
								<span className="font-semibold text-gray-700">Delivery:</span>{" "}
								{formatDateTime(selectedJobOrder.DeliveryAt)}
							</div>
							<div>
								<span className="font-semibold text-gray-700">Status:</span>{" "}
								{selectedJobOrder.Status}
							</div>
							<div>
								<span className="font-semibold text-gray-700">Total:</span>{" "}
								{currency(selectedJobOrder.TotalAmount)}
							</div>
						</div>
						{selectedJobOrder.Notes && (
							<p className="mt-2 text-sm text-gray-600">
								Notes: {selectedJobOrder.Notes}
							</p>
						)}

						<div className="mt-4">
							<h4 className="text-sm font-semibold text-gray-700 mb-2">
								Products
							</h4>
							<div className="max-h-48 overflow-y-auto rounded border border-gray-200">
								<table className="min-w-full text-sm">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
												Product
											</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
												Qty
											</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
												Price
											</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
												Subtotal
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200 bg-white">
										{(selectedJobOrder.items || []).map((line) => (
											<tr key={line.ID}>
												<td className="px-3 py-2 text-gray-900">
													{line.ProductName || "-"}
												</td>
												<td className="px-3 py-2 text-gray-700">
													{line.Quantity}
												</td>
												<td className="px-3 py-2 text-gray-700">
													{currency(line.PricePerUnit)}
												</td>
												<td className="px-3 py-2 text-gray-700">
													{currency(line.SubAmount)}
												</td>
											</tr>
										))}
										{(selectedJobOrder.items || []).length === 0 && (
											<tr>
												<td
													colSpan="4"
													className="px-3 py-3 text-center text-gray-500"
												>
													No products recorded.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>

						<div className="mt-4">
							<h4 className="text-sm font-semibold text-gray-700 mb-2">
								Custom Orders
							</h4>
							<div className="max-h-48 overflow-y-auto rounded border border-gray-200">
								<table className="min-w-full text-sm">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
												Description
											</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
												Qty
											</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
												Price
											</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
												Subtotal
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200 bg-white">
										{(selectedJobOrder.custom_items || []).map((line) => (
											<tr key={line.ID}>
												<td className="px-3 py-2 text-gray-900">
													{line.CustomOrderDescription || "-"}
												</td>
												<td className="px-3 py-2 text-gray-700">
													{line.Quantity}
												</td>
												<td className="px-3 py-2 text-gray-700">
													{currency(line.PricePerUnit)}
												</td>
												<td className="px-3 py-2 text-gray-700">
													{currency(
														Number(line.Quantity || 0) *
															Number(line.PricePerUnit || 0),
													)}
												</td>
											</tr>
										))}
										{(selectedJobOrder.custom_items || []).length === 0 && (
											<tr>
												<td
													colSpan="4"
													className="px-3 py-3 text-center text-gray-500"
												>
													No custom orders recorded.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>
						<div className="mt-6 flex justify-end">
							<button
								type="button"
								onClick={() => setSelectedJobOrder(null)}
								className="px-4 py-2 text-sm rounded-md border border-primary bg-white text-primary hover:bg-primary-soft"
							>
								Close
							</button>
						</div>
					</div>
				)}
			</Modal>

			<Modal show={Boolean(deliverTarget)} onClose={closeDeliverModal} maxWidth="lg">
				{deliverTarget && (
					<form onSubmit={submitDeliver} className="p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">
							Deliver Job Order #{deliverTarget.ID}
						</h3>
						<div className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Payment Selection
									</label>
									<select
										value={deliverForm.data.paymentSelection}
										onChange={(e) =>
											deliverForm.setData(
												"paymentSelection",
												e.target.value,
											)
										}
										className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
									>
										<option value="pay_later">Pay Later</option>
										<option value="pay_now">Pay Now</option>
									</select>
								</div>
								{deliverForm.data.paymentSelection === "pay_now" && (
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Payment Type
										</label>
										<select
											value={deliverForm.data.paymentType}
											onChange={(e) =>
												deliverForm.setData("paymentType", e.target.value)
											}
											className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
										>
											<option value="full">Full Payment</option>
											<option value="partial">Partial Payment</option>
										</select>
									</div>
								)}
							</div>

							{deliverForm.data.paymentSelection === "pay_now" &&
								deliverForm.data.paymentType === "partial" && (
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Amount Paid
										</label>
										<input
											type="number"
											step="0.01"
											min="0"
											value={deliverForm.data.paidAmount}
											onChange={(e) =>
												deliverForm.setData("paidAmount", e.target.value)
											}
											className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
										/>
										{deliverForm.errors.paidAmount && (
											<p className="mt-1 text-sm text-red-600">
												{deliverForm.errors.paidAmount}
											</p>
										)}
									</div>
								)}

							{(deliverForm.data.paymentSelection === "pay_later" ||
								(deliverForm.data.paymentSelection === "pay_now" &&
									deliverForm.data.paymentType === "partial")) && (
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Due Date
									</label>
									<input
										type="date"
										value={deliverForm.data.dueDate}
										onChange={(e) =>
											deliverForm.setData("dueDate", e.target.value)
										}
										className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
									/>
									{deliverForm.errors.dueDate && (
										<p className="mt-1 text-sm text-red-600">
											{deliverForm.errors.dueDate}
										</p>
									)}
								</div>
							)}

							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Payment Method
									</label>
									<select
										value={deliverForm.data.paymentMethod}
										onChange={(e) =>
											deliverForm.setData("paymentMethod", e.target.value)
										}
										className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
									>
										<option value="Cash">Cash</option>
										<option value="GCash">GCash</option>
										<option value="Bank Transfer">Bank Transfer</option>
										<option value="Card">Card</option>
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Total Amount
									</label>
									<div className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50">
										{currency(totalAmount)}
									</div>
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Additional Details
								</label>
								<input
									type="text"
									value={deliverForm.data.additionalDetails}
									onChange={(e) =>
										deliverForm.setData("additionalDetails", e.target.value)
									}
									placeholder="Reference no., notes, etc. (optional)"
									className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
								/>
							</div>
						</div>
						<div className="mt-6 flex justify-end gap-2">
							<button
								type="button"
								onClick={closeDeliverModal}
								className="px-4 py-2 text-sm rounded-md border border-primary bg-white text-primary hover:bg-primary-soft"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={deliverForm.processing}
								className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
							>
								Confirm Delivery
							</button>
						</div>
					</form>
				)}
			</Modal>

			<Modal show={Boolean(cancelTarget)} onClose={closeCancelModal} maxWidth="md">
				{cancelTarget && (
					<div className="p-6">
						<h3 className="text-lg font-semibold text-gray-900">
							Cancel Job Order #{cancelTarget.ID}
						</h3>
						<p className="mt-2 text-sm text-gray-600">
							This will mark the job order as cancelled. You can not deliver it
							afterwards.
						</p>
						<div className="mt-6 flex justify-end gap-2">
							<button
								type="button"
								onClick={closeCancelModal}
								className="rounded-md border border-primary bg-white px-4 py-2 text-sm text-primary hover:bg-primary-soft"
							>
								Close
							</button>
							<button
								type="button"
								onClick={submitCancel}
								disabled={cancelForm.processing}
								className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
							>
								Cancel Job Order
							</button>
						</div>
					</div>
				)}
			</Modal>
		</div>
	);
}
