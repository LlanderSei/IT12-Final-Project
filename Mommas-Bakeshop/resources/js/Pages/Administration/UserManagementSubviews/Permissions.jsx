import React, { useEffect, useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { formatCountLabel } from "@/utils/countLabel";
import usePermissions from "@/hooks/usePermissions";

function PermissionColumn({ permissions = [], rowPermissions = {}, onToggle, disabled = false }) {
	return (
		<div className="max-h-56 overflow-y-auto pr-2 space-y-2">
			{permissions.map((permission) => (
				<label key={permission.name} className="flex items-start gap-2 text-xs text-gray-700">
					<input
						type="checkbox"
						className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
						checked={Boolean(rowPermissions[permission.name])}
						disabled={disabled}
						onChange={(e) => onToggle(permission.name, e.target.checked)}
					/>
					<span className="leading-5 break-words">
						<span className="block">{permission.label}</span>
						{permission.groupName && (
							<span className="mt-0.5 block text-[11px] text-gray-500">
								Group: {permission.groupName}
							</span>
						)}
					</span>
				</label>
			))}
			{permissions.length === 0 && <p className="text-xs text-gray-400 italic">No permissions in this group.</p>}
		</div>
	);
}

export default function Permissions({
	permissionsUsers = [],
	permissionGroups = {},
	currentUserRoleRank = null,
	onHeaderMetaChange,
}) {
	const { can, deny, requirePermission } = usePermissions();
	const { auth } = usePage().props;
	const currentUserId = Number(auth?.user?.id ?? 0);
	const canUpdateUserPermissions = can("CanUpdateUserPermissions");
	const PERMISSION_GROUP_MAX_ROLE_RANK = {
		cashierLevel: 3,
		clerkLevel: 4,
		adminLevel: 2,
	};
	const [searchQuery, setSearchQuery] = useState("");
	const [rows, setRows] = useState(permissionsUsers);
	const [savingByUserId, setSavingByUserId] = useState({});

	useEffect(() => {
		setRows(permissionsUsers);
	}, [permissionsUsers]);

	const filteredRows = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return rows;
		return rows.filter((row) => {
			const fullName = String(row.FullName || "").toLowerCase();
			const role = String(row.Role || "").toLowerCase();
			return fullName.includes(query) || role.includes(query);
		});
	}, [rows, searchQuery]);
	const permissionGroupByName = useMemo(() => {
		const map = {};
		Object.entries(permissionGroups || {}).forEach(([groupKey, list]) => {
			(list || []).forEach((item) => {
				map[item.name] = groupKey;
			});
		});
		return map;
	}, [permissionGroups]);

	const countLabel = formatCountLabel(filteredRows.length, "record");

	useEffect(() => {
		onHeaderMetaChange?.({
			subtitle: "Permissions",
			countLabel,
		});
	}, [onHeaderMetaChange, countLabel]);

	const updateUserPermissions = (userId, previousPermissions, nextPermissions) => {
		setSavingByUserId((prev) => ({ ...prev, [userId]: true }));
		router.put(
			route("admin.permissions.update", userId),
			{ permissions: nextPermissions },
			{
				preserveScroll: true,
				preserveState: true,
				replace: true,
				only: ["permissionsUsers", "auth"],
				onError: (errors) => {
					setRows((prevRows) =>
						prevRows.map((row) =>
							row.id === userId
								? {
										...row,
										permissions: previousPermissions,
								  }
								: row,
						),
					);
					const firstError =
						(errors && Object.values(errors).find(Boolean)) ||
						"Insufficient permission.";
					if (typeof window !== "undefined") {
						window.dispatchEvent(
							new CustomEvent("app-toast", {
								detail: {
									type: "error",
									message: String(firstError),
								},
							}),
						);
					}
				},
				onFinish: () => {
					setSavingByUserId((prev) => ({ ...prev, [userId]: false }));
				},
			},
		);
	};

	const togglePermission = (userId, permissionName, checked) => {
		const currentRow = rows.find((row) => row.id === userId);
		if (!canUpdateUserPermissions) {
			requirePermission("CanUpdateUserPermissions");
			return;
		}
		const permissionGroupKey = permissionGroupByName[permissionName];
		const maxRoleRankForGroup =
			PERMISSION_GROUP_MAX_ROLE_RANK[permissionGroupKey] ?? Number.MAX_SAFE_INTEGER;
		const actorRoleRank = Number(currentUserRoleRank ?? Number.MAX_SAFE_INTEGER);
		const targetRoleRank = Number(currentRow?.RoleRank ?? Number.MAX_SAFE_INTEGER);
		if (actorRoleRank > targetRoleRank) {
			deny("You can only edit permissions for users with the same role or lower.");
			return;
		}
		if (actorRoleRank > maxRoleRankForGroup) {
			deny("You cannot edit permissions that are above your role level.");
			return;
		}
		const isSelf = Number(currentRow?.id ?? 0) === currentUserId;
		const isSelfCriticalPermission =
			permissionName === "CanViewUserManagementPermissions" ||
			permissionName === "CanUpdateUserPermissions";
		if (isSelf && isSelfCriticalPermission && !checked) {
			deny(
				"Warning: You cannot revoke your own permissions to view or update permissions.",
			);
			return;
		}
		const previousPermissions = {
			...(currentRow?.permissions || {}),
		};
		const nextPermissions = {
			...(currentRow?.permissions || {}),
			[permissionName]: checked,
		};

		setRows((prevRows) =>
			prevRows.map((row) =>
				row.id === userId
					? {
							...row,
							permissions: nextPermissions,
					  }
					: row,
			),
		);

		updateUserPermissions(userId, previousPermissions, nextPermissions);
	};

	return (
		<div className="flex flex-col flex-1 w-full relative overflow-hidden min-h-0">
			<div className="flex-1 flex flex-col overflow-hidden min-h-0">
				<div className="mx-auto w-full flex-1 flex flex-col overflow-hidden min-h-0">
					<div className="bg-white shadow-sm sm:rounded-lg flex-1 flex flex-col overflow-hidden min-h-0">
						<div className="p-6 flex-1 flex flex-col overflow-hidden min-h-0">
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
										placeholder="Search by full name or role..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
									/>
								</div>
							</div>
							{!canUpdateUserPermissions && (
								<div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
									Permission toggles are disabled for your account.
								</div>
							)}

							<div className="border rounded-lg border-gray-200 flex-1 min-h-0 flex flex-col overflow-hidden">
								<div className="overflow-x-auto overflow-y-auto min-h-0 flex-1">
									<table className="min-w-full divide-y divide-gray-200">
										<thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
											<tr>
												<th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-56">Full Name</th>
												<th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">Role</th>
												<th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-72">Cashier-Level Permissions</th>
												<th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-72">Clerk-Level Permissions</th>
												<th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-72">Admin-Level Permissions</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200">
												{filteredRows.map((row) => (
													<tr key={row.id} className="align-top hover:bg-gray-50">
													<td className="px-6 py-4 text-sm font-medium text-gray-900">
														<div>{row.FullName}</div>
														{savingByUserId[row.id] && (
															<p className="mt-1 text-xs text-gray-500">Saving changes...</p>
														)}
													</td>
													<td className="px-6 py-4 text-sm text-gray-700">{row.Role || "-"}</td>
														<td className="px-6 py-4">
															<PermissionColumn
																permissions={permissionGroups.cashierLevel || []}
																rowPermissions={row.permissions}
																disabled={
																	Boolean(savingByUserId[row.id]) ||
																	!canUpdateUserPermissions ||
																	Number(currentUserRoleRank ?? Number.MAX_SAFE_INTEGER) >
																		Number(row.RoleRank ?? Number.MAX_SAFE_INTEGER) ||
																	Number(currentUserRoleRank ?? Number.MAX_SAFE_INTEGER) >
																		PERMISSION_GROUP_MAX_ROLE_RANK.cashierLevel
																}
																onToggle={(permissionName, checked) =>
																	togglePermission(row.id, permissionName, checked)
																}
															/>
														</td>
														<td className="px-6 py-4">
															<PermissionColumn
																permissions={permissionGroups.clerkLevel || []}
																rowPermissions={row.permissions}
																disabled={
																	Boolean(savingByUserId[row.id]) ||
																	!canUpdateUserPermissions ||
																	Number(currentUserRoleRank ?? Number.MAX_SAFE_INTEGER) >
																		Number(row.RoleRank ?? Number.MAX_SAFE_INTEGER) ||
																	Number(currentUserRoleRank ?? Number.MAX_SAFE_INTEGER) >
																		PERMISSION_GROUP_MAX_ROLE_RANK.clerkLevel
																}
																onToggle={(permissionName, checked) =>
																	togglePermission(row.id, permissionName, checked)
																}
															/>
														</td>
														<td className="px-6 py-4">
															<PermissionColumn
																permissions={permissionGroups.adminLevel || []}
																rowPermissions={row.permissions}
																disabled={
																	Boolean(savingByUserId[row.id]) ||
																	!canUpdateUserPermissions ||
																	Number(currentUserRoleRank ?? Number.MAX_SAFE_INTEGER) >
																		Number(row.RoleRank ?? Number.MAX_SAFE_INTEGER) ||
																	Number(currentUserRoleRank ?? Number.MAX_SAFE_INTEGER) >
																		PERMISSION_GROUP_MAX_ROLE_RANK.adminLevel
																}
																onToggle={(permissionName, checked) =>
																	togglePermission(row.id, permissionName, checked)
																}
														/>
													</td>
												</tr>
											))}
											{filteredRows.length === 0 && (
												<tr>
													<td colSpan="5" className="px-6 py-10 text-center text-sm text-gray-500">
														No permission records found.
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
		</div>
	);
}
