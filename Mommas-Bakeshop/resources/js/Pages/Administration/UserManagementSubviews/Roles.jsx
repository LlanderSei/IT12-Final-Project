import React, { useEffect, useMemo, useState } from "react";
import { router } from "@inertiajs/react";
import Modal from "@/Components/Modal";
import { formatCountLabel } from "@/utils/countLabel";
import usePermissions from "@/hooks/usePermissions";
import SecondaryButton from "@/Components/SecondaryButton";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import { Pencil, Trash2 } from "lucide-react";

const PERMISSION_GROUP_MAX_ROLE_RANK = {
	cashierLevel: 3,
	clerkLevel: 4,
	adminLevel: 2,
	systemsLevel: 1,
};

const createEmptyPermissions = (permissionGroups = {}) => {
	const flags = {};
	Object.values(permissionGroups).forEach((group) => {
		(group || []).forEach((permission) => {
			flags[permission.name] = false;
		});
	});
	return flags;
};

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

const DEFAULT_ROLE_COLOR = "#6B7280";

function PermissionGroupRow({ title, permissions, selectedPermissions, onToggle, searchQuery, disabled }) {
	const [isOpen, setIsOpen] = useState(true);

	const filteredPermissions = useMemo(() => {
		if (!searchQuery) return permissions;
		return permissions.filter(p => 
			p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
			p.name.toLowerCase().includes(searchQuery.toLowerCase())
		);
	}, [permissions, searchQuery]);

	if (filteredPermissions.length === 0 && searchQuery) return null;

	return (
		<div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
			>
				<span className="font-semibold text-sm text-gray-700">{title} ({filteredPermissions.length})</span>
				<svg
					className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
				</svg>
			</button>
			{isOpen && (
				<div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
					{filteredPermissions.map((permission) => (
						<label 
							key={permission.name} 
							className={`flex items-start gap-3 p-2 rounded-md transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}`}
						>
							<input
								type="checkbox"
								className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
								checked={Boolean(selectedPermissions[permission.name])}
								disabled={disabled}
								onChange={(e) => onToggle(permission.name, e.target.checked)}
							/>
							<div className="flex flex-col">
								<span className="text-sm font-medium text-gray-900">{permission.label}</span>
								<span className="text-xs text-gray-500 font-mono">{permission.name}</span>
							</div>
						</label>
					))}
				</div>
			)}
		</div>
	);
}

export default function Roles({
	rolePresets = [],
	permissionGroups = {},
	currentUserRoleRank = null,
	onHeaderMetaChange,
}) {
	const { can, requirePermission } = usePermissions();
	const canCreateRole = can("CanCreateRole");
	const canUpdateRole = can("CanUpdateRole");
	const canDeleteRole = can("CanDeleteRole");
	const canUpdateRoleOrder = can("CanUpdateRoleOrder");
	const [searchQuery, setSearchQuery] = useState("");
	const [permissionSearchQuery, setPermissionSearchQuery] = useState("");
	const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
	const [editingRole, setEditingRole] = useState(null);
	const [deleteCandidate, setDeleteCandidate] = useState(null);
	const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
	const [roleOrder, setRoleOrder] = useState(() => [...rolePresets]);
	const [form, setForm] = useState({
		RoleName: "",
		RoleDescription: "",
		RoleColor: DEFAULT_ROLE_COLOR,
		permissions: createEmptyPermissions(permissionGroups),
	});
	const [errors, setErrors] = useState({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isSavingOrder, setIsSavingOrder] = useState(false);

	useEffect(() => {
		setRoleOrder([...rolePresets].sort((a, b) => Number(a.RoleRank || 0) - Number(b.RoleRank || 0)));
	}, [rolePresets]);

	const filteredRoles = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) {
			return [...rolePresets].sort((a, b) => Number(a.RoleRank || 0) - Number(b.RoleRank || 0));
		}

		return [...rolePresets]
			.filter((role) => {
				const haystack = [role.RoleName, role.RoleDescription, role.RoleRank]
					.join(" ")
					.toLowerCase();
				return haystack.includes(query);
			})
			.sort((a, b) => Number(a.RoleRank || 0) - Number(b.RoleRank || 0));
	}, [rolePresets, searchQuery]);

	const countLabel = formatCountLabel(filteredRoles.length, "role");

	useEffect(() => {
		onHeaderMetaChange?.({
			subtitle: "Roles",
			countLabel,
		});
	}, [onHeaderMetaChange, countLabel]);

	const currentRank = Number(currentUserRoleRank ?? Number.MAX_SAFE_INTEGER);

	const canManageRole = (role) => currentRank <= Number(role?.RoleRank ?? Number.MAX_SAFE_INTEGER);
	const isOwnerRole = (role) => Boolean(role?.IsSystemOwner);
	const isEditingOwnerRole = isOwnerRole(editingRole);

	const resetForm = () => {
		setForm({
			RoleName: "",
			RoleDescription: "",
			RoleColor: DEFAULT_ROLE_COLOR,
			permissions: createEmptyPermissions(permissionGroups),
		});
		setPermissionSearchQuery("");
		setErrors({});
	};

	const openAddModal = () => {
		if (!canCreateRole) return requirePermission("CanCreateRole");
		setEditingRole(null);
		resetForm();
		setIsRoleModalOpen(true);
	};

	const openEditModal = (role) => {
		if (!canUpdateRole) return requirePermission("CanUpdateRole");
		if (!canManageRole(role)) {
			showErrorToast("You can only edit roles with the same rank or lower.");
			return;
		}
		setEditingRole(role);
		setForm({
			RoleName: role.RoleName || "",
			RoleDescription: role.RoleDescription || "",
			RoleColor: role.RoleColor || DEFAULT_ROLE_COLOR,
			permissions: { ...createEmptyPermissions(permissionGroups), ...(role.permissions || {}) },
		});
		setPermissionSearchQuery("");
		setErrors({});
		setIsRoleModalOpen(true);
	};

	const closeRoleModal = () => {
		setIsRoleModalOpen(false);
		setEditingRole(null);
		resetForm();
	};

	const togglePermission = (permissionName, checked) => {
		const columnKey = Object.entries(permissionGroups).find(([, items]) =>
			(items || []).some((item) => item.name === permissionName),
		)?.[0];
		const maxRoleRank = PERMISSION_GROUP_MAX_ROLE_RANK[columnKey] ?? Number.MAX_SAFE_INTEGER;
		if (currentRank > maxRoleRank) {
			showErrorToast("You cannot assign permissions above your role level.");
			return;
		}
		setForm((prev) => ({
			...prev,
			permissions: {
				...prev.permissions,
				[permissionName]: checked,
			},
		}));
	};

	const submitRole = (e) => {
		e.preventDefault();
		setIsSubmitting(true);
		setErrors({});
		const routeName = editingRole ? route("admin.roles.update", editingRole.id) : route("admin.roles.store");
		const payload = {
			RoleName: form.RoleName,
			RoleDescription: form.RoleDescription,
			RoleColor: form.RoleColor,
			permissions: form.permissions,
		};
		const options = {
			preserveScroll: true,
			onError: (formErrors) => setErrors(formErrors || {}),
			onSuccess: () => closeRoleModal(),
			onFinish: () => setIsSubmitting(false),
		};

		if (editingRole) {
			router.put(routeName, payload, options);
			return;
		}

		router.post(routeName, payload, options);
	};

	const confirmDelete = () => {
		if (!deleteCandidate) return;
		if (!canDeleteRole) return requirePermission("CanDeleteRole");
		setIsDeleting(true);
		router.delete(route("admin.roles.destroy", deleteCandidate.id), {
			preserveScroll: true,
			onError: (formErrors) => {
				const firstError = Object.values(formErrors || {}).find(Boolean);
				showErrorToast(String(firstError || "Unable to delete role."));
			},
			onSuccess: () => setDeleteCandidate(null),
			onFinish: () => setIsDeleting(false),
		});
	};

	const openOrderModal = () => {
		if (!canUpdateRoleOrder) return requirePermission("CanUpdateRoleOrder");
		setRoleOrder([...rolePresets].sort((a, b) => Number(a.RoleRank || 0) - Number(b.RoleRank || 0)));
		setIsOrderModalOpen(true);
	};

	const moveRole = (roleId, direction) => {
		setRoleOrder((prev) => {
			const reordered = [...prev];
			const currentIndex = reordered.findIndex((role) => role.id === roleId);
			if (currentIndex === -1) return prev;
			const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
			if (targetIndex < 0 || targetIndex >= reordered.length) return prev;
			if (reordered[currentIndex]?.IsSystemOwner || reordered[targetIndex]?.IsSystemOwner) return prev;
			[reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];
			return reordered;
		});
	};

	const saveRoleOrder = () => {
		setIsSavingOrder(true);
		router.put(
			route("admin.roles.reorder"),
			{
				roleIds: roleOrder.filter((role) => !role.IsSystemOwner).map((role) => role.id),
			},
			{
				preserveScroll: true,
				onError: (formErrors) => {
					const firstError = Object.values(formErrors || {}).find(Boolean);
					showErrorToast(String(firstError || "Unable to save role order."));
				},
				onSuccess: () => setIsOrderModalOpen(false),
				onFinish: () => setIsSavingOrder(false),
			},
		);
	};

	const getDeleteTooltip = (role) => {
		if (!canDeleteRole) return "Insufficient permission.";
		if (isOwnerRole(role)) return "The Owner role cannot be deleted.";
		if (!canManageRole(role)) return "You can only delete roles with the same rank or lower.";
		if (Number(role.UsersCount || 0) > 0) return "Reassign or delete users in this role first.";
		return "Delete role";
	};

	return (
		<div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden text-gray-900">
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
										placeholder="Search roles by name, description, or rank..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
									/>
								</div>
								<button
									type="button"
									onClick={() => setSearchQuery("")}
									className="shrink-0 rounded-md border border-primary bg-white px-3 py-2 text-xs font-medium text-primary shadow-sm hover:bg-primary-soft transition-colors"
								>
									Reset Filters
								</button>
							</div>

							<div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-gray-200 custom-scrollbar">
								<table className="min-w-full divide-y divide-gray-200">
									<thead className="sticky top-0 z-10 bg-gray-50 shadow-sm border-b">
										<tr>
											<th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Role</th>
											<th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Color</th>
											<th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Description</th>
											<th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Rank</th>
											<th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Users</th>
											<th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Preset Permissions</th>
											<th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Actions</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200 bg-white">
										{filteredRoles.map((role) => {
											const canEdit = canUpdateRole && canManageRole(role);
											const canDelete =
												canDeleteRole &&
												!isOwnerRole(role) &&
												canManageRole(role) &&
												Number(role.UsersCount || 0) === 0;
											return (
												<tr key={role.id} className="hover:bg-gray-50 transition-colors">
													<td className="px-6 py-4 text-sm font-semibold text-gray-900">
														<div>{role.RoleName}</div>
														{role.IsSystemOwner && (
															<span className="mt-1 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-600">
																Locked System Role
															</span>
														)}
													</td>
													<td className="px-6 py-4">
														<div className="flex items-center gap-3">
															<span
																className="h-5 w-5 rounded-full border border-gray-200 shadow-sm"
																style={{ backgroundColor: role.RoleColor || DEFAULT_ROLE_COLOR }}
															/>
															<span className="font-mono text-xs font-medium uppercase text-gray-600">
																{role.RoleColor || DEFAULT_ROLE_COLOR}
															</span>
														</div>
													</td>
													<td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">{role.RoleDescription || "-"}</td>
													<td className="px-6 py-4 text-center text-sm font-bold text-primary">#{role.RoleRank}</td>
													<td className="px-6 py-4 text-center text-sm font-medium text-gray-700">{role.UsersCount || 0}</td>
													<td className="px-6 py-4 text-center">
														<span className="px-2 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
															{role.PresetPermissionCount || 0}
														</span>
													</td>
													<td className="px-6 py-4 text-right text-sm">
														<div className="inline-flex items-center gap-2">
															<button
																type="button"
																onClick={() => openEditModal(role)}
																disabled={!canEdit}
																className={canEdit ? "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-hover transition-all shadow-sm" : "inline-flex items-center gap-1.5 cursor-not-allowed rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-300 shadow-none"}
															>
																<Pencil className="h-3.5 w-3.5" />
																Edit
															</button>
															<button
																type="button"
																onClick={() => setDeleteCandidate(role)}
																disabled={!canDelete}
																title={getDeleteTooltip(role)}
																className={canDelete ? "inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition-all" : "inline-flex items-center gap-1.5 cursor-not-allowed rounded-md border border-gray-100 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-300 shadow-none"}
															>
																<Trash2 className="h-3.5 w-3.5" />
																Delete
															</button>
														</div>
													</td>
												</tr>
											);
										})}
										{filteredRoles.length === 0 && (
											<tr>
												<td colSpan="7" className="px-6 py-12 text-center text-sm text-gray-500 italic">
													No roles found matching your criteria.
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

			<div className="sticky bottom-0 z-10 w-full border-t border-gray-200 bg-white p-4 shadow-sm">
				<div className="mx-auto flex max-w-7xl gap-4 px-4 sm:px-6 lg:px-8">
					<PrimaryButton
						type="button"
						onClick={openAddModal}
						disabled={!canCreateRole}
						className="flex-1 justify-center py-3 text-sm font-bold shadow-md"
					>
						Add New Role
					</PrimaryButton>
					<SecondaryButton
						type="button"
						onClick={openOrderModal}
						disabled={!canUpdateRoleOrder || rolePresets.length <= 1}
						className="flex-1 justify-center py-3 text-sm font-bold shadow-sm"
					>
						Manage Priorities
					</SecondaryButton>
				</div>
			</div>

			<Modal show={isRoleModalOpen} onClose={closeRoleModal} maxWidth="4xl">
				<form onSubmit={submitRole} className="p-6">
					<div className="flex items-center justify-between border-b pb-4 mb-6">
						<div>
							<h3 className="text-xl font-bold text-gray-900">
								{editingRole ? "Configure Role Preset" : "Create New Role"}
							</h3>
							<p className="mt-1 text-sm text-gray-500">
								{isEditingOwnerRole
									? "The system-locked Owner role can only have its badge color customized."
									: "Changes will automatically re-sync for all users assigned to this role."}
							</p>
						</div>
						<button type="button" onClick={closeRoleModal} className="text-gray-400 hover:text-gray-500 transition-colors">
							<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>

					<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
						<div className="lg:col-span-1">
							<label className="block text-sm font-bold text-gray-700 mb-1.5" htmlFor="role-name">
								Role Identifer
							</label>
							<TextInput
								id="role-name"
								type="text"
								placeholder="e.g. Supervisor, Manager"
								value={form.RoleName}
								onChange={(e) => setForm((prev) => ({ ...prev, RoleName: e.target.value }))}
								disabled={isEditingOwnerRole}
								className="block w-full"
							/>
							{errors.RoleName && <p className="mt-2 text-xs font-semibold text-red-600">{errors.RoleName}</p>}
						</div>
						<div className="lg:col-span-1">
							<label className="block text-sm font-bold text-gray-700 mb-1.5" htmlFor="role-description">
								Brief Description
							</label>
							<TextInput
								id="role-description"
								placeholder="What are the responsibilities?"
								type="text"
								value={form.RoleDescription}
								onChange={(e) => setForm((prev) => ({ ...prev, RoleDescription: e.target.value }))}
								disabled={isEditingOwnerRole}
								className="block w-full"
							/>
							{errors.RoleDescription && <p className="mt-2 text-xs font-semibold text-red-600">{errors.RoleDescription}</p>}
						</div>
						<div className="lg:col-span-1">
							<label className="block text-sm font-bold text-gray-700 mb-1.5" htmlFor="role-color">
								Theme Color
							</label>
							<div className="flex items-center gap-3">
								<input
									id="role-color"
									type="color"
									value={form.RoleColor}
									onChange={(e) => setForm((prev) => ({ ...prev, RoleColor: e.target.value.toUpperCase() }))}
									className="h-10 w-12 cursor-pointer rounded-md border border-gray-300 bg-white p-1 shadow-sm transition-transform hover:scale-105"
								/>
								<TextInput
									type="text"
									value={form.RoleColor}
									onChange={(e) => setForm((prev) => ({ ...prev, RoleColor: e.target.value.toUpperCase() }))}
									className="block w-full font-mono text-sm"
									placeholder={DEFAULT_ROLE_COLOR}
								/>
							</div>
							{errors.RoleColor && <p className="mt-2 text-xs font-semibold text-red-600">{errors.RoleColor}</p>}
						</div>
					</div>

					<div className="mt-8 border-t pt-8">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h4 className="text-lg font-bold text-gray-900 border-l-4 border-primary pl-3">Preset Permissions</h4>
								<p className="text-sm text-gray-500 mt-1">Select the default permissions for this role's members.</p>
							</div>
							<div className="relative w-full max-w-xs">
								<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
									<svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
									</svg>
								</div>
								<TextInput
									type="text"
									className="block w-full pl-9 py-1.5 text-xs h-9"
									placeholder="Quick search permissions..."
									value={permissionSearchQuery}
									onChange={(e) => setPermissionSearchQuery(e.target.value)}
								/>
							</div>
						</div>

						{errors.permissions && <p className="mb-4 text-sm font-bold text-red-600">{errors.permissions}</p>}
						
						<div className="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar space-y-4">
							<PermissionGroupRow
								title="Cashier-Level Permissions"
								permissions={permissionGroups.cashierLevel || []}
								selectedPermissions={form.permissions}
								disabled={isEditingOwnerRole || currentRank > PERMISSION_GROUP_MAX_ROLE_RANK.cashierLevel}
								onToggle={togglePermission}
								searchQuery={permissionSearchQuery}
							/>
							<PermissionGroupRow
								title="Clerk-Level Permissions"
								permissions={permissionGroups.clerkLevel || []}
								selectedPermissions={form.permissions}
								disabled={isEditingOwnerRole || currentRank > PERMISSION_GROUP_MAX_ROLE_RANK.clerkLevel}
								onToggle={togglePermission}
								searchQuery={permissionSearchQuery}
							/>
							<PermissionGroupRow
								title="Administrator-Level Permissions"
								permissions={permissionGroups.adminLevel || []}
								selectedPermissions={form.permissions}
								disabled={isEditingOwnerRole || currentRank > PERMISSION_GROUP_MAX_ROLE_RANK.adminLevel}
								onToggle={togglePermission}
								searchQuery={permissionSearchQuery}
							/>
							<PermissionGroupRow
								title="Systems-Level Permissions"
								permissions={permissionGroups.systemsLevel || []}
								selectedPermissions={form.permissions}
								disabled={isEditingOwnerRole || currentRank > PERMISSION_GROUP_MAX_ROLE_RANK.systemsLevel}
								onToggle={togglePermission}
								searchQuery={permissionSearchQuery}
							/>
						</div>
					</div>

					<div className="mt-8 flex justify-end gap-3 border-t pt-6">
						<SecondaryButton
							type="button"
							onClick={closeRoleModal}
							className="px-6 py-2.5 font-bold"
						>
							Discard Changes
						</SecondaryButton>
						<PrimaryButton
							type="submit"
							disabled={isSubmitting}
							className="px-8 py-2.5 font-bold shadow-md"
						>
							{isSubmitting ? "Processing..." : editingRole ? "Update Role" : "Create Role"}
						</PrimaryButton>
					</div>
				</form>
			</Modal>

			<Modal show={Boolean(deleteCandidate)} onClose={() => setDeleteCandidate(null)} maxWidth="md">
				{deleteCandidate && (
					<div className="p-6">
						<div className="flex items-center gap-4 mb-4 text-red-600">
							<div className="bg-red-100 p-2 rounded-full">
								<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
								</svg>
							</div>
							<h3 className="text-xl font-bold text-gray-900">Confirm Role Deletion</h3>
						</div>
						<p className="text-sm text-gray-600 leading-relaxed">
							Are you absolutely sure you want to delete the <span className="font-bold text-gray-900">"{deleteCandidate.RoleName}"</span> role? 
							This action is irreversible and will remove the role configuration from the system.
						</p>
						<div className="mt-8 flex justify-end gap-3">
							<SecondaryButton
								type="button"
								onClick={() => setDeleteCandidate(null)}
								className="px-5 py-2 font-bold"
							>
								Cancel
							</SecondaryButton>
							<button
								type="button"
								onClick={confirmDelete}
								disabled={isDeleting}
								className="inline-flex items-center justify-center rounded-md border border-transparent bg-red-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition-all font-bold"
							>
								{isDeleting ? "Deleting..." : "Confirm Delete"}
							</button>
						</div>
					</div>
				)}
			</Modal>

			<Modal show={isOrderModalOpen} onClose={() => setIsOrderModalOpen(false)} maxWidth="lg">
				<div className="p-6">
					<div className="flex items-center justify-between border-b pb-4 mb-6">
						<div>
							<h3 className="text-xl font-bold text-gray-900">Set Role Priorities</h3>
							<p className="mt-1 text-sm text-gray-500">
								Owner is permanent rank #1. Adjust priority to control management hierarchies.
							</p>
						</div>
						<button type="button" onClick={() => setIsOrderModalOpen(false)} className="text-gray-400 hover:text-gray-500 transition-colors">
							<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>

					<div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
						{roleOrder.map((role, index) => {
							const canMoveUp = index > 1 && !role.IsSystemOwner;
							const canMoveDown = index < roleOrder.length - 1 && !role.IsSystemOwner;
							return (
								<div key={`role-order-${role.id}`} className={`flex items-center justify-between rounded-lg border px-4 py-4 transition-all ${role.IsSystemOwner ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200 hover:border-primary/30 shadow-sm'}`}>
									<div className="flex items-center gap-4">
										<div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${role.IsSystemOwner ? 'bg-gray-200 text-gray-600' : 'bg-primary/10 text-primary border border-primary/20'}`}>
											#{role.IsSystemOwner ? 1 : index + 1}
										</div>
										<div>
											<p className="text-sm font-bold text-gray-900">{role.RoleName}</p>
											<p className="text-[10px] font-medium uppercase tracking-tight text-gray-400 truncate max-w-[150px]">{role.RoleDescription || "No description provided"}</p>
										</div>
									</div>
									<div className="inline-flex gap-2">
										<button
											type="button"
											onClick={() => moveRole(role.id, "up")}
											disabled={!canMoveUp}
											className={canMoveUp ? "rounded-md border border-gray-300 bg-white p-1.5 text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm" : "opacity-0 pointer-events-none"}
											title="Move Up"
										>
											<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
											</svg>
										</button>
										<button
											type="button"
											onClick={() => moveRole(role.id, "down")}
											disabled={!canMoveDown}
											className={canMoveDown ? "rounded-md border border-gray-300 bg-white p-1.5 text-gray-600 hover:text-primary hover:border-primary transition-all shadow-sm" : "opacity-0 pointer-events-none"}
											title="Move Down"
										>
											<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
											</svg>
										</button>
									</div>
								</div>
							);
						})}
					</div>

					<div className="mt-8 flex justify-end gap-3 border-t pt-6 font-bold">
						<SecondaryButton
							type="button"
							onClick={() => setIsOrderModalOpen(false)}
							className="px-6"
						>
							Cancel
						</SecondaryButton>
						<PrimaryButton
							type="button"
							onClick={saveRoleOrder}
							disabled={isSavingOrder}
							className="px-8 shadow-md"
						>
							{isSavingOrder ? "Applying..." : "Save Priority List"}
						</PrimaryButton>
					</div>
				</div>
			</Modal>
		</div>
	);
}
