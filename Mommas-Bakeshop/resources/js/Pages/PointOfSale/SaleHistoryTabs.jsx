import React, { useEffect, useMemo, useState } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import Modal from "@/Components/Modal";
import { formatCountLabel } from "@/utils/countLabel";
import { exportInvoicePdf, exportReceiptPdf } from "@/utils/saleDocuments";
import usePermissions from "@/hooks/usePermissions";
import Sales from "./SaleHistorySubviews/Sales";
import PendingPayments from "./SaleHistorySubviews/PendingPayments";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value) => {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString();
};

const normalizeMoney = (value) => Number(value || 0);

export default function SaleHistoryTabs({
	initialTab = "Sales",
	sales = [],
	pendingSales = [],
}) {
	const { can, deny, requirePermission } = usePermissions();
	const canViewSalesHistory = can("CanViewSalesHistory");
	const canViewSalesTab =
		canViewSalesHistory && can("CanViewSalesHistorySales");
	const canViewPendingTab =
		canViewSalesHistory && can("CanViewSalesHistoryPendingPayments");
	const canRecordSalePayment = can("CanRecordSalePayment");
	const canViewInvoices = can("CanViewJobOrderInvoices");
	const canExportInvoices = can("CanExportJobOrderInvoices");
	const canViewReceipts = can("CanViewPaymentReceipts");
	const canExportReceipts = can("CanExportPaymentReceipts");

	const tabs = [
		{ label: "Sales", routeName: "pos.sale-history" },
		{ label: "Pending Payments", routeName: "pos.sale-history.pending" },
	];
	const visibleTabs = tabs.filter((tab) => {
		if (tab.label === "Sales") return canViewSalesTab;
		if (tab.label === "Pending Payments") return canViewPendingTab;
		return false;
	});
	const fallbackTab = visibleTabs[0]?.label || "Sales";
	const tabLabels = visibleTabs.map((tab) => tab.label);
	const activeTab = tabLabels.includes(initialTab) ? initialTab : fallbackTab;

	const [selectedSale, setSelectedSale] = useState(null);
	const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(25);
	const [searchQuery, setSearchQuery] = useState("");
	const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
	const [customerFilter, setCustomerFilter] = useState("all");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [dueFilter, setDueFilter] = useState("all");
	const [sortConfig, setSortConfig] = useState({
		key: "DateAdded",
		direction: "desc",
	});
	const paymentForm = useForm({
		SalesID: "",
		paymentType: "partial",
		PaidAmount: "",
		PaymentMethod: "Cash",
		AdditionalDetails: "",
	});

	const salesRows = useMemo(() => {
		return (sales || []).map((sale) => {
			const totalAmount = normalizeMoney(
				sale.payment?.TotalAmount ?? sale.TotalAmount,
			);
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
	}, [sales]);

	const pendingRows = useMemo(() => {
		return (pendingSales || [])
			.map((sale) => {
			const totalAmount = normalizeMoney(
				sale.payment?.TotalAmount ?? sale.TotalAmount,
			);
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
			})
			.filter((sale) => sale.amountLeft > 0);
	}, [pendingSales]);

	const applyFilters = (rows, { includeDueDate = false } = {}) => {
		const query = searchQuery.trim().toLowerCase();
		const from = dateFrom ? new Date(dateFrom) : null;
		const to = dateTo ? new Date(dateTo) : null;
		if (to) to.setHours(23, 59, 59, 999);
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		return rows.filter((sale) => {
			if (query) {
				const customOrderDetails =
					sale.custom_order_details || sale.customOrderDetails || [];
				const customOrderLines = customOrderDetails.flatMap(
					(detail) => detail.custom_orders || detail.customOrders || [],
				);
				const text = [
					sale.ID,
					sale.customer?.CustomerName || "Walk-In",
					sale.user?.FullName || "",
					sale.payment?.PaymentStatus || "",
					...(sale.sold_products || []).map(
						(line) => line.product?.ProductName || "",
					),
					...customOrderLines.map((line) => line.CustomOrderDescription || ""),
				]
					.join(" ")
					.toLowerCase();
				if (!text.includes(query)) return false;
			}

			if (
				paymentStatusFilter !== "all" &&
				sale.payment?.PaymentStatus !== paymentStatusFilter
			) {
				return false;
			}

			if (customerFilter === "walk-in" && sale.customer) return false;
			if (customerFilter === "with-customer" && !sale.customer) return false;

			const addedDate = sale.DateAdded ? new Date(sale.DateAdded) : null;
			if (from && (!addedDate || addedDate < from)) return false;
			if (to && (!addedDate || addedDate > to)) return false;

			if (includeDueDate && dueFilter !== "all") {
				const dueDate = sale.payment?.PaymentDueDate
					? new Date(sale.payment.PaymentDueDate)
					: null;
				if (!dueDate) return false;
				dueDate.setHours(0, 0, 0, 0);
				if (dueFilter === "overdue" && dueDate >= today) return false;
				if (dueFilter === "upcoming" && dueDate < today) return false;
			}

			return true;
		});
	};

	const filteredSalesRows = useMemo(
		() => applyFilters(salesRows),
		[
			salesRows,
			searchQuery,
			paymentStatusFilter,
			customerFilter,
			dateFrom,
			dateTo,
		],
	);

	const filteredPendingRows = useMemo(
		() => applyFilters(pendingRows, { includeDueDate: true }),
		[
			pendingRows,
			searchQuery,
			paymentStatusFilter,
			customerFilter,
			dateFrom,
			dateTo,
			dueFilter,
		],
	);

	const displayRows =
		activeTab === "Sales" ? filteredSalesRows : filteredPendingRows;

	const requestSort = (key) => {
		let direction = "asc";
		if (sortConfig.key === key && sortConfig.direction === "asc") {
			direction = "desc";
		}
		setSortConfig({ key, direction });
	};

	const getSortValue = (sale, key) => {
		switch (key) {
			case "Cashier":
				return String(sale.user?.FullName || "").toLowerCase();
			case "Customer":
				return String(sale.customer?.CustomerName || "Walk-In").toLowerCase();
			case "TotalAmount":
				return Number(sale.totalAmount || 0);
			case "PaymentStatus":
				return String(sale.payment?.PaymentStatus || "").toLowerCase();
			case "PartialPayments":
				return Number(sale.totalPartialPaid || 0);
			case "AmountLeft":
				return Number(sale.amountLeft || 0);
			case "PaymentDueDate":
				return sale.payment?.PaymentDueDate
					? new Date(sale.payment.PaymentDueDate).getTime()
					: 0;
			case "DateAdded":
				return sale.DateAdded ? new Date(sale.DateAdded).getTime() : 0;
			default:
				return "";
		}
	};

	const sortedDisplayRows = useMemo(() => {
		if (!sortConfig.key) return displayRows;
		return [...displayRows].sort((a, b) => {
			const aValue = getSortValue(a, sortConfig.key);
			const bValue = getSortValue(b, sortConfig.key);
			if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
			if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
			return 0;
		});
	}, [displayRows, sortConfig]);

	useEffect(() => {
		setCurrentPage(1);
	}, [
		activeTab,
		searchQuery,
		paymentStatusFilter,
		customerFilter,
		dateFrom,
		dateTo,
		dueFilter,
		sortConfig,
		itemsPerPage,
	]);

	const totalPages = Math.max(1, Math.ceil(sortedDisplayRows.length / itemsPerPage));
	const safeCurrentPage = Math.min(currentPage, totalPages);
	const startIndex = (safeCurrentPage - 1) * itemsPerPage;
	const paginatedRows = sortedDisplayRows.slice(startIndex, startIndex + itemsPerPage);
	const pageNumberWindow = 2;
	const pageStart = Math.max(1, safeCurrentPage - pageNumberWindow);
	const pageEnd = Math.min(totalPages, safeCurrentPage + pageNumberWindow);
	const pageNumbers = Array.from(
		{ length: pageEnd - pageStart + 1 },
		(_, idx) => pageStart + idx,
	);
	const canGoPrevious = safeCurrentPage > 1;
	const canGoNext = safeCurrentPage < totalPages;

	const goToPage = (page) => {
		setCurrentPage(Math.min(totalPages, Math.max(1, page)));
	};

	const selectedPendingSale = useMemo(
		() =>
			pendingRows.find(
				(sale) => String(sale.ID) === String(paymentForm.data.SalesID || ""),
			) || null,
		[pendingRows, paymentForm.data.SalesID],
	);
	const selectedSaleCustomOrderDetails = useMemo(() => {
		if (!selectedSale) return [];
		return selectedSale.custom_order_details || selectedSale.customOrderDetails || [];
	}, [selectedSale]);
	const selectedSaleCustomOrderLines = useMemo(
		() =>
			selectedSaleCustomOrderDetails.flatMap(
				(detail) => detail.custom_orders || detail.customOrders || [],
			),
		[selectedSaleCustomOrderDetails],
	);

	useEffect(() => {
		if (paymentForm.data.paymentType === "full" && selectedPendingSale) {
			paymentForm.setData(
				"PaidAmount",
				selectedPendingSale.amountLeft.toFixed(2),
			);
		}
	}, [paymentForm.data.paymentType, selectedPendingSale]);

	const countLabel = formatCountLabel(sortedDisplayRows.length, "sale");

	const clearFilters = () => {
		setSearchQuery("");
		setPaymentStatusFilter("all");
		setCustomerFilter("all");
		setDateFrom("");
		setDateTo("");
		setDueFilter("all");
	};

	const openPaymentModal = () => {
		if (!requirePermission("CanRecordSalePayment")) return;
		paymentForm.reset();
		paymentForm.setData({
			SalesID: pendingRows[0]?.ID ? String(pendingRows[0].ID) : "",
			paymentType: "partial",
			PaidAmount: "",
			PaymentMethod: "Cash",
			AdditionalDetails: "",
		});
		paymentForm.clearErrors();
		setIsPaymentModalOpen(true);
	};

	const handleExportInvoice = (sale) => {
		if (!requirePermission("CanExportJobOrderInvoices")) return;
		try {
			exportInvoicePdf(sale);
		} catch (error) {
			deny(error?.message || "Failed to export invoice PDF.");
		}
	};

	const handleExportReceipt = (sale, receiptPayment = null) => {
		if (!requirePermission("CanExportPaymentReceipts")) return;
		try {
			exportReceiptPdf(sale, receiptPayment);
		} catch (error) {
			deny(error?.message || "Failed to export receipt PDF.");
		}
	};

	const submitPayment = (e) => {
		e.preventDefault();
		if (!requirePermission("CanRecordSalePayment")) return;
		paymentForm.transform((data) => ({
			...data,
			SalesID: Number(data.SalesID),
			PaidAmount: Number(data.PaidAmount),
			AdditionalDetails:
				String(data.AdditionalDetails || "").trim() === ""
					? null
					: data.AdditionalDetails,
		}));
		paymentForm.post(route("pos.sale-history.payments.store"), {
			preserveScroll: true,
			onSuccess: () => {
				setIsPaymentModalOpen(false);
				paymentForm.reset();
			},
		});
	};

	return (
		<AuthenticatedLayout
			header={
				<div className="flex items-center justify-between gap-4">
					<h2 className="font-semibold text-xl text-gray-800 leading-tight">
						Sales History
						<span className="ml-2 text-base font-medium text-gray-500">
							&gt; {activeTab}
						</span>
					</h2>
					<div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
						{countLabel}
					</div>
				</div>
			}
			disableScroll={true}
		>
			<Head title="Sale History" />

			<div className="bg-white border-b border-gray-200 mt-0">
				<div className="mx-auto px-4">
					<nav className="-mb-px flex gap-2" aria-label="Tabs">
						{visibleTabs.map((tab) => {
							const active = route().current(tab.routeName);
							return (
								<Link
									key={tab.routeName}
									href={route(tab.routeName)}
									className={`${
										active
											? "bg-primary-soft border-primary text-primary"
											: "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300"
									} whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors duration-200 rounded-t-lg`}
								>
									{tab.label}
								</Link>
							);
						})}
					</nav>
				</div>
			</div>

			<div className="flex-1 p-4 md:p-6 min-h-0">
				{visibleTabs.length === 0 ? (
					<div className="h-full bg-white rounded-lg border border-gray-200 p-6 text-sm text-gray-500">
						No sales history tabs are available for your account.
					</div>
				) : (
				<div className="h-full bg-white rounded-lg flex flex-col min-h-0">
					<div className="mb-4 flex items-start gap-3">
						<div className="relative w-full max-w-xl shrink-0">
							<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<svg
									className="h-5 w-5 text-gray-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
									/>
								</svg>
							</div>
							<input
								type="text"
								className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
								placeholder="Search by sale ID, customer, cashier, product, or status..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
						</div>
						<div className="flex flex-1 min-w-0 items-center gap-2">
							<div className="relative flex-1 min-w-0">
								<div className="overflow-x-auto pb-1 pr-4">
									<div className="flex min-w-max items-center gap-2 pr-3">
										<select
											value={paymentStatusFilter}
											onChange={(e) => setPaymentStatusFilter(e.target.value)}
											className="w-44 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
										>
											<option value="all">All Payment Status</option>
											<option value="Paid">Paid</option>
											<option value="Partially Paid">Partially Paid</option>
											<option value="Unpaid">Unpaid</option>
										</select>
										<select
											value={customerFilter}
											onChange={(e) => setCustomerFilter(e.target.value)}
											className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
										>
											<option value="all">All Customers</option>
											<option value="walk-in">Walk-In</option>
											<option value="with-customer">Named Customer</option>
										</select>
										<input
											type="date"
											value={dateFrom}
											onChange={(e) => setDateFrom(e.target.value)}
											className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
										/>
										<span className="text-sm text-gray-500">~</span>
										<input
											type="date"
											value={dateTo}
											onChange={(e) => setDateTo(e.target.value)}
											className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
										/>
										{activeTab === "Pending Payments" && (
											<select
												value={dueFilter}
												onChange={(e) => setDueFilter(e.target.value)}
												className="w-36 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
											>
												<option value="all">Due: Any</option>
												<option value="overdue">Overdue</option>
												<option value="upcoming">Upcoming</option>
											</select>
										)}
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
							{activeTab === "Sales" ? (
								<Sales
											rows={paginatedRows}
											onView={setSelectedSale}
											onInvoice={handleExportInvoice}
											onReceipt={handleExportReceipt}
											canExportInvoices={canExportInvoices}
											canExportReceipts={canExportReceipts}
											sortConfig={sortConfig}
											requestSort={requestSort}
										/>
							) : (
								<PendingPayments
											rows={paginatedRows}
											onView={setSelectedSale}
											onInvoice={handleExportInvoice}
											canExportInvoices={canExportInvoices}
											sortConfig={sortConfig}
											requestSort={requestSort}
										/>
							)}
						</div>
						<div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<div className="text-sm text-gray-600">
									Showing {sortedDisplayRows.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedDisplayRows.length)} of {sortedDisplayRows.length}
								</div>
								<div className="flex flex-wrap items-center gap-2">
									<label htmlFor="sale-history-items-per-page" className="text-sm text-gray-600">Items per page</label>
									<select
										id="sale-history-items-per-page"
										value={itemsPerPage}
										onChange={(e) => setItemsPerPage(Number(e.target.value))}
										className="rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
									>
										<option value={25}>25</option>
										<option value={50}>50</option>
										<option value={100}>100</option>
										<option value={500}>500</option>
									</select>
									<button
										type="button"
										onClick={() => goToPage(1)}
										disabled={!canGoPrevious}
										className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
									>
										First
									</button>
									<button
										type="button"
										onClick={() => goToPage(safeCurrentPage - 1)}
										disabled={!canGoPrevious}
										className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
									>
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
									<button
										type="button"
										onClick={() => goToPage(safeCurrentPage + 1)}
										disabled={!canGoNext}
										className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
									>
										Next
									</button>
									<button
										type="button"
										onClick={() => goToPage(totalPages)}
										disabled={!canGoNext}
										className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
									>
										Last
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
				)}
			</div>

			{activeTab === "Pending Payments" && canRecordSalePayment && (
				<div className="sticky bottom-0 w-full p-4 bg-white border-t border-gray-200 z-10">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<button
							type="button"
							onClick={openPaymentModal}
							disabled={filteredPendingRows.length === 0}
							className="w-full inline-flex justify-center py-3 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed"
						>
							Record Payment
						</button>
					</div>
				</div>
			)}

				<Modal
					show={Boolean(selectedSale)}
					onClose={() => setSelectedSale(null)}
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
									{canViewInvoices && selectedSale.payment?.InvoiceNumber && (
										<div>
											Invoice: {selectedSale.payment.InvoiceNumber}
											{selectedSale.payment?.InvoiceIssuedAt
												? ` • ${formatDateTime(selectedSale.payment.InvoiceIssuedAt)}`
												: ""}
										</div>
									)}
									{canViewReceipts && selectedSale.payment?.ReceiptNumber && (
										<div>
											Initial receipt: {selectedSale.payment.ReceiptNumber}
											{selectedSale.payment?.ReceiptIssuedAt
												? ` • ${formatDateTime(selectedSale.payment.ReceiptIssuedAt)}`
												: ""}
										</div>
									)}
								</div>
							</div>
							<div className="flex flex-wrap justify-end gap-2">
								{canExportInvoices && selectedSale.payment?.InvoiceNumber && (
									<button
										type="button"
										onClick={() => handleExportInvoice(selectedSale)}
										className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
									>
										Export Invoice PDF
									</button>
								)}
								{canExportReceipts && selectedSale.payment?.ReceiptNumber && (
									<button
										type="button"
										onClick={() => handleExportReceipt(selectedSale)}
										className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
									>
										Export Receipt PDF
									</button>
								)}
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
							<div>
								<span className="font-semibold text-gray-700">Customer:</span>{" "}
								<span className="text-gray-900">
									{selectedSale.customer?.CustomerName || "Walk-In"}
								</span>
							</div>
							<div>
								<span className="font-semibold text-gray-700">Cashier:</span>{" "}
								<span className="text-gray-900">
									{selectedSale.user?.FullName || "Unknown"}
								</span>
							</div>
							<div>
								<span className="font-semibold text-gray-700">
									Total Amount:
								</span>{" "}
								<span className="text-gray-900">
									{currency(selectedSale.totalAmount)}
								</span>
							</div>
							<div>
								<span className="font-semibold text-gray-700">Status:</span>{" "}
								<span className="text-gray-900">
									{selectedSale.payment?.PaymentStatus || "-"}
								</span>
							</div>
							<div>
								<span className="font-semibold text-gray-700">Paid:</span>{" "}
								<span className="text-gray-900">
									{currency(selectedSale.paidAmount)}
								</span>
							</div>
							<div>
								<span className="font-semibold text-gray-700">
									Amount Left:
								</span>{" "}
								<span className="text-gray-900">
									{currency(selectedSale.amountLeft)}
								</span>
							</div>
							<div>
								<span className="font-semibold text-gray-700">Due Date:</span>{" "}
								<span className="text-gray-900">
									{selectedSale.payment?.PaymentDueDate
										? formatDateTime(selectedSale.payment.PaymentDueDate)
										: "-"}
								</span>
							</div>
						</div>
							<div className="mt-4">
								<h4 className="text-sm font-semibold text-gray-700 mb-2">
									Products
								</h4>
								<div className="max-h-56 overflow-y-auto rounded border border-gray-200">
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
											{(selectedSale.sold_products || []).map((line) => (
												<tr key={line.ID}>
													<td className="px-3 py-2 text-gray-900">
														{line.product?.ProductName || "-"}
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
									</tbody>
								</table>
							</div>
						</div>
							<div className="mt-4">
								<h4 className="text-sm font-semibold text-gray-700 mb-2">
									Custom Orders
								</h4>
								<div className="max-h-44 overflow-y-auto rounded border border-gray-200">
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
											{selectedSaleCustomOrderLines.map((line) => (
												<tr key={`custom-order-line-${line.ID}`}>
													<td className="px-3 py-2 text-gray-900">
														{line.CustomOrderDescription || "-"}
													</td>
													<td className="px-3 py-2 text-gray-700">
														{line.Quantity ?? "-"}
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
											{selectedSaleCustomOrderLines.length === 0 && (
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
							<div className="mt-4">
								<h4 className="text-sm font-semibold text-gray-700 mb-2">
									Partial Payments
								</h4>
								<div className="max-h-44 overflow-y-auto rounded border border-gray-200">
									<table className="min-w-full text-sm">
										<thead className="bg-gray-50">
											<tr>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
												Receipt No.
											</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
												Amount
											</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
												Method
											</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
												Date
											</th>
											<th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
												Actions
											</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-gray-200 bg-white">
											{(selectedSale.partial_payments || []).map((payment) => (
												<tr key={payment.ID}>
													<td className="px-3 py-2 text-gray-700">
														{payment.ReceiptNumber || "-"}
													</td>
													<td className="px-3 py-2 text-gray-900">
														{currency(payment.PaidAmount)}
												</td>
												<td className="px-3 py-2 text-gray-700">
													{payment.PaymentMethod || "-"}
												</td>
												<td className="px-3 py-2 text-gray-700">
													{formatDateTime(payment.DateAdded)}
												</td>
												<td className="px-3 py-2 text-right">
													{canExportReceipts && payment.ReceiptNumber ? (
														<button
															type="button"
															onClick={() =>
																handleExportReceipt(selectedSale, payment)
															}
															className="rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
														>
															Receipt PDF
														</button>
													) : (
														<span className="text-xs text-gray-400">-</span>
													)}
												</td>
											</tr>
										))}
											{(selectedSale.partial_payments || []).length === 0 && (
												<tr>
													<td
														colSpan="5"
													className="px-3 py-3 text-center text-gray-500"
												>
													No partial payments recorded.
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
								onClick={() => setSelectedSale(null)}
								className="px-4 py-2 text-sm rounded-md border border-primary bg-white text-primary hover:bg-primary-soft"
							>
								Close
							</button>
						</div>
					</div>
				)}
			</Modal>

			<Modal
				show={isPaymentModalOpen && canRecordSalePayment}
				onClose={() => setIsPaymentModalOpen(false)}
				maxWidth="lg"
			>
				<form onSubmit={submitPayment} className="p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">
						Record Payment
					</h3>
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Sale
							</label>
							<select
								value={paymentForm.data.SalesID}
								onChange={(e) => paymentForm.setData("SalesID", e.target.value)}
								className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
							>
								<option value="">Select pending sale</option>
								{pendingRows.map((sale) => (
									<option key={sale.ID} value={sale.ID}>
										#{sale.ID} - {sale.customer?.CustomerName || "Walk-In"} -
										Left {currency(sale.amountLeft)}
									</option>
								))}
							</select>
							{paymentForm.errors.SalesID && (
								<p className="mt-1 text-sm text-red-600">
									{paymentForm.errors.SalesID}
								</p>
							)}
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Payment Type
								</label>
								<select
									value={paymentForm.data.paymentType}
									onChange={(e) =>
										paymentForm.setData("paymentType", e.target.value)
									}
									className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
								>
									<option value="partial">Partial Payment</option>
									<option value="full">Full Payment</option>
								</select>
								{paymentForm.errors.paymentType && (
									<p className="mt-1 text-sm text-red-600">
										{paymentForm.errors.paymentType}
									</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Payment Method
								</label>
								<select
									value={paymentForm.data.PaymentMethod}
									onChange={(e) =>
										paymentForm.setData("PaymentMethod", e.target.value)
									}
									className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
								>
									<option value="Cash">Cash</option>
									<option value="GCash">GCash</option>
									<option value="Bank Transfer">Bank Transfer</option>
									<option value="Other">Other</option>
								</select>
								{paymentForm.errors.PaymentMethod && (
									<p className="mt-1 text-sm text-red-600">
										{paymentForm.errors.PaymentMethod}
									</p>
								)}
							</div>
						</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Amount
								</label>
							<input
								type="number"
								min="0.01"
								step="0.01"
								value={paymentForm.data.PaidAmount}
								readOnly={paymentForm.data.paymentType === "full"}
								onChange={(e) =>
									paymentForm.setData("PaidAmount", e.target.value)
								}
								className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
							/>
							{selectedPendingSale && (
								<p className="mt-1 text-xs text-gray-500">
									Amount left: {currency(selectedPendingSale.amountLeft)}
								</p>
							)}
								{paymentForm.errors.PaidAmount && (
									<p className="mt-1 text-sm text-red-600">
										{paymentForm.errors.PaidAmount}
									</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Additional Details
								</label>
								<input
									type="text"
									value={paymentForm.data.AdditionalDetails}
									onChange={(e) =>
										paymentForm.setData("AdditionalDetails", e.target.value)
									}
									placeholder="Reference no., notes, etc. (optional)"
									className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
								/>
								{paymentForm.errors.AdditionalDetails && (
									<p className="mt-1 text-sm text-red-600">
										{paymentForm.errors.AdditionalDetails}
									</p>
								)}
							</div>
						</div>
					<div className="mt-6 flex justify-end gap-2">
						<button
							type="button"
							onClick={() => setIsPaymentModalOpen(false)}
							className="px-4 py-2 text-sm rounded-md border border-primary bg-white text-primary hover:bg-primary-soft"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={paymentForm.processing}
							className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
						>
							Save Payment
						</button>
					</div>
				</form>
			</Modal>
		</AuthenticatedLayout>
	);
}
