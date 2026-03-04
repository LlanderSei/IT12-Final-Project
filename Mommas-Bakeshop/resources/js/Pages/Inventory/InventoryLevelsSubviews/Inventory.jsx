import React, { useMemo, useState } from "react";

import { useEffect } from "react";
import { formatCountLabel } from "@/utils/countLabel";

export default function Inventory({ inventory, onEdit, getStatus, onHeaderMetaChange }) {
	const [searchQuery, setSearchQuery] = useState("");
	const [typeFilter, setTypeFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [measurementFilter, setMeasurementFilter] = useState("all");
	const [minQty, setMinQty] = useState("");
	const [maxQty, setMaxQty] = useState("");
	const [sortConfig, setSortConfig] = useState({
		key: "ItemName",
		direction: "asc",
	});
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(25);

	const resetFilters = () => {
		setSearchQuery("");
		setTypeFilter("all");
		setStatusFilter("all");
		setMeasurementFilter("all");
		setMinQty("");
		setMaxQty("");
	};

	const typeOptions = useMemo(
		() => [...new Set((inventory || []).map((item) => item.ItemType).filter(Boolean))],
		[inventory],
	);

	const measurementOptions = useMemo(
		() =>
			[...new Set((inventory || []).map((item) => item.Measurement).filter(Boolean))],
		[inventory],
	);

	const requestSort = (key) => {
		let direction = "asc";
		if (sortConfig.key === key && sortConfig.direction === "asc") {
			direction = "desc";
		}
		setSortConfig({ key, direction });
	};

	const filteredAndSortedItems = useMemo(() => {
		let items = [...(inventory || [])];

		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			items = items.filter((item) => {
				const status = getStatus(item).toLowerCase();
				return (
					item.ItemName.toLowerCase().includes(query) ||
					item.ItemType.toLowerCase().includes(query) ||
					item.Measurement.toLowerCase().includes(query) ||
					status.includes(query)
				);
			});
		}

		if (typeFilter !== "all") {
			items = items.filter((item) => item.ItemType === typeFilter);
		}

		if (measurementFilter !== "all") {
			items = items.filter((item) => item.Measurement === measurementFilter);
		}

		if (statusFilter !== "all") {
			items = items.filter((item) => {
				const status = getStatus(item);
				if (statusFilter === "on_stock") return status === "On Stock";
				if (statusFilter === "low_stock") return status === "Low Stock";
				if (statusFilter === "no_stock") return status === "No Stock";
				return true;
			});
		}

		const min = Number(minQty);
		const max = Number(maxQty);
		if (String(minQty).trim() !== "" && !Number.isNaN(min)) {
			items = items.filter((item) => Number(item.Quantity) >= min);
		}
		if (String(maxQty).trim() !== "" && !Number.isNaN(max)) {
			items = items.filter((item) => Number(item.Quantity) <= max);
		}

		if (sortConfig.key) {
			items.sort((a, b) => {
				let aValue = a[sortConfig.key];
				let bValue = b[sortConfig.key];

				if (["Quantity", "LowCountThreshold"].includes(sortConfig.key)) {
					aValue = Number(aValue);
					bValue = Number(bValue);
				} else {
					aValue = (aValue || "").toString().toLowerCase();
					bValue = (bValue || "").toString().toLowerCase();
				}

				if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
				if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
				return 0;
			});
		}

		return items;
	}, [
		inventory,
		searchQuery,
		typeFilter,
		statusFilter,
		measurementFilter,
		minQty,
		maxQty,
		sortConfig,
		getStatus,
	]);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, typeFilter, statusFilter, measurementFilter, minQty, maxQty, sortConfig, itemsPerPage]);

	const totalPages = Math.max(1, Math.ceil(filteredAndSortedItems.length / itemsPerPage));
	const safeCurrentPage = Math.min(currentPage, totalPages);
	const startIndex = (safeCurrentPage - 1) * itemsPerPage;
	const paginatedItems = filteredAndSortedItems.slice(startIndex, startIndex + itemsPerPage);
	const pageNumberWindow = 2;
	const pageStart = Math.max(1, safeCurrentPage - pageNumberWindow);
	const pageEnd = Math.min(totalPages, safeCurrentPage + pageNumberWindow);
	const pageNumbers = Array.from({ length: pageEnd - pageStart + 1 }, (_, idx) => pageStart + idx);
	const canGoPrevious = safeCurrentPage > 1;
	const canGoNext = safeCurrentPage < totalPages;
	const countLabel = formatCountLabel(filteredAndSortedItems.length, "item");

	const goToPage = (page) => {
		setCurrentPage(Math.min(totalPages, Math.max(1, page)));
	};

	useEffect(() => {
		onHeaderMetaChange?.({
			subtitle: "Raw Materials & Supplies",
			countLabel,
		});
	}, [onHeaderMetaChange, countLabel]);

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
						placeholder="Search by name, type, measurement, or status..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
				<div className="flex flex-1 min-w-0 items-center gap-2">
					<div className="relative flex-1 min-w-0">
						<div className="overflow-x-auto pb-1 pr-4">
							<div className="flex min-w-max items-center gap-2 pr-3">
							<select
								value={typeFilter}
								onChange={(e) => setTypeFilter(e.target.value)}
								className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
							>
								<option value="all">All Types</option>
								{typeOptions.map((type) => (
									<option key={type} value={type}>
										{type}
									</option>
								))}
							</select>
							<select
								value={measurementFilter}
								onChange={(e) => setMeasurementFilter(e.target.value)}
								className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
							>
								<option value="all">All Units</option>
								{measurementOptions.map((measurement) => (
									<option key={measurement} value={measurement}>
										{measurement}
									</option>
								))}
							</select>
							<select
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value)}
								className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
							>
								<option value="all">All Status</option>
								<option value="on_stock">On Stock</option>
								<option value="low_stock">Low Stock</option>
								<option value="no_stock">No Stock</option>
							</select>
							<input
								type="number"
								min="0"
								placeholder="Min Qty"
								value={minQty}
								onChange={(e) => setMinQty(e.target.value)}
								className="w-32 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
							/>
							<input
								type="number"
								min="0"
								placeholder="Max Qty"
								value={maxQty}
								onChange={(e) => setMaxQty(e.target.value)}
								className="w-32 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
							/>
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
								"ItemName",
								"ItemDescription",
								"ItemType",
								"Measurement",
								"LowCountThreshold",
								"Quantity",
							].map((key) => (
								<th
									key={key}
									scope="col"
									className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
									onClick={() => requestSort(key)}
								>
									<div className="flex items-center">
										{key.replace(/([A-Z])/g, " $1").trim()}
										{sortConfig.key === key && (
											<span className="ml-1 text-[10px] text-gray-400">
												{sortConfig.direction === "asc" ? "asc" : "desc"}
											</span>
										)}
									</div>
								</th>
							))}
							<th
								scope="col"
								className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
							>
								Status
							</th>
							<th
								scope="col"
								className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
							>
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{paginatedItems.map((item) => (
							<tr key={item.ID} className="hover:bg-gray-50">
								<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
									{item.ItemName}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{item.ItemDescription || "-"}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{item.ItemType}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{item.Measurement}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{item.LowCountThreshold}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
									{item.Quantity}
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<span
										className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
											item.Quantity === 0
												? "bg-red-100 text-red-800"
												: item.Quantity <= item.LowCountThreshold
													? "bg-yellow-100 text-yellow-800"
													: "bg-green-100 text-green-800"
										}`}
									>
										{getStatus(item)}
									</span>
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
									<button
										onClick={() => onEdit(item)}
										className="rounded border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary-soft"
									>
										Edit
									</button>
								</td>
							</tr>
						))}
						{filteredAndSortedItems.length === 0 && (
							<tr>
								<td
									colSpan="8"
									className="px-6 py-4 text-center text-sm text-gray-500"
								>
									No inventory items found.
								</td>
							</tr>
						)}
					</tbody>
				</table>
				</div>
				<div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="text-sm text-gray-600">
							Showing {filteredAndSortedItems.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredAndSortedItems.length)} of {filteredAndSortedItems.length}
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<label htmlFor="inventory-items-per-page" className="text-sm text-gray-600">Items per page</label>
							<select
								id="inventory-items-per-page"
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
	);
}



