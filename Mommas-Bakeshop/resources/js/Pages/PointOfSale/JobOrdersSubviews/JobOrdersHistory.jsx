import React, { useState } from "react";
import Modal from "@/Components/Modal";
import { exportJobOrderPdf } from "@/utils/saleDocuments";
import usePermissions from "@/hooks/usePermissions";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value) => {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString();
};

export default function JobOrdersHistory({ rows = [] }) {
	const { requirePermission } = usePermissions();
	const [selectedJobOrder, setSelectedJobOrder] = useState(null);

	return (
		<div className="h-full bg-white rounded-lg border border-gray-200 p-4 md:p-6">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-base font-semibold text-gray-800">
					Job Orders History
				</h3>
				<div className="text-sm text-gray-500">{rows.length} records</div>
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
											Print Summary
										</button>
									</div>
								</td>
							</tr>
						))}
						{rows.length === 0 && (
							<tr>
								<td colSpan="6" className="px-4 py-6 text-center text-gray-500">
									No job order history yet.
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
		</div>
	);
}
