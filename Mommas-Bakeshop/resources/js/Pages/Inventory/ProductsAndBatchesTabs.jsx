import React, { useEffect, useMemo, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router, useForm } from "@inertiajs/react";
import Products from "./ProductsAndBatchesSubviews/Products";
import ProductionBatches from "./ProductsAndBatchesSubviews/ProductionBatches";
import Snapshots from "./ProductsAndBatchesSubviews/Snapshots";
import PageHeader from "@/Components/PageHeader";
import ModuleTabs from "@/Components/ModuleTabs";
import { 
	Package, 
	ChevronRight,
	Plus,
	Tags,
	ClipboardList,
	Camera as CameraIcon
} from "lucide-react";
import { 
	PRODUCTS_BATCHES_FOOTER_ACTIONS, 
	setPendingProductsBatchesFooterAction 
} from "@/utils/productsAndBatchesFooterActions";
import usePermissions from "@/hooks/usePermissions";
import ConfirmationModal from "@/Components/ConfirmationModal";
import { Button } from "@/Components/ui/button";

export default function ProductsAndBatchesTabs({
	products,
	categories,
	batches,
	snapshots,
	initialTab = "Products",
}) {
	const { can, requirePermission } = usePermissions();
	const [activeTab, setActiveTab] = useState(initialTab);
	
	const canCreateProduct = can("CanCreateProduct");
	const canCreateProductionBatch = can("CanCreateProductionBatch");
	const canViewProductSnapshots = can("CanViewProductSnapshots");
	const canRecordProductSnapshot = can("CanRecordProductSnapshot");
	const canManageCategories = can("CanCreateProductCategory") || can("CanUpdateProductCategory") || can("CanDeleteProductCategory");

	const [footerActions, setFooterActions] = useState({
		openAddProduct: null,
		openRecordBatch: null,
		openModifyCategories: null,
	});

	const [headerMeta, setHeaderMeta] = useState({ subtitle: "Finished Goods", countLabel: "" });

	// --- Count Logic from Develop ---
	const noStockProductsCount = useMemo(
		() => (products || []).reduce((total, item) => total + (Number(item.Quantity || 0) <= 0 ? 1 : 0), 0),
		[products]
	);
	const lowStockProductsCount = useMemo(
		() => (products || []).reduce((total, item) => {
			const quantity = Number(item.Quantity || 0);
			const threshold = Number(item.LowStockThreshold || 0);
			if (quantity > 0 && quantity <= threshold) return total + 1;
			return total;
		}, 0),
		[products]
	);

	const tabs = useMemo(() => {
		const allTabs = [
			{ label: "Products", icon: Package, value: "Products", badgeCount: noStockProductsCount },
			{ label: "Production Batches", icon: ClipboardList, value: "Production Batches" },
			{ label: "Snapshots", icon: CameraIcon, value: "Snapshots", hidden: !canViewProductSnapshots },
		];
		const visible = allTabs.filter(t => !t.hidden);
		return visible.map(t => ({
			...t,
			active: activeTab === t.value,
			href: "#" // ModuleTabs handles internal switching via onTabChange in this file
		}));
	}, [activeTab, canViewProductSnapshots, noStockProductsCount]);

	// Snapshot Logic
	const snapshotForm = useForm({ ProceedOnSameDay: false });
	const [isSnapshotWarningModalOpen, setIsSnapshotWarningModalOpen] = useState(false);

	const hasSnapshotForToday = (snapshots || []).some((s) => {
		if (!s?.SnapshotTime) return false;
		const d = new Date(s.SnapshotTime);
		const now = new Date();
		return d.toDateString() === now.toDateString();
	});

	const submitSnapshotRecord = (proceed) => {
		snapshotForm.transform(() => ({ ProceedOnSameDay: !!proceed }));
		snapshotForm.post(route("inventory.products.snapshots.store"), {
			preserveScroll: true,
			onSuccess: () => setIsSnapshotWarningModalOpen(false),
			onError: (err) => { if (err?.snapshot && !proceed) setIsSnapshotWarningModalOpen(true); }
		});
	};

	const handleRecordSnapshot = () => {
		if (!canRecordProductSnapshot) return requirePermission("CanRecordProductSnapshot");
		if (hasSnapshotForToday) { setIsSnapshotWarningModalOpen(true); return; }
		submitSnapshotRecord(false);
	};

	const triggerFooterAction = ({ targetTab, targetHref, pendingAction, openHandler }) => {
		if (activeTab === targetTab && typeof openHandler === "function") {
			openHandler();
			return;
		}
		setPendingProductsBatchesFooterAction(pendingAction);
		router.visit(targetHref);
	};

	return (
		<AuthenticatedLayout disableScroll={true}>
			<Head title="Products & Batches" />

			<div className="flex flex-col h-full bg-slate-50/50">
				<PageHeader 
					title="Products & Production" 
					subtitle={headerMeta.subtitle}
					count={headerMeta.countLabel}
					actions={
						<div className="flex items-center gap-3">
							<Button 
								variant="outline" 
								className="rounded-xl font-black uppercase tracking-widest text-[10px] h-10 px-5 gap-2 border-2"
								onClick={handleRecordSnapshot}
								disabled={snapshotForm.processing || !canRecordProductSnapshot}
							>
								<CameraIcon className="h-4 w-4" /> Record Snapshot
							</Button>
							<div className="h-6 w-px bg-border mx-1" />
							<Button 
								variant="secondary"
								className="rounded-xl font-black uppercase tracking-widest text-[10px] h-10 px-5 gap-2 shadow-sm border"
								onClick={() => triggerFooterAction({
									targetTab: "Products",
									targetHref: route("products.index"),
									pendingAction: PRODUCTS_BATCHES_FOOTER_ACTIONS.MODIFY_CATEGORIES,
									openHandler: footerActions.openModifyCategories,
								})}
								disabled={!canManageCategories}
							>
								<Tags className="h-4 w-4" /> Categories
							</Button>
						</div>
					}
				>
					{activeTab === "Products" && (
						<div className="flex items-center gap-2">
							{noStockProductsCount > 0 && (
								<div className="bg-destructive/10 text-destructive px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
									{noStockProductsCount} No Stock
								</div>
							)}
							{lowStockProductsCount > 0 && (
								<div className="bg-warning/10 text-warning-foreground px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
									{lowStockProductsCount} Low Stock
								</div>
							)}
						</div>
					)}
				</PageHeader>

				<div className="px-10 mt-6">
					<ModuleTabs 
						tabs={tabs} 
						onTabChange={(val) => {
							const target = tabs.find(t => t.value === val);
							if (target && target.value !== activeTab) {
								const hrefs = {
									"Products": route("products.index"),
									"Production Batches": route("products.batches"),
									"Snapshots": route("products.snapshots")
								};
								router.visit(hrefs[val]);
							}
						}} 
					/>
				</div>

				<main className="flex-1 overflow-hidden p-10 pt-6">
					<div className="bg-white rounded-[2.5rem] border shadow-2xl shadow-slate-200/50 h-full flex flex-col overflow-hidden relative">
						<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
						
						<div className="flex-1 overflow-hidden flex flex-col p-8">
							{activeTab === "Products" && (
								<Products
									products={products}
									categories={categories}
									onHeaderMetaChange={setHeaderMeta}
									canCreateProduct={canCreateProduct}
									canUpdateProduct={can("CanUpdateProduct")}
									canDeleteProduct={can("CanDeleteProduct")}
									canCreateProductCategory={can("CanCreateProductCategory")}
									canUpdateProductCategory={can("CanUpdateProductCategory")}
									canDeleteProductCategory={can("CanDeleteProductCategory")}
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
									canUpdateProductionBatch={can("CanUpdateProductionBatch")}
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

						{/* Quick Action Footer inside Main Container */}
						{(activeTab === "Products" || activeTab === "Production Batches") && (
							<div className="px-10 py-8 bg-slate-50 border-t flex items-center justify-between">
								<div className="flex items-center gap-6">
									<p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">Operational Shortcuts</p>
									<ChevronRight className="h-4 w-4 text-muted-foreground opacity-20" />
								</div>
								<div className="flex items-center gap-4">
									<Button 
										variant="outline"
										disabled={!canCreateProductionBatch}
										className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[10px] border-2 bg-background shadow-md hover:bg-slate-100 transition-all gap-3"
										onClick={() => triggerFooterAction({
											targetTab: "Production Batches",
											targetHref: route("products.batches"),
											pendingAction: PRODUCTS_BATCHES_FOOTER_ACTIONS.RECORD_BATCH,
											openHandler: footerActions.openRecordBatch,
										})}
									>
										<ClipboardList className="h-5 w-5 opacity-40" /> Record Batch Log
									</Button>
									<Button 
										disabled={!canCreateProduct}
										className="rounded-2xl h-14 px-10 font-black uppercase tracking-widest text-[11px] bg-primary text-white shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all gap-3"
										onClick={() => triggerFooterAction({
											targetTab: "Products",
											targetHref: route("products.index"),
											pendingAction: PRODUCTS_BATCHES_FOOTER_ACTIONS.ADD_PRODUCT,
											openHandler: footerActions.openAddProduct,
										})}
									>
										<Plus className="h-5 w-5" /> New Product Entry
									</Button>
								</div>
							</div>
						)}
					</div>
				</main>
			</div>

			<ConfirmationModal
				show={isSnapshotWarningModalOpen}
				onClose={() => setIsSnapshotWarningModalOpen(false)}
				onConfirm={() => submitSnapshotRecord(true)}
				title="Duplicate Snapshot Warning"
				message="An inventory snapshot for today already exists in the system. Continuing will create an additional timestamped record. Do you wish to proceed?"
				confirmText="Proceed Anyway"
				processing={snapshotForm.processing}
				variant="warning"
			/>
		</AuthenticatedLayout>
	);
}
