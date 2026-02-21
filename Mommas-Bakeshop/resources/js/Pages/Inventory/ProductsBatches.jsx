import React, { useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";

export default function ProductsBatches() {
	const tabs = ["Products", "Production Batches"];
	const [activeTab, setActiveTab] = useState(tabs[0]);

	return (
		<AuthenticatedLayout
			header={
				<h2 className="font-semibold text-xl text-gray-800 leading-tight">
					Products & Production Batches
				</h2>
			}
		>
			<Head title="Products & Batches" />

			<div className="bg-white border-b border-gray-200 mt-0">
				<div className="mx-auto px-4">
					<nav className="-mb-px flex gap-2" aria-label="Tabs">
						{tabs.map((tab) => (
							<button
								key={tab}
								onClick={() => setActiveTab(tab)}
								className={`${
									activeTab === tab
										? "bg-[#FDEFE6] border-[#D97736] text-[#D97736]"
										: "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300"
								} whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors duration-200 rounded-t-lg`}
							>
								{tab}
							</button>
						))}
					</nav>
				</div>
			</div>

			<div className="py-6">
				<div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
					<div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
						<div className="p-6 text-gray-900">
							<h3 className="text-lg font-medium text-[#D97736] mb-4">
								{activeTab}
							</h3>
							<p className="text-gray-600">
								The content for {activeTab} will be implemented here.
							</p>
						</div>
					</div>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
