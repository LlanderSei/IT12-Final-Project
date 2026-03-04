import React from "react";
import { Link } from "@inertiajs/react";

const tabs = [
	{ label: "Cash Sale", routeName: "pos.cash-sale" },
	{
		label: "Sale History",
		routeName: "pos.sale-history",
		activeRoutes: ["pos.sale-history", "pos.sale-history.pending"],
	},
];

export default function CashierTabs() {
	return (
		<div className="bg-white border-b border-gray-200 mt-0">
			<div className="mx-auto px-4">
				<nav className="-mb-px flex gap-2" aria-label="Tabs">
					{tabs.map((tab) => {
						const active = (tab.activeRoutes || [tab.routeName]).some((routeName) =>
							route().current(routeName),
						);

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
	);
}


