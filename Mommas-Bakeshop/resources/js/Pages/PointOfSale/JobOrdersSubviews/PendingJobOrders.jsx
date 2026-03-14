import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "@inertiajs/react";
import Modal from "@/Components/Modal";
import usePermissions from "@/hooks/usePermissions";
import { exportJobOrderPdf } from "@/utils/saleDocuments";
import { formatCountLabel } from "@/utils/countLabel";
import {
	countOverdueDeliveries,
	getDeliveryTimestamp,
	isDeliveryOverdue,
} from "@/utils/jobOrders";

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

export default function PendingJobOrders({ rows = [], onHeaderMetaChange }) {
	const { requirePermission } = usePermissions();
	const [selectedJobOrder, setSelectedJobOrder] = useState(null);
	const [deliverTarget, setDeliverTarget] = useState(null);
	const [cancelTarget, setCancelTarget] = useState(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [deliveryFilter, setDeliveryFilter] = useState("all");
	const [sortConfig, setSortConfig] = useState({
		key: "DeliveryAt",
		direction: "asc",
	});
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(25);

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

	const resetFilters = () => {
		setSearchQuery("");
		setDeliveryFilter("all");
	};

	const requestSort = (key) => {
		let direction = "asc";
		if (sortConfig.key === key && sortConfig.direction === "asc") {
			direction = "desc";
		}
		setSortConfig({ key, direction });
	};

	const filteredAndSortedRows = useMemo(() => {
		let items = [...(rows || [])];
		const query = searchQuery.trim().toLowerCase();
		const referenceTime = Date.now();

		if (query) {
			items = items.filter((row) => {
				const haystack = [
					`#${row.ID}`,
					row.ID,
					row.customer?.CustomerName,
					row.Status,
					row.TotalAmount,
					row.DeliveryAt,
				]
					.join(" ")
					.toLowerCase();
				return haystack.includes(query);
			});
		}

		if (deliveryFilter !== "all") {
			items = items.filter((row) => {
				const overdue = isDeliveryOverdue(row, referenceTime);
				return deliveryFilter === "overdue" ? overdue : !overdue;
			});
		}

		items.sort((a, b) => {
			const getValue = (row) => {
				switch (sortConfig.key) {
					case "ID":
						return Number(row.ID || 0);
					case "Customer":
						return String(row.customer?.CustomerName || "").toLowerCase();
					case "DeliveryAt":
						return getDeliveryTimestamp(row.DeliveryAt) || 0;
					case "TotalAmount":
						return Number(row.TotalAmount || 0);
					case "Status":
						return String(row.Status || "").toLowerCase();
					default:
						return String(row[sortConfig.key] || "").toLowerCase();
				}
			};

			const aValue = getValue(a);
			const bValue = getValue(b);
			if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
			if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
			return 0;
		});

		return items;
	}, [rows, searchQuery, deliveryFilter, sortConfig]);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, deliveryFilter, sortConfig, itemsPerPage]);

	const totalPages = Math.max(1, Math.ceil(filteredAndSortedRows.length / itemsPerPage));
	const safeCurrentPage = Math.min(currentPage, totalPages);
	const startIndex = (safeCurrentPage - 1) * itemsPerPage;
	const paginatedRows = filteredAndSortedRows.slice(startIndex, startIndex + itemsPerPage);
	const pageNumberWindow = 2;
	const pageStart = Math.max(1, safeCurrentPage - pageNumberWindow);
	const pageEnd = Math.min(totalPages, safeCurrentPage + pageNumberWindow);
	const pageNumbers = Array.from({ length: pageEnd - pageStart + 1 }, (_, idx) => pageStart + idx);
	const canGoPrevious = safeCurrentPage > 1;
	const canGoNext = safeCurrentPage < totalPages;
	const countLabel = formatCountLabel(
		filteredAndSortedRows.length,
		"pending job order",
		"pending job orders",
	);
	const overdueCount = countOverdueDeliveries(filteredAndSortedRows);
	const alertLabel =
		overdueCount > 0
			? `${overdueCount} overdue ${overdueCount === 1 ? "delivery" : "deliveries"}`
			: "";

	useEffect(() => {
		onHeaderMetaChange?.({
			subtitle: "Pending Job Orders",
			countLabel,
			alertLabel,
		});
	}, [onHeaderMetaChange, countLabel, alertLabel]);

	const goToPage = (page) => {
		setCurrentPage(Math.min(totalPages, Math.max(1, page)));
	};

	const statusBadgeClass = (status) => {
		if (status === "Pending") return "bg-yellow-100 text-yellow-800";
		if (status === "Delivered") return "bg-green-100 text-green-800";
		if (status === "Cancelled") return "bg-red-100 text-red-800";
		return "bg-gray-100 text-gray-800";
	};

	return (
		<div className="flex flex-col flex-1 overflow-hidden min-h-0">
			<div className="mb-6 flex items-start gap-3">
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
						placeholder="Search by ID, customer, status, or delivery date..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
				<div className="flex flex-1 min-w-0 items-center gap-2">
					<div className="relative flex-1 min-w-0">
						<div className="overflow-x-auto pb-1 pr-4">
							<div className="flex min-w-max items-center gap-2 pr-3">
								<select
									value={deliveryFilter}
									onChange={(e) => setDeliveryFilter(e.target.value)}
									className="w-44 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
								>
									<option value="all">All Deliveries</option>
									<option value="overdue">Overdue</option>
									<option value="upcoming">Upcoming</option>
								</select>
							</div>
						</div>
						<div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
					</div>
					<button
						type="button"
						onClick={resetFilters}
						className="shrink-0 rounded-md border border-primary bg-white px-3 py-2 text-xs font-medium text-primary shadow-sm hover:bg-primary-soft"
					>
						Reset Filters
					</button>
				</div>
			</div>

			<div className="border rounded-lg border-gray-200 flex-1 min-h-0 flex flex-col overflow-hidden">
				<div className="flex-1 overflow-y-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
							<tr>
								{[
									["ID", "ID"],
									["Customer", "Customer"],
									["DeliveryAt", "Delivery"],
									["TotalAmount", "Total"],
									["Status", "Status"],
								].map(([key, label]) => (
									<th
										key={key}
										scope="col"
										className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
										onClick={() => requestSort(key)}
									>
										<div className="flex items-center">
											{label}
											{sortConfig.key === key && (
												<span className="ml-1 text-[10px] text-gray-400">
													{sortConfig.direction}
												</span>
											)}
										</div>
									</th>
								))}
								<th
									scope="col"
									className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
								>
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{paginatedRows.map((row) => {
								const overdue = isDeliveryOverdue(row);
								return (
									<tr
										key={row.ID}
										className={`${
											overdue ? "overdue-row" : "hover:bg-gray-50"
										} transition-colors`}
									>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
											#{row.ID}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
											{row.customer?.CustomerName || "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
											{formatDateTime(row.DeliveryAt)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
											{currency(row.TotalAmount)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span
												className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadgeClass(
													row.Status,
												)}`}
											>
												{row.Status}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<div className="inline-flex flex-wrap justify-end gap-2">
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
								);
							})}
							{filteredAndSortedRows.length === 0 && (
								<tr>
									<td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
										No pending job orders found.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
				<div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="text-sm text-gray-600">
							Showing {filteredAndSortedRows.length === 0 ? 0 : startIndex + 1}-
							{Math.min(startIndex + itemsPerPage, filteredAndSortedRows.length)} of {" "}
							{filteredAndSortedRows.length}
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<label htmlFor="pending-items-per-page" className="text-sm text-gray-600">
								Items per page
							</label>
							<select
								id="pending-items-per-page"
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
