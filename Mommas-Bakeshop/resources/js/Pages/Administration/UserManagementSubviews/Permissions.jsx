import React, { useEffect, useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { formatCountLabel } from "@/utils/countLabel";
import usePermissions from "@/hooks/usePermissions";
import Modal from "@/Components/Modal";
import SecondaryButton from "@/Components/SecondaryButton";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import { Pencil } from "lucide-react";

function PermissionGroupRow({ title, permissions, userPermissions, onToggle, searchQuery }) {
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
						<label key={permission.name} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer transition-colors">
							<input
								type="checkbox"
								className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
								checked={Boolean(userPermissions[permission.name])}
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

function EditPermissionModal({ show, onClose, user, permissionGroups, onSave, isSaving }) {
	const [localPermissions, setLocalPermissions] = useState({});
	const [searchQuery, setSearchQuery] = useState("");

	useEffect(() => {
		if (show && user) {
			setLocalPermissions(user.permissions || {});
		}
	}, [show, user]);

	const handleToggle = (name, checked) => {
		setLocalPermissions(prev => ({ ...prev, [name]: checked }));
	};

	const handleSave = () => {
		onSave(user.id, user.permissions, localPermissions);
	};

	return (
		<Modal show={show} onClose={onClose} maxWidth="4xl">
			<div className="p-6">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h3 className="text-lg font-bold text-gray-900">Edit Permissions</h3>
						<p className="text-sm text-gray-500">Managing permissions for <span className="font-semibold text-primary">{user?.FullName}</span></p>
					</div>
					<button onClick={onClose} className="text-gray-400 hover:text-gray-500">
						<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<div className="mb-6">
					<div className="relative">
						<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
						<TextInput
							type="text"
							className="block w-full pl-10"
							placeholder="Search permissions by name or label..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
				</div>

				<div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
					<PermissionGroupRow
						title="Cashier-Level Permissions"
						permissions={permissionGroups.cashierLevel || []}
						userPermissions={localPermissions}
						onToggle={handleToggle}
						searchQuery={searchQuery}
					/>
					<PermissionGroupRow
						title="Clerk-Level Permissions"
						permissions={permissionGroups.clerkLevel || []}
						userPermissions={localPermissions}
						onToggle={handleToggle}
						searchQuery={searchQuery}
					/>
					<PermissionGroupRow
						title="Administrator-Level Permissions"
						permissions={permissionGroups.adminLevel || []}
						userPermissions={localPermissions}
						onToggle={handleToggle}
						searchQuery={searchQuery}
					/>
					<PermissionGroupRow
						title="Systems-Level Permissions"
						permissions={permissionGroups.systemsLevel || []}
						userPermissions={localPermissions}
						onToggle={handleToggle}
						searchQuery={searchQuery}
					/>
				</div>

				<div className="mt-8 flex justify-end gap-3 border-t pt-6">
					<SecondaryButton onClick={onClose} disabled={isSaving}>
						Cancel
					</SecondaryButton>
					<PrimaryButton onClick={handleSave} disabled={isSaving}>
						{isSaving ? "Saving..." : "Save Changes"}
					</PrimaryButton>
				</div>
			</div>
		</Modal>
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
		systemsLevel: 1,
	};
	const [searchQuery, setSearchQuery] = useState("");
	const [rows, setRows] = useState(permissionsUsers);
	const [savingByUserId, setSavingByUserId] = useState({});
	const [editingUser, setEditingUser] = useState(null);

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
				onSuccess: () => {
					setEditingUser(null);
				},
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

	const getPermissionCount = (userPermissions, groupList) => {
		if (!groupList) return 0;
		return groupList.filter(p => Boolean(userPermissions[p.name])).length;
	};

	const renderCountLabel = (count, total) => {
		if (count === 0) return <span className="text-gray-400 italic">No Permission</span>;
		return (
			<span className={`px-2 py-1 rounded text-xs font-semibold ${count === total ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'}`}>
				{count} {count === 1 ? 'Permission' : 'Permissions'}
			</span>
		);
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
									Permission editing is disabled for your account.
								</div>
							)}

							<div className="border rounded-lg border-gray-200 flex-1 min-h-0 flex flex-col overflow-hidden">
								<div className="overflow-x-auto overflow-y-auto min-h-0 flex-1 custom-scrollbar">
									<table className="min-w-full divide-y divide-gray-200">
										<thead className="bg-gray-50 sticky top-0 z-10 shadow-sm border-b">
											<tr>
												<th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</th>
												<th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
												<th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Cashier</th>
												<th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Clerk</th>
												<th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Administrator</th>
												<th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Systems</th>
												<th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200">
												{filteredRows.map((row) => (
													<tr key={row.id} className="hover:bg-gray-50 transition-colors">
													<td className="px-6 py-4 whitespace-nowrap">
														<div className="text-sm font-semibold text-gray-900">{row.FullName}</div>
														{savingByUserId[row.id] && (
															<p className="mt-0.5 text-[10px] text-primary animate-pulse font-medium uppercase tracking-tight">Saving changes...</p>
														)}
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
															{row.Role || "-"}
														</span>
													</td>
														<td className="px-6 py-4 text-center">
															{renderCountLabel(
																getPermissionCount(row.permissions, permissionGroups.cashierLevel),
																permissionGroups.cashierLevel?.length
															)}
														</td>
														<td className="px-6 py-4 text-center">
															{renderCountLabel(
																getPermissionCount(row.permissions, permissionGroups.clerkLevel),
																permissionGroups.clerkLevel?.length
															)}
														</td>
														<td className="px-6 py-4 text-center">
															{renderCountLabel(
																getPermissionCount(row.permissions, permissionGroups.adminLevel),
																permissionGroups.adminLevel?.length
															)}
														</td>
														<td className="px-6 py-4 text-center">
															{renderCountLabel(
																getPermissionCount(row.permissions, permissionGroups.systemsLevel),
																permissionGroups.systemsLevel?.length
															)}
														</td>
														<td className="px-6 py-4 text-right">
															<button
																onClick={() => {
																	if (!canUpdateUserPermissions) {
																		requirePermission("CanUpdateUserPermissions");
																		return;
																	}
																	const actorRoleRank = Number(currentUserRoleRank ?? Number.MAX_SAFE_INTEGER);
																	const targetRoleRank = Number(row?.RoleRank ?? Number.MAX_SAFE_INTEGER);
																	if (actorRoleRank > targetRoleRank) {
																		deny("You can only edit permissions for users with the same role or lower.");
																		return;
																	}
																	setEditingUser(row);
																}}
																className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-hover transition-all shadow-sm"
															>
																<Pencil className="h-3.5 w-3.5" />
																Edit
															</button>
														</td>
												</tr>
											))}
											{filteredRows.length === 0 && (
												<tr>
													<td colSpan="6" className="px-6 py-12 text-center text-sm text-gray-500 italic">
														No permission records found. Try adjusting your search.
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

			<EditPermissionModal
				show={!!editingUser}
				onClose={() => setEditingUser(null)}
				user={editingUser}
				permissionGroups={permissionGroups}
				onSave={updateUserPermissions}
				isSaving={Boolean(editingUser && savingByUserId[editingUser.id])}
			/>
		</div>
	);
}
