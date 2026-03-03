import React, { useEffect, useMemo, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";

export default function Audits({ audits = [] }) {
	const [searchQuery, setSearchQuery] = useState("");
	const [actionFilter, setActionFilter] = useState("all");
	const [tableFilter, setTableFilter] = useState("all");
	const [sourceFilter, setSourceFilter] = useState("all");
	const [dateRangeFilter, setDateRangeFilter] = useState("all");
	const [sortConfig, setSortConfig] = useState({
		key: "DateAdded",
		direction: "desc",
	});
	const [selectedAudit, setSelectedAudit] = useState(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(25);

	const actionOptions = useMemo(
		() => [...new Set(audits.map((audit) => audit.Action).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
		[audits],
	);

	const tableOptions = useMemo(
		() => [...new Set(audits.map((audit) => audit.TableEdited).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
		[audits],
	);

	const sourceOptions = useMemo(
		() => [...new Set(audits.map((audit) => audit.Source).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
		[audits],
	);

	const isInDateRange = (auditDate) => {
		if (dateRangeFilter === "all") return true;

		const now = new Date();
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const date = new Date(auditDate);
		if (Number.isNaN(date.getTime())) return false;

		if (dateRangeFilter === "today") {
			return date >= todayStart;
		}
		if (dateRangeFilter === "last7") {
			const cutoff = new Date(todayStart);
			cutoff.setDate(cutoff.getDate() - 6);
			return date >= cutoff;
		}
		if (dateRangeFilter === "last30") {
			const cutoff = new Date(todayStart);
			cutoff.setDate(cutoff.getDate() - 29);
			return date >= cutoff;
		}
		if (dateRangeFilter === "thisMonth") {
			return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
		}
		if (dateRangeFilter === "thisYear") {
			return date.getFullYear() === now.getFullYear();
		}

		return true;
	};

	const getSortValue = (audit, key) => {
		if (key === "User") return audit.user?.FullName || "";
		if (key === "DateAdded") return new Date(audit.DateAdded).getTime() || 0;
		return audit[key] || "";
	};

	const filteredAudits = useMemo(() => {
		const searchLower = searchQuery.toLowerCase().trim();

		const filtered = audits.filter((audit) => {
			const matchesSearch =
				!searchLower ||
				audit.user?.FullName?.toLowerCase().includes(searchLower) ||
				audit.TableEdited?.toLowerCase().includes(searchLower) ||
				audit.Action?.toLowerCase().includes(searchLower) ||
				audit.Source?.toLowerCase().includes(searchLower) ||
				audit.PreviousChanges?.toLowerCase().includes(searchLower) ||
				audit.SavedChanges?.toLowerCase().includes(searchLower) ||
				audit.ReadableChanges?.toLowerCase().includes(searchLower) ||
				new Date(audit.DateAdded).toLocaleString().toLowerCase().includes(searchLower);
			const matchesAction = actionFilter === "all" || audit.Action === actionFilter;
			const matchesTable = tableFilter === "all" || audit.TableEdited === tableFilter;
			const matchesSource = sourceFilter === "all" || audit.Source === sourceFilter;
			const matchesDate = isInDateRange(audit.DateAdded);

			return matchesSearch && matchesAction && matchesTable && matchesSource && matchesDate;
		});

		filtered.sort((a, b) => {
			const aValue = getSortValue(a, sortConfig.key);
			const bValue = getSortValue(b, sortConfig.key);
			const comparison =
				typeof aValue === "number" && typeof bValue === "number"
					? aValue - bValue
					: String(aValue).localeCompare(String(bValue), undefined, {
							numeric: true,
							sensitivity: "base",
					  });
			return sortConfig.direction === "asc" ? comparison : -comparison;
		});

		return filtered;
	}, [audits, searchQuery, actionFilter, tableFilter, sourceFilter, dateRangeFilter, sortConfig]);

	const requestSort = (key) => {
		let direction = "asc";
		if (sortConfig.key === key && sortConfig.direction === "asc") {
			direction = "desc";
		}
		setSortConfig({ key, direction });
	};

	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, actionFilter, tableFilter, sourceFilter, dateRangeFilter, sortConfig, itemsPerPage]);

	const clearFilters = () => {
		setSearchQuery("");
		setActionFilter("all");
		setTableFilter("all");
		setSourceFilter("all");
		setDateRangeFilter("all");
		setSortConfig({ key: "DateAdded", direction: "desc" });
	};

	const formatChanges = (jsonString) => {
		if (!jsonString) return null;
		try {
			const changes = JSON.parse(jsonString);
			return Object.entries(changes)
				.map(([key, value]) => `${key}: ${value}`)
				.join("\n");
		} catch (e) {
			return jsonString;
		}
	};

	const renderChange = (audit, field) => {
		const data = audit[field];
		if (field === "PreviousChanges") {
			if (["Created", "Create", "Add"].includes(audit.Action)) {
				return <span className="text-gray-400 italic">N/A</span>;
			}
			return formatChanges(data) || <span className="text-gray-400 italic">No data</span>;
		}
		if (field === "SavedChanges") {
			if (["Deleted", "Delete"].includes(audit.Action)) {
				return <span className="text-gray-400 italic">N/A</span>;
			}
			return formatChanges(data) || <span className="text-gray-400 italic">No data</span>;
		}
		return null;
	};

	const actionBadgeClass = (action) => {
		if (["Created", "Create", "Add"].includes(action)) return "bg-green-100 text-green-800";
		if (["Deleted", "Delete"].includes(action)) return "bg-red-100 text-red-800";
		return "bg-blue-100 text-blue-800";
	};

	const totalPages = Math.max(1, Math.ceil(filteredAudits.length / itemsPerPage));
	const safeCurrentPage = Math.min(currentPage, totalPages);
	const startIndex = (safeCurrentPage - 1) * itemsPerPage;
	const paginatedAudits = filteredAudits.slice(startIndex, startIndex + itemsPerPage);
	const pageNumberWindow = 2;
	const pageStart = Math.max(1, safeCurrentPage - pageNumberWindow);
	const pageEnd = Math.min(totalPages, safeCurrentPage + pageNumberWindow);
	const pageNumbers = Array.from({ length: pageEnd - pageStart + 1 }, (_, idx) => pageStart + idx);
	const canGoPrevious = safeCurrentPage > 1;
	const canGoNext = safeCurrentPage < totalPages;

	const goToPage = (page) => {
		setCurrentPage(Math.min(totalPages, Math.max(1, page)));
	};

	return (
		<AuthenticatedLayout
			header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Audit</h2>}
			disableScroll={true}
		>
			<Head title="Audits" />

			<div className="flex flex-col flex-1 w-full relative overflow-hidden min-h-0">
				<div className="flex-1 flex flex-col overflow-hidden min-h-0">
					<div className="mx-auto w-full flex-1 flex flex-col overflow-hidden min-h-0">
						<div className="bg-white shadow-sm sm:rounded-lg flex-1 flex flex-col overflow-hidden min-h-0">
							<div className="p-6 flex-1 flex flex-col overflow-hidden min-h-0">
								<div className="flex justify-between items-center mb-6">
									<h3 className="text-xl font-bold text-gray-900">Audit History</h3>
									<div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
										{filteredAudits.length} Records
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
											className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
											placeholder="Search audits by user, action, table, source, or change..."
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
										/>
									</div>
									<div className="flex flex-1 min-w-0 items-center gap-2">
										<div className="relative flex-1 min-w-0">
											<div className="overflow-x-auto pb-1 pr-4">
												<div className="flex min-w-max items-center gap-2 pr-3">
													<select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
														<option value="all">All Actions</option>
														{actionOptions.map((action) => (
															<option key={action} value={action}>{action}</option>
														))}
													</select>
													<select value={tableFilter} onChange={(e) => setTableFilter(e.target.value)} className="w-44 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
														<option value="all">All Tables</option>
														{tableOptions.map((tableName) => (
															<option key={tableName} value={tableName}>{tableName}</option>
														))}
													</select>
													<select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
														<option value="all">All Sources</option>
														{sourceOptions.map((source) => (
															<option key={source} value={source}>{source}</option>
														))}
													</select>
													<select value={dateRangeFilter} onChange={(e) => setDateRangeFilter(e.target.value)} className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
														<option value="all">All Dates</option>
														<option value="today">Today</option>
														<option value="last7">Last 7 Days</option>
														<option value="last30">Last 30 Days</option>
														<option value="thisMonth">This Month</option>
														<option value="thisYear">This Year</option>
													</select>
												</div>
											</div>
											<div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
										</div>
										<button
											type="button"
											onClick={clearFilters}
											className="shrink-0 rounded-md border border-primary bg-white px-3 py-2 text-xs font-medium text-primary shadow-sm hover:bg-primary-soft"
										>
											Reset Filters
										</button>
									</div>
								</div>

								<div className="border rounded-lg border-gray-200 flex-1 min-h-0 flex flex-col overflow-hidden">
									<div className="flex-1 overflow-y-auto">
										<table className="min-w-full divide-y divide-gray-200">
											<thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
												<tr>
													<th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort("User")}>
														<div className="flex items-center">User{sortConfig.key === "User" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction.toUpperCase()}</span>}</div>
													</th>
													<th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort("TableEdited")}>
														<div className="flex items-center">Table Edited{sortConfig.key === "TableEdited" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction.toUpperCase()}</span>}</div>
													</th>
													<th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort("Action")}>
														<div className="flex items-center">Action{sortConfig.key === "Action" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction.toUpperCase()}</span>}</div>
													</th>
													<th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort("Source")}>
														<div className="flex items-center">Source{sortConfig.key === "Source" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction.toUpperCase()}</span>}</div>
													</th>
													<th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Summary</th>
													<th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort("DateAdded")}>
														<div className="flex items-center">Date Added{sortConfig.key === "DateAdded" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction.toUpperCase()}</span>}</div>
													</th>
													<th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
												</tr>
											</thead>
											<tbody className="bg-white divide-y divide-gray-200">
												{paginatedAudits.map((audit) => (
													<tr key={audit.ID} className="hover:bg-gray-50">
														<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{audit.user?.FullName || "Unknown User"}</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{audit.TableEdited}</td>
														<td className="px-6 py-4 whitespace-nowrap">
															<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${actionBadgeClass(audit.Action)}`}>
																{audit.Action}
															</span>
														</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{audit.Source || "Application"}</td>
														<td className="px-6 py-4 text-sm text-gray-700 max-w-md">
															<div className="truncate">{audit.ReadableChanges || formatChanges(audit.SavedChanges) || "No summary"}</div>
														</td>
														<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(audit.DateAdded).toLocaleString()}</td>
														<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
															<button
																type="button"
																onClick={() => setSelectedAudit(audit)}
																className="rounded border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary-soft"
															>
																View
															</button>
														</td>
													</tr>
												))}
												{filteredAudits.length === 0 && (
													<tr>
														<td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
															No audit records found.
														</td>
													</tr>
												)}
											</tbody>
										</table>
									</div>
									<div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
										<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
											<div className="text-sm text-gray-600">
												Showing {filteredAudits.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredAudits.length)} of {filteredAudits.length}
											</div>
											<div className="flex flex-wrap items-center gap-2">
												<label htmlFor="audits-items-per-page" className="text-sm text-gray-600">Items per page</label>
												<select
													id="audits-items-per-page"
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
					</div>
				</div>
			</div>
		</div>

			{selectedAudit && (
				<div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
					<div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
						<div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedAudit(null)} />
						<span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
						<div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl w-full">
							<div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
								<h3 className="text-lg leading-6 font-medium text-gray-900">Audit Details</h3>
								<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
									<div><span className="font-semibold text-gray-700">User:</span> <span className="text-gray-900">{selectedAudit.user?.FullName || "Unknown User"}</span></div>
									<div><span className="font-semibold text-gray-700">Action:</span> <span className="text-gray-900">{selectedAudit.Action}</span></div>
									<div><span className="font-semibold text-gray-700">Table:</span> <span className="text-gray-900">{selectedAudit.TableEdited}</span></div>
									<div><span className="font-semibold text-gray-700">Source:</span> <span className="text-gray-900">{selectedAudit.Source || "Application"}</span></div>
									<div className="md:col-span-2"><span className="font-semibold text-gray-700">Date:</span> <span className="text-gray-900">{new Date(selectedAudit.DateAdded).toLocaleString()}</span></div>
								</div>
								<div className="mt-4 space-y-3">
									<div>
										<h4 className="text-sm font-semibold text-gray-700">Readable Changes</h4>
										<p className="mt-1 whitespace-pre-wrap text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-md p-3">{selectedAudit.ReadableChanges || "No readable summary."}</p>
									</div>
									<div>
										<h4 className="text-sm font-semibold text-gray-700">Previous Changes</h4>
										<p className="mt-1 whitespace-pre-wrap text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-md p-3">{renderChange(selectedAudit, "PreviousChanges")}</p>
									</div>
									<div>
										<h4 className="text-sm font-semibold text-gray-700">Saved Changes</h4>
										<p className="mt-1 whitespace-pre-wrap text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-md p-3">{renderChange(selectedAudit, "SavedChanges")}</p>
									</div>
								</div>
							</div>
							<div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
								<button type="button" onClick={() => setSelectedAudit(null)} className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto">
									Close
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</AuthenticatedLayout>
	);
}



