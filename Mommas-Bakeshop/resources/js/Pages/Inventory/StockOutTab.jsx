import React, { useState, useMemo } from "react";

export default function StockOutTab({ stockOuts }) {
	const [searchQuery, setSearchQuery] = useState("");

	const filteredStockOuts = useMemo(() => {
		if (!searchQuery) return stockOuts || [];
		const query = searchQuery.toLowerCase();
		return (stockOuts || []).filter(
			(record) =>
				record.inventory?.ItemName.toLowerCase().includes(query) ||
				record.user?.FullName.toLowerCase().includes(query) ||
				record.Reason.toLowerCase().includes(query),
		);
	}, [stockOuts, searchQuery]);

	return (
		<div className="flex flex-col flex-1 overflow-hidden min-h-0">
			<div className="flex justify-between items-center mb-6">
				<h3 className="text-xl font-bold text-gray-900">Stock-Out History</h3>
				<div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
					{filteredStockOuts.length} Records
				</div>
			</div>

			<div className="mb-6">
				<div className="relative">
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
						className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#D97736] focus:border-[#D97736] sm:text-sm"
						placeholder="Search by item name, user, or reason..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
			</div>

			<div className="border rounded-lg border-gray-200 flex-1 overflow-y-auto">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
						<tr>
							<th
								scope="col"
								className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
							>
								Used By
							</th>
							<th
								scope="col"
								className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
							>
								Item Name
							</th>
							<th
								scope="col"
								className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
							>
								Quantity Removed
							</th>
							<th
								scope="col"
								className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
							>
								Reason
							</th>
							<th
								scope="col"
								className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
							>
								Date Used
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{filteredStockOuts.map((record) => (
							<tr key={record.ID} className="hover:bg-gray-50">
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{record.user?.FullName || "Unknown"}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
									{record.inventory?.ItemName || "Deleted Item"}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-red-600 font-semibold">
									-{record.QuantityRemoved} {record.inventory?.Measurement}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{record.Reason}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{new Date(record.DateAdded).toLocaleString()}
								</td>
							</tr>
						))}
						{filteredStockOuts.length === 0 && (
							<tr>
								<td
									colSpan="5"
									className="px-6 py-4 text-center text-sm text-gray-500"
								>
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
