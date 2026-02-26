import React, { useMemo, useState } from "react";

function toComparableDate(value) {
	if (!value) return null;
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return null;
	return d;
}

export default function StockIn({ stockIns, onEdit }) {
	const [searchQuery, setSearchQuery] = useState("");
	const [addedByFilter, setAddedByFilter] = useState("all");
	const [supplierFilter, setSupplierFilter] = useState("all");
	const [itemTypeFilter, setItemTypeFilter] = useState("all");
	const [hasPurchaseDateFilter, setHasPurchaseDateFilter] = useState("all");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [minTotalAmount, setMinTotalAmount] = useState("");
	const [maxTotalAmount, setMaxTotalAmount] = useState("");
	const [sortConfig, setSortConfig] = useState({
		key: "DateAdded",
		direction: "desc",
	});

	const records = stockIns || [];

	const addedByOptions = useMemo(
		() => [...new Set(records.map((r) => r.user?.FullName).filter(Boolean))],
		[records],
	);

	const supplierOptions = useMemo(
		() => [...new Set(records.map((r) => r.Supplier).filter(Boolean))],
		[records],
	);

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
			case "AddedBy":
				return String(record.user?.FullName || "").toLowerCase();
			case "ItemsPurchased":
				return String(
					(record.ItemsPurchased || []).map((item) => item.ItemName || "").join(" "),
				).toLowerCase();
			case "Supplier":
				return String(record.Supplier || "").toLowerCase();
			case "PurchaseDate":
				return record.PurchaseDate ? new Date(record.PurchaseDate).getTime() : 0;
			case "TotalQuantity":
				return Number(record.TotalQuantity || 0);
			case "TotalAmount":
				return Number(record.TotalAmount || 0);
			case "AdditionalDetails":
				return String(record.AdditionalDetails || "").toLowerCase();
			case "DateAdded":
				return record.DateAdded ? new Date(record.DateAdded).getTime() : 0;
			default:
				return "";
		}
	};

	const filteredStockIns = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		const from = toComparableDate(dateFrom);
		const to = toComparableDate(dateTo);
		if (to) to.setHours(23, 59, 59, 999);
		const minAmount = Number(minTotalAmount);
		const maxAmount = Number(maxTotalAmount);

		const filtered = records.filter((record) => {
			if (query) {
				const matchesQuery =
					record.user?.FullName?.toLowerCase().includes(query) ||
					record.Supplier?.toLowerCase().includes(query) ||
					(record.AdditionalDetails || "").toLowerCase().includes(query) ||
					record.ItemsPurchased?.some((item) =>
						item.ItemName?.toLowerCase().includes(query),
					);
				if (!matchesQuery) return false;
			}

			if (addedByFilter !== "all" && record.user?.FullName !== addedByFilter) {
				return false;
			}

			if (supplierFilter !== "all" && record.Supplier !== supplierFilter) {
				return false;
			}

			if (itemTypeFilter !== "all") {
				const hasType = (record.ItemsPurchased || []).some(
					(item) => item.ItemType === itemTypeFilter,
				);
				if (!hasType) return false;
			}

			if (hasPurchaseDateFilter === "with" && !record.PurchaseDate) return false;
			if (hasPurchaseDateFilter === "without" && record.PurchaseDate) return false;

			const created = toComparableDate(record.DateAdded);
			if (from && (!created || created < from)) return false;
			if (to && (!created || created > to)) return false;

			if (String(minTotalAmount).trim() !== "" && !Number.isNaN(minAmount)) {
				if (Number(record.TotalAmount || 0) < minAmount) return false;
			}
			if (String(maxTotalAmount).trim() !== "" && !Number.isNaN(maxAmount)) {
				if (Number(record.TotalAmount || 0) > maxAmount) return false;
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
		addedByFilter,
		supplierFilter,
		itemTypeFilter,
		hasPurchaseDateFilter,
		dateFrom,
		dateTo,
		minTotalAmount,
		maxTotalAmount,
		sortConfig,
	]);

	return (
		<div className="flex flex-col flex-1 overflow-hidden min-h-0">
			<div className="flex justify-between items-center mb-6">
				<h3 className="text-xl font-bold text-gray-900">Stock-In History</h3>
				<div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
					{filteredStockIns.length} Records
				</div>
			</div>

			<div className="mb-6 flex items-start gap-3">
				<div className="relative w-full max-w-xl shrink-0">
					<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
						<svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
					</div>
					<input
						type="text"
						className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#D97736] focus:border-[#D97736] sm:text-sm"
						placeholder="Search item, supplier, user, notes..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
				<div className="flex flex-1 min-w-0 items-center gap-2">
					<div className="relative flex-1 min-w-0">
						<div className="overflow-x-auto pb-1 pr-4">
							<div className="flex min-w-max items-center gap-2 pr-3">
							<select value={addedByFilter} onChange={(e) => setAddedByFilter(e.target.value)} className="w-40 rounded-md border-gray-300 text-sm focus:border-[#D97736] focus:ring-[#D97736]">
								<option value="all">All Added By</option>
								{addedByOptions.map((name) => (
									<option key={name} value={name}>{name}</option>
								))}
							</select>
							<select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className="w-40 rounded-md border-gray-300 text-sm focus:border-[#D97736] focus:ring-[#D97736]">
								<option value="all">All Suppliers</option>
								{supplierOptions.map((supplier) => (
									<option key={supplier} value={supplier}>{supplier}</option>
								))}
							</select>
							<select value={itemTypeFilter} onChange={(e) => setItemTypeFilter(e.target.value)} className="w-36 rounded-md border-gray-300 text-sm focus:border-[#D97736] focus:ring-[#D97736]">
								<option value="all">All Item Types</option>
								<option value="Inventory">Inventory</option>
								<option value="Product">Product</option>
							</select>
							<select value={hasPurchaseDateFilter} onChange={(e) => setHasPurchaseDateFilter(e.target.value)} className="w-44 rounded-md border-gray-300 text-sm focus:border-[#D97736] focus:ring-[#D97736]">
								<option value="all">Purchase Date: Any</option>
								<option value="with">With Purchase Date</option>
								<option value="without">Without Purchase Date</option>
							</select>
							<input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40 rounded-md border-gray-300 text-sm focus:border-[#D97736] focus:ring-[#D97736]" />
							<span className="text-sm text-gray-500">~</span>
							<input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40 rounded-md border-gray-300 text-sm focus:border-[#D97736] focus:ring-[#D97736]" />
							<input type="number" min="0" step="0.01" placeholder="Min Amount" value={minTotalAmount} onChange={(e) => setMinTotalAmount(e.target.value)} className="w-32 rounded-md border-gray-300 text-sm focus:border-[#D97736] focus:ring-[#D97736]" />
							<input type="number" min="0" step="0.01" placeholder="Max Amount" value={maxTotalAmount} onChange={(e) => setMaxTotalAmount(e.target.value)} className="w-32 rounded-md border-gray-300 text-sm focus:border-[#D97736] focus:ring-[#D97736]" />
							</div>
						</div>
						<div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
					</div>
					<button
						type="button"
						onClick={resetFilters}
						className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
					>
						Reset Filters
					</button>
				</div>
			</div>

			<div className="border rounded-lg border-gray-200 flex-1 overflow-y-auto">
				<table className="min-w-full table-fixed divide-y divide-gray-200">
					<thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
						<tr>
							<th
								className="w-28 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
								onClick={() => requestSort("AddedBy")}
							>
								<div className="flex items-center">
									Added By
									{sortConfig.key === "AddedBy" && (
										<span className="ml-1 text-[10px] text-gray-400">
											{sortConfig.direction}
										</span>
									)}
								</div>
							</th>
							<th
								className="w-[30rem] px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
								onClick={() => requestSort("ItemsPurchased")}
							>
								<div className="flex items-center">
									Items Purchased
									{sortConfig.key === "ItemsPurchased" && (
										<span className="ml-1 text-[10px] text-gray-400">
											{sortConfig.direction}
										</span>
									)}
								</div>
							</th>
							<th
								className="w-36 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
								onClick={() => requestSort("Supplier")}
							>
								<div className="flex items-center">
									Supplier
									{sortConfig.key === "Supplier" && (
										<span className="ml-1 text-[10px] text-gray-400">
											{sortConfig.direction}
										</span>
									)}
								</div>
							</th>
							<th
								className="w-28 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
								onClick={() => requestSort("PurchaseDate")}
							>
								<div className="flex items-center">
									Purchase Date
									{sortConfig.key === "PurchaseDate" && (
										<span className="ml-1 text-[10px] text-gray-400">
											{sortConfig.direction}
										</span>
									)}
								</div>
							</th>
							<th className="w-40 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Purchase Details</th>
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
								className="w-28 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
								onClick={() => requestSort("TotalAmount")}
							>
								<div className="flex items-center">
									Total Amount
									{sortConfig.key === "TotalAmount" && (
										<span className="ml-1 text-[10px] text-gray-400">
											{sortConfig.direction}
										</span>
									)}
								</div>
							</th>
							<th
								className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
								onClick={() => requestSort("AdditionalDetails")}
							>
								<div className="flex items-center">
									Additional Details
									{sortConfig.key === "AdditionalDetails" && (
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
									Date Created
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
						{filteredStockIns.map((record) => (
							<tr key={record.ID} className="hover:bg-gray-50 align-top">
								<td className="px-4 py-4 text-sm text-gray-900 break-words">{record.user?.FullName || "Unknown"}</td>
								<td className="px-4 py-4 text-sm text-gray-900 break-words">
									<div className="space-y-1">
										{(record.ItemsPurchased || []).map((item, idx) => (
											<div key={`${record.ID}-${idx}`}>
												{item.ItemName} | Qty.: {item.QuantityAdded} - Unit Cost: PHP {Number(item.UnitCost).toFixed(2)} - Subtotal: PHP {Number(item.SubAmount).toFixed(2)}
											</div>
										))}
									</div>
								</td>
								<td className="px-4 py-4 text-sm text-gray-500 break-words">{record.Supplier || "-"}</td>
								<td className="px-4 py-4 text-sm text-gray-900 break-words">{record.PurchaseDate ? new Date(record.PurchaseDate).toLocaleDateString() : "n/a"}</td>
								<td className="px-4 py-4 text-sm text-gray-900 break-words">
									<div>Receipt: {record.ReceiptNumber || "n/a"}</div>
									<div>Invoice: {record.InvoiceNumber || "n/a"}</div>
								</td>
								<td className="px-4 py-4 text-sm text-gray-900">{record.TotalQuantity}</td>
								<td className="px-4 py-4 text-sm font-semibold text-gray-900">PHP {Number(record.TotalAmount).toFixed(2)}</td>
								<td className="px-4 py-4 text-sm text-gray-500 break-words">{record.AdditionalDetails || "-"}</td>
								<td className="px-4 py-4 text-sm text-gray-500 break-words">{new Date(record.DateAdded).toLocaleString()}</td>
								<td className="px-4 py-4 text-sm">
									<button
										type="button"
										onClick={() => onEdit?.(record)}
										className="rounded border border-[#D97736] px-3 py-1 text-xs font-medium text-[#D97736] hover:bg-[#FDEFE6]"
									>
										Edit
									</button>
								</td>
							</tr>
						))}
						{filteredStockIns.length === 0 && (
							<tr>
								<td colSpan="10" className="px-6 py-4 text-center text-sm text-gray-500">
									No stock-in records found.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
