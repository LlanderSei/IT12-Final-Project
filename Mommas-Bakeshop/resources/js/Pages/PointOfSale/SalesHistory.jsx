import React, { useEffect, useMemo, useRef, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import Modal from "@/Components/Modal";
import SaleDocumentPreviewModal from "@/Components/SaleDocumentPreviewModal";
import { formatCountLabel } from "@/utils/countLabel";
import usePermissions from "@/hooks/usePermissions";
import { Eye, FileText, Receipt } from "lucide-react";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value) => {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString();
};

const normalizeMoney = (value) => Number(value || 0);

function SalesTable({
	rows = [],
	onView,
	onInvoice,
	onReceipt,
	canViewInvoices = false,
	canViewReceipts = false,
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
					<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
						Receipt / Invoice ID
					</th>
					<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort?.("TotalAmount")}>
						<div className="flex items-center">Total Amount {sortConfig?.key === "TotalAmount" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction.toUpperCase()}</span>}</div>
					</th>
					<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort?.("PaymentStatus")}>
						<div className="flex items-center">Payment Status {sortConfig?.key === "PaymentStatus" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction.toUpperCase()}</span>}</div>
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
							{sale.SaleType === "JobOrder"
								? sale.payment?.InvoiceNumber || sale.payment?.ReceiptNumber || "-"
								: sale.payment?.ReceiptNumber || "-"}
						</td>
						<td className="px-4 py-4 text-sm font-semibold text-gray-900">{currency(sale.totalAmount)}</td>
						<td className="px-4 py-4 text-sm text-gray-700">{sale.payment?.PaymentStatus || "-"}</td>
						<td className="px-4 py-4 text-sm text-gray-500 text-right">{formatDateTime(sale.DateAdded)}</td>
						<td className="px-4 py-4 text-right">
							<div className="flex flex-wrap justify-end gap-2">
								<button
									type="button"
									onClick={() => onView?.(sale)}
									className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover"
								>
									<Eye size={14} />
									View
								</button>
								{canViewInvoices && sale.SaleType === "JobOrder" && sale.payment?.InvoiceNumber && (
									<button
										type="button"
										onClick={() => onInvoice?.(sale)}
										className="inline-flex items-center gap-1.5 rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-soft"
									>
										<FileText size={14} />
										Invoice
									</button>
								)}
								{canViewReceipts && sale.payment?.ReceiptNumber && (
									<button
										type="button"
										onClick={() => onReceipt?.(sale)}
										className="inline-flex items-center gap-1.5 rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-soft"
									>
										<Receipt size={14} />
										Receipt
									</button>
								)}
							</div>
						</td>
					</tr>
				))}
				{rows.length === 0 && (
					<tr>
						<td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
							No sales found.
						</td>
					</tr>
				)}
			</tbody>
		</table>
	);
}

export default function SalesHistory({
	sales = { data: [], current_page: 1, last_page: 1, per_page: 25, total: 0, from: null, to: null },
	filters = {},
}) {
	const { can, deny, requirePermission } = usePermissions();
	const canViewInvoices = can("CanViewJobOrderInvoices");
	const canExportInvoices = can("CanExportJobOrderInvoices");
	const canViewReceipts = can("CanViewPaymentReceipts");
	const canExportReceipts = can("CanExportPaymentReceipts");

	const [selectedSale, setSelectedSale] = useState(null);
	const [documentPreview, setDocumentPreview] = useState({
		type: null,
		sale: null,
		receiptPayment: null,
	});
	const [currentPage, setCurrentPage] = useState(Number(filters.page || sales.current_page || 1));
	const [itemsPerPage, setItemsPerPage] = useState(Number(filters.perPage || sales.per_page || 25));
	const [searchQuery, setSearchQuery] = useState(filters.search || "");
	const [paymentStatusFilter, setPaymentStatusFilter] = useState(filters.paymentStatus || "all");
	const [customerFilter, setCustomerFilter] = useState(filters.customerFilter || "all");
	const [dateFrom, setDateFrom] = useState(filters.dateFrom || "");
	const [dateTo, setDateTo] = useState(filters.dateTo || "");
	const [sortConfig, setSortConfig] = useState({
		key: filters.sortKey || "DateAdded",
		direction: filters.sortDirection || "desc",
	});
	const isFirstRender = useRef(true);

	const salesRows = useMemo(() => {
		return (sales.data || []).map((sale) => {
			const totalAmount = normalizeMoney(sale.payment?.TotalAmount ?? sale.TotalAmount);
			const paymentPaidAmount = normalizeMoney(sale.payment?.PaidAmount);
			const totalPartialPaid = (sale.partial_payments || []).reduce(
				(sum, payment) => sum + normalizeMoney(payment.PaidAmount),
				0,
			);
			const paidAmount = Math.max(paymentPaidAmount, totalPartialPaid);
			const amountLeft = Math.max(0, totalAmount - paidAmount);
			return {
				...sale,
				totalAmount,
				paidAmount,
				totalPartialPaid,
				amountLeft,
			};
		});
	}, [sales.data]);

	useEffect(() => {
		setSearchQuery(filters.search || "");
		setPaymentStatusFilter(filters.paymentStatus || "all");
		setCustomerFilter(filters.customerFilter || "all");
		setDateFrom(filters.dateFrom || "");
		setDateTo(filters.dateTo || "");
		setSortConfig({
			key: filters.sortKey || "DateAdded",
			direction: filters.sortDirection || "desc",
		});
		setCurrentPage(Number(filters.page || sales.current_page || 1));
		setItemsPerPage(Number(filters.perPage || sales.per_page || 25));
		setSelectedSale(null);
		setDocumentPreview({ type: null, sale: null, receiptPayment: null });
	}, [
		filters.search,
		filters.paymentStatus,
		filters.customerFilter,
		filters.dateFrom,
		filters.dateTo,
		filters.sortKey,
		filters.sortDirection,
		filters.page,
		filters.perPage,
		sales.current_page,
		sales.per_page,
	]);

	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}

		const timeoutId = window.setTimeout(() => {
			router.get(
				route("pos.sale-history"),
				{
					search: searchQuery,
					paymentStatus: paymentStatusFilter,
					customerFilter,
					dateFrom,
					dateTo,
					sortKey: sortConfig.key,
					sortDirection: sortConfig.direction,
					perPage: itemsPerPage,
					page: currentPage,
				},
				{
					preserveState: true,
					preserveScroll: true,
					replace: true,
					only: ["sales", "filters"],
				},
			);
		}, 250);

		return () => window.clearTimeout(timeoutId);
	}, [searchQuery, paymentStatusFilter, customerFilter, dateFrom, dateTo, sortConfig, itemsPerPage, currentPage]);

	const requestSort = (key) => {
		let direction = "asc";
		if (sortConfig.key === key && sortConfig.direction === "asc") {
			direction = "desc";
		}
		setSortConfig({ key, direction });
		setCurrentPage(1);
	};

	const totalPages = Math.max(1, Number(sales.last_page || 1));
	const safeCurrentPage = Math.min(currentPage, totalPages);
	const pageNumberWindow = 2;
	const pageStart = Math.max(1, safeCurrentPage - pageNumberWindow);
	const pageEnd = Math.min(totalPages, safeCurrentPage + pageNumberWindow);
	const pageNumbers = Array.from({ length: pageEnd - pageStart + 1 }, (_, idx) => pageStart + idx);
	const canGoPrevious = safeCurrentPage > 1;
	const canGoNext = safeCurrentPage < totalPages;

	const goToPage = (page) => {
		setCurrentPage(Math.min(totalPages, Math.max(1, page)));
	};

	const selectedSaleCustomOrderLines = useMemo(() => {
		if (!selectedSale) return [];
		return selectedSale.job_order?.custom_items || selectedSale.jobOrder?.customItems || selectedSale.jobOrder?.custom_items || [];
	}, [selectedSale]);
	const isPreviewOpen = Boolean(documentPreview.type && documentPreview.sale);
	const isSelectedSaleJobOrder = selectedSale?.SaleType === "JobOrder";
	const countLabel = formatCountLabel(Number(sales.total || 0), "sale");
	const visibleRangeLabel = useMemo(() => {
		const from = Number(sales.from || 0);
		const to = Number(sales.to || 0);
		const total = Number(sales.total || 0);
		return `Showing ${from}-${to} of ${total}`;
	}, [sales.from, sales.to, sales.total]);

	const clearFilters = () => {
		setSearchQuery("");
		setPaymentStatusFilter("all");
		setCustomerFilter("all");
		setDateFrom("");
		setDateTo("");
		setCurrentPage(1);
	};

	const openInvoicePreview = (sale) => {
		if (!requirePermission("CanViewJobOrderInvoices")) return;
		if (sale?.SaleType !== "JobOrder" || !sale?.payment?.InvoiceNumber) {
			return deny("Only job orders with an issued invoice can be previewed.");
		}
		setDocumentPreview({
			type: "invoice",
			sale,
			receiptPayment: null,
		});
	};

	const openReceiptPreview = (sale, receiptPayment = null) => {
		if (!requirePermission("CanViewPaymentReceipts")) return;
		const receiptNumber = receiptPayment?.ReceiptNumber || sale?.payment?.ReceiptNumber;
		if (!receiptNumber) {
			return deny("Only sales with an issued receipt can be previewed.");
		}
		setDocumentPreview({
			type: "receipt",
			sale,
			receiptPayment,
		});
	};

	return (
		<AuthenticatedLayout
			header={
				<div className="flex items-center justify-between gap-4">
					<h2 className="font-semibold text-xl text-gray-800 leading-tight">
						Sales History
					</h2>
					<div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
						{countLabel}
					</div>
				</div>
			}
			disableScroll={true}
		>
			<Head title="Sales History" />

			<div className="flex-1 p-4 md:p-6 min-h-0">
				<div className="h-full bg-white rounded-lg flex flex-col min-h-0">
					<div className="mb-4 flex items-start gap-3">
						<div className="relative w-full max-w-xl shrink-0">
							<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
								</svg>
							</div>
							<input
								type="text"
								className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
								placeholder="Search by sale ID, customer, cashier, product, or status..."
								value={searchQuery}
								onChange={(e) => {
									setSearchQuery(e.target.value);
									setCurrentPage(1);
								}}
							/>
						</div>
						<div className="flex flex-1 min-w-0 items-center gap-2">
							<div className="relative flex-1 min-w-0">
								<div className="overflow-x-auto pb-1 pr-4">
									<div className="flex min-w-max items-center gap-2 pr-3">
										<select
											value={paymentStatusFilter}
											onChange={(e) => {
												setPaymentStatusFilter(e.target.value);
												setCurrentPage(1);
											}}
											className="w-44 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
										>
											<option value="all">All Payment Status</option>
											<option value="Paid">Paid</option>
											<option value="Partially Paid">Partially Paid</option>
											<option value="Unpaid">Unpaid</option>
										</select>
										<select
											value={customerFilter}
											onChange={(e) => {
												setCustomerFilter(e.target.value);
												setCurrentPage(1);
											}}
											className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
										>
											<option value="all">All Customers</option>
											<option value="walk-in">Walk-In</option>
											<option value="with-customer">Named Customer</option>
										</select>
										<input
											type="date"
											value={dateFrom}
											onChange={(e) => {
												setDateFrom(e.target.value);
												setCurrentPage(1);
											}}
											className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
										/>
										<span className="text-sm text-gray-500">~</span>
										<input
											type="date"
											value={dateTo}
											onChange={(e) => {
												setDateTo(e.target.value);
												setCurrentPage(1);
											}}
											className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
										/>
									</div>
								</div>
								<div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
							</div>
							<button
								type="button"
								onClick={clearFilters}
								className="shrink-0 rounded-md border border-primary bg-white px-3 py-2 text-xs font-medium text-primary shadow-sm hover:bg-primary-soft"
							>
								Reset Filters
							</button>
						</div>
					</div>

					<div className="border rounded-lg border-gray-200 flex-1 min-h-0 flex flex-col overflow-hidden">
						<div className="flex-1 overflow-y-auto">
							<SalesTable
								rows={salesRows}
								onView={setSelectedSale}
								onInvoice={openInvoicePreview}
								onReceipt={openReceiptPreview}
								canViewInvoices={canViewInvoices}
								canViewReceipts={canViewReceipts}
								sortConfig={sortConfig}
								requestSort={requestSort}
							/>
						</div>
						<div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<div className="text-sm text-gray-600">{visibleRangeLabel}</div>
								<div className="flex flex-wrap items-center gap-2">
									<label htmlFor="sales-items-per-page" className="text-sm text-gray-600">
										Items per page
									</label>
									<select
										id="sales-items-per-page"
										value={itemsPerPage}
										onChange={(e) => {
											setItemsPerPage(Number(e.target.value));
											setCurrentPage(1);
										}}
										className="rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
									>
										<option value={25}>25</option>
										<option value={50}>50</option>
										<option value={100}>100</option>
										<option value={500}>500</option>
									</select>
									<button type="button" onClick={() => goToPage(1)} disabled={!canGoPrevious} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
										First
									</button>
									<button type="button" onClick={() => goToPage(safeCurrentPage - 1)} disabled={!canGoPrevious} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
										Previous
									</button>
									{pageNumbers.map((page) => (
										<button
											key={page}
											type="button"
											onClick={() => goToPage(page)}
											className={`rounded-md px-3 py-1.5 text-sm ${
												page === safeCurrentPage
													? "border border-primary bg-primary text-white"
													: "border border-gray-300 text-gray-700 hover:bg-gray-50"
											}`}
										>
											{page}
										</button>
									))}
									<button type="button" onClick={() => goToPage(safeCurrentPage + 1)} disabled={!canGoNext} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
										Next
									</button>
									<button type="button" onClick={() => goToPage(totalPages)} disabled={!canGoNext} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
										Last
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<Modal
				show={Boolean(selectedSale)}
				onClose={() => setSelectedSale(null)}
				closeable={!isPreviewOpen}
				maxWidth="2xl"
			>
				{selectedSale && (
					<div className="p-6 max-h-[80vh] overflow-y-auto">
						<div className="mb-4 flex flex-wrap items-start justify-between gap-3">
							<div>
								<h3 className="text-lg font-semibold text-gray-900">
									Sale Details
								</h3>
								<div className="mt-1 space-y-1 text-xs text-gray-500">
									<div>Sale Type: {selectedSale.SaleType || "-"}</div>
									{canViewInvoices && selectedSale.payment?.InvoiceNumber && (
										<div>
											Invoice: {selectedSale.payment.InvoiceNumber}
											{selectedSale.payment?.InvoiceIssuedAt ? ` - ${formatDateTime(selectedSale.payment.InvoiceIssuedAt)}` : ""}
										</div>
									)}
									{canViewReceipts && selectedSale.payment?.ReceiptNumber && (
										<div>
											Initial receipt: {selectedSale.payment.ReceiptNumber}
											{selectedSale.payment?.ReceiptIssuedAt ? ` - ${formatDateTime(selectedSale.payment.ReceiptIssuedAt)}` : ""}
										</div>
									)}
								</div>
							</div>
							<div className="flex flex-wrap justify-end gap-2">
								{canViewInvoices && selectedSale.SaleType === "JobOrder" && selectedSale.payment?.InvoiceNumber && (
									<button
										type="button"
										onClick={() => openInvoicePreview(selectedSale)}
										className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
									>
										Preview Invoice
									</button>
								)}
								{canViewReceipts && selectedSale.payment?.ReceiptNumber && (
									<button
										type="button"
										onClick={() => openReceiptPreview(selectedSale)}
										className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
									>
										Preview Receipt
									</button>
								)}
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
							<div><span className="font-semibold text-gray-700">Customer:</span> <span className="text-gray-900">{selectedSale.customer?.CustomerName || "Walk-In"}</span></div>
							<div><span className="font-semibold text-gray-700">Cashier:</span> <span className="text-gray-900">{selectedSale.user?.FullName || "Unknown"}</span></div>
							<div><span className="font-semibold text-gray-700">Total Amount:</span> <span className="text-gray-900">{currency(selectedSale.totalAmount)}</span></div>
							<div><span className="font-semibold text-gray-700">Status:</span> <span className="text-gray-900">{selectedSale.payment?.PaymentStatus || "-"}</span></div>
							<div><span className="font-semibold text-gray-700">Paid:</span> <span className="text-gray-900">{currency(selectedSale.paidAmount)}</span></div>
							<div><span className="font-semibold text-gray-700">Amount Left:</span> <span className="text-gray-900">{currency(selectedSale.amountLeft)}</span></div>
							<div><span className="font-semibold text-gray-700">Due Date:</span> <span className="text-gray-900">{selectedSale.payment?.PaymentDueDate ? formatDateTime(selectedSale.payment.PaymentDueDate) : "-"}</span></div>
							<div><span className="font-semibold text-gray-700">Payment Method:</span> <span className="text-gray-900">{selectedSale.payment?.PaymentMethod || "-"}</span></div>
						</div>
						<div className="mt-4">
							<h4 className="text-sm font-semibold text-gray-700 mb-2">Products</h4>
							<div className="max-h-56 overflow-y-auto rounded border border-gray-200">
								<table className="min-w-full text-sm">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subtotal</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200 bg-white">
										{(selectedSale.sold_products || []).map((line) => (
											<tr key={line.ID}>
												<td className="px-3 py-2 text-gray-900">{line.product?.ProductName || "-"}</td>
												<td className="px-3 py-2 text-gray-700">{line.Quantity}</td>
												<td className="px-3 py-2 text-gray-700">{currency(line.PricePerUnit)}</td>
												<td className="px-3 py-2 text-gray-700">{currency(line.SubAmount)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
						{isSelectedSaleJobOrder && (
							<>
								<div className="mt-4">
									<h4 className="text-sm font-semibold text-gray-700 mb-2">Custom Orders</h4>
									<div className="max-h-44 overflow-y-auto rounded border border-gray-200">
										<table className="min-w-full text-sm">
											<thead className="bg-gray-50">
												<tr>
													<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
													<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
													<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
													<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subtotal</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-gray-200 bg-white">
												{selectedSaleCustomOrderLines.map((line) => (
													<tr key={`custom-order-line-${line.ID}`}>
														<td className="px-3 py-2 text-gray-900 align-top"><div className="max-w-md whitespace-pre-wrap break-words">{line.CustomOrderDescription || "-"}</div></td>
														<td className="px-3 py-2 text-gray-700">{line.Quantity ?? "-"}</td>
														<td className="px-3 py-2 text-gray-700">{currency(line.PricePerUnit)}</td>
														<td className="px-3 py-2 text-gray-700">{currency(Number(line.Quantity || 0) * Number(line.PricePerUnit || 0))}</td>
													</tr>
												))}
												{selectedSaleCustomOrderLines.length === 0 && (
													<tr>
														<td colSpan="4" className="px-3 py-3 text-center text-gray-500">No custom orders recorded.</td>
													</tr>
												)}
											</tbody>
										</table>
									</div>
								</div>
								<div className="mt-4">
									<h4 className="text-sm font-semibold text-gray-700 mb-2">Partial Payments</h4>
									<div className="max-h-44 overflow-y-auto rounded border border-gray-200">
										<table className="min-w-full text-sm">
											<thead className="bg-gray-50">
												<tr>
													<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Receipt No.</th>
													<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Applied</th>
													<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tendered</th>
													<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Change</th>
													<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Method</th>
													<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
													<th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-gray-200 bg-white">
												{(selectedSale.partial_payments || []).map((payment) => (
													<tr key={payment.ID}>
														<td className="px-3 py-2 text-gray-700">{payment.ReceiptNumber || "-"}</td>
														<td className="px-3 py-2 text-gray-900">{currency(payment.PaidAmount)}</td>
														<td className="px-3 py-2 text-gray-700">{payment.TenderedAmount != null ? currency(payment.TenderedAmount) : "-"}</td>
														<td className="px-3 py-2 text-gray-700">{payment.Change != null ? currency(payment.Change) : "-"}</td>
														<td className="px-3 py-2 text-gray-700">{payment.PaymentMethod || "-"}</td>
														<td className="px-3 py-2 text-gray-700">{formatDateTime(payment.DateAdded)}</td>
														<td className="px-3 py-2 text-right">
															{canViewReceipts && payment.ReceiptNumber ? (
																<button
																	type="button"
																	onClick={() => openReceiptPreview(selectedSale, payment)}
																	className="rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
																>
																	Preview Receipt
																</button>
															) : (
																<span className="text-xs text-gray-400">-</span>
															)}
														</td>
													</tr>
												))}
												{(selectedSale.partial_payments || []).length === 0 && (
													<tr>
														<td colSpan="7" className="px-3 py-3 text-center text-gray-500">No partial payments recorded.</td>
													</tr>
												)}
											</tbody>
										</table>
									</div>
								</div>
							</>
						)}
						<div className="mt-6 flex justify-end">
							<button
								type="button"
								onClick={() => setSelectedSale(null)}
								className="px-4 py-2 text-sm rounded-md border border-primary bg-white text-primary hover:bg-primary-soft"
							>
								Close
							</button>
						</div>
					</div>
				)}
			</Modal>

			<SaleDocumentPreviewModal
				show={Boolean(documentPreview.type && documentPreview.sale)}
				onClose={() => setDocumentPreview({ type: null, sale: null, receiptPayment: null })}
				sale={documentPreview.sale}
				type={documentPreview.type || "invoice"}
				receiptPayment={documentPreview.receiptPayment}
				canExport={documentPreview.type === "invoice" ? canExportInvoices : canExportReceipts}
			/>
		</AuthenticatedLayout>
	);
}
