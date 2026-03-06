import React, { useEffect, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link, useForm } from "@inertiajs/react";
import Inventory from "./InventoryLevelsSubviews/Inventory";
import StockIn from "./InventoryLevelsSubviews/StockIn";
import StockOut from "./InventoryLevelsSubviews/StockOut";
import Snapshots from "./InventoryLevelsSubviews/Snapshots";
import StockMovementModal, {
	createDefaultStockInDraft,
	createDefaultStockOutDraft,
} from "./InventoryLevelsSubviews/StockMovementModal";
import ConfirmationModal from "@/Components/ConfirmationModal";
import { formatCountLabel } from "@/utils/countLabel";
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
	const canCreateInventoryItem = can("CanCreateInventoryItem");
	const canUpdateInventoryItem = can("CanUpdateInventoryItem");
	const canDeleteInventoryItem = can("CanDeleteInventoryItem");
	const canCreateStockIn = can("CanCreateStockIn");
	const canUpdateStockIn = can("CanUpdateStockIn");
	const canCreateStockOut = can("CanCreateStockOut");
	const canUpdateStockOut = can("CanUpdateStockOut");
	const canViewInventorySnapshots = can("CanViewInventorySnapshots");
	const canRecordInventorySnapshot = can("CanRecordInventorySnapshot");
	const parseStockOutReason = (reason) => {
		const value = String(reason || "").trim();
		if (!value) {
			return { ReasonType: "", ReasonNote: "" };
		}

		const separator = " | ";
		if (!value.includes(separator)) {
			return { ReasonType: "", ReasonNote: value };
		}

		const [type, ...notes] = value.split(separator);
		return {
			ReasonType: String(type || "").trim(),
			ReasonNote: notes.join(separator).trim(),
		};
	};

	const STOCK_IN_DRAFT_KEY = "inventory.stock_in_draft.v1";
	const STOCK_OUT_DRAFT_KEY = "inventory.stock_out_draft.v1";
	const tabs = [
		{ label: "Inventory", href: route("inventory.index") },
		{ label: "Stock-In", href: route("inventory.stock-in") },
		{ label: "Stock-Out", href: route("inventory.stock-out") },
		{
			label: "Snapshots",
			href: route("inventory.snapshots"),
			hidden: !canViewInventorySnapshots,
		},
	];
	const visibleTabs = tabs.filter((tab) => !tab.hidden);
	const tabLabels = visibleTabs.map((tab) => tab.label);
	const activeTab = tabLabels.includes(initialTab) ? initialTab : tabLabels[0];
	const getDefaultHeaderMeta = (tab) => {
		if (tab === "Inventory") {
			return {
				subtitle: "Raw Materials & Supplies",
				countLabel: formatCountLabel((inventory || []).length, "item"),
			};
		}
		if (tab === "Stock-In") {
			return {
				subtitle: "Stock-In History",
				countLabel: formatCountLabel((stockIns || []).length, "record"),
			};
		}
		if (tab === "Snapshots") {
			return {
				subtitle: "Snapshot History",
				countLabel: formatCountLabel((snapshots || []).length, "record"),
			};
		}
		return {
			subtitle: "Stock-Out History",
			countLabel: formatCountLabel((stockOuts || []).length, "record"),
		};
	};
	const [headerMeta, setHeaderMeta] = useState(() =>
		getDefaultHeaderMeta(activeTab),
	);

	// Modal States
	const [isItemModalOpen, setIsItemModalOpen] = useState(false);
	const [editingItem, setEditingItem] = useState(null);
	const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
	const [isStockOutModalOpen, setIsStockOutModalOpen] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [stockInDraft, setStockInDraft] = useState(createDefaultStockInDraft);
	const [editingStockInID, setEditingStockInID] = useState(null);
	const [stockOutDraft, setStockOutDraft] = useState(
		createDefaultStockOutDraft,
	);
	const [editingStockOutID, setEditingStockOutID] = useState(null);
	const [isSnapshotWarningModalOpen, setIsSnapshotWarningModalOpen] =
		useState(false);

	useEffect(() => {
		setHeaderMeta(getDefaultHeaderMeta(activeTab));
	}, [activeTab, inventory, stockIns, stockOuts, snapshots]);

	useEffect(() => {
		try {
			const raw = sessionStorage.getItem(STOCK_IN_DRAFT_KEY);
			if (raw) {
				setStockInDraft(JSON.parse(raw));
			}
		} catch (_e) {}
	}, []);

	useEffect(() => {
		try {
			sessionStorage.setItem(STOCK_IN_DRAFT_KEY, JSON.stringify(stockInDraft));
		} catch (_e) {}
	}, [stockInDraft]);

	useEffect(() => {
		try {
			const raw = sessionStorage.getItem(STOCK_OUT_DRAFT_KEY);
			if (raw) {
				setStockOutDraft(JSON.parse(raw));
			}
		} catch (_e) {}
	}, []);

	useEffect(() => {
		try {
			sessionStorage.setItem(
				STOCK_OUT_DRAFT_KEY,
				JSON.stringify(stockOutDraft),
			);
		} catch (_e) {}
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
	const snapshotForm = useForm({
		ProceedOnSameDay: false,
	});

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

	// Handlers
	const openAddItemModal = () => {
		if (!canCreateInventoryItem) return requirePermission("CanCreateInventoryItem");
		setEditingItem(null);
		itemForm.reset();
		itemForm.setData("Quantity", 0);
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
			if (!canUpdateInventoryItem) return requirePermission("CanUpdateInventoryItem");
			itemForm.put(route("inventory.levels.update", editingItem.ID), {
				onSuccess: () => setIsItemModalOpen(false),
			});
		} else {
			if (!canCreateInventoryItem) return requirePermission("CanCreateInventoryItem");
			itemForm.post(route("inventory.levels.store"), {
				onSuccess: () => setIsItemModalOpen(false),
			});
		}
	};

	const confirmDeleteItem = () => {
		if (!canDeleteInventoryItem) return requirePermission("CanDeleteInventoryItem");
		itemForm.delete(route("inventory.levels.destroy", editingItem.ID), {
			onSuccess: () => {
				setIsDeleteModalOpen(false);
				setIsItemModalOpen(false);
			},
		});
	};

	const handleRecordStockIn = (payload) => {
		if (editingStockInID && !canUpdateStockIn) return requirePermission("CanUpdateStockIn");
		if (!editingStockInID && !canCreateStockIn) return requirePermission("CanCreateStockIn");
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

	const handleSaveAndCloseStockIn = (draft) => {
		setStockInDraft(draft);
		setIsStockInModalOpen(false);
	};

	const handleCancelAndClearStockIn = () => {
		setStockInDraft(createDefaultStockInDraft());
		sessionStorage.removeItem(STOCK_IN_DRAFT_KEY);
		setEditingStockInID(null);
		setIsStockInModalOpen(false);
	};

	const openStockInCreateModal = () => {
		if (!canCreateStockIn) return requirePermission("CanCreateStockIn");
		setEditingStockInID(null);
		setIsStockInModalOpen(true);
	};

	const openEditStockInModal = (record) => {
		if (!canUpdateStockIn) return requirePermission("CanUpdateStockIn");
		const inventoryLines = [];
		const productLines = [];

		(record?.ItemsPurchased || []).forEach((item, idx) => {
			const line = {
				key: `edit-${record.ID}-${idx}-${Date.now()}`,
				ItemType: item.ItemType,
				InventoryID: item.InventoryID || null,
				ProductID: item.ProductID || null,
				ItemName: item.ItemName,
				QuantityAdded: item.QuantityAdded,
				UnitCost: item.UnitCost,
				SubAmount: item.SubAmount,
			};

			if (item.ItemType === "Inventory") {
				const inventoryItem = (inventory || []).find(
					(x) => x.ID === item.InventoryID,
				);
				line.Measurement = inventoryItem?.Measurement || "units";
				inventoryLines.push(line);
			} else {
				productLines.push(line);
			}
		});

		setStockInDraft({
			...createDefaultStockInDraft(),
			details: {
				Supplier: record.Supplier || "",
				Source: record.Source || "Purchased",
				PurchaseDate: record.PurchaseDate
					? String(record.PurchaseDate).slice(0, 10)
					: "",
				ReceiptNumber: record.ReceiptNumber || "",
				InvoiceNumber: record.InvoiceNumber || "",
				AdditionalDetails: record.AdditionalDetails || "",
			},
			inventoryLines,
			productLines,
		});
		setEditingStockInID(record.ID);
		setIsStockInModalOpen(true);
	};

	const handleRecordStockOut = (payload) => {
		if (editingStockOutID && !canUpdateStockOut) return requirePermission("CanUpdateStockOut");
		if (!editingStockOutID && !canCreateStockOut) return requirePermission("CanCreateStockOut");
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

	const handleSaveAndCloseStockOut = (draft) => {
		setStockOutDraft(draft);
		setIsStockOutModalOpen(false);
	};

	const handleCancelAndClearStockOut = () => {
		setStockOutDraft(createDefaultStockOutDraft());
		sessionStorage.removeItem(STOCK_OUT_DRAFT_KEY);
		setEditingStockOutID(null);
		setIsStockOutModalOpen(false);
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

			if (item.ItemType === "Inventory") {
				inventoryLines.push(line);
			} else {
				productLines.push(line);
			}
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

	const getStatus = (item) => {
		if (item.Quantity === 0) return "No Stock";
		if (item.Quantity <= item.LowCountThreshold) return "Low Stock";
		return "On Stock";
	};

	const submitSnapshotRecord = (proceedOnSameDay) => {
		snapshotForm.transform(() => ({
			ProceedOnSameDay: Boolean(proceedOnSameDay),
		}));
		snapshotForm.post(route("inventory.snapshots.store"), {
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
		if (!canRecordInventorySnapshot) {
			return requirePermission("CanRecordInventorySnapshot");
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
						Inventory Levels & Stock Movements
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
		>
			<Head title="Inventory Levels" />

			{/* Tabs */}
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

			<div className="flex flex-col flex-1 overflow-hidden min-h-0">
				<div className="mx-auto flex-1 flex flex-col overflow-hidden min-h-0 w-full">
					<div className="bg-white shadow-sm sm:rounded-lg flex-1 flex flex-col overflow-hidden min-h-0">
						<div className="p-6 flex-1 flex flex-col overflow-hidden min-h-0">
							{activeTab === "Inventory" && (
								<Inventory
									inventory={inventory}
									onEdit={openEditItemModal}
									getStatus={getStatus}
									onHeaderMetaChange={setHeaderMeta}
									canEdit={canUpdateInventoryItem}
								/>
							)}
							{activeTab === "Stock-In" && (
								<StockIn
									stockIns={stockIns}
									onEdit={openEditStockInModal}
									onHeaderMetaChange={setHeaderMeta}
									canEdit={canUpdateStockIn}
								/>
							)}
							{activeTab === "Stock-Out" && (
								<StockOut
									stockOuts={stockOuts}
									onEdit={openEditStockOutModal}
									onHeaderMetaChange={setHeaderMeta}
									canEdit={canUpdateStockOut}
								/>
							)}
							{activeTab === "Snapshots" && (
								<Snapshots
									snapshots={snapshots}
									onHeaderMetaChange={setHeaderMeta}
									canViewDetails={canViewInventorySnapshots}
								/>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Shared Bottom Buttons */}
			<div className="sticky bottom-0 w-full p-4 bg-white border-t border-gray-200 z-10">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-4 gap-4">
						<button
							onClick={openAddItemModal}
							disabled={!canCreateInventoryItem}
							className="flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
						>
							Add Item
						</button>
						<button
							onClick={openStockInCreateModal}
							disabled={!canCreateStockIn}
							className="flex justify-center py-3 px-4 border border-primary rounded-md shadow-sm text-sm font-medium text-primary bg-white hover:bg-primary-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
						>
							Stock-In
						</button>
					<button
						onClick={() => {
							if (!canCreateStockOut) return requirePermission("CanCreateStockOut");
							setEditingStockOutID(null);
							setIsStockOutModalOpen(true);
						}}
							disabled={!canCreateStockOut}
							className="flex justify-center py-3 px-4 border border-primary rounded-md shadow-sm text-sm font-medium text-primary bg-white hover:bg-primary-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
						>
							Stock-Out
						</button>
						<button
							onClick={handleRecordSnapshot}
							disabled={snapshotForm.processing || !canRecordInventorySnapshot}
							className="flex justify-center py-3 px-4 border border-primary rounded-md shadow-sm text-sm font-medium text-primary bg-white hover:bg-primary-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
						>
							Record Snapshot
						</button>
				</div>
			</div>

			{/* Item Modal */}
			{isItemModalOpen && (
				<div
					className="fixed inset-0 z-50 overflow-y-auto"
					aria-modal="true"
					role="dialog"
				>
					<div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
						<div
							className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
							onClick={() => setIsItemModalOpen(false)}
						/>
						<div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
							<form onSubmit={submitItem}>
								<div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
									<h3 className="text-lg font-medium text-gray-900 border-b pb-3">
										{editingItem ? "Edit Item" : "Add New Item"}
									</h3>
									<div className="mt-4 space-y-4">
										<div>
											<label className="block text-sm font-medium text-gray-700">
												Item Name
											</label>
											<input
												type="text"
												value={itemForm.data.ItemName}
												onChange={(e) =>
													itemForm.setData("ItemName", e.target.value)
												}
												required
												className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
											/>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700">
												Description
											</label>
											<textarea
												value={itemForm.data.ItemDescription}
												onChange={(e) =>
													itemForm.setData("ItemDescription", e.target.value)
												}
												rows={2}
												className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
											/>
										</div>
										<div className="grid grid-cols-2 gap-4">
											<div>
												<label className="block text-sm font-medium text-gray-700">
													Type
												</label>
												<select
													value={itemForm.data.ItemType}
													onChange={(e) =>
														itemForm.setData("ItemType", e.target.value)
													}
													required
													className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
												>
													<option value="">Select Type</option>
													<option value="Raw Material">Raw Material</option>
													<option value="Supplies">Supplies</option>
													<option value="Packaging">Packaging</option>
												</select>
											</div>
											<div>
												<label className="block text-sm font-medium text-gray-700">
													Measurement
												</label>
												<input
													type="text"
													value={itemForm.data.Measurement}
													onChange={(e) =>
														itemForm.setData("Measurement", e.target.value)
													}
													placeholder="e.g. kg, pcs, liters"
													required
													className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
												/>
											</div>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700">
												Low Stock Threshold
											</label>
											<input
												type="number"
												value={itemForm.data.LowCountThreshold}
												onChange={(e) =>
													itemForm.setData("LowCountThreshold", e.target.value)
												}
												min="0"
												required
												className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
											/>
										</div>
									</div>
								</div>
								<div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
									<button
										type="submit"
										disabled={itemForm.processing}
										className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-hover sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
									>
										{editingItem ? "Save Changes" : "Add Item"}
									</button>
										{editingItem && (
											<button
												type="button"
												disabled={!canDeleteInventoryItem}
												onClick={() => setIsDeleteModalOpen(true)}
												className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600"
											>
												Delete
											</button>
									)}
									<button
										type="button"
										onClick={() => setIsItemModalOpen(false)}
										className="mt-3 w-full inline-flex justify-center rounded-md border border-primary shadow-sm px-4 py-2 bg-white text-base font-medium text-primary hover:bg-primary-soft sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
									>
										Cancel
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			)}

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
				onSaveAndClose={handleSaveAndCloseStockIn}
				onCancelAndClear={handleCancelAndClearStockIn}
				title={editingStockInID ? "Edit Stock-In Batch" : "Stock-In Batch"}
				submitLabel={
					editingStockInID ? "Save Stock-In Changes" : "Record Stock-In"
				}
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
				onSaveAndClose={handleSaveAndCloseStockOut}
				onCancelAndClear={handleCancelAndClearStockOut}
				title={editingStockOutID ? "Edit Stock-Out Batch" : "Stock-Out Batch"}
				submitLabel={
					editingStockOutID ? "Save Stock-Out Changes" : "Record Stock-Out"
				}
			/>

			{/* Delete Confirmation */}
			<ConfirmationModal
				show={isDeleteModalOpen}
				onClose={() => setIsDeleteModalOpen(false)}
				onConfirm={confirmDeleteItem}
				title="Delete Item"
				message={`Are you sure you want to delete "${editingItem?.ItemName}"? This will also affect stock history records.`}
				confirmText="Delete"
				processing={itemForm.processing}
			/>

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
