import React, { useEffect, useMemo, useRef, useState } from "react";
import { router } from "@inertiajs/react";
import { formatCountLabel } from "@/utils/countLabel";
import { Pencil } from "lucide-react";

export default function StockOut({
	stockOuts = { data: [], current_page: 1, last_page: 1, per_page: 25, total: 0, from: null, to: null },
	filters = {},
	filterOptions = {},
	fetchRoute,
	onEdit,
	onHeaderMetaChange,
	canEdit = false,
}) {
	const [searchQuery, setSearchQuery] = useState(filters.search || "");
	const [usedByFilter, setUsedByFilter] = useState(filters.usedBy || "all");
	const [reasonFilter, setReasonFilter] = useState(filters.reason || "all");
	const [itemTypeFilter, setItemTypeFilter] = useState(filters.itemType || "all");
	const [dateFrom, setDateFrom] = useState(filters.dateFrom || "");
	const [dateTo, setDateTo] = useState(filters.dateTo || "");
	const [minTotalQty, setMinTotalQty] = useState(filters.minTotalQty || "");
	const [maxTotalQty, setMaxTotalQty] = useState(filters.maxTotalQty || "");
	const [sortConfig, setSortConfig] = useState({
		key: filters.sortKey || "DateAdded",
		direction: filters.sortDirection || "desc",
	});
	const [currentPage, setCurrentPage] = useState(Number(filters.page || stockOuts.current_page || 1));
	const [itemsPerPage, setItemsPerPage] = useState(Number(filters.perPage || stockOuts.per_page || 25));
	const isFirstRender = useRef(true);

	const records = stockOuts.data || [];
	const usedByOptions = filterOptions.usedBy || [];
	const reasonOptions = filterOptions.reason || [];

	useEffect(() => {
		setSearchQuery(filters.search || "");
		setUsedByFilter(filters.usedBy || "all");
		setReasonFilter(filters.reason || "all");
		setItemTypeFilter(filters.itemType || "all");
		setDateFrom(filters.dateFrom || "");
		setDateTo(filters.dateTo || "");
		setMinTotalQty(filters.minTotalQty || "");
		setMaxTotalQty(filters.maxTotalQty || "");
		setSortConfig({
			key: filters.sortKey || "DateAdded",
			direction: filters.sortDirection || "desc",
		});
		setCurrentPage(Number(filters.page || stockOuts.current_page || 1));
		setItemsPerPage(Number(filters.perPage || stockOuts.per_page || 25));
	}, [
		filters.search,
		filters.usedBy,
		filters.reason,
		filters.itemType,
		filters.dateFrom,
		filters.dateTo,
		filters.minTotalQty,
		filters.maxTotalQty,
		filters.sortKey,
		filters.sortDirection,
		filters.page,
		filters.perPage,
		stockOuts.current_page,
		stockOuts.per_page,
	]);

	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}

		const timeoutId = window.setTimeout(() => {
			router.get(
				fetchRoute,
				{
					stockOutSearch: searchQuery,
					stockOutUsedBy: usedByFilter,
					stockOutReason: reasonFilter,
					stockOutItemType: itemTypeFilter,
					stockOutDateFrom: dateFrom,
					stockOutDateTo: dateTo,
					stockOutMinTotalQty: minTotalQty,
					stockOutMaxTotalQty: maxTotalQty,
					stockOutSortKey: sortConfig.key,
					stockOutSortDirection: sortConfig.direction,
					stockOutPerPage: itemsPerPage,
					page: currentPage,
				},
				{
					preserveState: true,
					preserveScroll: true,
					replace: true,
					only: ["stockOuts", "stockOutFilters", "stockOutFilterOptions"],
				},
			);
		}, 250);

		return () => window.clearTimeout(timeoutId);
	}, [searchQuery, usedByFilter, reasonFilter, itemTypeFilter, dateFrom, dateTo, minTotalQty, maxTotalQty, sortConfig, itemsPerPage, currentPage, fetchRoute]);

	const resetFilters = () => {
		setSearchQuery("");
		setUsedByFilter("all");
		setReasonFilter("all");
		setItemTypeFilter("all");
		setDateFrom("");
		setDateTo("");
		setMinTotalQty("");
		setMaxTotalQty("");
		setCurrentPage(1);
	};

	const requestSort = (key) => {
		let direction = "asc";
		if (sortConfig.key === key && sortConfig.direction === "asc") {
			direction = "desc";
		}
		setSortConfig({ key, direction });
		setCurrentPage(1);
	};

	const totalPages = Math.max(1, Number(stockOuts.last_page || 1));
	const safeCurrentPage = Math.min(currentPage, totalPages);
	const pageNumberWindow = 2;
	const pageStart = Math.max(1, safeCurrentPage - pageNumberWindow);
	const pageEnd = Math.min(totalPages, safeCurrentPage + pageNumberWindow);
	const pageNumbers = Array.from({ length: pageEnd - pageStart + 1 }, (_, idx) => pageStart + idx);
	const canGoPrevious = safeCurrentPage > 1;
	const canGoNext = safeCurrentPage < totalPages;
	const countLabel = formatCountLabel(Number(stockOuts.total || 0), "record");
	const visibleRangeLabel = useMemo(() => {
		const from = Number(stockOuts.from || 0);
		const to = Number(stockOuts.to || 0);
		const total = Number(stockOuts.total || 0);
		return `Showing ${from}-${to} of ${total}`;
	}, [stockOuts.from, stockOuts.to, stockOuts.total]);

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
						<svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
					</div>
					<input type="text" className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm" placeholder="Search item, user, reason..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
				</div>
				<div className="flex flex-1 min-w-0 items-center gap-2">
					<div className="relative flex-1 min-w-0">
						<div className="overflow-x-auto pb-1 pr-4">
							<div className="flex min-w-max items-center gap-2 pr-3">
								<select value={usedByFilter} onChange={(e) => { setUsedByFilter(e.target.value); setCurrentPage(1); }} className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"><option value="all">All Used By</option>{usedByOptions.map((name) => <option key={name} value={name}>{name}</option>)}</select>
								<select value={reasonFilter} onChange={(e) => { setReasonFilter(e.target.value); setCurrentPage(1); }} className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"><option value="all">All Reasons</option>{reasonOptions.map((reason) => <option key={reason} value={reason}>{reason}</option>)}</select>
								<select value={itemTypeFilter} onChange={(e) => { setItemTypeFilter(e.target.value); setCurrentPage(1); }} className="w-36 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"><option value="all">All Item Types</option><option value="Inventory">Inventory</option><option value="Product">Product</option></select>
								<input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }} className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
								<span className="text-sm text-gray-500">~</span>
								<input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }} className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
								<input type="number" min="0" placeholder="Min Qty" value={minTotalQty} onChange={(e) => { setMinTotalQty(e.target.value); setCurrentPage(1); }} className="w-32 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
								<input type="number" min="0" placeholder="Max Qty" value={maxTotalQty} onChange={(e) => { setMaxTotalQty(e.target.value); setCurrentPage(1); }} className="w-32 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
							</div>
						</div>
						<div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
					</div>
					<button type="button" onClick={resetFilters} className="shrink-0 rounded-md border border-primary bg-white px-3 py-2 text-xs font-medium text-primary shadow-sm hover:bg-primary-soft">Reset Filters</button>
				</div>
			</div>

			<div className="border rounded-lg border-gray-200 flex-1 min-h-0 flex flex-col overflow-hidden">
				<div className="flex-1 overflow-y-auto">
					<table className="min-w-full table-fixed divide-y divide-gray-200">
						<thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
							<tr>
								<th className="w-28 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort("UsedBy")}><div className="flex items-center">Used By{sortConfig.key === "UsedBy" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction}</span>}</div></th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Items Used</th>
								<th className="w-24 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort("TotalQuantity")}><div className="flex items-center">Total Quantity{sortConfig.key === "TotalQuantity" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction}</span>}</div></th>
								<th className="w-48 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort("Reason")}><div className="flex items-center">Reason{sortConfig.key === "Reason" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction}</span>}</div></th>
								<th className="w-32 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort("DateAdded")}><div className="flex items-center">Date Used{sortConfig.key === "DateAdded" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction}</span>}</div></th>
								<th className="w-20 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{records.map((record) => (
								<tr key={record.ID} className="hover:bg-gray-50 align-top">
									<td className="px-4 py-4 text-sm text-gray-900 break-words">{record.user?.FullName || "Unknown"}</td>
									<td className="px-4 py-4 text-sm font-medium text-gray-900 break-words"><div className="space-y-1">{(record.ItemsUsed || []).map((item, idx) => <div key={`${record.ID}-${idx}`}>{item.ItemName} x{item.QuantityRemoved}</div>)}</div></td>
									<td className="px-4 py-4 text-sm font-semibold text-gray-900">{record.TotalQuantity}</td>
									<td className="px-4 py-4 text-sm text-gray-500 break-words">{record.Reason || "n/a"}</td>
									<td className="px-4 py-4 text-sm text-gray-500 break-words">{new Date(record.DateAdded).toLocaleString()}</td>
									<td className="px-4 py-4 text-sm">{canEdit ? <button type="button" onClick={() => onEdit?.(record)} className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary-hover"><Pencil className="h-3.5 w-3.5" />Edit</button> : <span className="text-xs text-gray-400">No access</span>}</td>
								</tr>
							))}
							{records.length === 0 && <tr><td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">No stock-out records found.</td></tr>}
						</tbody>
					</table>
				</div>
				<div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="text-sm text-gray-600">{visibleRangeLabel}</div>
						<div className="flex flex-wrap items-center gap-2">
							<label htmlFor="stock-out-items-per-page" className="text-sm text-gray-600">Items per page</label>
							<select id="stock-out-items-per-page" value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option><option value={500}>500</option></select>
							<button type="button" onClick={() => goToPage(1)} disabled={!canGoPrevious} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">First</button>
							<button type="button" onClick={() => goToPage(safeCurrentPage - 1)} disabled={!canGoPrevious} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
							{pageNumbers.map((page) => <button key={page} type="button" onClick={() => goToPage(page)} className={`rounded-md px-3 py-1.5 text-sm ${page === safeCurrentPage ? "border border-primary bg-primary text-white" : "border border-gray-300 text-gray-700 hover:bg-gray-50"}`}>{page}</button>)}
							<button type="button" onClick={() => goToPage(safeCurrentPage + 1)} disabled={!canGoNext} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
							<button type="button" onClick={() => goToPage(totalPages)} disabled={!canGoNext} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">Last</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
