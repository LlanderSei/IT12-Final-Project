import React, { useEffect, useMemo, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link, router } from "@inertiajs/react";
import Products from "./ProductsAndBatchesSubviews/Products";
import ProductionBatches from "./ProductsAndBatchesSubviews/ProductionBatches";
import Snapshots from "./ProductsAndBatchesSubviews/Snapshots";
import { formatCountLabel } from "@/utils/countLabel";
import {
	PRODUCTS_BATCHES_FOOTER_ACTIONS,
	setPendingProductsBatchesFooterAction,
} from "@/utils/productsAndBatchesFooterActions";
import usePermissions from "@/hooks/usePermissions";

export default function ProductsAndBatchesTabs({
	products,
	categories,
	batches,
	batchFilters,
	batchFilterOptions,
	snapshots,
	auth,
	initialTab = "Products",
}) {
	const { can } = usePermissions();
	const canCreateProduct = can("CanCreateProduct");
	const canUpdateProduct = can("CanUpdateProduct");
	const canDeleteProduct = can("CanArchiveProduct");
	const canCreateProductCategory = can("CanCreateProductCategory");
	const canUpdateProductCategory = can("CanUpdateProductCategory");
	const canDeleteProductCategory = can("CanDeleteProductCategory");
	const canCreateProductionBatch = can("CanCreateProductionBatch");
	const canUpdateProductionBatch = can("CanUpdateProductionBatch");
	const canViewProductSnapshots = can("CanViewProductSnapshots");
	const canManageCategories =
		canCreateProductCategory || canUpdateProductCategory || canDeleteProductCategory;
	const [footerActions, setFooterActions] = useState({
		openAddProduct: null,
		openRecordBatch: null,
		openModifyCategories: null,
	});

	const noStockProductsCount = useMemo(
		() =>
			(products || []).reduce(
				(total, item) => total + (Number(item.Quantity || 0) <= 0 ? 1 : 0),
				0,
			),
		[products],
	);
	const lowStockProductsCount = useMemo(
		() =>
			(products || []).reduce((total, item) => {
				const quantity = Number(item.Quantity || 0);
				const threshold = Number(item.LowStockThreshold || 0);
				if (quantity > 0 && quantity <= threshold) return total + 1;
				return total;
			}, 0),
		[products],
	);
	const tabs = [
		{
			label: "Products",
			href: route("products.index"),
			badgeCount: noStockProductsCount,
		},
		{ label: "Production Batches", href: route("products.batches") },
		{
			label: "Snapshots",
			href: route("products.snapshots"),
			hidden: !canViewProductSnapshots,
		},
	];
	const visibleTabs = tabs.filter((tab) => !tab.hidden);
	const tabLabels = visibleTabs.map((tab) => tab.label);
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
		if (tab === "Snapshots") {
			return {
				subtitle: "Snapshot History",
				countLabel: formatCountLabel((snapshots || []).length, "record"),
			};
		}
		return {
			subtitle: "Batches History",
			countLabel: formatCountLabel(getRecordCount(batches), "record"),
		};
	};
	const [headerMeta, setHeaderMeta] = useState(() =>
		getDefaultHeaderMeta(activeTab),
	);

	useEffect(() => {
		setHeaderMeta(getDefaultHeaderMeta(activeTab));
	}, [activeTab, products, batches, snapshots]);


	const triggerFooterAction = ({
		targetTab,
		targetHref,
		pendingAction,
		openHandler,
	}) => {
		if (activeTab === targetTab && typeof openHandler === "function") {
			openHandler();
			return;
		}

		setPendingProductsBatchesFooterAction(pendingAction);
		router.visit(targetHref);
	};

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
					<div className="flex items-center gap-2">
						{activeTab === "Products" && noStockProductsCount > 0 && (
							<div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
								{formatCountLabel(noStockProductsCount, "no stock item")}
							</div>
						)}
						{activeTab === "Products" && lowStockProductsCount > 0 && (
							<div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
								{formatCountLabel(lowStockProductsCount, "low stock item")}
							</div>
						)}
						{headerMeta?.countLabel && (
							<div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
								{headerMeta.countLabel}
							</div>
						)}
					</div>
				</div>
			}
			disableScroll={true}
		>
			<Head title="Products & Batches" />

			<div className="flex flex-col flex-1 w-full overflow-hidden min-h-0">
				<div className="bg-white border-b border-gray-200 mt-0">
					<div className="mx-auto px-4">
						<nav className="-mb-px flex gap-2" aria-label="Tabs">
						{visibleTabs.map((tab) => {
							const badgeCount = Number(tab.badgeCount || 0);
							return (
								<Link
									key={tab.label}
									href={tab.href}
									className={`${
										activeTab === tab.label
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

				{activeTab === "Products" && (
					<Products
						products={products}
						categories={categories}
						onHeaderMetaChange={setHeaderMeta}
						canCreateProduct={canCreateProduct}
						canUpdateProduct={canUpdateProduct}
						canDeleteProduct={canDeleteProduct}
						canCreateProductCategory={canCreateProductCategory}
						canUpdateProductCategory={canUpdateProductCategory}
						canDeleteProductCategory={canDeleteProductCategory}
						setFooterActions={setFooterActions}
					/>
				)}

				{activeTab === "Production Batches" && (
					<ProductionBatches
						products={products}
						categories={categories}
						batches={batches}
						filters={batchFilters}
						filterOptions={batchFilterOptions}
						fetchRoute={route("products.batches")}
						onHeaderMetaChange={setHeaderMeta}
						canCreateProductionBatch={canCreateProductionBatch}
						canUpdateProductionBatch={canUpdateProductionBatch}
						setFooterActions={setFooterActions}
					/>
				)}
				{activeTab === "Snapshots" && (
					<Snapshots
						snapshots={snapshots}
						onHeaderMetaChange={setHeaderMeta}
						canViewDetails={canViewProductSnapshots}
					/>
				)}
			</div>

			<div className="sticky bottom-0 w-full p-4 bg-white border-t border-gray-200 z-10">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					<button
						type="button"
						onClick={() =>
							triggerFooterAction({
								targetTab: "Products",
								targetHref: route("products.index"),
								pendingAction: PRODUCTS_BATCHES_FOOTER_ACTIONS.ADD_PRODUCT,
								openHandler: footerActions.openAddProduct,
							})
						}
						disabled={!canCreateProduct}
						className="flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Add Product
					</button>
					<button
						type="button"
						onClick={() =>
							triggerFooterAction({
								targetTab: "Production Batches",
								targetHref: route("products.batches"),
								pendingAction: PRODUCTS_BATCHES_FOOTER_ACTIONS.RECORD_BATCH,
								openHandler: footerActions.openRecordBatch,
							})
						}
						disabled={!canCreateProductionBatch}
						className="flex justify-center py-3 px-4 border border-primary rounded-md shadow-sm text-sm font-medium text-primary bg-white hover:bg-primary-soft disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Record a Batch
					</button>
					<button
						type="button"
						onClick={() =>
							triggerFooterAction({
								targetTab: "Products",
								targetHref: route("products.index"),
								pendingAction: PRODUCTS_BATCHES_FOOTER_ACTIONS.MODIFY_CATEGORIES,
								openHandler: footerActions.openModifyCategories,
							})
						}
						disabled={!canManageCategories}
						className="flex justify-center py-3 px-4 border border-primary rounded-md shadow-sm text-sm font-medium text-primary bg-white hover:bg-primary-soft disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Modify Categories
					</button>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
	const getRecordCount = (value) => {
		if (Array.isArray(value)) return value.length;
		return Number(value?.total || 0);
	};
