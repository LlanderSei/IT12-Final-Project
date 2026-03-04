import React, { useEffect, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link } from "@inertiajs/react";
import Users from "./UserManagementSubviews/Users";
import Permissions from "./UserManagementSubviews/Permissions";
import { formatCountLabel } from "@/utils/countLabel";

export default function UserManagementTabs({
	users,
	roles,
	initialTab = "Users",
}) {
	const tabs = [
		{ label: "Users", href: route("admin.users") },
		{ label: "Permissions", href: route("admin.permissions") },
	];
	const tabLabels = tabs.map((tab) => tab.label);
	const normalizedInitialTab = tabLabels.includes(initialTab)
		? initialTab
		: tabLabels[0];
	const activeTab = normalizedInitialTab;
	const getDefaultHeaderMeta = (tab) => {
		if (tab === "Users") {
			return {
				subtitle: "Users",
				countLabel: formatCountLabel((users || []).length, "user"),
			};
		}
		return {
			subtitle: "Permissions",
			countLabel: formatCountLabel(0, "permission"),
		};
	};
	const [headerMeta, setHeaderMeta] = useState(() =>
		getDefaultHeaderMeta(activeTab),
	);

	useEffect(() => {
		setHeaderMeta(getDefaultHeaderMeta(activeTab));
	}, [activeTab, users]);

	return (
		<AuthenticatedLayout
			header={
				<div className="flex items-center justify-between gap-4">
					<h2 className="font-semibold text-xl text-gray-800 leading-tight">
						User Management
						{headerMeta?.subtitle && (
							<span className="ml-2 text-base font-medium text-gray-500">
								&gt; {headerMeta.subtitle}
							</span>
						)}
					</h2>
					{headerMeta?.countLabel && (
						<div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
							{headerMeta.countLabel}
						</div>
					)}
				</div>
			}
			disableScroll={true}
		>
			<Head title="User Management" />

			<div className="bg-white border-b border-gray-200 mt-0">
				<div className="mx-auto px-4">
					<nav className="-mb-px flex gap-2" aria-label="Tabs">
						{tabs.map((tab) => (
							<Link
								key={tab.label}
								href={tab.href}
								className={`${
									activeTab === tab.label
										? "bg-primary-soft border-primary text-primary"
										: "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300"
								} whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors duration-200 rounded-t-lg`}
							>
								{tab.label}
							</Link>
						))}
					</nav>
				</div>
			</div>

			<div className="flex flex-col flex-1 overflow-hidden min-h-0">
				{activeTab === "Users" && (
					<Users
						users={users}
						roles={roles}
						onHeaderMetaChange={setHeaderMeta}
					/>
				)}
				{activeTab === "Permissions" && (
					<Permissions onHeaderMetaChange={setHeaderMeta} />
				)}
			</div>
		</AuthenticatedLayout>
	);
}


