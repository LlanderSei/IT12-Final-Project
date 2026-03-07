import React from "react";
import { Link } from "@inertiajs/react";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value) => {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString();
};

const formatDate = (value) => {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleDateString();
};

export default function PendingPayments({
	rows = [],
	onView,
	onInvoice,
	canExportInvoices = false,
	sortConfig,
	requestSort,
}) {
	return (
		<table className="min-w-full divide-y divide-gray-200">
			<thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
				<tr>
					<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort?.("Cashier")}>
						<div className="flex items-center">Cashier {sortConfig?.key === "Cashier" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction.toUpperCase()}</span>}</div>
					</th>
					<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort?.("Customer")}>
						<div className="flex items-center">Customer {sortConfig?.key === "Customer" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction.toUpperCase()}</span>}</div>
					</th>
					<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sold Products</th>
					<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort?.("TotalAmount")}>
						<div className="flex items-center">Total Amount {sortConfig?.key === "TotalAmount" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction.toUpperCase()}</span>}</div>
					</th>
					<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort?.("PaymentStatus")}>
						<div className="flex items-center">Payment Status {sortConfig?.key === "PaymentStatus" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction.toUpperCase()}</span>}</div>
					</th>
					<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort?.("PartialPayments")}>
						<div className="flex items-center">Partial Payments {sortConfig?.key === "PartialPayments" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction.toUpperCase()}</span>}</div>
					</th>
					<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort?.("AmountLeft")}>
						<div className="flex items-center">Amount Left {sortConfig?.key === "AmountLeft" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction.toUpperCase()}</span>}</div>
					</th>
					<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort?.("PaymentDueDate")}>
						<div className="flex items-center">Due Date {sortConfig?.key === "PaymentDueDate" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction.toUpperCase()}</span>}</div>
					</th>
					<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort?.("DateAdded")}>
						<div className="flex items-center justify-end">Date Added {sortConfig?.key === "DateAdded" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction.toUpperCase()}</span>}</div>
					</th>
					<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
				</tr>
			</thead>
			<tbody className="bg-white divide-y divide-gray-200">
				{rows.map((sale) => (
					<tr key={sale.ID} className="hover:bg-gray-50 align-top">
						<td className="px-4 py-4 text-sm text-gray-900">
							{sale.UserID ? (
								<Link href={route("admin.users")} className="text-primary hover:underline">
									{sale.user?.FullName || `User #${sale.UserID}`}
								</Link>
							) : (
								"Unknown"
							)}
						</td>
						<td className="px-4 py-4 text-sm text-gray-900">{sale.customer?.CustomerName || "Walk-In"}</td>
						<td className="px-4 py-4 text-sm text-gray-900">
							<div className="w-fit max-w-full overflow-x-auto">
								<table className="min-w-[22rem] text-xs">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-2 py-1 text-left font-semibold text-gray-600">Product</th>
											<th className="px-2 py-1 text-left font-semibold text-gray-600">Qty</th>
											<th className="px-2 py-1 text-left font-semibold text-gray-600">Price</th>
											<th className="px-2 py-1 text-left font-semibold text-gray-600">Subtotal</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-100">
										{(sale.sold_products || []).map((line) => (
											<tr key={line.ID}>
												<td className="px-2 py-1 text-gray-900">{line.product?.ProductName || "-"}</td>
												<td className="px-2 py-1 text-gray-700">{line.Quantity}</td>
												<td className="px-2 py-1 text-gray-700">{currency(line.PricePerUnit)}</td>
												<td className="px-2 py-1 text-gray-700">{currency(line.SubAmount)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</td>
						<td className="px-4 py-4 text-sm font-semibold text-gray-900">{currency(sale.totalAmount)}</td>
						<td className="px-4 py-4 text-sm text-gray-700">{sale.payment?.PaymentStatus || "-"}</td>
						<td className="px-4 py-4 text-sm text-gray-700">{currency(sale.totalPartialPaid)}</td>
						<td className="px-4 py-4 text-sm font-semibold text-gray-900">{currency(sale.amountLeft)}</td>
						<td className="px-4 py-4 text-sm text-gray-700">{formatDate(sale.payment?.PaymentDueDate)}</td>
						<td className="px-4 py-4 text-sm text-gray-500 text-right">{formatDateTime(sale.DateAdded)}</td>
						<td className="px-4 py-4 text-right">
							<div className="flex flex-wrap justify-end gap-2">
								<button
									type="button"
									onClick={() => onView?.(sale)}
									className="rounded border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary-soft"
								>
									View
								</button>
								{canExportInvoices && sale.payment?.InvoiceNumber && (
									<button
										type="button"
										onClick={() => onInvoice?.(sale)}
										className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
									>
										Invoice
									</button>
								)}
							</div>
						</td>
					</tr>
				))}
				{rows.length === 0 && (
					<tr>
						<td colSpan="10" className="px-6 py-4 text-center text-sm text-gray-500">
							No pending payments found.
						</td>
					</tr>
				)}
			</tbody>
		</table>
	);
}
