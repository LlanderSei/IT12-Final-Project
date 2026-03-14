import React from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import Overview from "./ReportsSubviews/Overview";
import FullBreakdown from "./ReportsSubviews/FullBreakdown";
import usePermissions from "@/hooks/usePermissions";
import PageHeader from "@/Components/PageHeader";
import ModuleTabs from "@/Components/ModuleTabs";
import { BarChart3, PieChart, FileDown } from "lucide-react";

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
		{ label: "Overview", icon: BarChart3, value: "Overview", hidden: !canViewOverviewTab },
		{ label: "Full Breakdown", icon: PieChart, value: "Full Breakdown", hidden: !canViewFullBreakdownTab },
	].filter(t => !t.hidden);

	const activeTab = tabs.find(t => t.value === initialTab) ? initialTab : (tabs[0]?.value || "Overview");

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
			<div className="flex flex-col items-center justify-center py-20 text-center opacity-40 border-2 border-dashed rounded-[3rem] bg-white">
				<BarChart3 className="h-12 w-12 mb-4" />
				<p className="text-sm font-black uppercase tracking-widest leading-loose">No Report Access</p>
				<p className="text-xs font-medium italic">Contact administrator for visual reporting permissions.</p>
			</div>
		);
	};

	return (
		<AuthenticatedLayout disableScroll={true}>
			<Head title="Reports & Analytics" />

			<div className="flex flex-col h-full bg-slate-50/50">
				<PageHeader 
					title="Reports & Analytics" 
					subtitle={activeTab} 
					actions={
						<div className="flex items-center gap-3">
							<span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50 mr-4">Reporting Engine 4.0</span>
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
									"Overview": route("admin.reports"),
									"Full Breakdown": route("admin.reports.full-breakdown")
								};
								router.visit(hrefs[val]);
							}
						}} 
					/>
				</div>

				<main className="flex-1 overflow-hidden p-10 pt-6">
					<div className="bg-white rounded-[2.5rem] border shadow-2xl shadow-slate-200/50 h-full flex flex-col overflow-hidden relative p-8">
						<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-400 via-indigo-600 to-indigo-400" />
						<div className="flex-1 overflow-y-auto">
							{renderActiveSubview()}
						</div>
					</div>
				</main>
			</div>
		</AuthenticatedLayout>
	);
}
