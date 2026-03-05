import React from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link } from "@inertiajs/react";
import Overview from "./ReportsSubviews/Overview";
import FullBreakdown from "./ReportsSubviews/FullBreakdown";
import usePermissions from "@/hooks/usePermissions";

export default function ReportsTabs({
	initialTab = "Overview",
	overviewData = {},
	fullBreakdownData = {},
}) {
	const { can } = usePermissions();
	const canViewOverviewTab = can("CanViewReportsOverview");
	const canViewFullBreakdownTab = can("CanViewReportsFullBreakdown");
	const canExportOverview = can("CanExportReportsOverview");
	const canExportFullBreakdown = can("CanExportReportsFullBreakdown");

	const tabs = [
		{ label: "Overview", href: route("admin.reports") },
		{ label: "Full Breakdown", href: route("admin.reports.full-breakdown") },
	];
	const visibleTabs = tabs.filter((tab) =>
		tab.label === "Overview" ? canViewOverviewTab : canViewFullBreakdownTab,
	);
	const tabLabels = visibleTabs.map((tab) => tab.label);
	const activeTab = tabLabels.includes(initialTab) ? initialTab : tabLabels[0] || "Overview";

	const renderActiveSubview = () => {
		if (activeTab === "Full Breakdown" && canViewFullBreakdownTab) {
			return (
				<FullBreakdown
					fullBreakdownData={fullBreakdownData}
					canExport={canExportFullBreakdown}
				/>
			);
		}
		if (activeTab === "Overview" && canViewOverviewTab) {
			return <Overview overviewData={overviewData} canExport={canExportOverview} />;
		}
		return (
			<div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
				No report tabs are available for your account.
			</div>
		);
	};

	return (
		<AuthenticatedLayout
			header={
				<h2 className="font-semibold text-xl text-gray-800 leading-tight">
					Reports
				</h2>
			}
			disableScroll={true}
		>
			<Head title="Reports" />

			<div className="bg-white border-b border-gray-200 sticky top-0 z-20">
				<div className="mx-auto px-4">
					<nav className="-mb-px flex gap-2" aria-label="Tabs">
						{visibleTabs.map((tab) => (
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

			<div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
				{renderActiveSubview()}
			</div>
		</AuthenticatedLayout>
	);
}
