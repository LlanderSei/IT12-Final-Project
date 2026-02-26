import React from "react";
import { Link } from "@inertiajs/react";

const tabs = [
	{ label: "Cash Sale", routeName: "pos.cash-sale" },
];

export default function CashierTabs() {
	return (
		<div className="bg-white border-b border-gray-200 mt-0">
			<div className="mx-auto px-4">
				<nav className="-mb-px flex gap-2" aria-label="Tabs">
					{tabs.map((tab) => {
						const active = route().current(tab.routeName);

						return (
							<Link
								key={tab.routeName}
								href={route(tab.routeName)}
								className={`${
									active
										? "bg-[#FDEFE6] border-[#D97736] text-[#D97736]"
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
