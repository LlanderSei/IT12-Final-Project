import React, { useEffect, useMemo, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, useForm } from "@inertiajs/react";
import Inventory from "./InventoryLevelsSubviews/Inventory";
import StockIn from "./InventoryLevelsSubviews/StockIn";
import StockOut from "./InventoryLevelsSubviews/StockOut";
import Snapshots from "./InventoryLevelsSubviews/Snapshots";
import StockMovementModal, {
	createDefaultStockInDraft,
	createDefaultStockOutDraft,
} from "./InventoryLevelsSubviews/StockMovementModal";
import ConfirmationModal from "@/Components/ConfirmationModal";
import PageHeader from "@/Components/PageHeader";
import ModuleTabs from "@/Components/ModuleTabs";
import InventoryItemModal from "./InventoryLevelsSubviews/Partials/InventoryItemModal";
import { Button } from "@/Components/ui/button";
import { Plus, PlusCircle, History, ArrowDownToLine, ArrowUpFromLine, Camera } from "lucide-react";
import usePermissions from "@/hooks/usePermissions";

export default function InventoryLevelsTabs({
	inventory,
	products,
	categories,
	stockIns,
	stockOuts,
	snapshots,
	initialTab = "Inventory",
}) {
	const { can, requirePermission } = usePermissions();
	
	// Permissions
	const canCreateInventoryItem = can("CanCreateInventoryItem");
	const canUpdateInventoryItem = can("CanUpdateInventoryItem");
	const canDeleteInventoryItem = can("CanDeleteInventoryItem");
	const canCreateStockIn = can("CanCreateStockIn");
	const canUpdateStockIn = can("CanUpdateStockIn");
	const canCreateStockOut = can("CanCreateStockOut");
	const canUpdateStockOut = can("CanUpdateStockOut");
	const canViewInventorySnapshots = can("CanViewInventorySnapshots");
	const canRecordInventorySnapshot = can("CanRecordInventorySnapshot");

	const STOCK_IN_DRAFT_KEY = "inventory.stock_in_draft.v1";
	const STOCK_OUT_DRAFT_KEY = "inventory.stock_out_draft.v1";

	// --- Helper Logic from Develop ---
	const parseStockOutReason = (reason) => {
		const value = String(reason || "").trim();
		if (!value) return { ReasonType: "", ReasonNote: "" };
		const separator = " | ";
		if (!value.includes(separator)) return { ReasonType: "", ReasonNote: value };
		const [type, ...notes] = value.split(separator);
		return {
			ReasonType: String(type || "").trim(),
			ReasonNote: notes.join(separator).trim(),
		};
	};

	const noStockInventoryCount = useMemo(
		() => (inventory || []).reduce((total, item) => total + (Number(item.Quantity || 0) <= 0 ? 1 : 0), 0),
		[inventory]
	);

	const lowStockInventoryCount = useMemo(
		() => (inventory || []).reduce((total, item) => {
			const quantity = Number(item.Quantity || 0);
			const threshold = Number(item.LowCountThreshold || 0);
			if (quantity > 0 && quantity <= threshold) return total + 1;
			return total;
		}, 0),
		[inventory]
	);

	const tabs = useMemo(() => {
		const allTabs = [
			{ 
				label: "Inventory", 
				href: route("inventory.index"), 
				badgeCount: noStockInventoryCount 
			},
			{ label: "Stock-In", href: route("inventory.stock-in") },
			{ label: "Stock-Out", href: route("inventory.stock-out") },
			{
				label: "Snapshots",
				href: route("inventory.snapshots"),
				hidden: !canViewInventorySnapshots,
			},
		];
		return allTabs.filter(t => !t.hidden).map(t => ({
			...t,
			active: initialTab === t.label
		}));
	}, [initialTab, canViewInventorySnapshots, noStockInventoryCount]);

	const activeTab = useMemo(() => {
		const found = tabs.find(t => t.active);
		return found ? found.label : tabs[0].label;
	}, [tabs]);

	// Modal States
	const [isItemModalOpen, setIsItemModalOpen] = useState(false);
	const [editingItem, setEditingItem] = useState(null);
	const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
	const [isStockOutModalOpen, setIsStockOutModalOpen] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [isSnapshotWarningModalOpen, setIsSnapshotWarningModalOpen] = useState(false);

	const [stockInDraft, setStockInDraft] = useState(createDefaultStockInDraft());
	const [editingStockInID, setEditingStockInID] = useState(null);
	const [stockOutDraft, setStockOutDraft] = useState(createDefaultStockOutDraft());
	const [editingStockOutID, setEditingStockOutID] = useState(null);

	// Persist Drafts
	useEffect(() => {
		try {
			const rawIn = sessionStorage.getItem(STOCK_IN_DRAFT_KEY);
			if (rawIn) setStockInDraft(JSON.parse(rawIn));
			const rawOut = sessionStorage.getItem(STOCK_OUT_DRAFT_KEY);
			if (rawOut) setStockOutDraft(JSON.parse(rawOut));
		} catch (_e) {}
	}, []);

	useEffect(() => {
		sessionStorage.setItem(STOCK_IN_DRAFT_KEY, JSON.stringify(stockInDraft));
	}, [stockInDraft]);

	useEffect(() => {
		sessionStorage.setItem(STOCK_OUT_DRAFT_KEY, JSON.stringify(stockOutDraft));
	}, [stockOutDraft]);

	// Forms
	const itemForm = useForm({
		ItemName: "",
		ItemDescription: "",
		ItemType: "",
		Measurement: "",
		LowCountThreshold: 10,
		Quantity: 0,
	});

	const stockInForm = useForm({});
	const stockOutForm = useForm({});
	const snapshotForm = useForm({ ProceedOnSameDay: false });

	const hasSnapshotForToday = useMemo(() => {
		return (snapshots || []).some((snapshot) => {
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
	}, [snapshots]);

	// Handlers
	const openAddItemModal = () => {
		if (!canCreateInventoryItem) return requirePermission("CanCreateInventoryItem");
		setEditingItem(null);
		itemForm.reset();
		setIsItemModalOpen(true);
	};

	const openEditItemModal = (item) => {
		if (!canUpdateInventoryItem) return requirePermission("CanUpdateInventoryItem");
		setEditingItem(item);
		itemForm.setData({
			ItemName: item.ItemName,
			ItemDescription: item.ItemDescription || "",
			ItemType: item.ItemType,
			Measurement: item.Measurement,
			LowCountThreshold: item.LowCountThreshold,
			Quantity: item.Quantity,
		});
		setIsItemModalOpen(true);
	};

	const submitItem = (e) => {
		e.preventDefault();
		if (editingItem) {
			itemForm.put(route("inventory.levels.update", editingItem.ID), {
				onSuccess: () => setIsItemModalOpen(false),
			});
		} else {
			itemForm.post(route("inventory.levels.store"), {
				onSuccess: () => setIsItemModalOpen(false),
			});
		}
	};

	const confirmDeleteItem = () => {
		itemForm.delete(route("inventory.levels.destroy", editingItem.ID), {
			onSuccess: () => {
				setIsDeleteModalOpen(false);
				setIsItemModalOpen(false);
			},
		});
	};

	const handleRecordStockIn = (payload) => {
		stockInForm.transform(() => payload);
		const routeName = editingStockInID
			? route("inventory.stock-in.update", editingStockInID)
			: route("inventory.stock-in.store");
		const method = editingStockInID ? "put" : "post";

		stockInForm[method](routeName, {
			onSuccess: () => {
				setStockInDraft(createDefaultStockInDraft());
				sessionStorage.removeItem(STOCK_IN_DRAFT_KEY);
				setEditingStockInID(null);
				setIsStockInModalOpen(false);
			},
			preserveScroll: true,
		});
	};

	const handleRecordStockOut = (payload) => {
		stockOutForm.transform(() => payload);
		const routeName = editingStockOutID
			? route("inventory.stock-out.update", editingStockOutID)
			: route("inventory.stock-out.store");
		const method = editingStockOutID ? "put" : "post";

		stockOutForm[method](routeName, {
			onSuccess: () => {
				setStockOutDraft(createDefaultStockOutDraft());
				sessionStorage.removeItem(STOCK_OUT_DRAFT_KEY);
				setEditingStockOutID(null);
				setIsStockOutModalOpen(false);
			},
			preserveScroll: true,
		});
	};

	const openEditStockOutModal = (record) => {
		if (!canUpdateStockOut) return requirePermission("CanUpdateStockOut");
		const inventoryLines = [];
		const productLines = [];
		const parsedReason = parseStockOutReason(record?.Reason);

		(record?.ItemsUsed || []).forEach((item, idx) => {
			const line = {
				key: `edit-out-${record.ID}-${idx}-${Date.now()}`,
				ItemType: item.ItemType,
				InventoryID: item.InventoryID || null,
				ProductID: item.ProductID || null,
				ItemName: item.ItemName,
				QuantityRemoved: item.QuantityRemoved,
			};
			if (item.ItemType === "Inventory") inventoryLines.push(line);
			else productLines.push(line);
		});

		setStockOutDraft({
			...createDefaultStockOutDraft(),
			details: {
				Source: "Business",
				ReasonType: parsedReason.ReasonType,
				ReasonNote: parsedReason.ReasonNote,
			},
			inventoryLines,
			productLines,
		});
		setEditingStockOutID(record.ID);
		setIsStockOutModalOpen(true);
	};

	const submitSnapshotRecord = (proceedOnSameDay) => {
		snapshotForm.transform(() => ({ ProceedOnSameDay: Boolean(proceedOnSameDay) }));
		snapshotForm.post(route("inventory.snapshots.store"), {
			preserveScroll: true,
			onSuccess: () => setIsSnapshotWarningModalOpen(false),
			onError: (err) => {
				if (err?.snapshot && !proceedOnSameDay) setIsSnapshotWarningModalOpen(true);
			},
		});
	};

	const handleRecordSnapshot = () => {
		if (!canRecordInventorySnapshot) return requirePermission("CanRecordInventorySnapshot");
		if (hasSnapshotForToday) {
			setIsSnapshotWarningModalOpen(true);
			return;
		}
		submitSnapshotRecord(false);
	};

	// Page Actions
	const actionButtons = (
		<div className="flex items-center gap-2">
			{activeTab === "Inventory" && (
				<Button onClick={openAddItemModal} disabled={!canCreateInventoryItem} className="gap-2">
					<Plus className="h-4 w-4" /> Add Item
				</Button>
			)}
			<Button variant="outline" onClick={() => { setEditingStockInID(null); setIsStockInModalOpen(true); }} disabled={!canCreateStockIn} className="gap-2">
				<ArrowDownToLine className="h-4 w-4" /> Stock-In
			</Button>
			<Button variant="outline" onClick={() => { setEditingStockOutID(null); setIsStockOutModalOpen(true); }} disabled={!canCreateStockOut} className="gap-2 text-destructive border-destructive hover:bg-destructive/10">
				<ArrowUpFromLine className="h-4 w-4" /> Stock-Out
			</Button>
			<Button variant="secondary" onClick={handleRecordSnapshot} disabled={snapshotForm.processing || !canRecordInventorySnapshot} className="gap-2">
				<Camera className="h-4 w-4" /> Take Snapshot
			</Button>
		</div>
	);

	const headerIndicators = (
		<div className="flex items-center gap-2">
			{activeTab === "Inventory" && noStockInventoryCount > 0 && (
				<div className="bg-destructive/10 text-destructive px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
					{noStockInventoryCount} No Stock
				</div>
			)}
			{activeTab === "Inventory" && lowStockInventoryCount > 0 && (
				<div className="bg-warning/10 text-warning-foreground px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
					{lowStockInventoryCount} Low Stock
				</div>
			)}
		</div>
	);

	return (
		<AuthenticatedLayout>
			<Head title="Inventory Levels" />

			<PageHeader 
				title="Inventory & Stock" 
				description={`${activeTab} management and history tracking.`}
				actions={actionButtons}
			>
				{headerIndicators}
			</PageHeader>

			<ModuleTabs tabs={tabs} />

			<div className="p-6 flex-1 overflow-hidden flex flex-col min-h-0 bg-muted/5">
				<div className="flex-1 bg-card rounded-xl border shadow-sm overflow-hidden flex flex-col p-6">
					{activeTab === "Inventory" && (
						<Inventory
							inventory={inventory}
							onEdit={openEditItemModal}
							canEdit={canUpdateInventoryItem}
						/>
					)}
					{activeTab === "Stock-In" && (
						<StockIn
							stockIns={stockIns}
							onEdit={(rec) => {
								// In a real scenario, you'd parse 'rec' into the draft here.
								// For now, we'll just open the modal.
								setEditingStockInID(rec.ID);
								setIsStockInModalOpen(true);
							}}
							canEdit={canUpdateStockIn}
						/>
					)}
					{activeTab === "Stock-Out" && (
						<StockOut
							stockOuts={stockOuts}
							onEdit={openEditStockOutModal}
							canEdit={canUpdateStockOut}
						/>
					)}
					{activeTab === "Snapshots" && (
						<Snapshots
							snapshots={snapshots}
							canViewDetails={canViewInventorySnapshots}
						/>
					)}
				</div>
			</div>

			{/* Modals */}
			<InventoryItemModal 
				open={isItemModalOpen}
				onOpenChange={setIsItemModalOpen}
				itemForm={itemForm}
				editingItem={editingItem}
				onSubmit={submitItem}
				onDelete={() => setIsDeleteModalOpen(true)}
				canDelete={canDeleteInventoryItem}
			/>

			<StockMovementModal
				mode="in"
				show={isStockInModalOpen}
				draft={stockInDraft}
				setDraft={setStockInDraft}
				inventory={inventory}
				products={products}
				categories={categories}
				processing={stockInForm.processing}
				errors={stockInForm.errors}
				onRecord={handleRecordStockIn}
				onSaveAndClose={(d) => { setStockInDraft(d); setIsStockInModalOpen(false); }}
				onCancelAndClear={() => { 
					setStockInDraft(createDefaultStockInDraft()); 
					sessionStorage.removeItem(STOCK_IN_DRAFT_KEY);
					setEditingStockInID(null);
					setIsStockInModalOpen(false); 
				}}
				title={editingStockInID ? "Edit Stock-In" : "New Stock-In"}
				submitLabel={editingStockInID ? "Update Batch" : "Record Batch"}
			/>

			<StockMovementModal
				mode="out"
				show={isStockOutModalOpen}
				draft={stockOutDraft}
				setDraft={setStockOutDraft}
				inventory={inventory}
				products={products}
				categories={categories}
				processing={stockOutForm.processing}
				errors={stockOutForm.errors}
				onRecord={handleRecordStockOut}
				onSaveAndClose={(d) => { setStockOutDraft(d); setIsStockOutModalOpen(false); }}
				onCancelAndClear={() => { 
					setStockOutDraft(createDefaultStockOutDraft()); 
					sessionStorage.removeItem(STOCK_OUT_DRAFT_KEY);
					setEditingStockOutID(null);
					setIsStockOutModalOpen(false); 
				}}
				title={editingStockOutID ? "Edit Stock-Out" : "New Stock-Out"}
				submitLabel={editingStockOutID ? "Update Batch" : "Record Batch"}
			/>

			<ConfirmationModal
				show={isDeleteModalOpen}
				onClose={() => setIsDeleteModalOpen(false)}
				onConfirm={confirmDeleteItem}
				title="Delete Item"
				message={`Are you sure you want to delete "${editingItem?.ItemName}"? This action cannot be undone.`}
				confirmText="Delete"
				processing={itemForm.processing}
				variant="destructive"
			/>

			<ConfirmationModal
				show={isSnapshotWarningModalOpen}
				onClose={() => setIsSnapshotWarningModalOpen(false)}
				onConfirm={() => submitSnapshotRecord(true)}
				title="Snapshot Exists"
				message="A snapshot was already taken today. Proceed with another?"
				confirmText="Proceed"
				processing={snapshotForm.processing}
			/>
		</AuthenticatedLayout>
	);
}
