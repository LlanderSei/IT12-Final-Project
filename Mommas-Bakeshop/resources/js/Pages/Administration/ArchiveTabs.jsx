import React, { useMemo } from "react";
import { Head, Link, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { formatCountLabel } from "@/utils/countLabel";
import usePermissions from "@/hooks/usePermissions";

const formatDateTime = (value) => {
	if (!value) return "-";
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleString();
};

const RestoreTable = ({
	rows = [],
	columns = [],
	restoreRoute,
	restorePermission,
	emptyLabel,
}) => {
	const { can } = usePermissions();
	const canRestore = can(restorePermission);

	return (
		<div className="rounded-lg border border-gray-200 bg-white">
			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							{columns.map((column) => (
								<th
									key={column.key}
									className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
								>
									{column.label}
								</th>
							))}
							<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-200 bg-white">
						{rows.map((row) => (
							<tr key={row.ID || row.id}>
								{columns.map((column) => (
									<td key={column.key} className="px-4 py-3 text-sm text-gray-700">
										{column.render ? column.render(row) : row[column.key] || "-"}
									</td>
								))}
								<td className="px-4 py-3 text-right">
									<button
										type="button"
										disabled={!canRestore}
										onClick={() => router.post(restoreRoute(row.ID || row.id))}
										className="rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50"
									>
										Restore
									</button>
								</td>
							</tr>
						))}
						{rows.length === 0 && (
							<tr>
								<td
									colSpan={columns.length + 1}
									className="px-4 py-6 text-center text-sm text-gray-500"
								>
									{emptyLabel}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default function ArchiveTabs({
	users = [],
	customers = [],
	products = [],
	inventory = [],
	initialTab = "Users",
}) {
	const { can } = usePermissions();
	const tabs = [
		{ label: "Users", href: route("admin.archives"), visible: true, count: users.length },
		{ label: "Customers", href: route("admin.archives.customers"), visible: true, count: customers.length },
		{ label: "Products", href: route("admin.archives.products"), visible: true, count: products.length },
		{ label: "Inventory", href: route("admin.archives.inventory"), visible: true, count: inventory.length },
	].filter((tab) => tab.visible);
	const activeTab = tabs.some((tab) => tab.label === initialTab) ? initialTab : tabs[0]?.label || "Users";
	const countLabel = useMemo(() => {
		if (activeTab === "Customers") return formatCountLabel(customers.length, "archived customer");
		if (activeTab === "Products") return formatCountLabel(products.length, "archived product");
		if (activeTab === "Inventory") return formatCountLabel(inventory.length, "archived item");
		return formatCountLabel(users.length, "archived user");
	}, [activeTab, customers.length, products.length, inventory.length, users.length]);

	return (
		<AuthenticatedLayout
			header={
				<div className="flex items-center justify-between gap-4">
					<h2 className="font-semibold text-xl text-gray-800 leading-tight">
						Archives
						<span className="ml-2 text-base font-medium text-gray-500">
							&gt; {activeTab}
						</span>
					</h2>
					<div className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
						{countLabel}
					</div>
				</div>
			}
			disableScroll={true}
		>
			<Head title="Archives" />

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
								} relative whitespace-nowrap rounded-t-lg border-b-2 px-4 py-3 text-sm font-medium transition-colors duration-200`}
							>
								{tab.label}
							</Link>
						))}
					</nav>
				</div>
			</div>

			<div className="flex flex-col flex-1 overflow-hidden min-h-0">
				<div className="mx-auto flex-1 flex flex-col overflow-hidden min-h-0 w-full">
					<div className="bg-white shadow-sm sm:rounded-lg flex-1 flex flex-col overflow-hidden min-h-0">
						<div className="p-6 flex-1 flex flex-col overflow-hidden min-h-0">
							{activeTab === "Users" && (
								<RestoreTable
									rows={users}
									restoreRoute={(id) => route("admin.users.restore", id)}
									restorePermission="CanRestoreUser"
									emptyLabel="No archived users found."
									columns={[
										{ key: "FullName", label: "User" },
										{ key: "email", label: "Email" },
										{ key: "role", label: "Role", render: (row) => row.role?.RoleName || "-" },
										{ key: "ArchivedAt", label: "Archived At", render: (row) => formatDateTime(row.ArchivedAt) },
										{ key: "archivedBy", label: "Archived By", render: (row) => row.archived_by?.FullName || row.archivedBy?.FullName || "-" },
										{ key: "ArchiveReason", label: "Reason" },
									]}
								/>
							)}
							{activeTab === "Customers" && (
								<RestoreTable
									rows={customers}
									restoreRoute={(id) => route("pos.customers.restore", id)}
									restorePermission="CanRestoreCustomer"
									emptyLabel="No archived customers found."
									columns={[
										{ key: "CustomerName", label: "Customer" },
										{ key: "CustomerType", label: "Type" },
										{ key: "sales_count", label: "Sales", render: (row) => row.sales_count ?? 0 },
										{ key: "ArchivedAt", label: "Archived At", render: (row) => formatDateTime(row.ArchivedAt) },
										{ key: "archivedBy", label: "Archived By", render: (row) => row.archived_by?.FullName || row.archivedBy?.FullName || "-" },
										{ key: "ArchiveReason", label: "Reason" },
									]}
								/>
							)}
							{activeTab === "Products" && (
								<RestoreTable
									rows={products}
									restoreRoute={(id) => route("inventory.products.restore", id)}
									restorePermission="CanRestoreProduct"
									emptyLabel="No archived products found."
									columns={[
										{ key: "ProductName", label: "Product" },
										{ key: "category", label: "Category", render: (row) => row.category?.CategoryName || "-" },
										{ key: "ProductFrom", label: "Source" },
										{ key: "ArchivedAt", label: "Archived At", render: (row) => formatDateTime(row.ArchivedAt) },
										{ key: "archivedBy", label: "Archived By", render: (row) => row.archived_by?.FullName || row.archivedBy?.FullName || "-" },
										{ key: "ArchiveReason", label: "Reason" },
									]}
								/>
							)}
							{activeTab === "Inventory" && (
								<RestoreTable
									rows={inventory}
									restoreRoute={(id) => route("inventory.levels.restore", id)}
									restorePermission="CanRestoreInventoryItem"
									emptyLabel="No archived inventory items found."
									columns={[
										{ key: "ItemName", label: "Item" },
										{ key: "ItemType", label: "Type" },
										{ key: "Measurement", label: "Unit" },
										{ key: "ArchivedAt", label: "Archived At", render: (row) => formatDateTime(row.ArchivedAt) },
										{ key: "archivedBy", label: "Archived By", render: (row) => row.archived_by?.FullName || row.archivedBy?.FullName || "-" },
										{ key: "ArchiveReason", label: "Reason" },
									]}
								/>
							)}
							{!can("CanViewArchives") && (
								<div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
									No archive tabs are available for your account.
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
