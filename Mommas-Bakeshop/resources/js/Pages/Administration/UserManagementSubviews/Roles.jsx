import React, { useEffect, useMemo, useState } from "react";
import { router } from "@inertiajs/react";
import Modal from "@/Components/Modal";
import { formatCountLabel } from "@/utils/countLabel";
import usePermissions from "@/hooks/usePermissions";

const PERMISSION_GROUP_MAX_ROLE_RANK = {
	cashierLevel: 3,
	clerkLevel: 4,
	adminLevel: 2,
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

function PermissionChecklistColumn({
	title,
	columnKey,
	permissions = [],
	selectedPermissions = {},
	onToggle,
	disabled = false,
}) {
	return (
		<div className="rounded-lg border border-gray-200 p-4">
			<h4 className="text-sm font-semibold text-gray-900">{title}</h4>
			<div className="mt-3 max-h-64 space-y-3 overflow-y-auto pr-2">
				{permissions.map((permission) => (
					<label key={`${columnKey}-${permission.name}`} className="flex items-start gap-3 text-sm text-gray-700">
						<input
							type="checkbox"
							className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
							checked={Boolean(selectedPermissions[permission.name])}
							disabled={disabled}
							onChange={(e) => onToggle(permission.name, e.target.checked)}
						/>
						<span className="min-w-0">
							<span className="block break-words font-medium text-gray-800">
								{permission.label}
							</span>
							{permission.groupName && (
								<span className="mt-0.5 block text-xs text-gray-500">
									Group: {permission.groupName}
								</span>
							)}
						</span>
					</label>
				))}
				{permissions.length === 0 && (
					<p className="text-xs italic text-gray-400">No permissions in this column.</p>
				)}
			</div>
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
										placeholder="Search roles by name, description, or rank..."
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
											<th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Role</th>
											<th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Color</th>
											<th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Description</th>
											<th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Rank</th>
											<th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Users</th>
											<th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Preset Permissions</th>
											<th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
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
												<tr key={role.id} className="hover:bg-gray-50">
													<td className="px-6 py-4 text-sm font-medium text-gray-900">
														<div>{role.RoleName}</div>
														{role.IsSystemOwner && (
															<span className="mt-1 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
																System Locked
															</span>
														)}
													</td>
													<td className="px-6 py-4 text-sm text-gray-700">
														<div className="flex items-center gap-3">
															<span
																className="h-5 w-5 rounded-full border border-gray-200"
																style={{ backgroundColor: role.RoleColor || DEFAULT_ROLE_COLOR }}
															/>
															<span className="font-mono text-xs uppercase">
																{role.RoleColor || DEFAULT_ROLE_COLOR}
															</span>
														</div>
													</td>
													<td className="px-6 py-4 text-sm text-gray-700">{role.RoleDescription || "-"}</td>
													<td className="px-6 py-4 text-sm text-gray-700">#{role.RoleRank}</td>
													<td className="px-6 py-4 text-sm text-gray-700">{role.UsersCount || 0}</td>
													<td className="px-6 py-4 text-sm text-gray-700">{role.PresetPermissionCount || 0}</td>
													<td className="px-6 py-4 text-right text-sm font-medium">
														<div className="inline-flex items-center gap-2">
															<button
																type="button"
																onClick={() => openEditModal(role)}
																disabled={!canEdit}
																className={canEdit ? "rounded border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary-soft" : "cursor-not-allowed rounded border border-gray-200 px-3 py-1 text-xs font-medium text-gray-300"}
															>
																Edit
															</button>
															<button
																type="button"
																onClick={() => setDeleteCandidate(role)}
																disabled={!canDelete}
																title={getDeleteTooltip(role)}
																className={canDelete ? "rounded border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50" : "cursor-not-allowed rounded border border-gray-200 px-3 py-1 text-xs font-medium text-gray-300"}
															>
																Delete
															</button>
														</div>
													</td>
												</tr>
											);
										})}
										{filteredRoles.length === 0 && (
											<tr>
												<td colSpan="7" className="px-6 py-10 text-center text-sm text-gray-500">
													No roles found.
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
				<div className="mx-auto flex max-w-7xl gap-3 px-4 sm:px-6 lg:px-8">
					<button
						type="button"
						onClick={openAddModal}
						disabled={!canCreateRole}
						className="inline-flex flex-1 justify-center rounded-md border border-transparent bg-primary px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
					>
						Add Role
					</button>
					<button
						type="button"
						onClick={openOrderModal}
						disabled={!canUpdateRoleOrder || rolePresets.length <= 1}
						className="inline-flex flex-1 justify-center rounded-md border border-primary bg-white px-6 py-3 text-sm font-medium text-primary shadow-sm hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-60"
					>
						Manage Role Order
					</button>
				</div>
			</div>

			<Modal show={isRoleModalOpen} onClose={closeRoleModal} maxWidth="4xl">
				<form onSubmit={submitRole} className="p-6">
					<h3 className="text-lg font-semibold text-gray-900">
						{editingRole ? "Edit Role Preset" : "Add Role"}
					</h3>
					<p className="mt-2 text-sm text-gray-500">
						{isEditingOwnerRole
							? "Owner keeps its locked name, description, rank, and permissions. Only the badge color can be changed."
							: "Role preset changes re-sync users currently assigned to that role."}
					</p>
					<div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<label className="block text-sm font-medium text-gray-700" htmlFor="role-name">
								Role Name
							</label>
							<input
								id="role-name"
								type="text"
								value={form.RoleName}
								onChange={(e) => setForm((prev) => ({ ...prev, RoleName: e.target.value }))}
								disabled={isEditingOwnerRole}
								className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary disabled:cursor-not-allowed disabled:bg-gray-100 sm:text-sm"
							/>
							{errors.RoleName && <p className="mt-2 text-sm text-red-600">{errors.RoleName}</p>}
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700" htmlFor="role-description">
								Role Description
							</label>
							<input
								id="role-description"
								type="text"
								value={form.RoleDescription}
								onChange={(e) => setForm((prev) => ({ ...prev, RoleDescription: e.target.value }))}
								disabled={isEditingOwnerRole}
								className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary disabled:cursor-not-allowed disabled:bg-gray-100 sm:text-sm"
							/>
							{errors.RoleDescription && <p className="mt-2 text-sm text-red-600">{errors.RoleDescription}</p>}
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700" htmlFor="role-color">
								Role Color
							</label>
							<div className="mt-1 flex items-center gap-3">
								<input
									id="role-color"
									type="color"
									value={form.RoleColor}
									onChange={(e) => setForm((prev) => ({ ...prev, RoleColor: e.target.value.toUpperCase() }))}
									className="h-10 w-16 cursor-pointer rounded-md border border-gray-300 bg-white p-1 shadow-sm"
								/>
								<input
									type="text"
									value={form.RoleColor}
									onChange={(e) => setForm((prev) => ({ ...prev, RoleColor: e.target.value.toUpperCase() }))}
									className="block w-full rounded-md border-gray-300 font-mono uppercase shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
									placeholder={DEFAULT_ROLE_COLOR}
								/>
							</div>
							{errors.RoleColor && <p className="mt-2 text-sm text-red-600">{errors.RoleColor}</p>}
						</div>
					</div>
					{errors.permissions && <p className="mt-4 text-sm text-red-600">{errors.permissions}</p>}
					<div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
						<PermissionChecklistColumn
							title="Cashier-Level Permissions"
							columnKey="cashierLevel"
							permissions={permissionGroups.cashierLevel || []}
							selectedPermissions={form.permissions}
							disabled={isEditingOwnerRole || currentRank > PERMISSION_GROUP_MAX_ROLE_RANK.cashierLevel}
							onToggle={togglePermission}
						/>
						<PermissionChecklistColumn
							title="Clerk-Level Permissions"
							columnKey="clerkLevel"
							permissions={permissionGroups.clerkLevel || []}
							selectedPermissions={form.permissions}
							disabled={isEditingOwnerRole || currentRank > PERMISSION_GROUP_MAX_ROLE_RANK.clerkLevel}
							onToggle={togglePermission}
						/>
						<PermissionChecklistColumn
							title="Admin-Level Permissions"
							columnKey="adminLevel"
							permissions={permissionGroups.adminLevel || []}
							selectedPermissions={form.permissions}
							disabled={isEditingOwnerRole || currentRank > PERMISSION_GROUP_MAX_ROLE_RANK.adminLevel}
							onToggle={togglePermission}
						/>
					</div>
					<div className="mt-6 flex justify-end gap-2">
						<button
							type="button"
							onClick={closeRoleModal}
							className="rounded-md border border-primary bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-primary-soft"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting}
							className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
						>
							{editingRole ? "Save Role" : "Add Role"}
						</button>
					</div>
				</form>
			</Modal>

			<Modal show={Boolean(deleteCandidate)} onClose={() => setDeleteCandidate(null)} maxWidth="md">
				{deleteCandidate && (
					<div className="p-6">
						<h3 className="text-lg font-semibold text-gray-900">Delete Role</h3>
						<p className="mt-3 text-sm text-gray-600">
							Are you sure you want to delete "{deleteCandidate.RoleName}"? This action cannot be undone.
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

			<Modal show={isOrderModalOpen} onClose={() => setIsOrderModalOpen(false)} maxWidth="lg">
				<div className="p-6">
					<h3 className="text-lg font-semibold text-gray-900">Manage Role Order</h3>
					<p className="mt-2 text-sm text-gray-500">
						Owner stays fixed at rank #1. The remaining roles will be renumbered in the order shown below.
					</p>
					<div className="mt-5 space-y-3">
						{roleOrder.map((role, index) => {
							const canMoveUp = index > 1 && !role.IsSystemOwner;
							const canMoveDown = index < roleOrder.length - 1 && !role.IsSystemOwner;
							return (
								<div key={`role-order-${role.id}`} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
									<div>
										<p className="text-sm font-medium text-gray-900">
											#{role.IsSystemOwner ? 1 : index + 1} {role.RoleName}
										</p>
										<p className="text-xs text-gray-500">{role.RoleDescription || "No description."}</p>
									</div>
									<div className="inline-flex gap-2">
										<button
											type="button"
											onClick={() => moveRole(role.id, "up")}
											disabled={!canMoveUp}
											className={canMoveUp ? "rounded border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary-soft" : "cursor-not-allowed rounded border border-gray-200 px-3 py-1 text-xs font-medium text-gray-300"}
										>
											Move Up
										</button>
										<button
											type="button"
											onClick={() => moveRole(role.id, "down")}
											disabled={!canMoveDown}
											className={canMoveDown ? "rounded border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary-soft" : "cursor-not-allowed rounded border border-gray-200 px-3 py-1 text-xs font-medium text-gray-300"}
										>
											Move Down
										</button>
									</div>
								</div>
							);
						})}
					</div>
					<div className="mt-6 flex justify-end gap-2">
						<button
							type="button"
							onClick={() => setIsOrderModalOpen(false)}
							className="rounded-md border border-primary bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-primary-soft"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={saveRoleOrder}
							disabled={isSavingOrder}
							className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
						>
							Save Order
						</button>
					</div>
				</div>
			</Modal>
		</div>
	);
}
