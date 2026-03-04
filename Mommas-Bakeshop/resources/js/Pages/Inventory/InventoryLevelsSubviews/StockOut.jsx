import React, { useMemo, useState } from "react";

import { useEffect } from "react";
import { formatCountLabel } from "@/utils/countLabel";

function toComparableDate(value) {
	if (!value) return null;
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return null;
	return d;
}

export default function StockOut({ stockOuts, onEdit, onHeaderMetaChange }) {
	const [searchQuery, setSearchQuery] = useState("");
	const [usedByFilter, setUsedByFilter] = useState("all");
	const [reasonFilter, setReasonFilter] = useState("all");
	const [itemTypeFilter, setItemTypeFilter] = useState("all");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [minTotalQty, setMinTotalQty] = useState("");
	const [maxTotalQty, setMaxTotalQty] = useState("");
	const [sortConfig, setSortConfig] = useState({
		key: "DateAdded",
		direction: "desc",
	});
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(25);

	const records = stockOuts || [];

	const usedByOptions = useMemo(
		() => [...new Set(records.map((r) => r.user?.FullName).filter(Boolean))],
		[records],
	);

	const reasonOptions = useMemo(
		() => [...new Set(records.map((r) => (r.Reason || "").split(" | ")[0].trim()).filter(Boolean))],
		[records],
	);

	const resetFilters = () => {
		setSearchQuery("");
		setUsedByFilter("all");
		setReasonFilter("all");
		setItemTypeFilter("all");
		setDateFrom("");
		setDateTo("");
		setMinTotalQty("");
		setMaxTotalQty("");
	};

	const requestSort = (key) => {
		let direction = "asc";
		if (sortConfig.key === key && sortConfig.direction === "asc") {
			direction = "desc";
		}
		setSortConfig({ key, direction });
	};

	const getSortValue = (record, key) => {
		switch (key) {
			case "UsedBy":
				return String(record.user?.FullName || "").toLowerCase();
			case "ItemsUsed":
				return String(
					(record.ItemsUsed || []).map((item) => item.ItemName || "").join(" "),
				).toLowerCase();
			case "TotalQuantity":
				return Number(record.TotalQuantity || 0);
			case "Reason":
				return String(record.Reason || "").toLowerCase();
			case "DateAdded":
				return record.DateAdded ? new Date(record.DateAdded).getTime() : 0;
			default:
				return "";
		}
	};

	const filteredStockOuts = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		const from = toComparableDate(dateFrom);
		const to = toComparableDate(dateTo);
		if (to) to.setHours(23, 59, 59, 999);
		const minQty = Number(minTotalQty);
		const maxQty = Number(maxTotalQty);

		const filtered = records.filter((record) => {
			if (query) {
				const matchesQuery =
					record.user?.FullName?.toLowerCase().includes(query) ||
					String(record.Reason || "").toLowerCase().includes(query) ||
					record.ItemsUsed?.some((item) => item.ItemName?.toLowerCase().includes(query));
				if (!matchesQuery) return false;
			}

			if (usedByFilter !== "all" && record.user?.FullName !== usedByFilter) {
				return false;
			}

			if (reasonFilter !== "all") {
				const reasonType = String(record.Reason || "").split(" | ")[0].trim();
				if (reasonType !== reasonFilter) return false;
			}

			if (itemTypeFilter !== "all") {
				const hasType = (record.ItemsUsed || []).some(
					(item) => item.ItemType === itemTypeFilter,
				);
				if (!hasType) return false;
			}

			const usedDate = toComparableDate(record.DateAdded);
			if (from && (!usedDate || usedDate < from)) return false;
			if (to && (!usedDate || usedDate > to)) return false;

			if (String(minTotalQty).trim() !== "" && !Number.isNaN(minQty)) {
				if (Number(record.TotalQuantity || 0) < minQty) return false;
			}
			if (String(maxTotalQty).trim() !== "" && !Number.isNaN(maxQty)) {
				if (Number(record.TotalQuantity || 0) > maxQty) return false;
			}

			return true;
		});
		if (!sortConfig.key) return filtered;

		return [...filtered].sort((a, b) => {
			const aValue = getSortValue(a, sortConfig.key);
			const bValue = getSortValue(b, sortConfig.key);
			if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
			if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
			return 0;
		});
	}, [
		records,
		searchQuery,
		usedByFilter,
		reasonFilter,
		itemTypeFilter,
		dateFrom,
		dateTo,
		minTotalQty,
		maxTotalQty,
		sortConfig,
	]);

	useEffect(() => {
		setCurrentPage(1);
	}, [
		searchQuery,
		usedByFilter,
		reasonFilter,
		itemTypeFilter,
		dateFrom,
		dateTo,
		minTotalQty,
		maxTotalQty,
		sortConfig,
		itemsPerPage,
	]);

	const totalPages = Math.max(1, Math.ceil(filteredStockOuts.length / itemsPerPage));
	const safeCurrentPage = Math.min(currentPage, totalPages);
	const startIndex = (safeCurrentPage - 1) * itemsPerPage;
	const paginatedStockOuts = filteredStockOuts.slice(startIndex, startIndex + itemsPerPage);
	const pageNumberWindow = 2;
	const pageStart = Math.max(1, safeCurrentPage - pageNumberWindow);
	const pageEnd = Math.min(totalPages, safeCurrentPage + pageNumberWindow);
	const pageNumbers = Array.from({ length: pageEnd - pageStart + 1 }, (_, idx) => pageStart + idx);
	const canGoPrevious = safeCurrentPage > 1;
	const canGoNext = safeCurrentPage < totalPages;
	const countLabel = formatCountLabel(filteredStockOuts.length, "record");

	const goToPage = (page) => {
		setCurrentPage(Math.min(totalPages, Math.max(1, page)));
	};

	useEffect(() => {
		onHeaderMetaChange?.({
			subtitle: "Stock-Out History",
			countLabel,
		});
	}, [onHeaderMetaChange, countLabel]);

	return (
		<div className="flex flex-col flex-1 overflow-hidden min-h-0">
			<div className="mb-6 flex items-start gap-3">
				<div className="relative w-full max-w-xl shrink-0">
					<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
						<svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
					</div>
					<input
						type="text"
						className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
						placeholder="Search item, user, reason..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
				<div className="flex flex-1 min-w-0 items-center gap-2">
					<div className="relative flex-1 min-w-0">
						<div className="overflow-x-auto pb-1 pr-4">
							<div className="flex min-w-max items-center gap-2 pr-3">
							<select value={usedByFilter} onChange={(e) => setUsedByFilter(e.target.value)} className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
								<option value="all">All Used By</option>
								{usedByOptions.map((name) => (
									<option key={name} value={name}>{name}</option>
								))}
							</select>
							<select value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)} className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
								<option value="all">All Reasons</option>
								{reasonOptions.map((reason) => (
									<option key={reason} value={reason}>{reason}</option>
								))}
							</select>
							<select value={itemTypeFilter} onChange={(e) => setItemTypeFilter(e.target.value)} className="w-36 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
								<option value="all">All Item Types</option>
								<option value="Inventory">Inventory</option>
								<option value="Product">Product</option>
							</select>
							<input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
							<span className="text-sm text-gray-500">~</span>
							<input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
							<input type="number" min="0" placeholder="Min Qty" value={minTotalQty} onChange={(e) => setMinTotalQty(e.target.value)} className="w-32 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
							<input type="number" min="0" placeholder="Max Qty" value={maxTotalQty} onChange={(e) => setMaxTotalQty(e.target.value)} className="w-32 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
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
				<table className="min-w-full table-fixed divide-y divide-gray-200">
					<thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
						<tr>
							<th
								className="w-28 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
								onClick={() => requestSort("UsedBy")}
							>
								<div className="flex items-center">
									Used By
									{sortConfig.key === "UsedBy" && (
										<span className="ml-1 text-[10px] text-gray-400">
											{sortConfig.direction}
										</span>
									)}
								</div>
							</th>
							<th
								className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
								onClick={() => requestSort("ItemsUsed")}
							>
								<div className="flex items-center">
									Items Used
									{sortConfig.key === "ItemsUsed" && (
										<span className="ml-1 text-[10px] text-gray-400">
											{sortConfig.direction}
										</span>
									)}
								</div>
							</th>
							<th
								className="w-24 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
								onClick={() => requestSort("TotalQuantity")}
							>
								<div className="flex items-center">
									Total Quantity
									{sortConfig.key === "TotalQuantity" && (
										<span className="ml-1 text-[10px] text-gray-400">
											{sortConfig.direction}
										</span>
									)}
								</div>
							</th>
							<th
								className="w-48 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
								onClick={() => requestSort("Reason")}
							>
								<div className="flex items-center">
									Reason
									{sortConfig.key === "Reason" && (
										<span className="ml-1 text-[10px] text-gray-400">
											{sortConfig.direction}
										</span>
									)}
								</div>
							</th>
							<th
								className="w-32 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
								onClick={() => requestSort("DateAdded")}
							>
								<div className="flex items-center">
									Date Used
									{sortConfig.key === "DateAdded" && (
										<span className="ml-1 text-[10px] text-gray-400">
											{sortConfig.direction}
										</span>
									)}
								</div>
							</th>
							<th className="w-20 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{paginatedStockOuts.map((record) => (
							<tr key={record.ID} className="hover:bg-gray-50 align-top">
								<td className="px-4 py-4 text-sm text-gray-900 break-words">{record.user?.FullName || "Unknown"}</td>
								<td className="px-4 py-4 text-sm font-medium text-gray-900 break-words">
									<div className="space-y-1">
										{(record.ItemsUsed || []).map((item, idx) => (
											<div key={`${record.ID}-${idx}`}>
												{item.ItemName} x{item.QuantityRemoved}
											</div>
										))}
									</div>
								</td>
								<td className="px-4 py-4 text-sm font-semibold text-gray-900">{record.TotalQuantity}</td>
								<td className="px-4 py-4 text-sm text-gray-500 break-words">{record.Reason || "n/a"}</td>
								<td className="px-4 py-4 text-sm text-gray-500 break-words">{new Date(record.DateAdded).toLocaleString()}</td>
								<td className="px-4 py-4 text-sm">
									<button
										type="button"
										onClick={() => onEdit?.(record)}
										className="rounded border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary-soft"
									>
										Edit
									</button>
								</td>
							</tr>
						))}
						{filteredStockOuts.length === 0 && (
							<tr>
								<td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
									No stock-out records found.
								</td>
							</tr>
						)}
					</tbody>
				</table>
				</div>
				<div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="text-sm text-gray-600">
							Showing {filteredStockOuts.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredStockOuts.length)} of {filteredStockOuts.length}
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<label htmlFor="stock-out-items-per-page" className="text-sm text-gray-600">Items per page</label>
							<select
								id="stock-out-items-per-page"
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



