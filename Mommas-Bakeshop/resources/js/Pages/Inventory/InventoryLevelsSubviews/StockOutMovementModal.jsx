import React, { useEffect, useMemo, useState } from "react";
import { 
	Package, 
	ShoppingCart, 
	Plus, 
	Trash2, 
	ClipboardList, 
	ShoppingBag, 
	PlusCircle,
	Calendar,
	Tag,
	FileText,
	FileDigit,
	Info
} from "lucide-react";

const money = (value) => {
	const n = Number(value || 0);
	if (isNaN(n)) return "0.00";
	return n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

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

function hasOutProgress(draft) {
	return (
		(draft?.inventoryLines || []).length > 0 ||
		(draft?.productLines || []).length > 0 ||
		(draft?.details?.ReasonType || "").trim() !== "" ||
		(draft?.details?.ReasonNote || "").trim() !== ""
	);
}

function showValidationToast(messages) {
	window.dispatchEvent(
		new CustomEvent("app-toast", {
			detail: { type: "error", messages },
		}),
	);
}

export default function StockOutMovementModal({
	show,
	draft,
	setDraft,
	inventory,
	products,
	processing,
	errors,
	onRecord,
	onSaveAndClose,
	onCancelAndClear,
	title,
	submitLabel,
}) {
	const [showExitWarning, setShowExitWarning] = useState(false);
	const [inventorySearch, setInventorySearch] = useState("");
	const [productSearch, setProductSearch] = useState("");

	useEffect(() => {
		if (!errors) return;
		const messages = Object.values(errors)
			.flatMap((v) => (Array.isArray(v) ? v : [v]))
			.filter(Boolean)
			.map(String);

		if (messages.length > 0) {
			showValidationToast(messages);
		}
	}, [errors]);

	const filteredInventoryItems = useMemo(() => {
		const query = inventorySearch.trim().toLowerCase();
		if (!query) return inventory || [];
		return (inventory || []).filter((item) =>
			item.ItemName?.toLowerCase().includes(query)
		);
	}, [inventory, inventorySearch]);

	const filteredProducts = useMemo(() => {
		const query = productSearch.trim().toLowerCase();
		if (!query) return products || [];
		return (products || []).filter((item) =>
			item.ProductName?.toLowerCase().includes(query)
		);
	}, [products, productSearch]);

	const allLines = [...(draft?.inventoryLines || []), ...(draft?.productLines || [])];
	const totalItems = allLines.reduce((sum, line) => sum + Number(line.QuantityRemoved || 0), 0);

	const updateDraft = (path, value) => {
		setDraft((prev) => {
			const next = { ...prev };
			if (path.startsWith("details.")) {
				next.details = { ...prev.details, [path.replace("details.", "")]: value };
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
				...(prev?.[group] || {}),
				[id]: {
					...(prev?.[group]?.[id] || { QuantityRemoved: "" }),
					[field]: value,
				},
			},
		}));
	};

	const addInventoryLine = (item) => {
		const row = (draft?.inventoryInputs || {})[item.ID] || {};
		const issues = [];
		if (!String(row.QuantityRemoved ?? "").trim()) issues.push(`"${item.ItemName}": Quantity is required.`);
		const qty = Number(row.QuantityRemoved || 0);
		if (qty <= 0) issues.push(`"${item.ItemName}": Quantity must be greater than 0.`);
		if (qty > (item.Quantity || 0)) issues.push(`"${item.ItemName}": Only ${item.Quantity} available.`);
		if (issues.length > 0) {
			showValidationToast(issues);
			return;
		}

		setDraft((prev) => ({
			...prev,
			inventoryLines: [
				...(prev.inventoryLines || []),
				{
					key: `inv-${item.ID}-${Date.now()}`,
					ItemType: "Inventory",
					InventoryID: item.ID,
					ItemName: item.ItemName,
					QuantityRemoved: qty,
				},
			],
			inventoryInputs: {
				...(prev.inventoryInputs || {}),
				[item.ID]: { QuantityRemoved: "" },
			},
		}));
	};

	const addProductLine = (item) => {
		const row = (draft?.productInputs || {})[item.ID] || {};
		const issues = [];
		if (!String(row.QuantityRemoved ?? "").trim()) issues.push(`"${item.ProductName}": Quantity is required.`);
		const qty = Number(row.QuantityRemoved || 0);
		if (qty <= 0) issues.push(`"${item.ProductName}": Quantity must be greater than 0.`);
		if (qty > (item.Quantity || 0)) issues.push(`"${item.ProductName}": Only ${item.Quantity} available.`);
		if (issues.length > 0) {
			showValidationToast(issues);
			return;
		}

		setDraft((prev) => ({
			...prev,
			productLines: [
				...(prev.productLines || []),
				{
					key: `prod-${item.ID}-${Date.now()}`,
					ItemType: "Product",
					ProductID: item.ID,
					ItemName: item.ProductName,
					QuantityRemoved: qty,
				},
			],
			productInputs: {
				...(prev.productInputs || {}),
				[item.ID]: { QuantityRemoved: "" },
			},
		}));
	};

	const removeLine = (group, key) => {
		setDraft((prev) => ({
			...prev,
			[group]: (prev[group] || []).filter((line) => line.key !== key),
		}));
	};

	const validateBeforeSubmit = () => {
		const issues = [];
		if (!allLines.length) issues.push("Add at least one item to stock-out.");
		if (!(draft?.details?.ReasonType || "").trim()) issues.push("Please select a reason for stock-out.");
		return issues;
	};

	const submitRecord = (e) => {
		e.preventDefault();
		const issues = validateBeforeSubmit();
		if (issues.length > 0) {
			showValidationToast(issues);
			return;
		}

		onRecord({
			Reason: `${draft?.details?.ReasonType || ""}${draft?.details?.ReasonNote ? " | " + draft?.details?.ReasonNote : ""}`,
			Source: draft?.details?.Source || "Business",
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

				<form onSubmit={submitRecord} className="relative w-full max-w-7xl rounded-lg bg-white shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
					<div className="border-b px-6 py-4 bg-white flex items-center justify-between">
						<div>
							<h3 className="text-lg font-bold text-gray-900">{title || "Stock-Out Batch"}</h3>
							<p className="text-sm text-gray-500">Record stock reduction due to usage, waste, or other reasons.</p>
						</div>
						<div className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium text-gray-700">
							{allLines.length} Items Selected
						</div>
					</div>

					<div className="grid gap-0 p-0 lg:grid-cols-12 flex-1 overflow-hidden">
						<div className="lg:col-span-4 border-r bg-gray-50/50 p-6 overflow-y-auto">
							<div className="mb-6">
								<div className="flex items-center gap-2 mb-4 text-orange-700">
									<Package className="h-5 w-5" />
									<h4 className="font-semibold">Inventory Items</h4>
								</div>
								<div className="space-y-4">
									<div className="relative">
										<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
											<PlusCircle className="h-4 w-4 text-gray-400" />
										</div>
										<input type="text" value={inventorySearch} onChange={(e) => setInventorySearch(e.target.value)} placeholder="Search raw materials..." className="w-full rounded-md border-gray-300 pl-9 text-sm focus:ring-primary focus:border-primary" />
									</div>
									<div className="space-y-2 max-h-64 overflow-y-auto pr-2">
										{filteredInventoryItems.map((item) => (
											<div key={item.ID} className="rounded-lg border bg-white p-3 shadow-sm transition-all hover:border-primary/30">
												<div className="flex justify-between items-start mb-2">
													<div className="font-medium text-gray-900">{item.ItemName}</div>
													<div className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
														Bal: {item.Quantity} {item.Measurement}
													</div>
												</div>
												<div className="flex gap-2">
													<input type="number" min="0" placeholder="Qty" value={draft?.inventoryInputs?.[item.ID]?.QuantityRemoved || ""} onChange={(e) => setInputValue("inventoryInputs", item.ID, "QuantityRemoved", e.target.value)} className="w-full rounded border-gray-300 text-sm py-1" />
													<button type="button" onClick={() => addInventoryLine(item)} className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary-hover transition-colors">Add</button>
												</div>
											</div>
										))}
									</div>
								</div>
							</div>

							<div>
								<div className="flex items-center gap-2 mb-4 text-blue-700 border-t pt-6">
									<ShoppingBag className="h-5 w-5" />
									<h4 className="font-semibold">Manufactured Products</h4>
								</div>
								<div className="space-y-4">
									<div className="relative">
										<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
											<PlusCircle className="h-4 w-4 text-gray-400" />
										</div>
										<input type="text" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products..." className="w-full rounded-md border-gray-300 pl-9 text-sm focus:ring-primary focus:border-primary" />
									</div>
									<div className="space-y-2 max-h-64 overflow-y-auto pr-2">
										{filteredProducts.map((item) => (
											<div key={item.ID} className="rounded-lg border bg-white p-3 shadow-sm transition-all hover:border-primary/30">
												<div className="flex justify-between items-start mb-2">
													<div className="font-medium text-gray-900">{item.ProductName}</div>
													<div className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
														Bal: {item.Quantity} units
													</div>
												</div>
												<div className="flex gap-2">
													<input type="number" min="0" placeholder="Qty" value={draft?.productInputs?.[item.ID]?.QuantityRemoved || ""} onChange={(e) => setInputValue("productInputs", item.ID, "QuantityRemoved", e.target.value)} className="w-full rounded border-gray-300 text-sm py-1" />
													<button type="button" onClick={() => addProductLine(item)} className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary-hover transition-colors">Add</button>
												</div>
											</div>
										))}
									</div>
								</div>
							</div>
						</div>

						<div className="lg:col-span-5 bg-white p-6 overflow-y-auto flex flex-col border-r">
							<div className="flex items-center justify-between mb-4">
								<h4 className="font-bold text-gray-800 flex items-center gap-2">
									<ClipboardList className="h-5 w-5 text-primary" />
									Current Stock-Out List
								</h4>
								<span className="text-xs text-gray-500 italic">Scroll to see all items</span>
							</div>

							<div className="space-y-3 flex-1 overflow-y-auto pr-2 min-h-[300px]">
								{allLines.length === 0 && (
									<div className="flex flex-col items-center justify-center h-full text-gray-400 py-12 border-2 border-dashed border-gray-100 rounded-xl">
										<Package className="h-12 w-12 mb-3 stroke-1" />
										<p>No items added to the list yet.</p>
									</div>
								)}
								{allLines.map((line) => (
									<div key={line.key} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
										<div className="flex items-center gap-3">
											<div className={`h-10 w-10 rounded-full flex items-center justify-center ${line.ItemType === 'Inventory' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
												{line.ItemType === 'Inventory' ? <Package className="h-5 w-5" /> : <Croissant className="h-5 w-5" />}
											</div>
											<div>
												<div className="font-bold text-gray-900">{line.ItemName}</div>
												<div className="text-xs text-gray-500 uppercase tracking-wider font-medium">{line.ItemType}</div>
											</div>
										</div>
										<div className="flex items-center gap-4">
											<div className="text-right">
												<div className="text-lg font-bold text-gray-900">-{line.QuantityRemoved}</div>
												<div className="text-xs text-gray-400 font-medium">Qty Removed</div>
											</div>
											<button type="button" onClick={() => removeLine(line.ItemType === 'Inventory' ? 'inventoryLines' : 'productLines', line.key)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all">
												<Trash2 className="h-5 w-5" />
											</button>
										</div>
									</div>
								))}
							</div>
						</div>

						<div className="lg:col-span-3 bg-gray-50/30 p-6 overflow-y-auto">
							<h4 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
								<FileText className="h-5 w-5 text-primary" />
								Batch Finalization
							</h4>
							<div className="space-y-6">
								<div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
									<label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Reason Category *</label>
									<div className="relative">
										<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
											<Tag className="h-4 w-4 text-gray-400" />
										</div>
										<select value={draft?.details?.ReasonType || ""} onChange={(e) => updateDraft("details.ReasonType", e.target.value)} required className="w-full rounded-lg border-gray-300 pl-10 text-sm focus:ring-primary focus:border-primary transition-all">
											<option value="">Select Reason (Required)</option>
											<option value="Kitchen Usage">Kitchen Usage</option>
											<option value="Production">Production</option>
											<option value="Waste / Spoilage">Waste / Spoilage</option>
											<option value="Damaged Goods">Damaged Goods</option>
											<option value="Store Display">Store Display</option>
											<option value="Inventory Correction">Inventory Correction</option>
											<option value="Other">Other</option>
										</select>
									</div>
								</div>

								<div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
									<label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Stock Source</label>
									<div className="relative">
										<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
											<FileDigit className="h-4 w-4 text-gray-400" />
										</div>
										<select value={draft?.details?.Source || "Business"} onChange={(e) => updateDraft("details.Source", e.target.value)} className="w-full rounded-lg border-gray-300 pl-10 text-sm focus:ring-primary focus:border-primary transition-all">
											<option value="Business">Business</option>
											<option value="Purchased">Purchased</option>
										</select>
									</div>
								</div>

								<div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
									<label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Reason Notes (Optional)</label>
									<textarea value={draft?.details?.ReasonNote || ""} onChange={(e) => updateDraft("details.ReasonNote", e.target.value)} placeholder="Provide additional context here..." className="w-full rounded-lg border-gray-300 text-sm focus:ring-primary focus:border-primary transition-all" rows={4} />
								</div>

								<div className="bg-primary/5 rounded-xl border border-primary/10 p-5 mt-6 border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
									<div className="flex items-center justify-between mb-2">
										<span className="text-xs font-bold text-primary uppercase tracking-widest">Total Quantity Reduction</span>
										<Info className="h-4 w-4 text-primary/40" />
									</div>
									<div className="text-3xl font-black text-primary flex items-baseline gap-1">
										{totalItems}
										<span className="text-xs font-medium text-primary/60">Units Total</span>
									</div>
								</div>
							</div>
						</div>
					</div>

					<div className="border-t bg-gray-50 px-8 py-5 flex items-center justify-end gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
						<button type="button" onClick={attemptClose} className="px-6 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm">
							Discard Draft
						</button>
						<button type="button" onClick={() => onSaveAndClose(draft)} className="px-6 py-2.5 rounded-lg border border-primary/20 bg-primary/5 text-sm font-bold text-primary hover:bg-primary/10 transition-all flex items-center gap-2">
							<FileText className="h-4 w-4" />
							Keep as Draft
						</button>
						<button type="submit" disabled={processing || allLines.length === 0} className="px-8 py-2.5 rounded-lg bg-primary text-sm font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary-hover hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none flex items-center gap-2">
							<PlusCircle className="h-4 w-4" />
							{submitLabel || "Record Stock-Out"}
						</button>
					</div>
				</form>
			</div>

			{showExitWarning && (
				<div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-gray-500/75" />
					<div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
						<h4 className="text-xl font-bold text-gray-900 mb-2">Unsaved Stock-Out Progress</h4>
						<p className="text-gray-600 mb-6">You have items in your stock-out list. Closing now will discard these changes unless you save them as a draft.</p>
						<div className="flex flex-col gap-3">
							<button type="button" onClick={() => { setShowExitWarning(false); onCancelAndClear(); }} className="w-full py-3 rounded-lg border border-red-200 bg-red-50 text-red-700 font-bold hover:bg-red-100 transition-all">Clear & Exit</button>
							<button type="button" onClick={() => { setShowExitWarning(false); onSaveAndClose(draft); }} className="w-full py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all">Save as Draft & Exit</button>
							<button type="button" onClick={() => setShowExitWarning(false)} className="w-full py-3 rounded-lg border border-gray-300 font-bold text-gray-600 hover:bg-gray-50 transition-all text-sm">Cancel</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
