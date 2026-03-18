import React, { useEffect, useMemo, useState } from "react";
import Modal from "@/Components/Modal";
import { exportJobOrderPdf } from "@/utils/saleDocuments";
import usePermissions from "@/hooks/usePermissions";
import { formatCountLabel } from "@/utils/countLabel";
import { getDeliveryTimestamp } from "@/utils/jobOrders";
import { Eye, Printer } from "lucide-react";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value) => {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString();
};

export default function JobOrdersHistory({ rows = [], onHeaderMetaChange }) {
	const { requirePermission } = usePermissions();
	const [selectedJobOrder, setSelectedJobOrder] = useState(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [sortConfig, setSortConfig] = useState({
		key: "DeliveryAt",
		direction: "desc",
	});
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(25);

	const resetFilters = () => {
		setSearchQuery("");
		setStatusFilter("all");
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

		if (statusFilter !== "all") {
			items = items.filter((row) => row.Status === statusFilter);
		}

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
	}, [rows, searchQuery, statusFilter, sortConfig]);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, statusFilter, sortConfig, itemsPerPage]);

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
		"job order",
		"job orders",
	);

	useEffect(() => {
		onHeaderMetaChange?.({
			subtitle: "Job Orders History",
			countLabel,
		});
	}, [onHeaderMetaChange, countLabel]);

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
									value={statusFilter}
									onChange={(e) => setStatusFilter(e.target.value)}
									className="w-44 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
								>
									<option value="all">All Statuses</option>
									<option value="Delivered">Delivered</option>
									<option value="Cancelled">Cancelled</option>
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
							{paginatedRows.map((row) => (
								<tr key={row.ID} className="hover:bg-gray-50">
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
										<div className="inline-flex gap-2">
											<button
												type="button"
												onClick={() => setSelectedJobOrder(row)}
												className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover"
											>
												<Eye size={14} />
												View
											</button>
											<button
												type="button"
												onClick={() => {
													if (!requirePermission("CanPrintJobOrders")) return;
													exportJobOrderPdf(row);
												}}
												className="inline-flex items-center gap-1.5 rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-soft"
											>
												<Printer size={14} />
												Print Summary
											</button>
										</div>
									</td>
								</tr>
							))}
							{filteredAndSortedRows.length === 0 && (
								<tr>
									<td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
										No job order history found.
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
							<label htmlFor="history-items-per-page" className="text-sm text-gray-600">
								Items per page
							</label>
							<select
								id="history-items-per-page"
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
		</div>
	);
}
