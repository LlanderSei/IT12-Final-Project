import React, { useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";
import Products from "./ProductsAndBatchesSubviews/Products";
import ProductionBatches from "./ProductsAndBatchesSubviews/ProductionBatches";

export default function ProductsAndBatchesTabs({
	products,
	categories,
	batches,
	auth,
}) {
	const tabs = ["Products", "Production Batches"];
	const [activeTab, setActiveTab] = useState(tabs[0]);

	return (
		<AuthenticatedLayout
			header={
				<h2 className="font-semibold text-xl text-gray-800 leading-tight">
					Products & Production Batches
				</h2>
			}
			disableScroll={true}
		>
			<Head title="Products & Batches" />

			<div className="flex flex-col flex-1 w-full overflow-hidden min-h-0">
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

				{activeTab === "Products" && (
					<Products products={products} categories={categories} />
				)}

				{activeTab === "Production Batches" && (
					<ProductionBatches
						products={products}
						categories={categories}
						batches={batches}
					/>
				)}
			</div>
		</AuthenticatedLayout>
	);
}
