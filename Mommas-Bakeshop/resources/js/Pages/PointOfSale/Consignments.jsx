import React from "react";
import { Head } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import CashierTabs from "./CashierTabs";

export default function Consignments() {
	return (
		<AuthenticatedLayout
			header={
				<h2 className="font-semibold text-xl text-gray-800 leading-tight">
					Cashier
				</h2>
			}
			disableScroll={true}
		>
			<Head title="Consignments" />
			<CashierTabs />

			<div className="flex-1 p-4 md:p-6 min-h-0">
				<div className="h-full">
					<div className="h-full bg-white border border-gray-200 rounded-lg p-6 flex items-center justify-center">
						<div className="text-center">
							<h3 className="text-lg font-semibold text-gray-900">Consignments Page</h3>
							<p className="text-sm text-gray-600 mt-2">Consignments page coming next.</p>
						</div>
					</div>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
