import React, { useMemo, useState } from "react";
import { useForm, usePage } from "@inertiajs/react";

export default function Users({ users = [], roles = [] }) {
	const { auth } = usePage().props;
	const currentUser = auth?.user;

	const normalizedRoles = useMemo(() => {
		if (Array.isArray(roles) && roles.length > 0) {
			return [...roles]
				.filter((role) => role?.ID)
				.sort((a, b) => {
					const rankDelta = Number(a?.RoleRank ?? 0) - Number(b?.RoleRank ?? 0);
					if (rankDelta !== 0) return rankDelta;
					return String(a?.RoleName || "").localeCompare(String(b?.RoleName || ""));
				});
		}

		const mapped = new Map();
		(users || []).forEach((user) => {
			if (!user?.RoleID || !user?.Roles) return;
			mapped.set(String(user.RoleID), {
				ID: user.RoleID,
				RoleName: user.Roles,
				RoleRank: user.RoleRank ?? null,
			});
		});
		return [...mapped.values()];
	}, [roles, users]);

	const defaultRoleId = useMemo(
		() => String(normalizedRoles[0]?.ID ?? ""),
		[normalizedRoles],
	);

	const [searchQuery, setSearchQuery] = useState("");
	const [roleFilter, setRoleFilter] = useState("all");
	const [sortConfig, setSortConfig] = useState({
		key: "FullName",
		direction: "asc",
	});
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingUser, setEditingUser] = useState(null);
	const [deleteCandidate, setDeleteCandidate] = useState(null);

	const form = useForm({
		FullName: "",
		email: "",
		RoleID: defaultRoleId,
		password: "",
		password_confirmation: "",
	});

	const currentUserRecord = useMemo(
		() => users.find((user) => Number(user?.id) === Number(currentUser?.id)) || null,
		[users, currentUser?.id],
	);

	const getSortValue = (user, key) => {
		if (key === "Records") return Number(user.RelationCount || 0);
		if (key === "Roles") return user.Roles || "";
		return user[key] || "";
	};

	const filteredUsers = useMemo(() => {
		const searchLower = searchQuery.toLowerCase().trim();

		const result = users.filter((user) => {
			const matchesSearch =
				!searchLower ||
				user.FullName?.toLowerCase().includes(searchLower) ||
				user.email?.toLowerCase().includes(searchLower) ||
				user.Roles?.toLowerCase().includes(searchLower);
			const matchesRole =
				roleFilter === "all" || String(user.RoleID || "") === String(roleFilter);
			return matchesSearch && matchesRole;
		});

		result.sort((a, b) => {
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

		return result;
	}, [users, searchQuery, roleFilter, sortConfig]);

	const requestSort = (key) => {
		let direction = "asc";
		if (sortConfig.key === key && sortConfig.direction === "asc") {
			direction = "desc";
		}
		setSortConfig({ key, direction });
	};

	const openAddModal = () => {
		setEditingUser(null);
		form.reset();
		form.clearErrors();
		form.setData({
			FullName: "",
			email: "",
			RoleID: defaultRoleId,
			password: "",
			password_confirmation: "",
		});
		setIsModalOpen(true);
	};

	const openEditModal = (user) => {
		setEditingUser(user);
		form.clearErrors();
		form.setData({
			FullName: user.FullName || "",
			email: user.email || "",
			RoleID: String(user.RoleID || defaultRoleId),
			password: "",
			password_confirmation: "",
		});
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setEditingUser(null);
		form.reset();
		form.clearErrors();
	};

	const isEditingOwnAccount =
		editingUser && Number(editingUser.id) === Number(currentUser?.id);

	const submitUser = (e) => {
		e.preventDefault();
		if (editingUser) {
			form.put(route("admin.users.update", editingUser.id), {
				onSuccess: () => closeModal(),
			});
			return;
		}

		form.post(route("admin.users.store"), {
			onSuccess: () => closeModal(),
		});
	};

	const isSelf = (user) => Number(user.id) === Number(currentUser?.id);

	const canDeleteTarget = (user) => {
		if (isSelf(user)) return false;
		const currentRank = Number(currentUserRecord?.RoleRank);
		const targetRank = Number(user?.RoleRank);
		if (!Number.isFinite(currentRank) || !Number.isFinite(targetRank)) return true;
		return currentRank <= targetRank;
	};

	const getDeleteTooltip = (user) => {
		if (isSelf(user)) return "You cannot delete your own account.";
		if (!canDeleteTarget(user)) {
			return "You can only delete users with the same role or lower privilege.";
		}
		return "Delete user";
	};

	const confirmDelete = () => {
		if (!deleteCandidate) return;
		form.delete(route("admin.users.destroy", deleteCandidate.id), {
			onSuccess: () => setDeleteCandidate(null),
		});
	};

	const clearFilters = () => {
		setSearchQuery("");
		setRoleFilter("all");
		setSortConfig({ key: "FullName", direction: "asc" });
	};

	return (
		<div className="flex flex-col flex-1 w-full relative overflow-hidden min-h-0">
			<div className="flex-1 flex flex-col overflow-hidden min-h-0">
				<div className="mx-auto w-full flex-1 flex flex-col overflow-hidden min-h-0">
					<div className="bg-white shadow-sm sm:rounded-lg flex-1 flex flex-col overflow-hidden min-h-0">
						<div className="p-6 flex-1 flex flex-col overflow-hidden min-h-0">
							<div className="flex justify-between items-center mb-6">
								<h3 className="text-xl font-bold text-gray-900">Users</h3>
								<div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
									{filteredUsers.length} Users
								</div>
							</div>

							<div className="mb-6 flex items-start gap-3">
								<div className="relative w-full max-w-xl shrink-0">
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
										placeholder="Search users by name, email, or role..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
									/>
								</div>
								<div className="flex flex-1 min-w-0 items-center gap-2">
									<div className="relative flex-1 min-w-0">
										<div className="overflow-x-auto pb-1 pr-4">
											<div className="flex min-w-max items-center gap-2 pr-3">
												<select
													value={roleFilter}
													onChange={(e) => setRoleFilter(e.target.value)}
													className="w-44 rounded-md border-gray-300 text-sm focus:border-[#D97736] focus:ring-[#D97736]"
												>
													<option value="all">All Roles</option>
													{normalizedRoles.map((role) => (
														<option key={role.ID} value={String(role.ID)}>
															{role.RoleName}
														</option>
													))}
												</select>
											</div>
										</div>
										<div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
									</div>
									<button
										type="button"
										onClick={clearFilters}
										className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
									>
										Reset Filters
									</button>
								</div>
							</div>

							<div className="border rounded-lg border-gray-200 flex-1 overflow-y-auto">
								<table className="min-w-full divide-y divide-gray-200">
									<thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
										<tr>
											<th
												scope="col"
												className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
												onClick={() => requestSort("FullName")}
											>
												<div className="flex items-center">
													Full Name
													{sortConfig.key === "FullName" && (
														<span className="ml-1 text-[10px] text-gray-400">
															{sortConfig.direction.toUpperCase()}
														</span>
													)}
												</div>
											</th>
											<th
												scope="col"
												className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
												onClick={() => requestSort("email")}
											>
												<div className="flex items-center">
													Email
													{sortConfig.key === "email" && (
														<span className="ml-1 text-[10px] text-gray-400">
															{sortConfig.direction.toUpperCase()}
														</span>
													)}
												</div>
											</th>
											<th
												scope="col"
												className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
												onClick={() => requestSort("Roles")}
											>
												<div className="flex items-center">
													Role
													{sortConfig.key === "Roles" && (
														<span className="ml-1 text-[10px] text-gray-400">
															{sortConfig.direction.toUpperCase()}
														</span>
													)}
												</div>
											</th>
											<th
												scope="col"
												className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
												onClick={() => requestSort("Records")}
											>
												<div className="flex items-center">
													Linked Records
													{sortConfig.key === "Records" && (
														<span className="ml-1 text-[10px] text-gray-400">
															{sortConfig.direction.toUpperCase()}
														</span>
													)}
												</div>
											</th>
											<th
												scope="col"
												className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
											>
												Actions
											</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{filteredUsers.map((user) => {
											const canDelete = canDeleteTarget(user);
											return (
												<tr key={user.id} className="hover:bg-gray-50">
													<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
														{user.FullName}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
														{user.email}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
														{user.Roles || "N/A"}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
														{user.RelationCount || 0}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
														<div className="inline-flex items-center gap-2">
															<button
																type="button"
																onClick={() => openEditModal(user)}
																className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
															>
																Edit
															</button>
															<button
																type="button"
																onClick={() => setDeleteCandidate(user)}
																disabled={!canDelete}
																title={getDeleteTooltip(user)}
																className={
																	canDelete
																		? "rounded border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
																		: "rounded border border-gray-200 px-3 py-1 text-xs font-medium text-gray-300 cursor-not-allowed"
																}
															>
																Delete
															</button>
														</div>
													</td>
												</tr>
											);
										})}
										{filteredUsers.length === 0 && (
											<tr>
												<td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
													No users found.
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

			<div className="sticky bottom-0 w-full p-4 bg-white border-t border-gray-200 z-10">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<button
						onClick={openAddModal}
						disabled={!defaultRoleId}
						className="w-full inline-flex justify-center py-3 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#D97736] hover:bg-[#c2682e] disabled:opacity-60 disabled:cursor-not-allowed"
					>
						Add User
					</button>
				</div>
			</div>

			{isModalOpen && (
				<div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
					<div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
						<div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal} />
						<span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
							&#8203;
						</span>
						<div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
							<form onSubmit={submitUser}>
								<div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
									<div className="sm:flex sm:items-start">
										<div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
											<h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
												{editingUser ? "Edit User" : "Add User"}
											</h3>
											<div className="mt-4 space-y-4">
												<div>
													<label className="block text-sm font-medium text-gray-700" htmlFor="FullName">
														Full Name
													</label>
													<input
														type="text"
														id="FullName"
														value={form.data.FullName}
														onChange={(e) => form.setData("FullName", e.target.value)}
														required
														className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#D97736] focus:border-[#D97736] sm:text-sm"
													/>
													{form.errors.FullName && <p className="mt-2 text-sm text-red-600">{form.errors.FullName}</p>}
												</div>

												<div>
													<label className="block text-sm font-medium text-gray-700" htmlFor="email">
														Email
													</label>
													<input
														type="email"
														id="email"
														value={form.data.email}
														onChange={(e) => form.setData("email", e.target.value)}
														required
														className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#D97736] focus:border-[#D97736] sm:text-sm"
													/>
													{form.errors.email && <p className="mt-2 text-sm text-red-600">{form.errors.email}</p>}
												</div>

												<div>
													<label className="block text-sm font-medium text-gray-700" htmlFor="RoleID">
														Role
													</label>
													<select
														id="RoleID"
														value={form.data.RoleID}
														onChange={(e) => form.setData("RoleID", e.target.value)}
														required
														disabled={Boolean(isEditingOwnAccount)}
														className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#D97736] focus:border-[#D97736] sm:text-sm"
													>
														<option value="" disabled>
															Select role
														</option>
														{normalizedRoles.map((role) => (
															<option key={role.ID} value={String(role.ID)}>
																{role.RoleName} {role.RoleRank ? `(Rank ${role.RoleRank})` : ""}
															</option>
														))}
													</select>
													{isEditingOwnAccount && (
														<p className="mt-2 text-xs text-amber-700">
															Your own role rank cannot be changed.
														</p>
													)}
													{form.errors.RoleID && <p className="mt-2 text-sm text-red-600">{form.errors.RoleID}</p>}
												</div>

												<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
													<div>
														<label className="block text-sm font-medium text-gray-700" htmlFor="password">
															Password {editingUser ? "(optional)" : ""}
														</label>
														<input
															type="password"
															id="password"
															value={form.data.password}
															onChange={(e) => form.setData("password", e.target.value)}
															required={!editingUser}
															className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#D97736] focus:border-[#D97736] sm:text-sm"
														/>
														{form.errors.password && <p className="mt-2 text-sm text-red-600">{form.errors.password}</p>}
													</div>

													<div>
														<label className="block text-sm font-medium text-gray-700" htmlFor="password_confirmation">
															Confirm Password
														</label>
														<input
															type="password"
															id="password_confirmation"
															value={form.data.password_confirmation}
															onChange={(e) => form.setData("password_confirmation", e.target.value)}
															required={!editingUser || Boolean(form.data.password)}
															className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#D97736] focus:border-[#D97736] sm:text-sm"
														/>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
								<div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
									<button
										type="submit"
										disabled={form.processing}
										className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#D97736] text-base font-medium text-white hover:bg-[#c2682e] sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
									>
										{editingUser ? "Save Changes" : "Add User"}
									</button>
									<button
										type="button"
										onClick={closeModal}
										className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
									>
										Cancel
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			)}

			{deleteCandidate && (
				<div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
					<div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
						<div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setDeleteCandidate(null)} />
						<span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
							&#8203;
						</span>
						<div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md w-full">
							<div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
								<h3 className="text-lg leading-6 font-medium text-gray-900">Delete User</h3>
								<p className="mt-3 text-sm text-gray-600">
									Are you sure you want to delete "{deleteCandidate.FullName}"? This action cannot be undone.
								</p>
							</div>
							<div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
								<button
									type="button"
									onClick={confirmDelete}
									disabled={form.processing}
									className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
								>
									Delete
								</button>
								<button
									type="button"
									onClick={() => setDeleteCandidate(null)}
									className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
								>
									Cancel
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
