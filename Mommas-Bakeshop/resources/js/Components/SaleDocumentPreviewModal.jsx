import React from "react";
import Modal from "@/Components/Modal";
import {
	currency,
	exportInvoicePdf,
	exportReceiptPdf,
	formatDateTime,
	getCustomOrderLines,
	getSoldLines,
} from "@/utils/saleDocuments";
import { getReceiptAmountReceived } from "@/utils/paymentFlow";

export default function SaleDocumentPreviewModal({
	show = false,
	onClose,
	sale = null,
	type = "invoice",
	receiptPayment = null,
	canExport = false,
}) {
	if (!sale) return null;

	const isInvoice = type === "invoice";
	const isJobOrderInvoice = isInvoice && sale.SaleType === "JobOrder";
	const lines = [
		...getSoldLines(sale).map((line) => ({
			label: line.product?.ProductName || "-",
			quantity: Number(line.Quantity || 0),
			pricePerUnit: Number(line.PricePerUnit || 0),
			subtotal: Number(line.SubAmount || 0),
		})),
		...getCustomOrderLines(sale).map((line) => ({
			label: line.CustomOrderDescription || "-",
			quantity: Number(line.Quantity || 0),
			pricePerUnit: Number(line.PricePerUnit || 0),
			subtotal: Number(line.Quantity || 0) * Number(line.PricePerUnit || 0),
		})),
	];

	const documentNumber = isInvoice
		? sale.payment?.InvoiceNumber
		: receiptPayment?.ReceiptNumber || sale.payment?.ReceiptNumber;
	const issuedAt = isInvoice
		? sale.payment?.InvoiceIssuedAt || sale.DateAdded
		: receiptPayment?.ReceiptIssuedAt ||
			receiptPayment?.DateAdded ||
			sale.payment?.ReceiptIssuedAt ||
			sale.payment?.DateAdded ||
			sale.DateAdded;
	const paidThisDocument = isInvoice
		? Number(sale.paidAmount || 0)
		: getReceiptAmountReceived(receiptPayment || sale.payment);
	const partialPayments = sale.partial_payments || [];

	const handleExport = () => {
		if (!canExport) return;
		if (isInvoice) {
			exportInvoicePdf(sale);
			return;
		}
		exportReceiptPdf(sale, receiptPayment);
	};

	return (
		<Modal show={show} onClose={onClose} maxWidth="4xl">
			<div className="p-6 max-h-[85vh] overflow-y-auto">
				<div className="rounded-lg bg-primary px-5 py-4 text-white">
					<p className="text-lg font-semibold">Momma&apos;s Bakeshop</p>
					<p className="text-sm opacity-90">
						{isInvoice ? "Job Order Invoice Preview" : "Payment Receipt Preview"}
					</p>
				</div>

				<div className="mt-4 flex flex-wrap items-start justify-between gap-4">
					<div>
						<h3 className="text-lg font-semibold text-gray-900">
							{isInvoice ? "Invoice" : "Receipt"}
						</h3>
						<p className="text-sm text-gray-500">
							{documentNumber || "Document number pending"}
						</p>
					</div>
					{canExport && documentNumber && (
						<button
							type="button"
							onClick={handleExport}
							className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
						>
							Download PDF
						</button>
					)}
				</div>

				<div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
					<div>
						<span className="font-semibold text-gray-700">Sale Type:</span>{" "}
						<span className="text-gray-900">{sale.SaleType || "-"}</span>
					</div>
					<div>
						<span className="font-semibold text-gray-700">Sale ID:</span>{" "}
						<span className="text-gray-900">#{sale.ID}</span>
					</div>
					<div>
						<span className="font-semibold text-gray-700">Customer:</span>{" "}
						<span className="text-gray-900">
							{sale.customer?.CustomerName || "Walk-In"}
						</span>
					</div>
					<div>
						<span className="font-semibold text-gray-700">Cashier:</span>{" "}
						<span className="text-gray-900">{sale.user?.FullName || "Unknown"}</span>
					</div>
					<div>
						<span className="font-semibold text-gray-700">Issued At:</span>{" "}
						<span className="text-gray-900">{formatDateTime(issuedAt)}</span>
					</div>
					<div>
						<span className="font-semibold text-gray-700">Status:</span>{" "}
						<span className="text-gray-900">{sale.payment?.PaymentStatus || "-"}</span>
					</div>
					<div>
						<span className="font-semibold text-gray-700">Payment Method:</span>{" "}
						<span className="text-gray-900">
							{receiptPayment?.PaymentMethod || sale.payment?.PaymentMethod || "-"}
						</span>
					</div>
					{!isInvoice && (
						<div>
							<span className="font-semibold text-gray-700">Change:</span>{" "}
							<span className="text-gray-900">
								{currency(receiptPayment?.Change ?? sale.payment?.Change ?? 0)}
							</span>
						</div>
					)}
					<div>
						<span className="font-semibold text-gray-700">Due Date:</span>{" "}
						<span className="text-gray-900">
							{sale.payment?.PaymentDueDate
								? formatDateTime(sale.payment.PaymentDueDate)
								: "-"}
						</span>
					</div>
				</div>

				<div className="mt-5 rounded-lg border border-gray-200">
					<table className="min-w-full text-sm">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
									Item
								</th>
								<th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
									Qty
								</th>
								<th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
									Price
								</th>
								<th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
									Subtotal
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200 bg-white">
							{lines.map((line, index) => (
								<tr key={`${documentNumber || "document"}-${index}`}>
									<td className="px-3 py-2 text-gray-900 align-top">
										<div className="max-w-md whitespace-pre-wrap break-words">
											{line.label}
										</div>
									</td>
									<td className="px-3 py-2 text-gray-700">{line.quantity}</td>
									<td className="px-3 py-2 text-gray-700">
										{currency(line.pricePerUnit)}
									</td>
									<td className="px-3 py-2 text-gray-700">
										{currency(line.subtotal)}
									</td>
								</tr>
							))}
							{lines.length === 0 && (
								<tr>
									<td colSpan="4" className="px-3 py-3 text-center text-gray-500">
										No line items recorded.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				<div className="mt-5 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
					<div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
						<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
							Total Amount
						</p>
						<p className="mt-2 text-xl font-semibold text-gray-900">
							{currency(sale.totalAmount)}
						</p>
					</div>
					<div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
						<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
							{isInvoice ? "Paid To Date" : "Paid This Receipt"}
						</p>
						<p className="mt-2 text-xl font-semibold text-gray-900">
							{currency(paidThisDocument)}
						</p>
					</div>
					<div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
						<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
							Amount Left
						</p>
						<p className="mt-2 text-xl font-semibold text-gray-900">
							{currency(sale.amountLeft)}
						</p>
					</div>
					<div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
						<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
							Additional Details
						</p>
						<p className="mt-2 text-sm text-gray-700">
							{receiptPayment?.AdditionalDetails ||
								sale.payment?.AdditionalDetails ||
								"No additional details."}
						</p>
					</div>
				</div>

				{isJobOrderInvoice && partialPayments.length > 0 && (
					<div className="mt-5 rounded-lg border border-gray-200">
						<div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
							<h4 className="text-sm font-semibold text-gray-700">
								Partial Payments
							</h4>
						</div>
						<div className="max-h-56 overflow-y-auto">
							<table className="min-w-full text-sm">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
											Receipt No.
										</th>
										<th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
											Applied
										</th>
										<th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
											Tendered
										</th>
										<th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
											Change
										</th>
										<th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
											Method
										</th>
										<th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
											Date
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-200 bg-white">
									{partialPayments.map((payment) => (
										<tr key={`preview-partial-${payment.ID}`}>
											<td className="px-3 py-2 text-gray-700">
												{payment.ReceiptNumber || "-"}
											</td>
											<td className="px-3 py-2 text-gray-900">
												{currency(payment.PaidAmount)}
											</td>
											<td className="px-3 py-2 text-gray-700">
												{payment.TenderedAmount != null
													? currency(payment.TenderedAmount)
													: "-"}
											</td>
											<td className="px-3 py-2 text-gray-700">
												{payment.Change != null
													? currency(payment.Change)
													: "-"}
											</td>
											<td className="px-3 py-2 text-gray-700">
												{payment.PaymentMethod || "-"}
											</td>
											<td className="px-3 py-2 text-gray-700">
												{formatDateTime(payment.DateAdded)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}

				<div className="mt-6 flex justify-end">
					<button
						type="button"
						onClick={onClose}
						className="rounded-md border border-primary bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-primary-soft"
					>
						Close
					</button>
				</div>
			</div>
		</Modal>
	);
}
