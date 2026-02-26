import React, { useMemo, useState } from "react";

function toComparableDate(value) {
	if (!value) return null;
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return null;
	return d;
}

export default function StockOut({ stockOuts, onEdit }) {
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

	return (
		<div className="flex flex-col flex-1 overflow-hidden min-h-0">
			<div className="flex justify-between items-center mb-6">
				<h3 className="text-xl font-bold text-gray-900">Stock-Out History</h3>
				<div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
					{filteredStockOuts.length} Records
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
						placeholder="Search item, user, reason..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
				<div className="flex flex-1 min-w-0 items-center gap-2">
					<div className="relative flex-1 min-w-0">
						<div className="overflow-x-auto pb-1 pr-4">
							<div className="flex min-w-max items-center gap-2 pr-3">
							<select value={usedByFilter} onChange={(e) => setUsedByFilter(e.target.value)} className="w-40 rounded-md border-gray-300 text-sm focus:border-[#D97736] focus:ring-[#D97736]">
								<option value="all">All Used By</option>
								{usedByOptions.map((name) => (
									<option key={name} value={name}>{name}</option>
								))}
							</select>
							<select value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)} className="w-40 rounded-md border-gray-300 text-sm focus:border-[#D97736] focus:ring-[#D97736]">
								<option value="all">All Reasons</option>
								{reasonOptions.map((reason) => (
									<option key={reason} value={reason}>{reason}</option>
								))}
							</select>
							<select value={itemTypeFilter} onChange={(e) => setItemTypeFilter(e.target.value)} className="w-36 rounded-md border-gray-300 text-sm focus:border-[#D97736] focus:ring-[#D97736]">
								<option value="all">All Item Types</option>
								<option value="Inventory">Inventory</option>
								<option value="Product">Product</option>
							</select>
							<input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40 rounded-md border-gray-300 text-sm focus:border-[#D97736] focus:ring-[#D97736]" />
							<span className="text-sm text-gray-500">~</span>
							<input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40 rounded-md border-gray-300 text-sm focus:border-[#D97736] focus:ring-[#D97736]" />
							<input type="number" min="0" placeholder="Min Qty" value={minTotalQty} onChange={(e) => setMinTotalQty(e.target.value)} className="w-32 rounded-md border-gray-300 text-sm focus:border-[#D97736] focus:ring-[#D97736]" />
							<input type="number" min="0" placeholder="Max Qty" value={maxTotalQty} onChange={(e) => setMaxTotalQty(e.target.value)} className="w-32 rounded-md border-gray-300 text-sm focus:border-[#D97736] focus:ring-[#D97736]" />
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
						{filteredStockOuts.map((record) => (
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
										className="rounded border border-[#D97736] px-3 py-1 text-xs font-medium text-[#D97736] hover:bg-[#FDEFE6]"
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
		</div>
	);
}
