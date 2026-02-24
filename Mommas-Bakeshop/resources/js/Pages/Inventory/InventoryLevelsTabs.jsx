import React, { useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, useForm } from "@inertiajs/react";
import Inventory from "./InventoryLevelsSubviews/Inventory";
import StockIn from "./InventoryLevelsSubviews/StockIn";
import StockOut from "./InventoryLevelsSubviews/StockOut";
import ConfirmationModal from "@/Components/ConfirmationModal";

export default function InventoryLevelsTabs({
	inventory,
	stockIns,
	stockOuts,
	users,
}) {
	const tabs = ["Inventory", "Stock-In (Raw)", "Stock-Out (Kitchen)"];
	const [activeTab, setActiveTab] = useState(tabs[0]);

	// Modal States
	const [isItemModalOpen, setIsItemModalOpen] = useState(false);
	const [editingItem, setEditingItem] = useState(null);
	const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
	const [isStockOutModalOpen, setIsStockOutModalOpen] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

	// Forms
	const itemForm = useForm({
		ItemName: "",
		ItemDescription: "",
		ItemType: "",
		Measurement: "",
		LowCountThreshold: 10,
		Quantity: 0,
	});

	const stockInForm = useForm({
		InventoryID: "",
		Supplier: "",
		PricePerUnit: "",
		QuantityAdded: "",
		AdditionalDetails: "",
	});

	const stockOutForm = useForm({
		InventoryID: "",
		QuantityRemoved: "",
		Reason: "",
	});

	// Handlers
	const openAddItemModal = () => {
		setEditingItem(null);
		itemForm.reset();
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

	const submitStockIn = (e) => {
		e.preventDefault();
		stockInForm.post(route("inventory.stock-in.store"), {
			onSuccess: () => {
				setIsStockInModalOpen(false);
				stockInForm.reset();
			},
		});
	};

	const submitStockOut = (e) => {
		e.preventDefault();
		stockOutForm.post(route("inventory.stock-out.store"), {
			onSuccess: () => {
				setIsStockOutModalOpen(false);
				stockOutForm.reset();
			},
		});
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
							{activeTab === "Stock-In (Raw)" && (
								<StockIn stockIns={stockIns} />
							)}
							{activeTab === "Stock-Out (Kitchen)" && (
								<StockOut stockOuts={stockOuts} />
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
						className="flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#D97736] hover:bg-[#c2682e] transition-colors"
					>
						Add Item
					</button>
					<button
						onClick={() => setIsStockInModalOpen(true)}
						className="flex justify-center py-3 px-4 border border-[#D97736] rounded-md shadow-sm text-sm font-medium text-[#D97736] bg-white hover:bg-[#FDEFE6] transition-colors"
					>
						Stock-In
					</button>
					<button
						onClick={() => setIsStockOutModalOpen(true)}
						className="flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
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
												className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#D97736] focus:ring-[#D97736] sm:text-sm"
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
												className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#D97736] focus:ring-[#D97736] sm:text-sm"
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
													className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#D97736] focus:ring-[#D97736] sm:text-sm"
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
													className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#D97736] focus:ring-[#D97736] sm:text-sm"
												/>
											</div>
										</div>
										<div className="grid grid-cols-2 gap-4">
											<div>
												<label className="block text-sm font-medium text-gray-700">
													Initial Quantity
												</label>
												<input
													type="number"
													value={itemForm.data.Quantity}
													onChange={(e) =>
														itemForm.setData("Quantity", e.target.value)
													}
													min="0"
													required
													className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#D97736] focus:ring-[#D97736] sm:text-sm"
												/>
											</div>
											<div>
												<label className="block text-sm font-medium text-gray-700">
													Low Stock Threshold
												</label>
												<input
													type="number"
													value={itemForm.data.LowCountThreshold}
													onChange={(e) =>
														itemForm.setData(
															"LowCountThreshold",
															e.target.value,
														)
													}
													min="0"
													required
													className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#D97736] focus:ring-[#D97736] sm:text-sm"
												/>
											</div>
										</div>
									</div>
								</div>
								<div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
									<button
										type="submit"
										disabled={itemForm.processing}
										className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#D97736] text-base font-medium text-white hover:bg-[#c2682e] sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
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
										className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
									>
										Cancel
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			)}

			{/* Stock-In Modal */}
			{isStockInModalOpen && (
				<div
					className="fixed inset-0 z-50 overflow-y-auto"
					aria-modal="true"
					role="dialog"
				>
					<div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
						<div
							className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
							onClick={() => setIsStockInModalOpen(false)}
						/>
						<div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
							<form onSubmit={submitStockIn}>
								<div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
									<h3 className="text-lg font-medium text-gray-900 border-b pb-3">
										Stock-In (Restock)
									</h3>
									<div className="mt-4 space-y-4">
										<div>
											<label className="block text-sm font-medium text-gray-700">
												Select Item
											</label>
											<select
												value={stockInForm.data.InventoryID}
												onChange={(e) =>
													stockInForm.setData("InventoryID", e.target.value)
												}
												required
												className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#D97736] focus:ring-[#D97736] sm:text-sm"
											>
												<option value="">Select an Item</option>
												{inventory?.map((item) => (
													<option key={item.ID} value={item.ID}>
														{item.ItemName} ({item.Quantity} {item.Measurement}{" "}
														on hand)
													</option>
												))}
											</select>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700">
												Supplier
											</label>
											<input
												type="text"
												value={stockInForm.data.Supplier}
												onChange={(e) =>
													stockInForm.setData("Supplier", e.target.value)
												}
												required
												className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#D97736] focus:ring-[#D97736] sm:text-sm"
											/>
										</div>
										<div className="grid grid-cols-2 gap-4">
											<div>
												<label className="block text-sm font-medium text-gray-700">
													Price Per Unit (₱)
												</label>
												<input
													type="number"
													step="0.01"
													value={stockInForm.data.PricePerUnit}
													onChange={(e) =>
														stockInForm.setData("PricePerUnit", e.target.value)
													}
													required
													className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#D97736] focus:ring-[#D97736] sm:text-sm"
												/>
											</div>
											<div>
												<label className="block text-sm font-medium text-gray-700">
													Quantity Added
												</label>
												<input
													type="number"
													value={stockInForm.data.QuantityAdded}
													onChange={(e) =>
														stockInForm.setData("QuantityAdded", e.target.value)
													}
													min="1"
													required
													className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#D97736] focus:ring-[#D97736] sm:text-sm"
												/>
											</div>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700">
												Additional Details
											</label>
											<textarea
												value={stockInForm.data.AdditionalDetails}
												onChange={(e) =>
													stockInForm.setData(
														"AdditionalDetails",
														e.target.value,
													)
												}
												rows={2}
												className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#D97736] focus:ring-[#D97736] sm:text-sm"
												placeholder="OR#, Lot#, etc."
											/>
										</div>
									</div>
								</div>
								<div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
									<button
										type="submit"
										disabled={stockInForm.processing}
										className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#D97736] text-base font-medium text-white hover:bg-[#c2682e] sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
									>
										Record Stock-In
									</button>
									<button
										type="button"
										onClick={() => setIsStockInModalOpen(false)}
										className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
									>
										Cancel
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			)}

			{/* Stock-Out Modal */}
			{isStockOutModalOpen && (
				<div
					className="fixed inset-0 z-50 overflow-y-auto"
					aria-modal="true"
					role="dialog"
				>
					<div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
						<div
							className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
							onClick={() => setIsStockOutModalOpen(false)}
						/>
						<div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
							<form onSubmit={submitStockOut}>
								<div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
									<h3 className="text-lg font-medium text-gray-900 border-b pb-3">
										Stock-Out (Usage)
									</h3>
									<div className="mt-4 space-y-4">
										<div>
											<label className="block text-sm font-medium text-gray-700">
												Select Item
											</label>
											<select
												value={stockOutForm.data.InventoryID}
												onChange={(e) =>
													stockOutForm.setData("InventoryID", e.target.value)
												}
												required
												className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#D97736] focus:ring-[#D97736] sm:text-sm"
											>
												<option value="">Select an Item</option>
												{inventory?.map((item) => (
													<option
														key={item.ID}
														value={item.ID}
														disabled={item.Quantity <= 0}
													>
														{item.ItemName} ({item.Quantity} {item.Measurement}{" "}
														available)
													</option>
												))}
											</select>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700">
												Quantity to Remove
											</label>
											<input
												type="number"
												value={stockOutForm.data.QuantityRemoved}
												onChange={(e) =>
													stockOutForm.setData(
														"QuantityRemoved",
														e.target.value,
													)
												}
												min="1"
												max={
													inventory?.find(
														(i) => i.ID == stockOutForm.data.InventoryID,
													)?.Quantity
												}
												required
												className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#D97736] focus:ring-[#D97736] sm:text-sm"
											/>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700">
												Reason
											</label>
											<select
												value={stockOutForm.data.Reason}
												onChange={(e) =>
													stockOutForm.setData("Reason", e.target.value)
												}
												required
												className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#D97736] focus:ring-[#D97736] sm:text-sm"
											>
												<option value="">Select Reason</option>
												<option value="Kitchen Usage">Kitchen Usage</option>
												<option value="Damaged/Spoiled">Damaged/Spoiled</option>
												<option value="Inventory Correction">
													Inventory Correction
												</option>
												<option value="Expired">Expired</option>
											</select>
										</div>
									</div>
								</div>
								<div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
									<button
										type="submit"
										disabled={stockOutForm.processing}
										className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#D97736] text-base font-medium text-white hover:bg-[#c2682e] sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
									>
										Record Stock-Out
									</button>
									<button
										type="button"
										onClick={() => setIsStockOutModalOpen(false)}
										className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
									>
										Cancel
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			)}

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
