import React, { useEffect, useMemo, useRef, useState } from "react";
import { router } from "@inertiajs/react";
import Modal from "@/Components/Modal";
import { formatCountLabel } from "@/utils/countLabel";
import { Eye, Pencil } from "lucide-react";

const formatCurrency = (value) => `PHP ${Number(value || 0).toFixed(2)}`;

const formatDate = (value) => {
	if (!value) return "n/a";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "n/a";
	return parsed.toLocaleDateString();
};

const formatDateTime = (value) => {
	if (!value) return "n/a";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "n/a";
	return parsed.toLocaleString();
};

export default function StockIn({
	stockIns = { data: [], current_page: 1, last_page: 1, per_page: 25, total: 0, from: null, to: null },
	filters = {},
	filterOptions = {},
	fetchRoute,
	onEdit,
	onHeaderMetaChange,
	canEdit = false,
}) {
	const [searchQuery, setSearchQuery] = useState(filters.search || "");
	const [addedByFilter, setAddedByFilter] = useState(filters.addedBy || "all");
	const [supplierFilter, setSupplierFilter] = useState(filters.supplier || "all");
	const [itemTypeFilter, setItemTypeFilter] = useState(filters.itemType || "all");
	const [hasPurchaseDateFilter, setHasPurchaseDateFilter] = useState(filters.hasPurchaseDate || "all");
	const [dateFrom, setDateFrom] = useState(filters.dateFrom || "");
	const [dateTo, setDateTo] = useState(filters.dateTo || "");
	const [minTotalAmount, setMinTotalAmount] = useState(filters.minTotalAmount || "");
	const [maxTotalAmount, setMaxTotalAmount] = useState(filters.maxTotalAmount || "");
	const [sortConfig, setSortConfig] = useState({
		key: filters.sortKey || "DateAdded",
		direction: filters.sortDirection || "desc",
	});
	const [currentPage, setCurrentPage] = useState(Number(filters.page || stockIns.current_page || 1));
	const [itemsPerPage, setItemsPerPage] = useState(Number(filters.perPage || stockIns.per_page || 25));
	const [selectedRecord, setSelectedRecord] = useState(null);
	const isFirstRender = useRef(true);

	const records = stockIns.data || [];
	const addedByOptions = filterOptions.addedBy || [];
	const supplierOptions = filterOptions.supplier || [];

	useEffect(() => {
		setSearchQuery(filters.search || "");
		setAddedByFilter(filters.addedBy || "all");
		setSupplierFilter(filters.supplier || "all");
		setItemTypeFilter(filters.itemType || "all");
		setHasPurchaseDateFilter(filters.hasPurchaseDate || "all");
		setDateFrom(filters.dateFrom || "");
		setDateTo(filters.dateTo || "");
		setMinTotalAmount(filters.minTotalAmount || "");
		setMaxTotalAmount(filters.maxTotalAmount || "");
		setSortConfig({
			key: filters.sortKey || "DateAdded",
			direction: filters.sortDirection || "desc",
		});
		setCurrentPage(Number(filters.page || stockIns.current_page || 1));
		setItemsPerPage(Number(filters.perPage || stockIns.per_page || 25));
		setSelectedRecord(null);
	}, [
		filters.search,
		filters.addedBy,
		filters.supplier,
		filters.itemType,
		filters.hasPurchaseDate,
		filters.dateFrom,
		filters.dateTo,
		filters.minTotalAmount,
		filters.maxTotalAmount,
		filters.sortKey,
		filters.sortDirection,
		filters.page,
		filters.perPage,
		stockIns.current_page,
		stockIns.per_page,
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
					stockInSearch: searchQuery,
					stockInAddedBy: addedByFilter,
					stockInSupplier: supplierFilter,
					stockInItemType: itemTypeFilter,
					stockInHasPurchaseDate: hasPurchaseDateFilter,
					stockInDateFrom: dateFrom,
					stockInDateTo: dateTo,
					stockInMinTotalAmount: minTotalAmount,
					stockInMaxTotalAmount: maxTotalAmount,
					stockInSortKey: sortConfig.key,
					stockInSortDirection: sortConfig.direction,
					stockInPerPage: itemsPerPage,
					page: currentPage,
				},
				{
					preserveState: true,
					preserveScroll: true,
					replace: true,
					only: ["stockIns", "stockInFilters", "stockInFilterOptions"],
				},
			);
		}, 250);

		return () => window.clearTimeout(timeoutId);
	}, [searchQuery, addedByFilter, supplierFilter, itemTypeFilter, hasPurchaseDateFilter, dateFrom, dateTo, minTotalAmount, maxTotalAmount, sortConfig, itemsPerPage, currentPage, fetchRoute]);

	const resetFilters = () => {
		setSearchQuery("");
		setAddedByFilter("all");
		setSupplierFilter("all");
		setItemTypeFilter("all");
		setHasPurchaseDateFilter("all");
		setDateFrom("");
		setDateTo("");
		setMinTotalAmount("");
		setMaxTotalAmount("");
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

	const totalPages = Math.max(1, Number(stockIns.last_page || 1));
	const safeCurrentPage = Math.min(currentPage, totalPages);
	const pageNumberWindow = 2;
	const pageStart = Math.max(1, safeCurrentPage - pageNumberWindow);
	const pageEnd = Math.min(totalPages, safeCurrentPage + pageNumberWindow);
	const pageNumbers = Array.from({ length: pageEnd - pageStart + 1 }, (_, idx) => pageStart + idx);
	const canGoPrevious = safeCurrentPage > 1;
	const canGoNext = safeCurrentPage < totalPages;
	const countLabel = formatCountLabel(Number(stockIns.total || 0), "record");
	const visibleRangeLabel = useMemo(() => {
		const from = Number(stockIns.from || 0);
		const to = Number(stockIns.to || 0);
		const total = Number(stockIns.total || 0);
		return `Showing ${from}-${to} of ${total}`;
	}, [stockIns.from, stockIns.to, stockIns.total]);

	const goToPage = (page) => {
		setCurrentPage(Math.min(totalPages, Math.max(1, page)));
	};

	useEffect(() => {
		onHeaderMetaChange?.({
			subtitle: "Stock-In History",
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
						placeholder="Search item, supplier, user, notes..."
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
								<select value={addedByFilter} onChange={(e) => { setAddedByFilter(e.target.value); setCurrentPage(1); }} className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
									<option value="all">All Added By</option>
									{addedByOptions.map((name) => (
										<option key={name} value={name}>{name}</option>
									))}
								</select>
								<select value={supplierFilter} onChange={(e) => { setSupplierFilter(e.target.value); setCurrentPage(1); }} className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
									<option value="all">All Suppliers</option>
									{supplierOptions.map((option) => (
										<option key={option} value={option}>{option}</option>
									))}
								</select>
								<select value={itemTypeFilter} onChange={(e) => { setItemTypeFilter(e.target.value); setCurrentPage(1); }} className="w-36 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
									<option value="all">All Item Types</option>
									<option value="Inventory">Inventory</option>
									<option value="Product">Product</option>
								</select>
								<select value={hasPurchaseDateFilter} onChange={(e) => { setHasPurchaseDateFilter(e.target.value); setCurrentPage(1); }} className="w-44 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
									<option value="all">Purchase Date: Any</option>
									<option value="with">With Purchase Date</option>
									<option value="without">Without Purchase Date</option>
								</select>
								<input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }} className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
								<span className="text-sm text-gray-500">~</span>
								<input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }} className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
								<input type="number" min="0" step="0.01" placeholder="Min Amount" value={minTotalAmount} onChange={(e) => { setMinTotalAmount(e.target.value); setCurrentPage(1); }} className="w-32 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
								<input type="number" min="0" step="0.01" placeholder="Max Amount" value={maxTotalAmount} onChange={(e) => { setMaxTotalAmount(e.target.value); setCurrentPage(1); }} className="w-32 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
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
								<th className="w-28 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort("AddedBy")}>
									<div className="flex items-center">Added By{sortConfig.key === "AddedBy" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction}</span>}</div>
								</th>
								<th className="w-36 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort("Supplier")}>
									<div className="flex items-center">Supplier{sortConfig.key === "Supplier" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction}</span>}</div>
								</th>
								<th className="w-28 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort("PurchaseDate")}>
									<div className="flex items-center">Purchase Date{sortConfig.key === "PurchaseDate" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction}</span>}</div>
								</th>
								<th className="w-40 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Purchase Details</th>
								<th className="w-24 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort("TotalQuantity")}>
									<div className="flex items-center">Total Quantity{sortConfig.key === "TotalQuantity" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction}</span>}</div>
								</th>
								<th className="w-28 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort("TotalAmount")}>
									<div className="flex items-center">Total Amount{sortConfig.key === "TotalAmount" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction}</span>}</div>
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort("AdditionalDetails")}>
									<div className="flex items-center">Additional Details{sortConfig.key === "AdditionalDetails" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction}</span>}</div>
								</th>
								<th className="w-32 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort("DateAdded")}>
									<div className="flex items-center">Date Created{sortConfig.key === "DateAdded" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction}</span>}</div>
								</th>
								<th className="w-20 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{records.map((record) => (
								<tr key={record.ID} className="hover:bg-gray-50 align-top">
									<td className="px-4 py-4 text-sm text-gray-900 break-words">{record.user?.FullName || "Unknown"}</td>
									<td className="px-4 py-4 text-sm text-gray-500 break-words">{record.Supplier || "-"}</td>
									<td className="px-4 py-4 text-sm text-gray-900 break-words">{formatDate(record.PurchaseDate)}</td>
									<td className="px-4 py-4 text-sm text-gray-900 break-words"><div>Receipt: {record.ReceiptNumber || "n/a"}</div><div>Invoice: {record.InvoiceNumber || "n/a"}</div></td>
									<td className="px-4 py-4 text-sm text-gray-900">{record.TotalQuantity}</td>
									<td className="px-4 py-4 text-sm font-semibold text-gray-900">{formatCurrency(record.TotalAmount)}</td>
									<td className="px-4 py-4 text-sm text-gray-500 break-words">{record.AdditionalDetails || "-"}</td>
									<td className="px-4 py-4 text-sm text-gray-500 break-words">{formatDateTime(record.DateAdded)}</td>
									<td className="px-4 py-4 text-sm">
										<div className="flex items-center gap-2">
											<button type="button" onClick={() => setSelectedRecord(record)} className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary-hover"><Eye className="h-3.5 w-3.5" />View</button>
											{canEdit ? (
												<button type="button" onClick={() => onEdit?.(record)} className="inline-flex items-center gap-1.5 rounded border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary-soft"><Pencil className="h-3.5 w-3.5" />Edit</button>
											) : (
												<span className="text-xs text-gray-400">No access</span>
											)}
										</div>
									</td>
								</tr>
							))}
							{records.length === 0 && (
								<tr><td colSpan="9" className="px-6 py-4 text-center text-sm text-gray-500">No stock-in records found.</td></tr>
							)}
						</tbody>
					</table>
				</div>
				<div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="text-sm text-gray-600">{visibleRangeLabel}</div>
						<div className="flex flex-wrap items-center gap-2">
							<label htmlFor="stock-in-items-per-page" className="text-sm text-gray-600">Items per page</label>
							<select id="stock-in-items-per-page" value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
								<option value={25}>25</option>
								<option value={50}>50</option>
								<option value={100}>100</option>
								<option value={500}>500</option>
							</select>
							<button type="button" onClick={() => goToPage(1)} disabled={!canGoPrevious} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">First</button>
							<button type="button" onClick={() => goToPage(safeCurrentPage - 1)} disabled={!canGoPrevious} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
							{pageNumbers.map((page) => (
								<button key={page} type="button" onClick={() => goToPage(page)} className={`rounded-md px-3 py-1.5 text-sm ${page === safeCurrentPage ? "border border-primary bg-primary text-white" : "border border-gray-300 text-gray-700 hover:bg-gray-50"}`}>{page}</button>
							))}
							<button type="button" onClick={() => goToPage(safeCurrentPage + 1)} disabled={!canGoNext} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
							<button type="button" onClick={() => goToPage(totalPages)} disabled={!canGoNext} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">Last</button>
						</div>
					</div>
				</div>
			</div>
			<Modal show={Boolean(selectedRecord)} onClose={() => setSelectedRecord(null)} maxWidth="4xl">
				{selectedRecord && (
					<div className="p-6 max-h-[80vh] overflow-y-auto">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">Stock-In Details</h3>
						<div className="grid grid-cols-1 gap-3 md:grid-cols-2 text-sm">
							<div><span className="font-semibold text-gray-700">Added By:</span> <span className="text-gray-900">{selectedRecord.user?.FullName || "Unknown"}</span></div>
							<div><span className="font-semibold text-gray-700">Supplier:</span> <span className="text-gray-900">{selectedRecord.Supplier || "-"}</span></div>
							<div><span className="font-semibold text-gray-700">Purchase Date:</span> <span className="text-gray-900">{formatDate(selectedRecord.PurchaseDate)}</span></div>
							<div><span className="font-semibold text-gray-700">Receipt #:</span> <span className="text-gray-900">{selectedRecord.ReceiptNumber || "n/a"}</span></div>
							<div><span className="font-semibold text-gray-700">Invoice #:</span> <span className="text-gray-900">{selectedRecord.InvoiceNumber || "n/a"}</span></div>
							<div><span className="font-semibold text-gray-700">Total Quantity:</span> <span className="text-gray-900">{selectedRecord.TotalQuantity}</span></div>
							<div><span className="font-semibold text-gray-700">Total Amount:</span> <span className="text-gray-900">{formatCurrency(selectedRecord.TotalAmount)}</span></div>
							<div className="md:col-span-2"><span className="font-semibold text-gray-700">Additional Details:</span> <span className="text-gray-900">{selectedRecord.AdditionalDetails || "-"}</span></div>
							<div className="md:col-span-2"><span className="font-semibold text-gray-700">Date Created:</span> <span className="text-gray-900">{formatDateTime(selectedRecord.DateAdded)}</span></div>
						</div>
						<div className="mt-6">
							<h4 className="text-sm font-semibold text-gray-700 mb-2">Items Purchased</h4>
							<div className="max-h-80 overflow-y-auto rounded border border-gray-200">
								<table className="min-w-full text-sm">
									<thead className="bg-gray-50 sticky top-0 z-10"><tr><th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Item Name</th><th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th><th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th><th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit Cost</th><th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subtotal</th></tr></thead>
									<tbody className="divide-y divide-gray-200 bg-white">
										{(selectedRecord.ItemsPurchased || []).map((item, idx) => (
											<tr key={`${selectedRecord.ID}-${idx}`}><td className="px-3 py-2 text-gray-900">{item.ItemName || "-"}</td><td className="px-3 py-2 text-gray-700">{item.ItemType || "-"}</td><td className="px-3 py-2 text-gray-700">{item.QuantityAdded ?? 0}</td><td className="px-3 py-2 text-gray-700">{formatCurrency(item.UnitCost)}</td><td className="px-3 py-2 text-gray-900 font-medium">{formatCurrency(item.SubAmount)}</td></tr>
										))}
										{(selectedRecord.ItemsPurchased || []).length === 0 && <tr><td colSpan="5" className="px-3 py-4 text-center text-gray-500">No items found.</td></tr>}
									</tbody>
								</table>
							</div>
						</div>
						<div className="mt-6 flex justify-end"><button type="button" onClick={() => setSelectedRecord(null)} className="px-4 py-2 text-sm rounded-md border border-primary bg-white text-primary hover:bg-primary-soft">Close</button></div>
					</div>
				)}
			</Modal>
		</div>
	);
}
