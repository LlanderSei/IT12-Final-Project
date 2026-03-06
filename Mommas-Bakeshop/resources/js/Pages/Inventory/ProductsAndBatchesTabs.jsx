import React, { useEffect, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link, router, useForm } from "@inertiajs/react";
import Products from "./ProductsAndBatchesSubviews/Products";
import ProductionBatches from "./ProductsAndBatchesSubviews/ProductionBatches";
import Snapshots from "./ProductsAndBatchesSubviews/Snapshots";
import { formatCountLabel } from "@/utils/countLabel";
import usePermissions from "@/hooks/usePermissions";
import ConfirmationModal from "@/Components/ConfirmationModal";

export default function ProductsAndBatchesTabs({
	products,
	categories,
	batches,
	snapshots,
	auth,
	initialTab = "Products",
}) {
	const { can, requirePermission } = usePermissions();
	const canCreateProduct = can("CanCreateProduct");
	const canUpdateProduct = can("CanUpdateProduct");
	const canDeleteProduct = can("CanDeleteProduct");
	const canCreateProductCategory = can("CanCreateProductCategory");
	const canUpdateProductCategory = can("CanUpdateProductCategory");
	const canDeleteProductCategory = can("CanDeleteProductCategory");
	const canCreateProductionBatch = can("CanCreateProductionBatch");
	const canUpdateProductionBatch = can("CanUpdateProductionBatch");
	const canViewProductSnapshots = can("CanViewProductSnapshots");
	const canRecordProductSnapshot = can("CanRecordProductSnapshot");
	const canManageCategories =
		canCreateProductCategory || canUpdateProductCategory || canDeleteProductCategory;
	const [footerActions, setFooterActions] = useState({
		openAddProduct: null,
		openRecordBatch: null,
		openModifyCategories: null,
	});

	const tabs = [
		{ label: "Products", href: route("products.index") },
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
			countLabel: formatCountLabel((batches || []).length, "record"),
		};
	};
	const [headerMeta, setHeaderMeta] = useState(() =>
		getDefaultHeaderMeta(activeTab),
	);

	useEffect(() => {
		setHeaderMeta(getDefaultHeaderMeta(activeTab));
	}, [activeTab, products, batches, snapshots]);

	const snapshotForm = useForm({
		ProceedOnSameDay: false,
	});
	const [isSnapshotWarningModalOpen, setIsSnapshotWarningModalOpen] =
		useState(false);

	const hasSnapshotForToday = (snapshots || []).some((snapshot) => {
		if (!snapshot?.SnapshotTime) return false;
		const value = new Date(snapshot.SnapshotTime);
		if (Number.isNaN(value.getTime())) return false;
		const now = new Date();
		return (
			value.getFullYear() === now.getFullYear() &&
			value.getMonth() === now.getMonth() &&
			value.getDate() === now.getDate()
		);
	});

	const submitSnapshotRecord = (proceedOnSameDay) => {
		snapshotForm.transform(() => ({
			ProceedOnSameDay: Boolean(proceedOnSameDay),
		}));
		snapshotForm.post(route("inventory.products.snapshots.store"), {
			preserveScroll: true,
			onSuccess: () => {
				setIsSnapshotWarningModalOpen(false);
			},
			onError: (errors) => {
				if (errors?.snapshot && !proceedOnSameDay) {
					setIsSnapshotWarningModalOpen(true);
				}
			},
		});
	};

	const handleRecordSnapshot = () => {
		if (!canRecordProductSnapshot) {
			return requirePermission("CanRecordProductSnapshot");
		}
		if (hasSnapshotForToday) {
			setIsSnapshotWarningModalOpen(true);
			return;
		}
		submitSnapshotRecord(false);
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
							{visibleTabs.map((tab) => (
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
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<button
						type="button"
						onClick={() => {
							if (footerActions.openAddProduct) {
								footerActions.openAddProduct();
								return;
							}
							router.visit(route("products.index"));
						}}
						disabled={!canCreateProduct}
						className="flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Add Product
					</button>
					<button
						type="button"
						onClick={() => {
							if (footerActions.openRecordBatch) {
								footerActions.openRecordBatch();
								return;
							}
							router.visit(route("products.batches"));
						}}
						disabled={!canCreateProductionBatch}
						className="flex justify-center py-3 px-4 border border-primary rounded-md shadow-sm text-sm font-medium text-primary bg-white hover:bg-primary-soft disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Record a Batch
					</button>
					<button
						type="button"
						onClick={() => {
							if (footerActions.openModifyCategories) {
								footerActions.openModifyCategories();
								return;
							}
							router.visit(route("products.index"));
						}}
						disabled={!canManageCategories}
						className="flex justify-center py-3 px-4 border border-primary rounded-md shadow-sm text-sm font-medium text-primary bg-white hover:bg-primary-soft disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Modify Categories
					</button>
					<button
						type="button"
						onClick={handleRecordSnapshot}
						disabled={snapshotForm.processing || !canRecordProductSnapshot}
						className="flex justify-center py-3 px-4 border border-primary rounded-md shadow-sm text-sm font-medium text-primary bg-white hover:bg-primary-soft disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
					>
						Record Snapshot
					</button>
				</div>
			</div>
			<ConfirmationModal
				show={isSnapshotWarningModalOpen}
				onClose={() => setIsSnapshotWarningModalOpen(false)}
				onConfirm={() => submitSnapshotRecord(true)}
				title="Snapshot Already Exists Today"
				message="A snapshot for today already exists. Do you want to proceed and record another snapshot?"
				confirmText="Proceed"
				processing={snapshotForm.processing}
			/>
		</AuthenticatedLayout>
	);
}
