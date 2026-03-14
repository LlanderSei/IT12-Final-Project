import React from "react";
import usePermissions from "@/hooks/usePermissions";
import ModuleTabs from "@/Components/ModuleTabs";

export default function CashierTabs() {
	const { can } = usePermissions();
	const canViewCashier = can("CanViewCashier");
	const canViewSalesHistoryBase = can("CanViewSalesHistory");
	const canViewSalesTab = canViewSalesHistoryBase && can("CanViewSalesHistorySales");
	const canViewPendingTab = canViewSalesHistoryBase && can("CanViewSalesHistoryPendingPayments");
	const canViewSaleHistory = canViewSalesTab || canViewPendingTab;
	const canViewCustomers = can("CanViewCustomers");
	
	const isSaleHistoryRoute = route().current("pos.sale-history") || route().current("pos.sale-history.pending");

	const tabConfigs = [
		canViewCashier && {
			label: "Cashier",
			href: route("pos.cash-sale"),
			active: route().current("pos.cash-sale") || route().current("pos.cashier"),
		},
		...(isSaleHistoryRoute
			? [
					canViewSalesTab && {
						label: "Sales History",
						href: route("pos.sale-history"),
						active: route().current("pos.sale-history"),
					},
					canViewPendingTab && {
						label: "Pending Payments",
						href: route("pos.sale-history.pending"),
						active: route().current("pos.sale-history.pending"),
					},
				]
			: [
					canViewSaleHistory && {
						label: "Sale History",
						href: route("pos.sale-history"),
						active: route().current("pos.sale-history") || route().current("pos.sale-history.pending"),
					},
				]),
		canViewCustomers && {
			label: "Customers",
			href: route("pos.customers"),
			active: route().current("pos.customers"),
		},
	].filter(Boolean);

	return <ModuleTabs tabs={tabConfigs} />;
}
