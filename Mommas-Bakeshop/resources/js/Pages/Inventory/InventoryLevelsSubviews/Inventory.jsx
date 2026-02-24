import React, { useState, useMemo } from "react";

export default function Inventory({ inventory, onEdit, getStatus }) {
	const [searchQuery, setSearchQuery] = useState("");
	const [sortConfig, setSortConfig] = useState({
		key: "ItemName",
		direction: "asc",
	});

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
	}, [inventory, searchQuery, sortConfig, getStatus]);

	return (
		<div className="flex flex-col flex-1 overflow-hidden min-h-0">
			{/* Header & Search */}
			<div className="flex justify-between items-center mb-6">
				<h3 className="text-xl font-bold text-gray-900">
					Raw Materials & Supplies
				</h3>
				<div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
					{filteredAndSortedItems.length} Items
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
						placeholder="Search by name, type, measurement, or status..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
			</div>

			{/* Table */}
			<div className="border rounded-lg border-gray-200 flex-1 overflow-y-auto">
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
											<span className="ml-1">
												{sortConfig.direction === "asc" ? "↑" : "↓"}
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
							<th scope="col" className="relative px-6 py-3">
								<span className="sr-only">Edit</span>
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{filteredAndSortedItems.map((item) => (
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
								<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
									<button
										onClick={() => onEdit(item)}
										className="text-gray-400 hover:text-[#D97736]"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-5 w-5"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											strokeWidth={2}
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
											/>
										</svg>
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
		</div>
	);
}
