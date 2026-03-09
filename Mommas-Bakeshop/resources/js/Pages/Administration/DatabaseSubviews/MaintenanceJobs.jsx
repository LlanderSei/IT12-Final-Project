import React, { useEffect, useMemo, useState } from "react";

const formatDateTime = (value) => {
	if (!value) return "-";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "-";
	return parsed.toLocaleString();
};

export default function MaintenanceJobs({ maintenanceOperations = [] }) {
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(25);

	const orderedOperations = useMemo(
		() => [...maintenanceOperations],
		[maintenanceOperations],
	);

	useEffect(() => {
		setCurrentPage(1);
	}, [itemsPerPage, maintenanceOperations]);

	const totalPages = Math.max(
		1,
		Math.ceil(orderedOperations.length / itemsPerPage),
	);
	const safeCurrentPage = Math.min(currentPage, totalPages);
	const startIndex = (safeCurrentPage - 1) * itemsPerPage;
	const paginatedOperations = orderedOperations.slice(
		startIndex,
		startIndex + itemsPerPage,
	);
	const pageNumberWindow = 2;
	const pageStart = Math.max(1, safeCurrentPage - pageNumberWindow);
	const pageEnd = Math.min(totalPages, safeCurrentPage + pageNumberWindow);
	const pageNumbers = Array.from(
		{ length: pageEnd - pageStart + 1 },
		(_, index) => pageStart + index,
	);
	const canGoPrevious = safeCurrentPage > 1;
	const canGoNext = safeCurrentPage < totalPages;

	const goToPage = (page) => {
		setCurrentPage(Math.min(totalPages, Math.max(1, page)));
	};

	return (
		<div className="min-h-0 flex flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
			<div className="border-b border-gray-200 px-6 py-4">
				<h3 className="text-sm font-semibold text-gray-900">Maintenance Jobs</h3>
				<p className="mt-1 text-xs text-gray-500">Queued and completed maintenance operations are tracked here independently from backup records.</p>
			</div>
			<div className="min-h-0 flex-1 overflow-auto">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
						<tr>
							{["Title", "Status", "Started", "Completed", "Created By", "Notes", "Failure"].map((label) => (
								<th key={label} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-200 bg-white">
						{orderedOperations.length === 0 ? (
							<tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">No maintenance jobs recorded yet.</td></tr>
						) : paginatedOperations.map((operation) => (
							<tr key={operation.id} className="align-top">
								<td className="px-6 py-4 text-sm text-gray-900"><div className="font-medium">{operation.Title}</div><div className="mt-1 text-xs text-gray-500">{operation.OperationType}</div></td>
								<td className="px-6 py-4 text-sm"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${operation.Status === "Completed" ? "bg-emerald-100 text-emerald-700" : operation.Status === "Failed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{operation.Status}</span></td>
								<td className="px-6 py-4 text-sm text-gray-700">{formatDateTime(operation.StartedAt || operation.DateAdded)}</td>
								<td className="px-6 py-4 text-sm text-gray-700">{formatDateTime(operation.CompletedAt)}</td>
								<td className="px-6 py-4 text-sm text-gray-700">{operation.CreatedBy || "System"}</td>
								<td className="px-6 py-4 text-sm text-gray-700"><div className="max-w-xs break-words">{operation.Notes || "-"}</div></td>
								<td className="px-6 py-4 text-sm text-red-600"><div className="max-w-xs break-words">{operation.FailureMessage || "-"}</div></td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="text-sm text-gray-600">
						Showing {orderedOperations.length === 0 ? 0 : startIndex + 1}-
						{Math.min(startIndex + itemsPerPage, orderedOperations.length)} of{" "}
						{orderedOperations.length}
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<label
							htmlFor="maintenance-jobs-items-per-page"
							className="text-sm text-gray-600"
						>
							Items per page
						</label>
						<select
							id="maintenance-jobs-items-per-page"
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
	);
}
