import React from "react";
import { Head, Link } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import JobOrders from "./JobOrdersSubviews/JobOrders";
import PendingJobOrders from "./JobOrdersSubviews/PendingJobOrders";
import JobOrdersHistory from "./JobOrdersSubviews/JobOrdersHistory";
import usePermissions from "@/hooks/usePermissions";

export default function JobOrdersTabs({
	initialTab = "Job Orders",
	jobOrders = [],
	pendingJobOrders = [],
	historyJobOrders = [],
	products = [],
	categories = [],
	customers = [],
}) {
	const { can } = usePermissions();
	const canViewJobOrders = can("CanViewJobOrders");
	const canViewPending = can("CanViewPendingJobOrders");
	const canViewHistory = can("CanViewJobOrdersHistory");

	const tabs = [
		canViewJobOrders
			? { label: "Job Orders", routeName: "pos.job-orders" }
			: null,
		canViewPending
			? { label: "Pending Job Orders", routeName: "pos.job-orders.pending" }
			: null,
		canViewHistory
			? { label: "Job Orders History", routeName: "pos.job-orders.history" }
			: null,
	].filter(Boolean);

	const tabLabels = tabs.map((tab) => tab.label);
	const activeTab = tabLabels.includes(initialTab)
		? initialTab
		: tabLabels[0] || "Job Orders";

	return (
		<AuthenticatedLayout
			header={
				<h2 className="font-semibold text-xl text-gray-800 leading-tight">
					Job Orders
					<span className="ml-2 text-base font-medium text-gray-500">
						&gt; {activeTab}
					</span>
				</h2>
			}
			disableScroll={true}
		>
			<Head title="Job Orders" />

			{tabs.length > 0 && (
				<div className="bg-white border-b border-gray-200 mt-0">
					<div className="mx-auto px-4">
						<nav className="-mb-px flex gap-2" aria-label="Tabs">
							{tabs.map((tab) => {
								const active = tab.label === activeTab;
								return (
									<Link
										key={tab.routeName}
										href={route(tab.routeName)}
										className={`${
											active
												? "bg-primary-soft border-primary text-primary"
												: "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300"
										} whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors duration-200 rounded-t-lg`}
									>
										{tab.label}
									</Link>
								);
							})}
						</nav>
					</div>
				</div>
			)}

			<div className="flex-1 p-4 md:p-6 min-h-0">
				{tabs.length === 0 ? (
					<div className="h-full bg-white rounded-lg border border-gray-200 p-6 text-sm text-gray-500">
						You do not have access to job orders.
					</div>
				) : !canViewJobOrders && activeTab === "Job Orders" ? (
					<div className="h-full bg-white rounded-lg border border-gray-200 p-6 text-sm text-gray-500">
						You do not have access to job orders.
					</div>
				) : !canViewPending && activeTab === "Pending Job Orders" ? (
					<div className="h-full bg-white rounded-lg border border-gray-200 p-6 text-sm text-gray-500">
						You do not have access to pending job orders.
					</div>
				) : !canViewHistory && activeTab === "Job Orders History" ? (
					<div className="h-full bg-white rounded-lg border border-gray-200 p-6 text-sm text-gray-500">
						You do not have access to job order history.
					</div>
				) : activeTab === "Job Orders" ? (
					<JobOrders
						products={products}
						categories={categories}
						customers={customers}
					/>
				) : activeTab === "Pending Job Orders" ? (
					<PendingJobOrders rows={pendingJobOrders} />
				) : (
					<JobOrdersHistory rows={historyJobOrders} />
				)}
			</div>
		</AuthenticatedLayout>
	);
}
