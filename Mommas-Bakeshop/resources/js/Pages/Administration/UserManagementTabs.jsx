import React, { useEffect, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import Users from "./UserManagementSubviews/Users";
import Permissions from "./UserManagementSubviews/Permissions";
import Roles from "./UserManagementSubviews/Roles";
import PermissionGroups from "./UserManagementSubviews/PermissionGroups";
import PageHeader from "@/Components/PageHeader";
import ModuleTabs from "@/Components/ModuleTabs";
import { Users as UsersIcon, ShieldCheck, Key, FolderLock } from "lucide-react";
import usePermissions from "@/hooks/usePermissions";

export default function UserManagementTabs({
	users,
	roles,
	permissionsUsers = [],
	permissionGroups = {},
	rolePresets = [],
	permissionGroupRows = [],
	currentUserRoleRank = null,
	initialTab = "Users",
}) {
	const { can } = usePermissions();
	const canViewUsersTab = can("CanViewUserManagementUsers");
	const canViewPermissionsTab = can("CanViewUserManagementPermissions");
	const canViewRolesTab = can("CanViewUserManagementRoles");
	const canViewPermissionGroupsTab = can("CanViewUserManagementPermissionGroups");

	const tabs = [
		{ label: "Users", icon: UsersIcon, value: "Users", hidden: !canViewUsersTab },
		{ label: "Permissions", icon: Key, value: "Permissions", hidden: !canViewPermissionsTab },
		{ label: "Roles", icon: ShieldCheck, value: "Roles", hidden: !canViewRolesTab },
		{ label: "Permission Groups", icon: FolderLock, value: "Permission Groups", hidden: !canViewPermissionGroupsTab },
	].filter(t => !t.hidden);

	const activeTab = tabs.find(t => t.value === initialTab) ? initialTab : (tabs[0]?.value || "Users");
	const [headerMeta, setHeaderMeta] = useState({ subtitle: activeTab, countLabel: "" });

	return (
		<AuthenticatedLayout disableScroll={true}>
			<Head title="Access Control | Momma's Bakeshop" />

			<div className="flex flex-col h-full bg-slate-50/50">
				<PageHeader 
					title="User Management" 
					subtitle={headerMeta.subtitle}
					count={headerMeta.countLabel}
					actions={
						<div className="flex items-center gap-3">
							<span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50 mr-4">Security Protocol 1.2</span>
						</div>
					}
				/>

				<div className="px-10 mt-6">
					<ModuleTabs 
						tabs={tabs} 
						activeTab={activeTab} 
						onTabChange={(val) => {
							const target = tabs.find(t => t.value === val);
							if (target) {
								const hrefs = {
									"Users": route("admin.users"),
									"Permissions": route("admin.permissions"),
									"Roles": route("admin.roles"),
									"Permission Groups": route("admin.permission-groups")
								};
								router.visit(hrefs[val]);
							}
						}} 
					/>
				</div>

				<main className="flex-1 overflow-hidden p-10 pt-6">
					<div className="bg-white rounded-[2.5rem] border shadow-2xl shadow-slate-200/50 h-full flex flex-col overflow-hidden relative p-8">
						<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-600 to-emerald-400" />
						
						<div className="flex-1 overflow-hidden flex flex-col">
							{activeTab === "Users" && canViewUsersTab && (
								<Users
									users={users}
									roles={roles}
									onHeaderMetaChange={setHeaderMeta}
								/>
							)}
							{activeTab === "Permissions" && canViewPermissionsTab && (
								<Permissions
									permissionsUsers={permissionsUsers}
									permissionGroups={permissionGroups}
									currentUserRoleRank={currentUserRoleRank}
									onHeaderMetaChange={setHeaderMeta}
								/>
							)}
							{activeTab === "Roles" && canViewRolesTab && (
								<Roles
									rolePresets={rolePresets}
									permissionGroups={permissionGroups}
									currentUserRoleRank={currentUserRoleRank}
									onHeaderMetaChange={setHeaderMeta}
								/>
							)}
							{activeTab === "Permission Groups" && canViewPermissionGroupsTab && (
								<PermissionGroups
									rows={permissionGroupRows}
									onHeaderMetaChange={setHeaderMeta}
								/>
							)}

							{tabs.length === 0 && (
								<div className="flex flex-col items-center justify-center py-20 text-center opacity-40 border-2 border-dashed rounded-[3rem] bg-white">
									<ShieldCheck className="h-12 w-12 mb-4" />
									<p className="text-sm font-black uppercase tracking-widest leading-loose">Access Restricted</p>
									<p className="text-xs font-medium italic">Your role does not have management elevation.</p>
								</div>
							)}
						</div>
					</div>
				</main>
			</div>
		</AuthenticatedLayout>
	);
}
