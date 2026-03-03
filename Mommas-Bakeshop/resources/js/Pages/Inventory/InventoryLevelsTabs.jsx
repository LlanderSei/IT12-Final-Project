import React, { useEffect, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link, useForm } from "@inertiajs/react";
import Inventory from "./InventoryLevelsSubviews/Inventory";
import StockIn from "./InventoryLevelsSubviews/StockIn";
import StockOut from "./InventoryLevelsSubviews/StockOut";
import StockMovementModal, {
	createDefaultStockInDraft,
	createDefaultStockOutDraft,
} from "./InventoryLevelsSubviews/StockMovementModal";
import ConfirmationModal from "@/Components/ConfirmationModal";

export default function InventoryLevelsTabs({
	inventory,
	products,
	categories,
	stockIns,
	stockOuts,
	initialTab = "Inventory",
}) {
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
	];
	const tabLabels = tabs.map((tab) => tab.label);
	const activeTab = tabLabels.includes(initialTab) ? initialTab : tabLabels[0];

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

	// Handlers
	const openAddItemModal = () => {
		setEditingItem(null);
		itemForm.reset();
		itemForm.setData("Quantity", 0);
		setIsItemModalOpen(true);
	};

	const openEditItemModal = (item) => {
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
		setEditingStockInID(null);
		setIsStockInModalOpen(true);
	};

	const openEditStockInModal = (record) => {
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

	return (
		<AuthenticatedLayout
			header={
				<h2 className="font-semibold text-xl text-gray-800 leading-tight">
					Inventory Levels & Stock Movements
				</h2>
			}
		>
			<Head title="Inventory Levels" />

			{/* Tabs */}
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

			<div className="flex flex-col flex-1 overflow-hidden min-h-0">
				<div className="mx-auto flex-1 flex flex-col overflow-hidden min-h-0 w-full">
					<div className="bg-white shadow-sm sm:rounded-lg flex-1 flex flex-col overflow-hidden min-h-0">
						<div className="p-6 flex-1 flex flex-col overflow-hidden min-h-0">
							{activeTab === "Inventory" && (
								<Inventory
									inventory={inventory}
									onEdit={openEditItemModal}
									getStatus={getStatus}
								/>
							)}
							{activeTab === "Stock-In" && (
								<StockIn stockIns={stockIns} onEdit={openEditStockInModal} />
							)}
							{activeTab === "Stock-Out" && (
								<StockOut
									stockOuts={stockOuts}
									onEdit={openEditStockOutModal}
								/>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Shared Bottom Buttons */}
			<div className="sticky bottom-0 w-full p-4 bg-white border-t border-gray-200 z-10">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-3 gap-4">
					<button
						onClick={openAddItemModal}
						className="flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover transition-colors"
					>
						Add Item
					</button>
					<button
						onClick={openStockInCreateModal}
						className="flex justify-center py-3 px-4 border border-primary rounded-md shadow-sm text-sm font-medium text-primary bg-white hover:bg-primary-soft transition-colors"
					>
						Stock-In
					</button>
					<button
						onClick={() => {
							setEditingStockOutID(null);
							setIsStockOutModalOpen(true);
						}}
						className="flex justify-center py-3 px-4 border border-primary rounded-md shadow-sm text-sm font-medium text-primary bg-white hover:bg-primary-soft transition-colors"
					>
						Stock-Out
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
											onClick={() => setIsDeleteModalOpen(true)}
											className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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
		</AuthenticatedLayout>
	);
}



