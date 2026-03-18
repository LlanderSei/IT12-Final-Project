import React, { useEffect, useMemo, useState } from "react";
import Modal from "@/Components/Modal";
import { formatCountLabel } from "@/utils/countLabel";
import { Eye } from "lucide-react";

export default function Snapshots({
	snapshots = [],
	onHeaderMetaChange,
	canViewDetails = true,
}) {
	const [searchQuery, setSearchQuery] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(25);
	const [selectedSnapshot, setSelectedSnapshot] = useState(null);
	const [sortConfig, setSortConfig] = useState({
		key: "SnapshotTime",
		direction: "desc",
	});

	const requestSort = (key) => {
		let direction = "asc";
		if (sortConfig.key === key && sortConfig.direction === "asc") {
			direction = "desc";
		}
		setSortConfig({ key, direction });
	};

	const filteredSnapshots = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		const filtered = (snapshots || []).filter((snapshot) => {
			if (!query) return true;
			return (
				String(snapshot.user?.FullName || "")
					.toLowerCase()
					.includes(query) ||
				String(snapshot.SnapshotTime || "")
					.toLowerCase()
					.includes(query) ||
				(snapshot.Leftovers || []).some((line) =>
					String(line.ItemName || "").toLowerCase().includes(query),
				)
			);
		});

		return [...filtered].sort((a, b) => {
			const getValue = (record) => {
				if (sortConfig.key === "SnapshotCreatedBy") {
					return String(record.user?.FullName || "").toLowerCase();
				}
				if (sortConfig.key === "TotalItems") {
					return Number(record.TotalItems || 0);
				}
				if (sortConfig.key === "TotalLeftovers") {
					return Number(record.TotalLeftovers || 0);
				}
				return record.SnapshotTime ? new Date(record.SnapshotTime).getTime() : 0;
			};

			const aValue = getValue(a);
			const bValue = getValue(b);
			if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
			if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
			return 0;
		});
	}, [snapshots, searchQuery, sortConfig]);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, sortConfig, itemsPerPage]);

	const totalPages = Math.max(
		1,
		Math.ceil(filteredSnapshots.length / itemsPerPage),
	);
	const safeCurrentPage = Math.min(currentPage, totalPages);
	const startIndex = (safeCurrentPage - 1) * itemsPerPage;
	const paginatedSnapshots = filteredSnapshots.slice(
		startIndex,
		startIndex + itemsPerPage,
	);
	const canGoPrevious = safeCurrentPage > 1;
	const canGoNext = safeCurrentPage < totalPages;
	const pageNumberWindow = 2;
	const pageStart = Math.max(1, safeCurrentPage - pageNumberWindow);
	const pageEnd = Math.min(totalPages, safeCurrentPage + pageNumberWindow);
	const pageNumbers = Array.from(
		{ length: pageEnd - pageStart + 1 },
		(_, idx) => pageStart + idx,
	);
	const countLabel = formatCountLabel(filteredSnapshots.length, "record");

	useEffect(() => {
		onHeaderMetaChange?.({
			subtitle: "Snapshot History",
			countLabel,
		});
	}, [onHeaderMetaChange, countLabel]);

	const goToPage = (page) => {
		setCurrentPage(Math.min(totalPages, Math.max(1, page)));
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
						placeholder="Search by snapshot creator, date, or item..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
			</div>

			<div className="border rounded-lg border-gray-200 flex-1 min-h-0 flex flex-col overflow-hidden">
				<div className="flex-1 overflow-y-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
							<tr>
								{[
									{ key: "SnapshotCreatedBy", label: "Snapshot Created By" },
									{ key: "TotalItems", label: "Total Items" },
									{ key: "TotalLeftovers", label: "Total Leftovers" },
									{ key: "SnapshotTime", label: "Snapshot Time" },
								].map((col) => (
									<th
										key={col.key}
										className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
										onClick={() => requestSort(col.key)}
									>
										<div className="flex items-center">
											{col.label}
											{sortConfig.key === col.key && (
												<span className="ml-1 text-[10px] text-gray-400">
													{sortConfig.direction}
												</span>
											)}
										</div>
									</th>
								))}
								<th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{paginatedSnapshots.map((snapshot) => (
								<tr key={snapshot.ID} className="hover:bg-gray-50">
									<td className="px-6 py-4 text-sm text-gray-900">
										{snapshot.user?.FullName || "Unknown"}
									</td>
									<td className="px-6 py-4 text-sm text-gray-900">
										{snapshot.TotalItems}
									</td>
									<td className="px-6 py-4 text-sm text-gray-900">
										{snapshot.TotalLeftovers}
									</td>
									<td className="px-6 py-4 text-sm text-gray-500">
										{snapshot.SnapshotTime
											? new Date(snapshot.SnapshotTime).toLocaleString()
											: "-"}
									</td>
									<td className="px-6 py-4 text-sm">
										<button
											type="button"
											onClick={() => setSelectedSnapshot(snapshot)}
											disabled={!canViewDetails}
											className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
										>
											<Eye className="h-3.5 w-3.5" />
											View
										</button>
									</td>
								</tr>
							))}
							{filteredSnapshots.length === 0 && (
								<tr>
									<td
										colSpan="5"
										className="px-6 py-4 text-center text-sm text-gray-500"
									>
										No snapshot records found.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				<div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="text-sm text-gray-600">
							Showing {filteredSnapshots.length === 0 ? 0 : startIndex + 1}-
							{Math.min(startIndex + itemsPerPage, filteredSnapshots.length)} of{" "}
							{filteredSnapshots.length}
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<label
								htmlFor="snapshot-items-per-page"
								className="text-sm text-gray-600"
							>
								Items per page
							</label>
							<select
								id="snapshot-items-per-page"
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
				show={Boolean(selectedSnapshot)}
				onClose={() => setSelectedSnapshot(null)}
				maxWidth="4xl"
			>
				<div className="p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-1">
						Inventory Snapshot Details
					</h3>
					<div className="text-sm text-gray-600 space-y-1 mb-4">
						<p>
							Created By:{" "}
							<span className="font-medium text-gray-800">
								{selectedSnapshot?.user?.FullName || "Unknown"}
							</span>
						</p>
						<p>
							Total Items:{" "}
							<span className="font-medium text-gray-800">
								{selectedSnapshot?.TotalItems || 0}
							</span>
						</p>
						<p>
							Total Leftovers:{" "}
							<span className="font-medium text-gray-800">
								{selectedSnapshot?.TotalLeftovers || 0}
							</span>
						</p>
						<p>
							Snapshot Time:{" "}
							<span className="font-medium text-gray-800">
								{selectedSnapshot?.SnapshotTime
									? new Date(selectedSnapshot.SnapshotTime).toLocaleString()
									: "-"}
							</span>
						</p>
					</div>

					<div className="border rounded-lg border-gray-200 max-h-80 overflow-y-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50 sticky top-0 z-10">
								<tr>
									<th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
										Item Name
									</th>
									<th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
										Item Type
									</th>
									<th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
										Measurement
									</th>
									<th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
										Leftover Quantity
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{(selectedSnapshot?.Leftovers || []).map((line) => (
									<tr key={line.ID}>
										<td className="px-4 py-2 text-sm text-gray-900">
											{line.ItemName}
										</td>
										<td className="px-4 py-2 text-sm text-gray-700">
											{line.ItemType || "-"}
										</td>
										<td className="px-4 py-2 text-sm text-gray-700">
											{line.Measurement || "-"}
										</td>
										<td className="px-4 py-2 text-sm text-gray-900">
											{line.LeftoverQuantity}
										</td>
									</tr>
								))}
								{(selectedSnapshot?.Leftovers || []).length === 0 && (
									<tr>
										<td
											colSpan="4"
											className="px-4 py-4 text-center text-sm text-gray-500"
										>
											No snapshot items found.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>

					<div className="mt-6 flex justify-end">
						<button
							type="button"
							onClick={() => setSelectedSnapshot(null)}
							className="px-4 py-2 text-sm rounded-md border border-primary bg-white text-primary hover:bg-primary-soft"
						>
							Close
						</button>
					</div>
				</div>
			</Modal>
		</div>
	);
}
