import React, { useEffect, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link } from "@inertiajs/react";
import Products from "./ProductsAndBatchesSubviews/Products";
import ProductionBatches from "./ProductsAndBatchesSubviews/ProductionBatches";
import { formatCountLabel } from "@/utils/countLabel";

export default function ProductsAndBatchesTabs({
	products,
	categories,
	batches,
	auth,
	initialTab = "Products",
}) {
	const tabs = [
		{ label: "Products", href: route("products.index") },
		{ label: "Production Batches", href: route("products.batches") },
	];
	const tabLabels = tabs.map((tab) => tab.label);
	const normalizedInitialTab = tabLabels.includes(initialTab)
		? initialTab
		: tabLabels[0];
	const activeTab = normalizedInitialTab;
	const getDefaultHeaderMeta = (tab) => {
		if (tab === "Products") {
			return {
				subtitle: "Finished Goods",
				countLabel: formatCountLabel((products || []).length, "product"),
			};
		}
		return {
			subtitle: "Batches History",
			countLabel: formatCountLabel((batches || []).length, "record"),
		};
	};
	const [headerMeta, setHeaderMeta] = useState(() =>
		getDefaultHeaderMeta(activeTab),
	);

	useEffect(() => {
		setHeaderMeta(getDefaultHeaderMeta(activeTab));
	}, [activeTab, products, batches]);

	return (
		<AuthenticatedLayout
			header={
				<div className="flex items-center justify-between gap-4">
					<h2 className="font-semibold text-xl text-gray-800 leading-tight">
						Products & Production Batches
						{headerMeta?.subtitle && (
							<span className="ml-2 text-base font-medium text-gray-500">
								&gt; {headerMeta.subtitle}
							</span>
						)}
					</h2>
					{headerMeta?.countLabel && (
						<div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
							{headerMeta.countLabel}
						</div>
					)}
				</div>
			}
			disableScroll={true}
		>
			<Head title="Products & Batches" />

			<div className="flex flex-col flex-1 w-full overflow-hidden min-h-0">
				<div className="bg-white border-b border-gray-200 mt-0">
					<div className="mx-auto px-4">
						<nav className="-mb-px flex gap-2" aria-label="Tabs">
							{tabs.map((tab) => (
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

				{activeTab === "Products" && (
					<Products
						products={products}
						categories={categories}
						onHeaderMetaChange={setHeaderMeta}
					/>
				)}

				{activeTab === "Production Batches" && (
					<ProductionBatches
						products={products}
						categories={categories}
						batches={batches}
						onHeaderMetaChange={setHeaderMeta}
					/>
				)}
			</div>
		</AuthenticatedLayout>
	);
}


