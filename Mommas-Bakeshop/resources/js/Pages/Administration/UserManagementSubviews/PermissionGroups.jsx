import React, { useEffect, useMemo, useState } from "react";
import { router } from "@inertiajs/react";
import Modal from "@/Components/Modal";
import { formatCountLabel } from "@/utils/countLabel";
import usePermissions from "@/hooks/usePermissions";
import { Pencil, Trash2 } from "lucide-react";

const showErrorToast = (message) => {
	if (typeof window === "undefined") return;
	window.dispatchEvent(
		new CustomEvent("app-toast", {
			detail: {
				type: "error",
				message,
			},
		}),
	);
};

export default function PermissionGroups({ rows = [], onHeaderMetaChange }) {
	const { can, requirePermission } = usePermissions();
	const canCreate = can("CanCreatePermissionGroup");
	const canUpdate = can("CanUpdatePermissionGroup");
	const canDelete = can("CanDeletePermissionGroup");
	const [searchQuery, setSearchQuery] = useState("");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingRow, setEditingRow] = useState(null);
	const [deleteCandidate, setDeleteCandidate] = useState(null);
	const [form, setForm] = useState({ GroupName: "", GroupDescription: "" });
	const [errors, setErrors] = useState({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const filteredRows = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) {
			return [...rows].sort((a, b) => Number(a.DisplayOrder || 0) - Number(b.DisplayOrder || 0));
		}
		return [...rows]
			.filter((row) =>
				[row.GroupName, row.GroupDescription, row.DisplayOrder]
					.join(" ")
					.toLowerCase()
					.includes(query),
			)
			.sort((a, b) => Number(a.DisplayOrder || 0) - Number(b.DisplayOrder || 0));
	}, [rows, searchQuery]);

	const countLabel = formatCountLabel(filteredRows.length, "group");

	useEffect(() => {
		onHeaderMetaChange?.({
			subtitle: "Permission Groups",
			countLabel,
		});
	}, [onHeaderMetaChange, countLabel]);

	const resetForm = () => {
		setForm({ GroupName: "", GroupDescription: "" });
		setErrors({});
	};

	const openAddModal = () => {
		if (!canCreate) return requirePermission("CanCreatePermissionGroup");
		setEditingRow(null);
		resetForm();
		setIsModalOpen(true);
	};

	const openEditModal = (row) => {
		if (!canUpdate) return requirePermission("CanUpdatePermissionGroup");
		setEditingRow(row);
		setForm({
			GroupName: row.GroupName || "",
			GroupDescription: row.GroupDescription || "",
		});
		setErrors({});
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setEditingRow(null);
		resetForm();
	};

	const submitGroup = (e) => {
		e.preventDefault();
		setIsSubmitting(true);
		setErrors({});
		const destination = editingRow
			? route("admin.permission-groups.update", editingRow.id)
			: route("admin.permission-groups.store");
		const payload = {
			GroupName: form.GroupName,
			GroupDescription: form.GroupDescription,
		};
		const options = {
			preserveScroll: true,
			onError: (formErrors) => setErrors(formErrors || {}),
			onSuccess: () => closeModal(),
			onFinish: () => setIsSubmitting(false),
		};

		if (editingRow) {
			router.put(destination, payload, options);
			return;
		}

		router.post(destination, payload, options);
	};

	const confirmDelete = () => {
		if (!deleteCandidate) return;
		if (!canDelete) return requirePermission("CanDeletePermissionGroup");
		setIsDeleting(true);
		router.delete(route("admin.permission-groups.destroy", deleteCandidate.id), {
			preserveScroll: true,
			onError: (formErrors) => {
				const firstError = Object.values(formErrors || {}).find(Boolean);
				showErrorToast(String(firstError || "Unable to delete permission group."));
			},
			onSuccess: () => setDeleteCandidate(null),
			onFinish: () => setIsDeleting(false),
		});
	};

	const getDeleteTooltip = (row) => {
		if (!canDelete) return "Insufficient permission.";
		if (Number(row.PermissionsCount || 0) > 0) return "Reassign permissions out of this group before deleting it.";
		return "Delete permission group";
	};

	return (
		<div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
			<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
				<div className="mx-auto flex min-h-0 w-full flex-1 flex-col overflow-hidden">
					<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-white shadow-sm">
						<div className="flex flex-1 flex-col overflow-hidden p-6">
							<div className="mb-6 flex items-start gap-3">
								<div className="relative w-full max-w-xl shrink-0">
									<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
										<svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
										</svg>
									</div>
									<input
										type="text"
										className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm leading-5 placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
										placeholder="Search permission groups by name, description, or order..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
									/>
								</div>
								<button
									type="button"
									onClick={() => setSearchQuery("")}
									className="shrink-0 rounded-md border border-primary bg-white px-3 py-2 text-xs font-medium text-primary shadow-sm hover:bg-primary-soft"
								>
									Reset Filters
								</button>
							</div>

							<div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-gray-200">
								<table className="min-w-full divide-y divide-gray-200">
									<thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
										<tr>
											<th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Group Name</th>
											<th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Description</th>
											<th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Permissions</th>
											<th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Display Order</th>
											<th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200 bg-white">
										{filteredRows.map((row) => {
											const deletable = canDelete && Number(row.PermissionsCount || 0) === 0;
											return (
												<tr key={row.id} className="hover:bg-gray-50">
													<td className="px-6 py-4 text-sm font-medium text-gray-900">{row.GroupName}</td>
													<td className="px-6 py-4 text-sm text-gray-700">{row.GroupDescription || "-"}</td>
													<td className="px-6 py-4 text-sm text-gray-700">{row.PermissionsCount || 0}</td>
													<td className="px-6 py-4 text-sm text-gray-700">#{row.DisplayOrder}</td>
													<td className="px-6 py-4 text-right text-sm font-medium">
														<div className="inline-flex items-center gap-2">
															<button
																type="button"
																onClick={() => openEditModal(row)}
																disabled={!canUpdate}
																className={canUpdate ? "inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary-hover" : "inline-flex items-center gap-1.5 cursor-not-allowed rounded border border-gray-200 px-3 py-1 text-xs font-medium text-gray-300"}
															>
																<Pencil className="h-3.5 w-3.5" />
																Edit
															</button>
															<button
																type="button"
																onClick={() => setDeleteCandidate(row)}
																disabled={!deletable}
																title={getDeleteTooltip(row)}
																className={deletable ? "inline-flex items-center gap-1.5 rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700" : "inline-flex items-center gap-1.5 cursor-not-allowed rounded border border-gray-200 px-3 py-1 text-xs font-medium text-gray-300"}
															>
																<Trash2 className="h-3.5 w-3.5" />
																Delete
															</button>
														</div>
													</td>
												</tr>
											);
										})}
										{filteredRows.length === 0 && (
											<tr>
												<td colSpan="5" className="px-6 py-10 text-center text-sm text-gray-500">
													No permission groups found.
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

			<div className="sticky bottom-0 z-10 w-full border-t border-gray-200 bg-white p-4">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<button
						type="button"
						onClick={openAddModal}
						disabled={!canCreate}
						className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
					>
						Add Permission Group
					</button>
				</div>
			</div>

			<Modal show={isModalOpen} onClose={closeModal} maxWidth="lg">
				<form onSubmit={submitGroup} className="p-6">
					<h3 className="text-lg font-semibold text-gray-900">
						{editingRow ? "Edit Permission Group" : "Add Permission Group"}
					</h3>
					<div className="mt-5 space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700" htmlFor="group-name">
								Group Name
							</label>
							<input
								id="group-name"
								type="text"
								value={form.GroupName}
								onChange={(e) => setForm((prev) => ({ ...prev, GroupName: e.target.value }))}
								className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
							/>
							{errors.GroupName && <p className="mt-2 text-sm text-red-600">{errors.GroupName}</p>}
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700" htmlFor="group-description">
								Description
							</label>
							<textarea
								id="group-description"
								value={form.GroupDescription}
								onChange={(e) => setForm((prev) => ({ ...prev, GroupDescription: e.target.value }))}
								rows={4}
								className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
							/>
							{errors.GroupDescription && <p className="mt-2 text-sm text-red-600">{errors.GroupDescription}</p>}
						</div>
					</div>
					<div className="mt-6 flex justify-end gap-2">
						<button
							type="button"
							onClick={closeModal}
							className="rounded-md border border-primary bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-primary-soft"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting}
							className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
						>
							{editingRow ? "Save Group" : "Add Group"}
						</button>
					</div>
				</form>
			</Modal>

			<Modal show={Boolean(deleteCandidate)} onClose={() => setDeleteCandidate(null)} maxWidth="md">
				{deleteCandidate && (
					<div className="p-6">
						<h3 className="text-lg font-semibold text-gray-900">Delete Permission Group</h3>
						<p className="mt-3 text-sm text-gray-600">
							Are you sure you want to delete "{deleteCandidate.GroupName}"? This action cannot be undone.
						</p>
						<div className="mt-6 flex justify-end gap-2">
							<button
								type="button"
								onClick={() => setDeleteCandidate(null)}
								className="rounded-md border border-primary bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-primary-soft"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={confirmDelete}
								disabled={isDeleting}
								className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
							>
								Delete
							</button>
						</div>
					</div>
				)}
			</Modal>
		</div>
	);
}
