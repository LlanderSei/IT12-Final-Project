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
	const defaultSource = "Purchased";
	const detailsChanged = Object.entries(draft.details).some(([key, v]) => {
		if (key === "Source" && v === defaultSource) return false;
		return String(v || "").trim() !== "";
	});

	return draft.inventoryLines.length > 0 || draft.productLines.length > 0 || detailsChanged;
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
	const [addedSearch, setAddedSearch] = useState("");
	const [expandedGroups, setExpandedGroups] = useState({ inventory: true, products: true });

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

	const filteredAddedLines = useMemo(() => {
		const query = addedSearch.trim().toLowerCase();
		const filterLine = (line) =>
			line.ItemName?.toLowerCase().includes(query) ||
			line.Measurement?.toLowerCase().includes(query);

		return {
			inventory: draft.inventoryLines.filter(filterLine),
			products: draft.productLines.filter(filterLine),
		};
	}, [draft.inventoryLines, draft.productLines, addedSearch]);

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
				ItemDescription: nextLine.ItemDescription,
				Measurement: nextLine.Measurement,
			};
		}
		if (nextLine.CreateProduct) {
			nextLine.CreateProduct = {
				...nextLine.CreateProduct,
				ProductName: nextLine.ItemName,
				ProductDescription: nextLine.ProductDescription,
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

	const toggleGroup = (group) => {
		setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
	};

	return (
		<div className="fixed inset-0 z-50 flex flex-col bg-white">
			<div className="flex h-16 shrink-0 items-center justify-between border-b px-6">
				<h3 className="text-xl font-bold text-gray-900">{title}</h3>
				<div className="flex items-center gap-4">
					<div className="text-right">
						<div className="text-xs text-gray-500 uppercase tracking-wider">Total Amount</div>
						<div className="text-lg font-bold text-primary">PHP {money(totalAmount)}</div>
					</div>
					<button type="button" onClick={attemptClose} className="rounded-full p-2 hover:bg-gray-100 transition-colors">
						<svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			<div className="flex-1 overflow-hidden">
				<div className="grid h-full grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-x overflow-hidden">
					{/* Panel 1: Inventory Items */}
					<div className="flex flex-col flex-1 border-b md:border-b-0 md:border-r border-gray-100 overflow-hidden bg-white">
						<div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
							<h4 className="font-bold text-gray-900">Inventory Items</h4>
							<span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary-hex">
								{inventory?.length || 0} Available
							</span>
						</div>

						<div className="flex-1 flex flex-col overflow-hidden">
							<div className="sticky top-0 z-10 bg-white p-3 border-b">
									<div className="relative">
										<svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
										</svg>
										<input
											type="text"
											value={inventorySearch}
											onChange={(e) => setInventorySearch(e.target.value)}
											placeholder="Search existing items..."
											className="w-full rounded-lg border-gray-300 pl-9 text-sm focus:border-primary focus:ring-primary transition-all bg-white"
										/>
									</div>
								</div>
							<div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
								{filteredInventoryItems.map((item) => (
									<div key={item.ID} className="group rounded-xl border border-gray-100 bg-white p-3 shadow-sm hover:border-primary-soft hover:shadow-md transition-all duration-200">
										<div className="flex items-start justify-between">
											<div>
												<div className="font-bold text-gray-800">{item.ItemName}</div>
												<div className="text-xs text-gray-500">{item.Measurement}</div>
											</div>
										</div>
										<div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
											<div className="relative">
												<span className="absolute left-2 top-1.5 text-[10px] uppercase text-gray-400">Qty</span>
												<input
													type="number"
													min="1"
													value={draft.inventoryInputs[item.ID]?.QuantityAdded || ""}
													onChange={(e) => setInputValue("inventoryInputs", item.ID, "QuantityAdded", e.target.value)}
													className="w-full rounded-lg border-gray-200 pb-1.5 pt-4 text-sm focus:border-primary focus:ring-0"
												/>
											</div>
											<div className="relative">
												<span className="absolute left-2 top-1.5 text-[10px] uppercase text-gray-400">Cost</span>
												<input
													type="number"
													step="0.01"
													min="0"
													value={draft.inventoryInputs[item.ID]?.UnitCost || ""}
													onChange={(e) => setInputValue("inventoryInputs", item.ID, "UnitCost", e.target.value)}
													className="w-full rounded-lg border-gray-200 pb-1.5 pt-4 text-sm focus:border-primary focus:ring-0"
												/>
											</div>
											<button
												type="button"
												onClick={() => addInventoryExisting(item)}
												className="w-auto rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark active:scale-[0.98] transition-all whitespace-nowrap"
											>
												Add
											</button>
										</div>
									</div>
								))}
								{filteredInventoryItems.length === 0 && (
									<div className="flex flex-col items-center justify-center py-8 text-gray-400">
										<svg className="h-12 w-12 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
										</svg>
										<span>No items found</span>
									</div>
								)}
							</div>
						</div>

						{/* Create New Item */}
						<div className="flex-none bg-gray-50 p-4 border-t border-gray-100">
							<h5 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Create New Inventory Item</h5>
							<div className="grid grid-cols-1 gap-2">
								<input 
									type="text" 
									placeholder="Item Name" 
									value={draft.newInventory.ItemName} 
									onChange={(e) => updateDraft("newInventory.ItemName", e.target.value)} 
									className="rounded-lg border-gray-300 text-sm focus:border-primary focus:ring-primary" 
								/>
								<input 
									type="text" 
									placeholder="Item Description" 
									value={draft.newInventory.ItemDescription} 
									onChange={(e) => updateDraft("newInventory.ItemDescription", e.target.value)} 
									className="rounded-lg border-gray-300 text-sm focus:border-primary focus:ring-primary" 
								/>
								<div className="grid grid-cols-2 gap-2">
									<input 
										type="text" 
										placeholder="Measurement" 
										value={draft.newInventory.Measurement} 
										onChange={(e) => updateDraft("newInventory.Measurement", e.target.value)} 
										className="rounded-lg border-gray-300 text-sm focus:border-primary focus:ring-primary" 
									/>
									<div className="grid grid-cols-2 gap-1">
										<input type="number" min="1" placeholder="Qty" value={draft.newInventory.QuantityAdded} onChange={(e) => updateDraft("newInventory.QuantityAdded", e.target.value)} className="rounded-lg border-gray-300 text-sm focus:border-primary focus:ring-primary" />
										<input type="number" step="0.01" min="0" placeholder="Cost" value={draft.newInventory.UnitCost} onChange={(e) => updateDraft("newInventory.UnitCost", e.target.value)} className="rounded-lg border-gray-300 text-sm focus:border-primary focus:ring-primary" />
									</div>
								</div>
								<button 
									type="button" 
									onClick={addInventoryNew} 
									className="rounded-lg border border-primary bg-white py-2 text-sm font-bold text-primary hover:bg-primary-soft transition-colors"
								>
									Add New Inventory Item
								</button>
							</div>
						</div>
					</div>

					{/* Panel 2: Product Items */}
					<div className="flex flex-col flex-1 border-b md:border-b-0 md:border-r border-gray-100 overflow-hidden bg-white">
						<div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
							<h4 className="text-gray-900 font-bold">Product Items</h4>
							<span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
								{purchasedProducts?.length || 0} Available
							</span>
						</div>

						<div className="flex-1 flex flex-col overflow-hidden">
							<div className="sticky top-0 z-10 bg-white p-3 border-b">
								<div className="relative">
									<svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
									</svg>
									<input
										type="text"
										value={productSearch}
										onChange={(e) => setProductSearch(e.target.value)}
										placeholder="Search existing products..."
										className="w-full rounded-lg border-gray-300 pl-9 text-sm focus:border-primary focus:ring-primary transition-all bg-white"
									/>
								</div>
							</div>
							<div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
								{filteredPurchasedProducts.map((item) => (
									<div key={item.ID} className="group rounded-xl border border-gray-100 bg-white p-3 shadow-sm hover:border-primary-soft hover:shadow-md transition-all duration-200">
										<div className="flex items-start justify-between">
											<div>
												<div className="font-bold text-gray-800">{item.ProductName}</div>
												<div className="text-xs text-gray-500">{item.category?.CategoryName}</div>
											</div>
										</div>
										<div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
											<div className="relative">
												<span className="absolute left-2 top-1.5 text-[10px] uppercase text-gray-400">Qty</span>
												<input
													type="number"
													min="1"
													value={draft.productInputs[item.ID]?.QuantityAdded || ""}
													onChange={(e) => setInputValue("productInputs", item.ID, "QuantityAdded", e.target.value)}
													className="w-full rounded-lg border-gray-200 pb-1.5 pt-4 text-sm focus:border-primary focus:ring-0"
												/>
											</div>
											<div className="relative">
												<span className="absolute left-2 top-1.5 text-[10px] uppercase text-gray-400">Cost</span>
												<input
													type="number"
													step="0.01"
													min="0"
													value={draft.productInputs[item.ID]?.UnitCost || ""}
													onChange={(e) => setInputValue("productInputs", item.ID, "UnitCost", e.target.value)}
													className="w-full rounded-lg border-gray-200 pb-1.5 pt-4 text-sm focus:border-primary focus:ring-0"
												/>
											</div>
											<button
												type="button"
												onClick={() => addProductExisting(item)}
												className="w-auto rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark active:scale-[0.98] transition-all whitespace-nowrap"
											>
												Add
											</button>
										</div>
									</div>
								))}
								{filteredPurchasedProducts.length === 0 && (
									<div className="flex flex-col items-center justify-center py-8 text-gray-400">
										<svg className="h-12 w-12 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
										</svg>
										<span>No products found</span>
									</div>
								)}
							</div>
						</div>

						{/* Create New Product */}
						<div className="flex-none bg-gray-50 p-4 border-t border-gray-100">
							<h5 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Create New Product</h5>
							<div className="grid grid-cols-1 gap-2">
								<input type="text" placeholder="Product Name" value={draft.newProduct.ProductName} onChange={(e) => updateDraft("newProduct.ProductName", e.target.value)} className="rounded-lg border-gray-300 text-sm focus:border-primary focus:ring-primary" />
								<input type="text" placeholder="Product Description" value={draft.newProduct.ProductDescription} onChange={(e) => updateDraft("newProduct.ProductDescription", e.target.value)} className="rounded-lg border-gray-300 text-sm focus:border-primary focus:ring-primary" />
								<div className="grid grid-cols-2 gap-2">
									<select value={draft.newProduct.CategoryID} onChange={(e) => updateDraft("newProduct.CategoryID", e.target.value)} className="rounded-lg border-gray-300 text-sm focus:border-primary focus:ring-primary">
										<option value="">Category</option>
										{(categories || []).map((cat) => (
											<option key={cat.ID} value={cat.ID}>{cat.CategoryName}</option>
										))}
									</select>
									<div className="grid grid-cols-2 gap-1">
										<input type="number" min="1" placeholder="Qty" value={draft.newProduct.QuantityAdded} onChange={(e) => updateDraft("newProduct.QuantityAdded", e.target.value)} className="rounded-lg border-gray-300 text-sm focus:border-primary focus:ring-primary" />
										<input type="number" step="0.01" min="0" placeholder="Cost" value={draft.newProduct.UnitCost} onChange={(e) => updateDraft("newProduct.UnitCost", e.target.value)} className="rounded-lg border-gray-300 text-sm focus:border-primary focus:ring-primary" />
									</div>
								</div>
								<button type="button" onClick={addProductNew} className="rounded-lg border border-primary bg-white py-2 text-sm font-bold text-primary hover:bg-primary-soft transition-colors">Add New Product</button>
							</div>
						</div>
					</div>

					{/* Panel 3: Added Items */}
					<div className="flex flex-col flex-1 border-b md:border-b-0 md:border-r border-gray-100 overflow-hidden bg-white">
						<div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
							<h4 className="font-bold text-gray-900">Stock-In List</h4>
						</div>

						<div className="flex-1 flex flex-col overflow-hidden">
							<div className="sticky top-0 z-10 bg-white p-3 border-b">
								<div className="relative">
									<svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
									</svg>
									<input
										type="text"
										value={addedSearch}
										onChange={(e) => setAddedSearch(e.target.value)}
										placeholder="Search added items..."
										className="w-full rounded-lg border-gray-300 pl-9 text-sm focus:border-primary focus:ring-primary transition-all bg-white"
									/>
								</div>
							</div>
						
						<div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
							<div className="space-y-4">
								{/* Inventory Group */}
								<div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
									<button 
										type="button"
										onClick={() => toggleGroup('inventory')}
										className="flex w-full items-center justify-between bg-gray-50/80 px-4 py-3 transition-colors hover:bg-gray-100"
									>
										<div className="flex items-center gap-2">
											<span className="font-bold text-gray-700">Inventory Items</span>
											<span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-400">
												{filteredAddedLines.inventory.length}
											</span>
										</div>
										<svg className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${expandedGroups.inventory ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
										</svg>
									</button>
									
									{expandedGroups.inventory && (
										<div className="divide-y divide-gray-100">
											{filteredAddedLines.inventory.map((line) => (
												<div key={line.key} className="p-3 hover:bg-blue-50/30 transition-colors">
													<div className="flex items-center justify-between">
														<div className="font-semibold text-gray-800">{line.ItemName}</div>
														<div className="flex gap-1">
															<button type="button" onClick={() => beginEditLine("inventoryLines", line)} className="rounded-md p-1.5 text-blue-600 hover:bg-blue-100 transition-colors">
																<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
															</button>
															<button type="button" onClick={() => removeLine("inventoryLines", line.key)} className="rounded-md p-1.5 text-red-600 hover:bg-red-100 transition-colors">
																<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
															</button>
														</div>
													</div>
													<div className="mt-1 flex items-baseline justify-between text-xs">
														<div className="text-gray-500">
															{line.QuantityAdded} {line.Measurement || "units"} × {money(line.UnitCost)}
														</div>
														<div className="font-bold text-gray-700">PHP {money(line.SubAmount)}</div>
													</div>
												</div>
											))}
											{filteredAddedLines.inventory.length === 0 && (
												<div className="p-4 text-center text-xs text-gray-400 italic">No inventory items added.</div>
											)}
										</div>
									)}
								</div>

								{/* Product Group */}
								<div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
									<button 
										type="button"
										onClick={() => toggleGroup('products')}
										className="flex w-full items-center justify-between bg-gray-50/80 px-4 py-3 transition-colors hover:bg-gray-100"
									>
										<div className="flex items-center gap-2">
											<span className="font-bold text-gray-700">Product Items</span>
											<span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-400">
												{filteredAddedLines.products.length}
											</span>
										</div>
										<svg className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${expandedGroups.products ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
										</svg>
									</button>
									
									{expandedGroups.products && (
										<div className="divide-y divide-gray-100">
											{filteredAddedLines.products.map((line) => (
												<div key={line.key} className="p-3 hover:bg-blue-50/30 transition-colors">
													<div className="flex items-center justify-between">
														<div className="font-semibold text-gray-800">{line.ItemName}</div>
														<div className="flex gap-1">
															<button type="button" onClick={() => beginEditLine("productLines", line)} className="rounded-md p-1.5 text-blue-600 hover:bg-blue-100 transition-colors">
																<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
															</button>
															<button type="button" onClick={() => removeLine("productLines", line.key)} className="rounded-md p-1.5 text-red-600 hover:bg-red-100 transition-colors">
																<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
															</button>
														</div>
													</div>
													<div className="mt-1 flex items-baseline justify-between text-xs">
														<div className="text-gray-500">
															{line.QuantityAdded} units × {money(line.UnitCost)}
														</div>
														<div className="font-bold text-gray-700">PHP {money(line.SubAmount)}</div>
													</div>
												</div>
											))}
											{filteredAddedLines.products.length === 0 && (
												<div className="p-4 text-center text-xs text-gray-400 italic">No products added.</div>
											)}
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>

					{/* Panel 4: Details */}
					<div className="flex flex-col flex-1 overflow-hidden bg-white">
						<div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
							<h4 className="font-bold text-gray-900">Batch Details</h4>
						</div>
						<div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
							<div className="space-y-6">
								<div className="space-y-4">
									<div className="relative">
										<label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Supplier</label>
										<input 
											type="text" 
											placeholder="Enter supplier name" 
											value={draft.details.Supplier} 
											onChange={(e) => updateDraft("details.Supplier", e.target.value)} 
											className="w-full rounded-xl border-gray-300 text-sm focus:border-primary focus:ring-primary bg-white" 
										/>
									</div>
									
									<div className="relative">
										<label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Source Type</label>
										<select 
											value={draft.details.Source || "Purchased"} 
											onChange={(e) => updateDraft("details.Source", e.target.value)} 
											className="w-full rounded-xl border-gray-300 text-sm focus:border-primary focus:ring-primary bg-white"
										>
											<option value="Purchased">Purchased</option>
											<option value="Business">Business</option>
											<option value="Donation">Donation</option>
										</select>
									</div>

									<div className="relative">
										<label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Purchase Date</label>
										<input 
											type="date" 
											value={draft.details.PurchaseDate} 
											onChange={(e) => updateDraft("details.PurchaseDate", e.target.value)} 
											className="w-full rounded-xl border-gray-300 text-sm focus:border-primary focus:ring-primary bg-white" 
										/>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div className="relative">
											<label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Receipt #</label>
											<input 
												type="text" 
												placeholder="Optional" 
												value={draft.details.ReceiptNumber} 
												onChange={(e) => updateDraft("details.ReceiptNumber", e.target.value)} 
												className="w-full rounded-xl border-gray-300 text-sm focus:border-primary focus:ring-primary bg-white" 
											/>
										</div>
										<div className="relative">
											<label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Invoice #</label>
											<input 
												type="text" 
												placeholder="Optional" 
												value={draft.details.InvoiceNumber} 
												onChange={(e) => updateDraft("details.InvoiceNumber", e.target.value)} 
												className="w-full rounded-xl border-gray-300 text-sm focus:border-primary focus:ring-primary bg-white" 
											/>
										</div>
									</div>

									<div className="relative">
										<label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Notes</label>
										<textarea 
											placeholder="Additional instructions or notes..." 
											value={draft.details.AdditionalDetails} 
											onChange={(e) => updateDraft("details.AdditionalDetails", e.target.value)} 
											className="w-full rounded-xl border-gray-300 text-sm focus:border-primary focus:ring-primary bg-white" 
											rows={4} 
										/>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="flex shrink-0 items-center justify-between border-t bg-gray-50 px-8 py-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
				<div className="flex items-center gap-6">
					<button type="button" onClick={attemptClose} className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">Cancel</button>
					<button 
						type="button" 
						onClick={() => onSaveAndClose(draft)} 
						className="rounded-lg border border-primary bg-white px-6 py-2.5 text-sm font-bold text-primary hover:bg-primary-soft transition-all active:scale-95"
					>
						Save and Close
					</button>
				</div>
				<form onSubmit={submitRecord}>
					<button 
						type="submit" 
						disabled={processing || allLines.length === 0} 
						className="flex items-center gap-2 rounded-lg bg-primary px-10 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary-dark active:scale-95 disabled:opacity-50 disabled:shadow-none"
					>
						{submitLabel}
						<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
						</svg>
					</button>
				</form>
			</div>

			{editingLine && (
				<div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setEditingLine(null)} />
					<div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
						<div className="flex items-center justify-between border-b px-6 py-4">
							<h4 className="text-lg font-bold text-gray-900">Edit Line Item</h4>
							<button onClick={() => setEditingLine(null)} className="rounded-full p-1 hover:bg-gray-100">
								<svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
						
						<div className="p-6 space-y-6">
							{/* If it's a "New" item, allow editing more fields */}
							{(editingLine.CreateInventory || editingLine.CreateProduct) ? (
								<div className="space-y-4">
									<div className="relative">
										<label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Item/Product Name</label>
										<input 
											className="w-full rounded-xl border-gray-200 text-sm focus:border-primary focus:ring-primary transition-all" 
											value={editingLine.ItemName} 
											onChange={(e) => setEditingLine((p) => ({ ...p, ItemName: e.target.value }))} 
											placeholder="Name" 
										/>
									</div>
									<div className="relative">
										<label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Description</label>
										<input 
											className="w-full rounded-xl border-gray-200 text-sm focus:border-primary focus:ring-primary transition-all" 
											value={editingLine.ItemDescription || editingLine.ProductDescription || ""} 
											onChange={(e) => setEditingLine((p) => ({ 
												...p, 
												[editingLine.CreateInventory ? 'ItemDescription' : 'ProductDescription']: e.target.value 
											}))} 
											placeholder="Description" 
										/>
									</div>
									{editingLine.CreateInventory && (
										<div className="relative">
											<label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Measurement</label>
											<input 
												className="w-full rounded-xl border-gray-200 text-sm focus:border-primary focus:ring-primary transition-all" 
												value={editingLine.Measurement || ""} 
												onChange={(e) => setEditingLine((p) => ({ ...p, Measurement: e.target.value }))} 
												placeholder="Measurement (e.g., kg, pcs)" 
											/>
										</div>
									)}
									{editingLine.CreateProduct && (
										<div className="relative">
											<label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Category</label>
											<select 
												className="w-full rounded-xl border-gray-200 text-sm focus:border-primary focus:ring-primary transition-all" 
												value={editingLine.CreateProduct.CategoryID || ""} 
												onChange={(e) => setEditingLine((p) => ({ ...p, CreateProduct: { ...p.CreateProduct, CategoryID: Number(e.target.value) } }))}
											>
												<option value="">Select Category</option>
												{(categories || []).map((cat) => (
													<option key={cat.ID} value={cat.ID}>{cat.CategoryName}</option>
												))}
											</select>
										</div>
									)}
								</div>
							) : (
								<div className="rounded-xl bg-gray-50 p-4">
									<div className="text-xs font-bold uppercase text-gray-400 mb-1">Item Reference</div>
									<div className="font-bold text-gray-800">{editingLine.ItemName}</div>
									<div className="text-xs text-gray-500">{editingLine.Measurement || "Product Unit"}</div>
								</div>
							)}

							<div className="grid grid-cols-2 gap-4 pt-2">
								<div className="relative">
									<label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Quantity</label>
									<input 
										type="number" 
										min="1" 
										className="w-full rounded-xl border-gray-200 text-sm focus:border-primary focus:ring-primary transition-all" 
										value={editingLine.QuantityAdded} 
										onChange={(e) => setEditingLine((p) => ({ ...p, QuantityAdded: e.target.value }))} 
										placeholder="Qty" 
									/>
								</div>
								<div className="relative">
									<label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Unit Cost</label>
									<input 
										type="number" 
										min="0" 
										step="0.01" 
										className="w-full rounded-xl border-gray-200 text-sm focus:border-primary focus:ring-primary transition-all" 
										value={editingLine.UnitCost} 
										onChange={(e) => setEditingLine((p) => ({ ...p, UnitCost: e.target.value }))} 
										placeholder="Cost" 
									/>
								</div>
							</div>
						</div>

						<div className="flex items-center justify-end gap-3 border-t bg-gray-50 px-6 py-4">
							<button 
								type="button" 
								className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors" 
								onClick={() => setEditingLine(null)}
							>
								Cancel
							</button>
							<button 
								type="button" 
								className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95" 
								onClick={saveEditLine}
							>
								Save Changes
							</button>
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



