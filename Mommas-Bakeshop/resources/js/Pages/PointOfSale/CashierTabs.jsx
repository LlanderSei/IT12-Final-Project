import React from "react";
import { Link } from "@inertiajs/react";
import usePermissions from "@/hooks/usePermissions";

const tabs = [
	{ label: "Cash Sale", routeName: "pos.cash-sale" },
	{
		label: "Sale History",
		routeName: "pos.sale-history",
		activeRoutes: ["pos.sale-history", "pos.sale-history.pending"],
	},
	{
		label: "Shrinkage History",
		routeName: "pos.shrinkage-history",
	},
	{
		label: "Customers",
		routeName: "pos.customers",
	},
];

export default function CashierTabs() {
	const { can } = usePermissions();
	const canViewCashier = can("CanViewCashier");
	const canViewSalesHistoryBase = can("CanViewSalesHistory");
	const canViewSalesTab =
		canViewSalesHistoryBase && can("CanViewSalesHistorySales");
	const canViewPendingTab =
		canViewSalesHistoryBase && can("CanViewSalesHistoryPendingPayments");
	const canViewSaleHistory = canViewSalesTab || canViewPendingTab;
	const canViewShrinkageHistory = can("CanViewShrinkageHistory");
	const canViewCustomers = can("CanViewCustomers");
	const visibleTabs = tabs.filter((tab) =>
		tab.routeName === "pos.cash-sale"
			? canViewCashier
		: tab.routeName === "pos.sale-history"
			? canViewSaleHistory
			: tab.routeName === "pos.shrinkage-history"
				? canViewShrinkageHistory
			: tab.routeName === "pos.customers"
				? canViewCustomers
				: true,
	);

	return (
		<div className="bg-white border-b border-gray-200 mt-0">
			<div className="mx-auto px-4">
				<nav className="-mb-px flex gap-2" aria-label="Tabs">
					{visibleTabs.map((tab) => {
						const active = (tab.activeRoutes || [tab.routeName]).some((routeName) =>
							route().current(routeName),
						);

						return (
							<Link
								key={tab.routeName}
								href={
									tab.routeName === "pos.sale-history" && !canViewSalesTab && canViewPendingTab
										? route("pos.sale-history.pending")
										: route(tab.routeName)
								}
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
	);
}
