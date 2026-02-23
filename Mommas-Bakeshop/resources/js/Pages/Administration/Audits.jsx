import React, { useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";

export default function Audits({ audits, inventoryCount }) {
	const [searchQuery, setSearchQuery] = useState("");

	const filteredAudits = audits.filter((audit) => {
		const searchLower = searchQuery.toLowerCase();
		return (
			audit.user?.FullName?.toLowerCase().includes(searchLower) ||
			audit.TableEdited?.toLowerCase().includes(searchLower) ||
			audit.Action?.toLowerCase().includes(searchLower) ||
			audit.PreviousChanges?.toLowerCase().includes(searchLower) ||
			audit.SavedChanges?.toLowerCase().includes(searchLower) ||
			new Date(audit.DateAdded)
				.toLocaleString()
				.toLowerCase()
				.includes(searchLower)
		);
	});

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
		>
			<Head title="Audits" />

			<div className="flex flex-col flex-1 w-full relative">
				<div className="flex-1">
					<div className="mx-auto w-full">
						<div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
							<div className="p-6">
								{/* Header */}
								<div className="flex justify-between items-center mb-6">
									<h3 className="text-xl font-bold text-gray-900">
										Audit History
									</h3>
									<div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
										{audits.length || 0} Records
									</div>
								</div>

								{/* Search Bar */}
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
											className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#D97736] focus:border-[#D97736] sm:text-sm"
											placeholder="Search audit history..."
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
										/>
									</div>
								</div>

								{/* Table */}
								<div className="border rounded-lg border-gray-200 overflow-hidden">
									<table className="min-w-full divide-y divide-gray-200">
										<thead className="bg-gray-50">
											<tr>
												<th
													scope="col"
													className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
												>
													User
												</th>
												<th
													scope="col"
													className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
												>
													Table Edited
												</th>
												<th
													scope="col"
													className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
												>
													Previous Changes
												</th>
												<th
													scope="col"
													className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
												>
													Saved Changes
												</th>
												<th
													scope="col"
													className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
												>
													Action
												</th>
												<th
													scope="col"
													className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
												>
													Date Added
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
