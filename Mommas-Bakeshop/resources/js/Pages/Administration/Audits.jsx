import React, { useMemo, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";

export default function Audits({ audits, inventoryCount }) {
	const [searchQuery, setSearchQuery] = useState("");
	const [actionFilter, setActionFilter] = useState("all");
	const [tableFilter, setTableFilter] = useState("all");
	const [dateRangeFilter, setDateRangeFilter] = useState("all");
	const [sortConfig, setSortConfig] = useState({
		key: "DateAdded",
		direction: "desc",
	});

	const actionOptions = useMemo(() => {
		return [...new Set(audits.map((audit) => audit.Action).filter(Boolean))].sort(
			(a, b) => a.localeCompare(b),
		);
	}, [audits]);

	const tableOptions = useMemo(() => {
		return [
			...new Set(audits.map((audit) => audit.TableEdited).filter(Boolean)),
		].sort((a, b) => a.localeCompare(b));
	}, [audits]);

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
			return (
				date.getFullYear() === now.getFullYear() &&
				date.getMonth() === now.getMonth()
			);
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
				audit.PreviousChanges?.toLowerCase().includes(searchLower) ||
				audit.SavedChanges?.toLowerCase().includes(searchLower) ||
				new Date(audit.DateAdded)
					.toLocaleString()
					.toLowerCase()
					.includes(searchLower);
			const matchesAction =
				actionFilter === "all" || audit.Action === actionFilter;
			const matchesTable =
				tableFilter === "all" || audit.TableEdited === tableFilter;
			const matchesDate = isInDateRange(audit.DateAdded);

			return matchesSearch && matchesAction && matchesTable && matchesDate;
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
	}, [
		audits,
		searchQuery,
		actionFilter,
		tableFilter,
		dateRangeFilter,
		sortConfig,
	]);

	const handleSort = (key) => {
		setSortConfig((current) => {
			if (current.key === key) {
				return {
					key,
					direction: current.direction === "asc" ? "desc" : "asc",
				};
			}
			return { key, direction: "asc" };
		});
	};

	const getSortIndicator = (key) => {
		if (sortConfig.key !== key) return "-";
		return sortConfig.direction === "asc" ? "^" : "v";
	};

	const clearFilters = () => {
		setSearchQuery("");
		setActionFilter("all");
		setTableFilter("all");
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
			if (
				audit.Action === "Created" ||
				audit.Action === "Create" ||
				audit.Action === "Add"
			) {
				return <span className="text-gray-400 italic">N/A</span>;
			}
			return (
				formatChanges(data) || (
					<span className="text-gray-400 italic">No data</span>
				)
			);
		}
		if (field === "SavedChanges") {
			if (audit.Action === "Deleted" || audit.Action === "Delete") {
				return <span className="text-gray-400 italic">N/A</span>;
			}
			return (
				formatChanges(data) || (
					<span className="text-gray-400 italic">No data</span>
				)
			);
		}
		return null;
	};

	return (
		<AuthenticatedLayout
			header={
				<h2 className="font-semibold text-xl text-gray-800 leading-tight">
					Audit
				</h2>
			}
			disableScroll={true}
		>
			<Head title="Audits" />

			<div className="flex flex-col flex-1 w-full relative overflow-hidden min-h-0">
				<div className="flex-1 flex flex-col overflow-hidden min-h-0">
					<div className="mx-auto w-full flex-1 flex flex-col overflow-hidden min-h-0">
						<div className="bg-white shadow-sm sm:rounded-lg flex-1 flex flex-col overflow-hidden min-h-0">
							<div className="p-6 flex-1 flex flex-col overflow-hidden min-h-0">
								{/* Header */}
								<div className="flex justify-between items-center mb-6">
									<h3 className="text-xl font-bold text-gray-900">
										Audit History
									</h3>
									<div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
										{audits.length || 0} Records
									</div>
								</div>

								{/* Search + Filters */}
								<div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
									<div className="relative flex-1">
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
											className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#D97736] focus:border-[#D97736] sm:text-sm"
											placeholder="Search audit history..."
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
										/>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 w-full lg:w-auto">
										<select
											className="py-2 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#D97736] focus:border-[#D97736]"
											value={actionFilter}
											onChange={(e) => setActionFilter(e.target.value)}
										>
											<option value="all">All Actions</option>
											{actionOptions.map((action) => (
												<option key={action} value={action}>
													{action}
												</option>
											))}
										</select>

										<select
											className="py-2 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#D97736] focus:border-[#D97736]"
											value={tableFilter}
											onChange={(e) => setTableFilter(e.target.value)}
										>
											<option value="all">All Tables</option>
											{tableOptions.map((table) => (
												<option key={table} value={table}>
													{table}
												</option>
											))}
										</select>

										<select
											className="py-2 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#D97736] focus:border-[#D97736]"
											value={dateRangeFilter}
											onChange={(e) => setDateRangeFilter(e.target.value)}
										>
											<option value="all">All Dates</option>
											<option value="today">Today</option>
											<option value="last7">Last 7 Days</option>
											<option value="last30">Last 30 Days</option>
											<option value="thisMonth">This Month</option>
											<option value="thisYear">This Year</option>
										</select>

										<button
											type="button"
											onClick={clearFilters}
											className="py-2 px-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
										>
											Clear Filters
										</button>
									</div>
								</div>

								{/* Table */}
								<div className="border rounded-lg border-gray-200 flex-1 overflow-y-auto">
									<table className="min-w-full divide-y divide-gray-200">
										<thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
											<tr>
												<th
													scope="col"
													className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
												>
													<button
														type="button"
														onClick={() => handleSort("User")}
														className="flex items-center gap-1 hover:text-gray-700"
													>
														User
														<span>{getSortIndicator("User")}</span>
													</button>
												</th>
												<th
													scope="col"
													className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
												>
													<button
														type="button"
														onClick={() => handleSort("TableEdited")}
														className="flex items-center gap-1 hover:text-gray-700"
													>
														Table Edited
														<span>{getSortIndicator("TableEdited")}</span>
													</button>
												</th>
												<th
													scope="col"
													className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
												>
													<button
														type="button"
														onClick={() => handleSort("PreviousChanges")}
														className="flex items-center gap-1 hover:text-gray-700"
													>
														Previous Changes
														<span>{getSortIndicator("PreviousChanges")}</span>
													</button>
												</th>
												<th
													scope="col"
													className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
												>
													<button
														type="button"
														onClick={() => handleSort("SavedChanges")}
														className="flex items-center gap-1 hover:text-gray-700"
													>
														Saved Changes
														<span>{getSortIndicator("SavedChanges")}</span>
													</button>
												</th>
												<th
													scope="col"
													className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
												>
													<button
														type="button"
														onClick={() => handleSort("Action")}
														className="flex items-center gap-1 hover:text-gray-700"
													>
														Action
														<span>{getSortIndicator("Action")}</span>
													</button>
												</th>
												<th
													scope="col"
													className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
												>
													<button
														type="button"
														onClick={() => handleSort("DateAdded")}
														className="flex items-center gap-1 hover:text-gray-700"
													>
														Date Added
														<span>{getSortIndicator("DateAdded")}</span>
													</button>
												</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200">
											{filteredAudits.map((audit) => (
												<tr key={audit.ID} className="hover:bg-gray-50">
													<td className="px-6 py-4 whitespace-nowrap">
														<div className="text-sm font-medium text-gray-900">
															{audit.user?.FullName || "Unknown User"}
														</div>
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<div className="text-sm text-gray-900">
															{audit.TableEdited}
														</div>
													</td>
													<td className="px-6 py-4">
														<div className="text-sm text-gray-900 whitespace-pre-wrap">
															{renderChange(audit, "PreviousChanges")}
														</div>
													</td>
													<td className="px-6 py-4">
														<div className="text-sm text-gray-900 whitespace-pre-wrap">
															{renderChange(audit, "SavedChanges")}
														</div>
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<span
															className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
														${
															audit.Action === "Created" ||
															audit.Action === "Create" ||
															audit.Action === "Add"
																? "bg-green-100 text-green-800"
																: audit.Action === "Deleted" ||
																  audit.Action === "Delete"
																	? "bg-red-100 text-red-800"
																	: "bg-blue-100 text-blue-800"
														}`}
														>
															{audit.Action}
														</span>
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
														{new Date(audit.DateAdded).toLocaleString()}
													</td>
												</tr>
											))}
											{filteredAudits.length === 0 && (
												<tr>
													<td
														colSpan="6"
														className="px-6 py-4 text-center text-sm text-gray-500"
													>
														No audit records found.
													</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
