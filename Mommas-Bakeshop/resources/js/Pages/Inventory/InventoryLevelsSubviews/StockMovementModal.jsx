import React, { useEffect, useMemo, useState } from "react";

const money = (value) => Number(value || 0).toFixed(2);

export const createDefaultStockInDraft = () => ({
	details: {
		Supplier: "",
		Source: "Purchased",
		PurchaseDate: "",
		ReceiptNumber: "",
		InvoiceNumber: "",
		AdditionalDetails: "",
	},
	inventoryMode: "existing",
	productMode: "existing",
	inventoryInputs: {},
	productInputs: {},
	newInventory: {
		ItemName: "",
		ItemDescription: "",
		ItemType: "Raw Material",
		Measurement: "",
		LowCountThreshold: 10,
		QuantityAdded: "",
		UnitCost: "",
	},
	newProduct: {
		ProductName: "",
		ProductDescription: "",
		CategoryID: "",
		LowStockThreshold: 10,
		QuantityAdded: "",
		UnitCost: "",
	},
	inventoryLines: [],
	productLines: [],
});

function hasInProgress(draft) {
	return (
		draft.inventoryLines.length > 0 ||
		draft.productLines.length > 0 ||
		Object.values(draft.details).some((v) => String(v || "").trim() !== "")
	);
}

function StockInMovementModal({
	show,
	draft,
	setDraft,
	inventory,
	products,
	categories,
	processing,
	errors,
	onRecord,
	onSaveAndClose,
	onCancelAndClear,
	title = "Stock-In Batch",
	submitLabel = "Record Stock-In",
}) {
	const [showExitWarning, setShowExitWarning] = useState(false);
	const [editingLine, setEditingLine] = useState(null);
	const [inventorySearch, setInventorySearch] = useState("");
	const [productSearch, setProductSearch] = useState("");

	useEffect(() => {
		if (!errors) return;
		const messages = Object.values(errors)
			.flatMap((v) => (Array.isArray(v) ? v : [v]))
			.filter(Boolean)
			.map(String);

		if (messages.length > 0) {
			window.dispatchEvent(
				new CustomEvent("app-toast", {
					detail: { type: "error", messages },
				}),
			);
		}
	}, [errors]);

	const purchasedProducts = useMemo(
		() =>
			(products || []).filter(
				(p) => String(p.ProductFrom || "").toLowerCase() === "purchased",
			),
		[products],
	);

	const filteredInventoryItems = useMemo(() => {
		const query = inventorySearch.trim().toLowerCase();
		if (!query) return inventory || [];
		return (inventory || []).filter(
			(item) =>
				item.ItemName?.toLowerCase().includes(query) ||
				item.Measurement?.toLowerCase().includes(query),
		);
	}, [inventory, inventorySearch]);

	const filteredPurchasedProducts = useMemo(() => {
		const query = productSearch.trim().toLowerCase();
		if (!query) return purchasedProducts;
		return purchasedProducts.filter(
			(item) =>
				item.ProductName?.toLowerCase().includes(query) ||
				item.category?.CategoryName?.toLowerCase().includes(query),
		);
	}, [purchasedProducts, productSearch]);

	const allLines = [...draft.inventoryLines, ...draft.productLines];
	const totalAmount = allLines.reduce(
		(sum, line) => sum + Number(line.SubAmount || 0),
		0,
	);

	const updateDraft = (path, value) => {
		setDraft((prev) => {
			const next = { ...prev };
			if (path.startsWith("details.")) {
				next.details = { ...prev.details, [path.replace("details.", "")]: value };
				return next;
			}
			if (path.startsWith("newInventory.")) {
				next.newInventory = {
					...prev.newInventory,
					[path.replace("newInventory.", "")]: value,
				};
				return next;
			}
			if (path.startsWith("newProduct.")) {
				next.newProduct = {
					...prev.newProduct,
					[path.replace("newProduct.", "")]: value,
				};
				return next;
			}
			next[path] = value;
			return next;
		});
	};

	const setInputValue = (group, id, field, value) => {
		setDraft((prev) => ({
			...prev,
			[group]: {
				...prev[group],
				[id]: {
					...(prev[group][id] || { QuantityAdded: "", UnitCost: "" }),
					[field]: value,
				},
			},
		}));
	};

	const addInventoryExisting = (item) => {
		const row = draft.inventoryInputs[item.ID] || {};
		const issues = [];
		if (!String(row.QuantityAdded ?? "").trim()) issues.push(`"${item.ItemName}": Quantity is required.`);
		if (!String(row.UnitCost ?? "").trim()) issues.push(`"${item.ItemName}": Unit cost is required.`);
		const qty = Number(row.QuantityAdded || 0);
		const unitCost = Number(row.UnitCost || 0);
		if (qty <= 0) issues.push(`"${item.ItemName}": Quantity must be greater than 0.`);
		if (unitCost < 0) issues.push(`"${item.ItemName}": Unit cost cannot be negative.`);
		if (issues.length > 0) {
			showValidationToast(issues);
			return;
		}

		setDraft((prev) => ({
			...prev,
			inventoryLines: [
				...prev.inventoryLines,
				{
					key: `inv-${item.ID}-${Date.now()}`,
					ItemType: "Inventory",
					InventoryID: item.ID,
					ItemName: item.ItemName,
					Measurement: item.Measurement,
					QuantityAdded: qty,
					UnitCost: unitCost,
					SubAmount: qty * unitCost,
				},
			],
			inventoryInputs: {
				...prev.inventoryInputs,
				[item.ID]: { QuantityAdded: "", UnitCost: "" },
			},
		}));
	};

	const addInventoryNew = () => {
		const ni = draft.newInventory;
		const issues = [];
		if (!String(ni.ItemName || "").trim()) issues.push("New Inventory: Item Name is required.");
		if (!String(ni.Measurement || "").trim()) issues.push("New Inventory: Measurement is required.");
		if (!String(ni.QuantityAdded || "").trim()) issues.push("New Inventory: Quantity is required.");
		if (!String(ni.UnitCost || "").trim()) issues.push("New Inventory: Unit cost is required.");
		const qty = Number(ni.QuantityAdded || 0);
		const unitCost = Number(ni.UnitCost || 0);
		if (qty <= 0) issues.push("New Inventory: Quantity must be greater than 0.");
		if (unitCost < 0) issues.push("New Inventory: Unit cost cannot be negative.");
		if (issues.length > 0) {
			showValidationToast(issues);
			return;
		}

		setDraft((prev) => ({
			...prev,
			inventoryLines: [
				...prev.inventoryLines,
				{
					key: `new-inv-${Date.now()}`,
					ItemType: "Inventory",
					ItemName: ni.ItemName,
					Measurement: ni.Measurement,
					QuantityAdded: qty,
					UnitCost: unitCost,
					SubAmount: qty * unitCost,
					CreateInventory: {
						ItemName: ni.ItemName,
						ItemDescription: ni.ItemDescription,
						ItemType: ni.ItemType,
						Measurement: ni.Measurement,
						LowCountThreshold: Number(ni.LowCountThreshold || 10),
					},
				},
			],
			newInventory: {
				...prev.newInventory,
				ItemName: "",
				ItemDescription: "",
				Measurement: "",
				QuantityAdded: "",
				UnitCost: "",
			},
		}));
	};

	const addProductExisting = (item) => {
		const row = draft.productInputs[item.ID] || {};
		const issues = [];
		if (!String(row.QuantityAdded ?? "").trim()) issues.push(`"${item.ProductName}": Quantity is required.`);
		if (!String(row.UnitCost ?? "").trim()) issues.push(`"${item.ProductName}": Unit cost is required.`);
		const qty = Number(row.QuantityAdded || 0);
		const unitCost = Number(row.UnitCost || 0);
		if (qty <= 0) issues.push(`"${item.ProductName}": Quantity must be greater than 0.`);
		if (unitCost < 0) issues.push(`"${item.ProductName}": Unit cost cannot be negative.`);
		if (issues.length > 0) {
			showValidationToast(issues);
			return;
		}

		setDraft((prev) => ({
			...prev,
			productLines: [
				...prev.productLines,
				{
					key: `prod-${item.ID}-${Date.now()}`,
					ItemType: "Product",
					ProductID: item.ID,
					ItemName: item.ProductName,
					QuantityAdded: qty,
					UnitCost: unitCost,
					SubAmount: qty * unitCost,
				},
			],
			productInputs: {
				...prev.productInputs,
				[item.ID]: { QuantityAdded: "", UnitCost: "" },
			},
		}));
	};

	const addProductNew = () => {
		const np = draft.newProduct;
		const issues = [];
		if (!String(np.ProductName || "").trim()) issues.push("New Product: Product Name is required.");
		if (!String(np.CategoryID || "").trim()) issues.push("New Product: Category is required.");
		if (!String(np.QuantityAdded || "").trim()) issues.push("New Product: Quantity is required.");
		if (!String(np.UnitCost || "").trim()) issues.push("New Product: Unit cost is required.");
		const qty = Number(np.QuantityAdded || 0);
		const unitCost = Number(np.UnitCost || 0);
		if (qty <= 0) issues.push("New Product: Quantity must be greater than 0.");
		if (unitCost < 0) issues.push("New Product: Unit cost cannot be negative.");
		if (issues.length > 0) {
			showValidationToast(issues);
			return;
		}

		setDraft((prev) => ({
			...prev,
			productLines: [
				...prev.productLines,
				{
					key: `new-prod-${Date.now()}`,
					ItemType: "Product",
					ItemName: np.ProductName,
					QuantityAdded: qty,
					UnitCost: unitCost,
					SubAmount: qty * unitCost,
					CreateProduct: {
						ProductName: np.ProductName,
						ProductDescription: np.ProductDescription,
						CategoryID: Number(np.CategoryID),
						LowStockThreshold: Number(np.LowStockThreshold || 10),
						Price: unitCost,
					},
				},
			],
			newProduct: {
				...prev.newProduct,
				ProductName: "",
				ProductDescription: "",
				CategoryID: "",
				QuantityAdded: "",
				UnitCost: "",
			},
		}));
	};

	const removeLine = (group, key) => {
		setDraft((prev) => ({
			...prev,
			[group]: prev[group].filter((line) => line.key !== key),
		}));
	};

	const beginEditLine = (group, line) => {
		setEditingLine({
			group,
			originalKey: line.key,
			...JSON.parse(JSON.stringify(line)),
		});
	};

	const saveEditLine = () => {
		if (!editingLine) return;
		const qty = Number(editingLine.QuantityAdded || 0);
		const unitCost = Number(editingLine.UnitCost || 0);
		const issues = [];
		if (qty <= 0) issues.push("Edit line: Quantity must be greater than 0.");
		if (unitCost < 0) issues.push("Edit line: Unit cost cannot be negative.");
		if (issues.length > 0) {
			showValidationToast(issues);
			return;
		}

		const nextLine = {
			...editingLine,
			QuantityAdded: qty,
			UnitCost: unitCost,
			SubAmount: qty * unitCost,
			key: editingLine.originalKey,
		};

		if (nextLine.CreateInventory) {
			nextLine.CreateInventory = {
				...nextLine.CreateInventory,
				ItemName: nextLine.ItemName,
				Measurement: nextLine.Measurement,
			};
		}
		if (nextLine.CreateProduct) {
			nextLine.CreateProduct = {
				...nextLine.CreateProduct,
				ProductName: nextLine.ItemName,
				Price: unitCost,
			};
		}

		setDraft((prev) => ({
			...prev,
			[editingLine.group]: prev[editingLine.group].map((line) =>
				line.key === editingLine.originalKey ? nextLine : line,
			),
		}));
		setEditingLine(null);
	};

	const validateBeforeSubmit = () => {
		const messages = [];
		if (!String(draft.details.Supplier || "").trim()) {
			messages.push("Supplier is required.");
		}
		if (allLines.length === 0) {
			messages.push("Add at least one inventory/product line item.");
		}
		allLines.forEach((line, idx) => {
			if (Number(line.QuantityAdded || 0) <= 0) {
				messages.push(`Line ${idx + 1}: Quantity must be greater than 0.`);
			}
			if (Number(line.UnitCost || 0) < 0) {
				messages.push(`Line ${idx + 1}: Unit cost cannot be negative.`);
			}
		});
		return messages;
	};

	const submitRecord = (e) => {
		e.preventDefault();
		const messages = validateBeforeSubmit();
		if (messages.length > 0) {
			showValidationToast(messages);
			return;
		}

		onRecord({
			Supplier: draft.details.Supplier,
			Source: draft.details.Source || "Purchased",
			PurchaseDate: draft.details.PurchaseDate || null,
			ReceiptNumber: draft.details.ReceiptNumber || null,
			InvoiceNumber: draft.details.InvoiceNumber || null,
			AdditionalDetails: draft.details.AdditionalDetails || null,
			items: allLines.map((line) => ({
				ItemType: line.ItemType,
				InventoryID: line.InventoryID || null,
				ProductID: line.ProductID || null,
				QuantityAdded: Number(line.QuantityAdded),
				SubAmount: Number(line.SubAmount),
				CreateInventory: line.CreateInventory || null,
				CreateProduct: line.CreateProduct || null,
			})),
		});
	};

	const attemptClose = () => {
		if (!hasInProgress(draft)) {
			onCancelAndClear();
			return;
		}
		setShowExitWarning(true);
	};

	if (!show) return null;

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto">
			<div className="flex min-h-screen items-center justify-center p-4">
				<div className="fixed inset-0 bg-gray-500/75" onClick={attemptClose} />

				<form
					onSubmit={submitRecord}
					className="relative w-full max-w-7xl rounded-lg bg-white shadow-xl"
				>
					<div className="border-b px-6 py-4">
						<h3 className="text-lg font-semibold text-gray-900">{title}</h3>
					</div>

					<div className="grid gap-4 p-6 lg:grid-cols-3">
						<div className="rounded-lg border p-4">
							<h4 className="mb-3 font-semibold">Inventory Items</h4>
							<div className="mb-3 h-44 overflow-y-auto rounded border p-2 text-sm">
								{draft.inventoryLines.length === 0 && (
									<div className="text-gray-500">No inventory items yet.</div>
								)}
								{draft.inventoryLines.map((line) => (
									<div key={line.key} className="mb-2 rounded border p-2">
										<div className="font-medium">{line.ItemName}</div>
										<div>
											{line.QuantityAdded} {line.Measurement || "units"} x {money(line.UnitCost)} ={" "}
											{money(line.SubAmount)}
										</div>
										<div className="mt-1 flex gap-2">
											<button
												type="button"
												onClick={() => beginEditLine("inventoryLines", line)}
												className="text-xs text-blue-600"
											>
												Edit
											</button>
											<button
												type="button"
												onClick={() => removeLine("inventoryLines", line.key)}
												className="text-xs text-red-600"
											>
												Delete
											</button>
										</div>
									</div>
								))}
							</div>

							<div className="rounded border p-3">
								<select
									value={draft.inventoryMode}
									onChange={(e) => updateDraft("inventoryMode", e.target.value)}
									className="mb-3 w-full rounded border-gray-300 text-sm"
								>
									<option value="existing">Select existing items</option>
									<option value="create">Create new item</option>
								</select>

								{draft.inventoryMode === "existing" ? (
									<div className="max-h-56 space-y-2 overflow-y-auto">
										<input
											type="text"
											value={inventorySearch}
											onChange={(e) => setInventorySearch(e.target.value)}
											placeholder="Search inventory items..."
											className="w-full rounded border-gray-300 text-sm"
										/>
										{filteredInventoryItems.map((item) => (
											<div key={item.ID} className="rounded border p-2 text-sm">
												<div className="font-medium">{item.ItemName}</div>
												<div className="mb-2 text-xs text-gray-500">{item.Measurement}</div>
												<div className="flex flex-wrap items-center gap-2">
													<input
														type="number"
														min="1"
														placeholder="Qty"
														value={draft.inventoryInputs[item.ID]?.QuantityAdded || ""}
														onChange={(e) =>
															setInputValue("inventoryInputs", item.ID, "QuantityAdded", e.target.value)
														}
														className="min-w-0 flex-1 rounded border-gray-300 text-sm"
													/>
													<input
														type="number"
														step="0.01"
														min="0"
														placeholder="Unit Cost"
														value={draft.inventoryInputs[item.ID]?.UnitCost || ""}
														onChange={(e) =>
															setInputValue("inventoryInputs", item.ID, "UnitCost", e.target.value)
														}
														className="min-w-0 flex-1 rounded border-gray-300 text-sm"
													/>
													<button
														type="button"
														onClick={() => addInventoryExisting(item)}
														className="w-full rounded bg-primary px-3 py-2 text-xs text-white sm:w-auto"
													>
														Add
													</button>
												</div>
											</div>
										))}
										{filteredInventoryItems.length === 0 && (
											<div className="text-xs text-gray-500">No inventory item match found.</div>
										)}
									</div>
								) : (
									<div className="space-y-2 text-sm">
										<input type="text" placeholder="Item Name" value={draft.newInventory.ItemName} onChange={(e) => updateDraft("newInventory.ItemName", e.target.value)} className="w-full rounded border-gray-300" />
										<input type="text" placeholder="Item Description" value={draft.newInventory.ItemDescription} onChange={(e) => updateDraft("newInventory.ItemDescription", e.target.value)} className="w-full rounded border-gray-300" />
										<input type="text" placeholder="Measurement" value={draft.newInventory.Measurement} onChange={(e) => updateDraft("newInventory.Measurement", e.target.value)} className="w-full rounded border-gray-300" />
										<div className="grid grid-cols-2 gap-2">
											<input type="number" min="1" placeholder="Qty" value={draft.newInventory.QuantityAdded} onChange={(e) => updateDraft("newInventory.QuantityAdded", e.target.value)} className="rounded border-gray-300" />
											<input type="number" step="0.01" min="0" placeholder="Unit Cost" value={draft.newInventory.UnitCost} onChange={(e) => updateDraft("newInventory.UnitCost", e.target.value)} className="rounded border-gray-300" />
										</div>
										<button type="button" onClick={addInventoryNew} className="rounded bg-primary px-3 py-1 text-white">Add New Inventory Item</button>
									</div>
								)}
							</div>
						</div>

						<div className="rounded-lg border p-4">
							<h4 className="mb-3 font-semibold">Product Items</h4>
							<div className="mb-3 h-44 overflow-y-auto rounded border p-2 text-sm">
								{draft.productLines.length === 0 && <div className="text-gray-500">No product items yet.</div>}
								{draft.productLines.map((line) => (
									<div key={line.key} className="mb-2 rounded border p-2">
										<div className="font-medium">{line.ItemName}</div>
										<div>{line.QuantityAdded} units x {money(line.UnitCost)} = {money(line.SubAmount)}</div>
										<div className="mt-1 flex gap-2">
											<button type="button" onClick={() => beginEditLine("productLines", line)} className="text-xs text-blue-600">Edit</button>
											<button type="button" onClick={() => removeLine("productLines", line.key)} className="text-xs text-red-600">Delete</button>
										</div>
									</div>
								))}
							</div>
							<div className="rounded border p-3">
								<select value={draft.productMode} onChange={(e) => updateDraft("productMode", e.target.value)} className="mb-3 w-full rounded border-gray-300 text-sm">
									<option value="existing">Select existing items</option>
									<option value="create">Create new item</option>
								</select>
								{draft.productMode === "existing" ? (
									<div className="max-h-56 space-y-2 overflow-y-auto">
										<input
											type="text"
											value={productSearch}
											onChange={(e) => setProductSearch(e.target.value)}
											placeholder="Search purchased products..."
											className="w-full rounded border-gray-300 text-sm"
										/>
										{filteredPurchasedProducts.map((item) => (
											<div key={item.ID} className="rounded border p-2 text-sm">
												<div className="font-medium">{item.ProductName}</div>
												<div className="flex flex-wrap items-center gap-2">
													<input type="number" min="1" placeholder="Qty" value={draft.productInputs[item.ID]?.QuantityAdded || ""} onChange={(e) => setInputValue("productInputs", item.ID, "QuantityAdded", e.target.value)} className="min-w-0 flex-1 rounded border-gray-300 text-sm" />
													<input type="number" step="0.01" min="0" placeholder="Unit Cost" value={draft.productInputs[item.ID]?.UnitCost || ""} onChange={(e) => setInputValue("productInputs", item.ID, "UnitCost", e.target.value)} className="min-w-0 flex-1 rounded border-gray-300 text-sm" />
													<button type="button" onClick={() => addProductExisting(item)} className="w-full rounded bg-primary px-3 py-2 text-xs text-white sm:w-auto">Add</button>
												</div>
											</div>
										))}
										{filteredPurchasedProducts.length === 0 && (
											<div className="text-xs text-gray-500">No purchased product match found.</div>
										)}
									</div>
								) : (
									<div className="space-y-2 text-sm">
										<input type="text" placeholder="Product Name" value={draft.newProduct.ProductName} onChange={(e) => updateDraft("newProduct.ProductName", e.target.value)} className="w-full rounded border-gray-300" />
										<select value={draft.newProduct.CategoryID} onChange={(e) => updateDraft("newProduct.CategoryID", e.target.value)} className="w-full rounded border-gray-300">
											<option value="">Select Category</option>
											{(categories || []).map((cat) => (
												<option key={cat.ID} value={cat.ID}>{cat.CategoryName}</option>
											))}
										</select>
										<input type="text" placeholder="Product Description" value={draft.newProduct.ProductDescription} onChange={(e) => updateDraft("newProduct.ProductDescription", e.target.value)} className="w-full rounded border-gray-300" />
										<div className="grid grid-cols-2 gap-2">
											<input type="number" min="1" placeholder="Qty" value={draft.newProduct.QuantityAdded} onChange={(e) => updateDraft("newProduct.QuantityAdded", e.target.value)} className="rounded border-gray-300" />
											<input type="number" step="0.01" min="0" placeholder="Unit Cost" value={draft.newProduct.UnitCost} onChange={(e) => updateDraft("newProduct.UnitCost", e.target.value)} className="rounded border-gray-300" />
										</div>
										<button type="button" onClick={addProductNew} className="rounded bg-primary px-3 py-1 text-white">Add New Product</button>
									</div>
								)}
							</div>
						</div>

						<div className="rounded-lg border p-4">
							<h4 className="mb-3 font-semibold">Details</h4>
							<div className="space-y-2 text-sm">
								<input type="text" placeholder="Supplier" value={draft.details.Supplier} onChange={(e) => updateDraft("details.Supplier", e.target.value)} className="w-full rounded border-gray-300" />
								<select value={draft.details.Source || "Purchased"} onChange={(e) => updateDraft("details.Source", e.target.value)} className="w-full rounded border-gray-300">
									<option value="Purchased">Purchased</option>
									<option value="Business">Business</option>
									<option value="Donation">Donation</option>
								</select>
								<input type="date" value={draft.details.PurchaseDate} onChange={(e) => updateDraft("details.PurchaseDate", e.target.value)} className="w-full rounded border-gray-300" />
								<input type="text" placeholder="Receipt Number" value={draft.details.ReceiptNumber} onChange={(e) => updateDraft("details.ReceiptNumber", e.target.value)} className="w-full rounded border-gray-300" />
								<input type="text" placeholder="Invoice Number" value={draft.details.InvoiceNumber} onChange={(e) => updateDraft("details.InvoiceNumber", e.target.value)} className="w-full rounded border-gray-300" />
								<textarea placeholder="Additional Details" value={draft.details.AdditionalDetails} onChange={(e) => updateDraft("details.AdditionalDetails", e.target.value)} className="w-full rounded border-gray-300" rows={3} />
								<div className="rounded bg-gray-50 p-3">
									<div className="text-gray-600">Total Amount</div>
									<div className="text-xl font-bold">PHP {money(totalAmount)}</div>
								</div>
							</div>
						</div>
					</div>

					<div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-3">
						<button type="button" onClick={attemptClose} className="rounded border border-primary bg-white px-4 py-2 text-sm text-primary hover:bg-primary-soft">Cancel</button>
						<button type="button" onClick={() => onSaveAndClose(draft)} className="rounded border border-primary bg-white px-4 py-2 text-sm text-primary hover:bg-primary-soft">Save and Close</button>
						<button type="submit" disabled={processing || allLines.length === 0} className="rounded bg-primary px-4 py-2 text-sm text-white disabled:opacity-50">{submitLabel}</button>
					</div>
				</form>
			</div>

			{editingLine && (
				<div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-gray-500/75" />
					<div className="relative w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
						<h4 className="text-lg font-semibold mb-3">Edit Line Item</h4>
						<div className="space-y-2 text-sm">
							{editingLine.CreateInventory && (
								<>
									<input className="w-full rounded border-gray-300" value={editingLine.ItemName} onChange={(e) => setEditingLine((p) => ({ ...p, ItemName: e.target.value }))} placeholder="Item Name" />
									<input className="w-full rounded border-gray-300" value={editingLine.Measurement || ""} onChange={(e) => setEditingLine((p) => ({ ...p, Measurement: e.target.value }))} placeholder="Measurement" />
								</>
							)}
							{editingLine.CreateProduct && (
								<>
									<input className="w-full rounded border-gray-300" value={editingLine.ItemName} onChange={(e) => setEditingLine((p) => ({ ...p, ItemName: e.target.value }))} placeholder="Product Name" />
									<select className="w-full rounded border-gray-300" value={editingLine.CreateProduct.CategoryID || ""} onChange={(e) => setEditingLine((p) => ({ ...p, CreateProduct: { ...p.CreateProduct, CategoryID: Number(e.target.value) } }))}>
										<option value="">Select Category</option>
										{(categories || []).map((cat) => (
											<option key={cat.ID} value={cat.ID}>{cat.CategoryName}</option>
										))}
									</select>
								</>
							)}
							<div className="grid grid-cols-2 gap-2">
								<input type="number" min="1" className="rounded border-gray-300" value={editingLine.QuantityAdded} onChange={(e) => setEditingLine((p) => ({ ...p, QuantityAdded: e.target.value }))} placeholder="Quantity" />
								<input type="number" min="0" step="0.01" className="rounded border-gray-300" value={editingLine.UnitCost} onChange={(e) => setEditingLine((p) => ({ ...p, UnitCost: e.target.value }))} placeholder="Unit Cost" />
							</div>
						</div>
						<div className="mt-4 flex justify-end gap-2">
							<button type="button" className="rounded border border-primary bg-white px-3 py-2 text-sm text-primary hover:bg-primary-soft" onClick={() => setEditingLine(null)}>Cancel</button>
							<button type="button" className="rounded bg-primary px-3 py-2 text-sm text-white" onClick={saveEditLine}>Save Changes</button>
						</div>
					</div>
				</div>
			)}

			{showExitWarning && (
				<div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-gray-500/75" />
					<div className="relative w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
						<h4 className="text-lg font-semibold">Unsaved Stock-In Progress</h4>
						<p className="mt-2 text-sm text-gray-600">You have draft changes. What do you want to do?</p>
						<div className="mt-4 flex flex-wrap justify-end gap-2">
							<button type="button" onClick={() => { setShowExitWarning(false); onCancelAndClear(); }} className="rounded border border-red-300 px-3 py-2 text-sm text-red-600">Confirm Exit</button>
							<button type="button" onClick={() => { setShowExitWarning(false); onSaveAndClose(draft); }} className="rounded border border-primary bg-white px-3 py-2 text-sm text-primary hover:bg-primary-soft">Save and Exit</button>
							<button type="button" onClick={() => setShowExitWarning(false)} className="rounded border border-primary bg-white px-3 py-2 text-sm text-primary hover:bg-primary-soft">Continue</button>
						</div>
					</div>
				</div>
			)}

		</div>
	);
}

export const createDefaultStockOutDraft = () => ({
	details: {
		Source: "Business",
		ReasonType: "",
		ReasonNote: "",
	},
	inventoryInputs: {},
	productInputs: {},
	inventoryLines: [],
	productLines: [],
});

function showValidationToast(messages) {
	window.dispatchEvent(
		new CustomEvent("app-toast", {
			detail: { type: "error", messages },
		}),
	);
}

function hasOutProgress(draft) {
	return (
		draft.inventoryLines.length > 0 ||
		draft.productLines.length > 0 ||
		String(draft.details?.ReasonType || "").trim() !== "" ||
		String(draft.details?.ReasonNote || "").trim() !== ""
	);
}

export default function StockMovementModal({
	mode = "in",
	show,
	draft,
	setDraft,
	inventory,
	products,
	categories,
	processing,
	errors,
	onRecord,
	onSaveAndClose,
	onCancelAndClear,
	title,
	submitLabel,
}) {
	if (mode === "in") {
		return <StockInMovementModal {...{ show, draft, setDraft, inventory, products, categories, processing, errors, onRecord, onSaveAndClose, onCancelAndClear, title, submitLabel }} />;
	}

	const [showExitWarning, setShowExitWarning] = useState(false);
	const [editingLine, setEditingLine] = useState(null);
	const [inventorySearch, setInventorySearch] = useState("");
	const [productSearch, setProductSearch] = useState("");

	useEffect(() => {
		if (!errors) return;
		const messages = Object.values(errors)
			.flatMap((v) => (Array.isArray(v) ? v : [v]))
			.filter(Boolean)
			.map(String);
		if (messages.length) {
			showValidationToast(messages);
		}
	}, [errors]);

	const filteredInventoryItems = useMemo(() => {
		const query = inventorySearch.trim().toLowerCase();
		return (inventory || []).filter((item) => {
			if (Number(item.Quantity || 0) <= 0) return false;
			if (!query) return true;
			return (
				item.ItemName?.toLowerCase().includes(query) ||
				item.Measurement?.toLowerCase().includes(query)
			);
		});
	}, [inventory, inventorySearch]);

	const filteredProducts = useMemo(() => {
		const query = productSearch.trim().toLowerCase();
		return (products || []).filter((item) => {
			if (Number(item.Quantity || 0) <= 0) return false;
			if (!query) return true;
			return (
				item.ProductName?.toLowerCase().includes(query) ||
				item.category?.CategoryName?.toLowerCase().includes(query)
			);
		});
	}, [products, productSearch]);

	const allLines = [...(draft.inventoryLines || []), ...(draft.productLines || [])];
	const totalItems = allLines.reduce(
		(sum, line) => sum + Number(line.QuantityRemoved || 0),
		0,
	);

	const setInputValue = (group, id, value) => {
		setDraft((prev) => ({
			...prev,
			[group]: {
				...prev[group],
				[id]: { QuantityRemoved: value },
			},
		}));
	};

	const addInventoryItem = (item) => {
		const row = draft.inventoryInputs[item.ID] || {};
		const qty = Number(row.QuantityRemoved || 0);
		const issues = [];
		if (!String(row.QuantityRemoved ?? "").trim()) issues.push(`"${item.ItemName}": Quantity is required.`);
		if (qty <= 0) issues.push(`"${item.ItemName}": Quantity must be greater than 0.`);
		if (issues.length) {
			showValidationToast(issues);
			return;
		}

		setDraft((prev) => ({
			...prev,
			inventoryLines: [
				...prev.inventoryLines,
				{
					key: `out-inv-${item.ID}-${Date.now()}`,
					ItemType: "Inventory",
					InventoryID: item.ID,
					ItemName: item.ItemName,
					QuantityRemoved: qty,
				},
			],
			inventoryInputs: {
				...prev.inventoryInputs,
				[item.ID]: { QuantityRemoved: "" },
			},
		}));
	};

	const addProductItem = (item) => {
		const row = draft.productInputs[item.ID] || {};
		const qty = Number(row.QuantityRemoved || 0);
		const issues = [];
		if (!String(row.QuantityRemoved ?? "").trim()) issues.push(`"${item.ProductName}": Quantity is required.`);
		if (qty <= 0) issues.push(`"${item.ProductName}": Quantity must be greater than 0.`);
		if (issues.length) {
			showValidationToast(issues);
			return;
		}

		setDraft((prev) => ({
			...prev,
			productLines: [
				...prev.productLines,
				{
					key: `out-prod-${item.ID}-${Date.now()}`,
					ItemType: "Product",
					ProductID: item.ID,
					ItemName: item.ProductName,
					QuantityRemoved: qty,
				},
			],
			productInputs: {
				...prev.productInputs,
				[item.ID]: { QuantityRemoved: "" },
			},
		}));
	};

	const removeLine = (group, key) => {
		setDraft((prev) => ({
			...prev,
			[group]: prev[group].filter((line) => line.key !== key),
		}));
	};

	const beginEditLine = (group, line) => {
		setEditingLine({ group, originalKey: line.key, ...line });
	};

	const saveEditLine = () => {
		if (!editingLine) return;
		const qty = Number(editingLine.QuantityRemoved || 0);
		if (qty <= 0) {
			showValidationToast(["Edit line: Quantity must be greater than 0."]);
			return;
		}

		setDraft((prev) => ({
			...prev,
			[editingLine.group]: prev[editingLine.group].map((line) =>
				line.key === editingLine.originalKey
					? { ...line, QuantityRemoved: qty }
					: line,
			),
		}));
		setEditingLine(null);
	};

	const submitRecord = (e) => {
		e.preventDefault();
		const issues = [];
		if (allLines.length === 0) {
			issues.push("Add at least one item.");
		}
		if (issues.length) {
			showValidationToast(issues);
			return;
		}

		onRecord({
			Source: draft.details?.Source || "Business",
			ReasonType: draft.details?.ReasonType || null,
			ReasonNote: draft.details?.ReasonNote || null,
			items: allLines.map((line) => ({
				ItemType: line.ItemType,
				InventoryID: line.InventoryID || null,
				ProductID: line.ProductID || null,
				QuantityRemoved: Number(line.QuantityRemoved),
			})),
		});
	};

	const attemptClose = () => {
		if (!hasOutProgress(draft)) {
			onCancelAndClear();
			return;
		}
		setShowExitWarning(true);
	};

	if (!show) return null;

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto">
			<div className="flex min-h-screen items-center justify-center p-4">
				<div className="fixed inset-0 bg-gray-500/75" onClick={attemptClose} />
				<form
					onSubmit={submitRecord}
					className="relative w-full max-w-7xl rounded-lg bg-white shadow-xl"
				>
					<div className="border-b px-6 py-4">
						<h3 className="text-lg font-semibold text-gray-900">
							{title || "Stock-Out Batch"}
						</h3>
					</div>

					<div className="grid gap-4 p-6 lg:grid-cols-3">
						<div className="rounded-lg border p-4">
							<h4 className="mb-3 font-semibold">Inventory Items</h4>
							<div className="mb-3 h-44 overflow-y-auto rounded border p-2 text-sm">
								{(draft.inventoryLines || []).length === 0 && (
									<div className="text-gray-500">No inventory items yet.</div>
								)}
								{(draft.inventoryLines || []).map((line) => (
									<div key={line.key} className="mb-2 rounded border p-2">
										<div className="font-medium">{line.ItemName}</div>
										<div>{line.ItemName} x{line.QuantityRemoved}</div>
										<div className="mt-1 flex gap-2">
											<button type="button" onClick={() => beginEditLine("inventoryLines", line)} className="text-xs text-blue-600">Edit</button>
											<button type="button" onClick={() => removeLine("inventoryLines", line.key)} className="text-xs text-red-600">Delete</button>
										</div>
									</div>
								))}
							</div>
							<div className="max-h-56 space-y-2 overflow-y-auto rounded border p-3">
								<input type="text" value={inventorySearch} onChange={(e) => setInventorySearch(e.target.value)} placeholder="Search inventory items..." className="w-full rounded border-gray-300 text-sm" />
								{filteredInventoryItems.map((item) => (
									<div key={item.ID} className="rounded border p-2 text-sm">
										<div className="font-medium">{item.ItemName}</div>
										<div className="mb-2 text-xs text-gray-500">
											{item.Measurement} | Available: {item.Quantity}
										</div>
										<div className="flex flex-wrap items-center gap-2">
											<input type="number" min="1" placeholder="Qty" value={draft.inventoryInputs?.[item.ID]?.QuantityRemoved || ""} onChange={(e) => setInputValue("inventoryInputs", item.ID, e.target.value)} className="min-w-0 flex-1 rounded border-gray-300 text-sm" />
											<button type="button" onClick={() => addInventoryItem(item)} className="shrink-0 rounded bg-primary px-3 py-2 text-xs text-white">Add</button>
										</div>
									</div>
								))}
							</div>
						</div>

						<div className="rounded-lg border p-4">
							<h4 className="mb-3 font-semibold">Product Items</h4>
							<div className="mb-3 h-44 overflow-y-auto rounded border p-2 text-sm">
								{(draft.productLines || []).length === 0 && (
									<div className="text-gray-500">No product items yet.</div>
								)}
								{(draft.productLines || []).map((line) => (
									<div key={line.key} className="mb-2 rounded border p-2">
										<div className="font-medium">{line.ItemName}</div>
										<div>{line.ItemName} x{line.QuantityRemoved}</div>
										<div className="mt-1 flex gap-2">
											<button type="button" onClick={() => beginEditLine("productLines", line)} className="text-xs text-blue-600">Edit</button>
											<button type="button" onClick={() => removeLine("productLines", line.key)} className="text-xs text-red-600">Delete</button>
										</div>
									</div>
								))}
							</div>
							<div className="max-h-56 space-y-2 overflow-y-auto rounded border p-3">
								<input type="text" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products..." className="w-full rounded border-gray-300 text-sm" />
								{filteredProducts.map((item) => (
									<div key={item.ID} className="rounded border p-2 text-sm">
										<div className="font-medium">{item.ProductName}</div>
										<div className="mb-2 text-xs text-gray-500">
											Available: {item.Quantity}
										</div>
										<div className="flex flex-wrap items-center gap-2">
											<input type="number" min="1" placeholder="Qty" value={draft.productInputs?.[item.ID]?.QuantityRemoved || ""} onChange={(e) => setInputValue("productInputs", item.ID, e.target.value)} className="min-w-0 flex-1 rounded border-gray-300 text-sm" />
											<button type="button" onClick={() => addProductItem(item)} className="shrink-0 rounded bg-primary px-3 py-2 text-xs text-white">Add</button>
										</div>
									</div>
								))}
							</div>
						</div>

						<div className="rounded-lg border p-4">
							<h4 className="mb-3 font-semibold">Details</h4>
							<div className="space-y-2 text-sm">
								<div className="rounded bg-gray-50 p-3">
									<div className="text-gray-600">Total Items</div>
									<div className="text-xl font-bold">{totalItems}</div>
								</div>
								<select
									value={draft.details?.Source || "Business"}
									onChange={(e) =>
										setDraft((prev) => ({
											...prev,
											details: { ...prev.details, Source: e.target.value },
										}))
									}
									className="w-full rounded border-gray-300"
								>
									<option value="Business">Business</option>
									<option value="Purchased">Purchased</option>
									<option value="Donation">Donation</option>
								</select>
								<select
									value={draft.details?.ReasonType || ""}
									onChange={(e) =>
										setDraft((prev) => ({
											...prev,
											details: { ...prev.details, ReasonType: e.target.value },
										}))
									}
									className="w-full rounded border-gray-300"
								>
									<option value="">Select Reason (Optional)</option>
									<option value="Kitchen Usage">Kitchen Usage</option>
									<option value="Damaged/Spoiled">Damaged/Spoiled</option>
									<option value="Inventory Correction">Inventory Correction</option>
									<option value="Expired">Expired</option>
								</select>
								<textarea
									rows={3}
									placeholder="Reason note (optional)"
									value={draft.details?.ReasonNote || ""}
									onChange={(e) =>
										setDraft((prev) => ({
											...prev,
											details: { ...prev.details, ReasonNote: e.target.value },
										}))
									}
									className="w-full rounded border-gray-300"
								/>
							</div>
						</div>
					</div>

					<div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-3">
						<button type="button" onClick={attemptClose} className="rounded border border-primary bg-white px-4 py-2 text-sm text-primary hover:bg-primary-soft">Cancel</button>
						<button type="button" onClick={() => onSaveAndClose(draft)} className="rounded border border-primary bg-white px-4 py-2 text-sm text-primary hover:bg-primary-soft">Save and Close</button>
						<button type="submit" disabled={processing || allLines.length === 0} className="rounded bg-primary px-4 py-2 text-sm text-white disabled:opacity-50">
							{submitLabel || "Record Stock-Out"}
						</button>
					</div>
				</form>
			</div>

			{editingLine && (
				<div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-gray-500/75" />
					<div className="relative w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
						<h4 className="mb-3 text-lg font-semibold">Edit Line Item</h4>
						<input type="number" min="1" className="w-full rounded border-gray-300 text-sm" value={editingLine.QuantityRemoved} onChange={(e) => setEditingLine((p) => ({ ...p, QuantityRemoved: e.target.value }))} />
						<div className="mt-4 flex justify-end gap-2">
							<button type="button" className="rounded border border-primary bg-white px-3 py-2 text-sm text-primary hover:bg-primary-soft" onClick={() => setEditingLine(null)}>Cancel</button>
							<button type="button" className="rounded bg-primary px-3 py-2 text-sm text-white" onClick={saveEditLine}>Save Changes</button>
						</div>
					</div>
				</div>
			)}

			{showExitWarning && (
				<div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-gray-500/75" />
					<div className="relative w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
						<h4 className="text-lg font-semibold">Unsaved Stock-Out Progress</h4>
						<p className="mt-2 text-sm text-gray-600">You have draft changes. What do you want to do?</p>
						<div className="mt-4 flex flex-wrap justify-end gap-2">
							<button type="button" onClick={() => { setShowExitWarning(false); onCancelAndClear(); }} className="rounded border border-red-300 px-3 py-2 text-sm text-red-600">Confirm Exit</button>
							<button type="button" onClick={() => { setShowExitWarning(false); onSaveAndClose(draft); }} className="rounded border border-primary bg-white px-3 py-2 text-sm text-primary hover:bg-primary-soft">Save and Exit</button>
							<button type="button" onClick={() => setShowExitWarning(false)} className="rounded border border-primary bg-white px-3 py-2 text-sm text-primary hover:bg-primary-soft">Continue</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}





