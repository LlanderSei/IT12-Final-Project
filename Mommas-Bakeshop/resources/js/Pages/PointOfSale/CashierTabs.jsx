import React from "react";
import { Link } from "@inertiajs/react";
import usePermissions from "@/hooks/usePermissions";

export default function CashierTabs({ pendingOverdueCount = 0 }) {
	const { can } = usePermissions();
	const canViewCashier = can("CanViewCashier");
	const canViewSalesHistoryBase = can("CanViewSalesHistory");
	const canViewSalesTab =
		canViewSalesHistoryBase && can("CanViewSalesHistorySales");
	const canViewPendingTab =
		canViewSalesHistoryBase && can("CanViewSalesHistoryPendingPayments");
	const canViewSaleHistory = canViewSalesTab || canViewPendingTab;
	const canViewCustomers = can("CanViewCustomers");
	const isSaleHistoryRoute =
		route().current("pos.sale-history") ||
		route().current("pos.sale-history.pending");

	const tabs = [
		canViewCashier
			? { label: "Cash Sale", routeName: "pos.cash-sale" }
			: null,
		...(isSaleHistoryRoute
			? [
					canViewSalesTab
						? {
								label: "Sales",
								routeName: "pos.sale-history",
								activeRoutes: ["pos.sale-history"],
							}
						: null,
					canViewPendingTab
						? {
								label: "Pending Payments",
								routeName: "pos.sale-history.pending",
								activeRoutes: ["pos.sale-history.pending"],
							}
						: null,
				]
			: [
					canViewSaleHistory
						? {
								label: "Sale History",
								routeName: "pos.sale-history",
								activeRoutes: ["pos.sale-history", "pos.sale-history.pending"],
							}
						: null,
				]),
		canViewCustomers
			? {
					label: "Customers",
					routeName: "pos.customers",
				}
			: null,
	].filter(Boolean);

	return (
		<div className="bg-white border-b border-gray-200 mt-0">
			<div className="mx-auto px-4">
				<nav className="-mb-px flex gap-2" aria-label="Tabs">
					{tabs.map((tab) => {
						const active = (tab.activeRoutes || [tab.routeName]).some((routeName) =>
							route().current(routeName),
						);

						const badgeCount =
							tab.label === "Pending Payments"
								? Number(pendingOverdueCount || 0)
								: 0;

						return (
							<Link
								key={tab.routeName}
								href={
									tab.routeName === "pos.sale-history" &&
									!canViewSalesTab &&
									canViewPendingTab
										? route("pos.sale-history.pending")
										: route(tab.routeName)
								}
								className={`${
									active
										? "bg-primary-soft border-primary text-primary"
										: "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300"
								} relative whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors duration-200 rounded-t-lg`}
							>
								{tab.label}
								{badgeCount > 0 && (
									<span className="pointer-events-none absolute -bottom-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white shadow-sm ring-2 ring-white">
										{badgeCount}
									</span>
								)}
							</Link>
						);
					})}
				</nav>
			</div>
		</div>
	);
}
