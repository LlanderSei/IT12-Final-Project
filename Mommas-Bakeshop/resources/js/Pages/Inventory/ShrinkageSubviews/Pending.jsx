import React from "react";
import { CheckCircle2, Eye, Pencil, XCircle } from "lucide-react";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value) => {
	if (!value) return "-";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "-";
	return parsed.toLocaleString();
};

export default function Pending({
	records = [],
	sortConfig,
	requestSort,
	onView,
	onVerify,
	onEdit,
	onReject,
	canVerifyShrinkage,
	canUpdateShrinkage,
	filteredCount,
	startIndex,
	itemsPerPage,
	safeCurrentPage,
	pageNumbers,
	canGoPrevious,
	canGoNext,
	goToPage,
	totalPages,
}) {
	return (
		<div className="border rounded-lg border-gray-200 flex-1 min-h-0 flex flex-col overflow-hidden">
			<div className="flex-1 overflow-y-auto">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
						<tr>
							{[
								["ID", "ID"],
								["UserID", "User ID"],
								["Quantity", "Quantity"],
								["TotalAmount", "Total Amount"],
								["Reason", "Reason"],
								["VerificationStatus", "Verification"],
								["DateAdded", "Date Added"],
							].map(([key, label]) => (
								<th
									key={key}
									className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
									onClick={() => requestSort(key)}
								>
									<div className="flex items-center">
										{label}
										{sortConfig.key === key && (
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
						{records.map((record) => (
							<tr key={record.ID} className="hover:bg-gray-50">
								<td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
									{record.ID}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
									<div>{record.UserID}</div>
									<p className="text-xs text-gray-400">{record.CreatedBy}</p>
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
									{record.Quantity}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{currency(record.TotalAmount)}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
									{record.Reason}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
									{record.VerificationStatus || "Pending"}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{formatDateTime(record.DateAdded)}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() => onView(record)}
											className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary-hover"
										>
											<Eye className="h-3.5 w-3.5" />
											View
										</button>
										<button
											type="button"
											onClick={() => onVerify(record)}
											disabled={!canVerifyShrinkage}
											className="inline-flex items-center gap-1.5 rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											<CheckCircle2 className="h-3.5 w-3.5" />
											Confirm Shrinkage
										</button>
										<button
											type="button"
											onClick={() => onEdit(record)}
											disabled={!canUpdateShrinkage}
											className="inline-flex items-center gap-1.5 rounded border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary-soft disabled:opacity-50 disabled:cursor-not-allowed"
										>
											<Pencil className="h-3.5 w-3.5" />
											Edit
										</button>
										<button
											type="button"
											onClick={() => onReject(record)}
											disabled={!canVerifyShrinkage}
											className="inline-flex items-center gap-1.5 rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											<XCircle className="h-3.5 w-3.5" />
											Reject
										</button>
									</div>
								</td>
							</tr>
						))}
						{filteredCount === 0 && (
							<tr>
								<td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
									No pending shrinkage records found.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			<div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="text-sm text-gray-600">
						Showing {filteredCount === 0 ? 0 : startIndex + 1}-
						{Math.min(startIndex + itemsPerPage, filteredCount)} of {filteredCount}
					</div>
					<div className="flex flex-wrap items-center gap-2">
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
