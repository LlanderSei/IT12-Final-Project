import React, { useEffect, useMemo, useState } from "react";
import { 
	Package, 
	ShoppingCart, 
	FileInfo, 
	Plus, 
	Trash2, 
	ClipboardList, 
	ShoppingBag, 
	Info,
	Calendar,
	User,
	Tag,
	Receipt,
	FileDigit,
	PlusCircle,
	FileText
} from "lucide-react";

const money = (value) => {
	const n = Number(value || 0);
	if (isNaN(n)) return "0.00";
	return n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const createDefaultStockInDraft = () => ({
	details: {
		Type: "Restock",
		Date: new Date().toISOString().split("T")[0],
		Supplier: "",
		Source: "Purchased",
		Reference: "",
		TotalAmount: "",
	},
	inventoryInputs: {},
	productInputs: {},
	inventoryLines: [],
	productLines: [],
});

function hasInProgress(draft) {
	return (
		(draft?.inventoryLines || []).length > 0 ||
		(draft?.productLines || []).length > 0 ||
		(draft?.details?.Supplier || "").trim() !== "" ||
		(draft?.details?.Reference || "").trim() !== ""
	);
}

function showValidationToast(messages) {
	window.dispatchEvent(
		new CustomEvent("app-toast", {
			detail: { type: "error", messages },
		}),
	);
}

export default function StockInMovementModal({
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
	const [showExitWarning, setShowExitWarning] = useState(false);
	const [activeTab, setActiveTab] = useState("inventory");
	const [searchQuery, setSearchQuery] = useState("");
	const [editingLine, setEditingLine] = useState(null);

	useEffect(() => {
		if (!errors) return;
		const messages = Object.values(errors)
			.flatMap((v) => (Array.isArray(v) ? v : [v]))
			.filter(Boolean)
			.map(String);
		if (messages.length > 0) showValidationToast(messages);
	}, [errors]);

	const purchasedProducts = useMemo(() => (products || []).filter((p) => p.IsPurchased), [products]);

	const filteredList = useMemo(() => {
		const list = activeTab === "inventory" ? (inventory || []) : purchasedProducts;
		const query = searchQuery.toLowerCase().trim();
		if (!query) return list;
		return list.filter((item) =>
			(item.ItemName || item.ProductName || "").toLowerCase().includes(query)
		);
	}, [activeTab, inventory, purchasedProducts, searchQuery]);

	const allLines = [...(draft?.inventoryLines || []), ...(draft?.productLines || [])];

	const totalAmount = useMemo(() => 
		allLines.reduce((sum, line) => sum + Number(line.QuantityAdded || 0) * Number(line.UnitCost || 0), 0)
	, [allLines]);

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
					...(prev?.[group]?.[id] || { QuantityAdded: "", UnitCost: "" }),
					[field]: value,
				},
			},
		}));
	};

	const addLine = (item) => {
		const group = activeTab === "inventory" ? "inventoryInputs" : "productInputs";
		const inputs = (draft?.[group] || {})[item.ID] || {};
		const issues = [];
		if (!String(inputs.QuantityAdded || "").trim()) issues.push("Quantity is required.");
		if (!String(inputs.UnitCost || "").trim()) issues.push("Unit Cost is required.");
		if (issues.length > 0) {
			showValidationToast(issues.map((m) => `"${item.ItemName || item.ProductName}": ${m}`));
			return;
		}

		setDraft((prev) => ({
			...prev,
			[activeTab === "inventory" ? "inventoryLines" : "productLines"]: [
				...(prev[activeTab === "inventory" ? "inventoryLines" : "productLines"] || []),
				{
					key: `${item.ID}-${Date.now()}`,
					ItemType: activeTab === "inventory" ? "Inventory" : "Product",
					InventoryID: activeTab === "inventory" ? item.ID : null,
					ProductID: activeTab === "inventory" ? null : item.ID,
					ItemName: item.ItemName || item.ProductName,
					QuantityAdded: Number(inputs.QuantityAdded),
					UnitCost: Number(inputs.UnitCost),
					Measurement: item.Measurement || "units",
				},
			],
			[group]: {
				...(prev[group] || {}),
				[item.ID]: { QuantityAdded: "", UnitCost: "" },
			},
		}));
	};

	const removeLine = (group, key) => {
		setDraft((prev) => ({
			...prev,
			[group]: (prev[group] || []).filter((line) => line.key !== key),
		}));
	};

	const startEdit = (group, line) => {
		setEditingLine({
			group,
			originalKey: line.key,
			...{...line},
		});
	};

	const saveEdit = () => {
		if (!editingLine) return;
		setDraft((prev) => ({
			...prev,
			[editingLine.group]: (prev[editingLine.group] || []).map((l) =>
				l.key === editingLine.originalKey ? { ...editingLine, key: l.key } : l
			),
		}));
		setEditingLine(null);
	};

	const submitRecord = (e) => {
		e.preventDefault();
		const issues = [];
		if (allLines.length === 0) issues.push("Add at least one item to the batch.");
		if (!draft?.details?.Supplier?.trim()) issues.push("Supplier name is required.");
		if (issues.length > 0) {
			showValidationToast(issues);
			return;
		}

		onRecord({
			...draft.details,
			Reference: draft.details.Reference || `RE-${Date.now()}`,
			items: allLines.map((l) => ({
				ItemType: l.ItemType,
				InventoryID: l.InventoryID,
				ProductID: l.ProductID,
				QuantityAdded: l.QuantityAdded,
				UnitCost: l.UnitCost,
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
				<div className="fixed inset-0 bg-gray-500/75 transition-opacity" onClick={attemptClose} />

				<form onSubmit={submitRecord} className="relative w-full max-w-7xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
					<div className="border-b px-8 py-6 bg-white flex items-center justify-between">
						<div>
							<h3 className="text-2xl font-black text-gray-900 tracking-tight">{title || "New Stock-In Batch"}</h3>
							<p className="text-sm text-gray-500 font-medium">Record incoming raw materials or purchased products.</p>
						</div>
						<div className="flex items-center gap-3">
							<div className="bg-primary/10 px-4 py-2 rounded-full text-sm font-bold text-primary flex items-center gap-2">
								<ClipboardList className="h-4 w-4" />
								{allLines.length} Items Selected
							</div>
							<button type="button" onClick={attemptClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
								<span className="text-2xl leading-none">&times;</span>
							</button>
						</div>
					</div>

					<div className="grid gap-0 p-0 lg:grid-cols-12 flex-1 overflow-hidden">
						<div className="lg:col-span-4 border-r bg-gray-50/50 p-6 overflow-y-auto">
							<div className="mb-6 flex p-1 bg-gray-200/50 rounded-xl">
								<button type="button" onClick={() => setActiveTab("inventory")} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "inventory" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Raw Materials</button>
								<button type="button" onClick={() => setActiveTab("products")} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "products" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Purchased Goods</button>
							</div>

							<div className="relative mb-6">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<PlusCircle className="h-4 w-4 text-gray-400" />
								</div>
								<input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={`Search ${activeTab === "inventory" ? "raw materials" : "products"}...`} className="w-full rounded-xl border-gray-200 pl-10 text-sm focus:ring-primary focus:border-primary transition-all shadow-sm" />
							</div>

							<div className="space-y-3 pb-4">
								{filteredList.map((item) => (
									<div key={item.ID} className="group rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200">
										<div className="flex justify-between items-start mb-3">
											<div className="font-bold text-gray-900 group-hover:text-primary transition-colors">{item.ItemName || item.ProductName}</div>
											<div className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-2 py-1 rounded">
												{item.Measurement || "units"}
											</div>
										</div>
										<div className="grid grid-cols-11 gap-2 items-center">
											<div className="col-span-4 relative">
												<label className="absolute -top-1.5 left-2 px-1 bg-white text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Qty</label>
												<input type="number" min="0" value={draft?.[activeTab === "inventory" ? "inventoryInputs" : "productInputs"]?.[item.ID]?.QuantityAdded || ""} onChange={(e) => setInputValue(activeTab === "inventory" ? "inventoryInputs" : "productInputs", item.ID, "QuantityAdded", e.target.value)} className="w-full rounded-lg border-gray-200 text-sm py-2 px-3 pt-3.5 focus:ring-primary transition-all" />
											</div>
											<div className="col-span-5 relative">
												<label className="absolute -top-1.5 left-2 px-1 bg-white text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Cost</label>
												<div className="absolute left-3 top-4 text-gray-400 text-xs">P</div>
												<input type="number" min="0" step="0.01" value={draft?.[activeTab === "inventory" ? "inventoryInputs" : "productInputs"]?.[item.ID]?.UnitCost || ""} onChange={(e) => setInputValue(activeTab === "inventory" ? "inventoryInputs" : "productInputs", item.ID, "UnitCost", e.target.value)} className="w-full rounded-lg border-gray-200 text-sm py-2 pl-6 pt-3.5 focus:ring-primary transition-all" />
											</div>
											<div className="col-span-2">
												<button type="button" onClick={() => addLine(item)} className="w-full h-10 flex items-center justify-center bg-gray-900 text-white rounded-lg hover:bg-primary transition-all shadow-sm active:scale-95">
													<Plus className="h-5 w-5" />
												</button>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>

						<div className="lg:col-span-5 bg-white p-8 overflow-y-auto flex flex-col border-r">
							<div className="flex items-center justify-between mb-8">
								<h4 className="text-lg font-black text-gray-800 flex items-center gap-3">
									<div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
										<Package className="h-5 w-5 text-primary" />
									</div>
									Batch Contents
								</h4>
								<span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Scroll to view</span>
							</div>

							<div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[400px]">
								{allLines.length === 0 && (
									<div className="flex flex-col items-center justify-center h-full text-gray-400 py-16 border-2 border-dashed border-gray-100 rounded-3xl animate-pulse">
										<ShoppingCart className="h-16 w-16 mb-4 stroke-[1.5] text-gray-200" />
										<p className="font-bold text-gray-300 uppercase tracking-widest text-sm text-center px-8 leading-relaxed">Your batch is empty.<br/>Add items from the side to begin.</p>
									</div>
								)}
								{allLines.map((line) => (
									<div key={line.key} className="flex items-center justify-between p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-xl hover:border-primary/10 transition-all duration-300 group relative overflow-hidden">
										<div className="absolute inset-y-0 left-0 w-1 bg-primary transform -translate-x-full group-hover:translate-x-0 transition-transform" />
										<div className="flex items-center gap-4">
											<div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-inner ${line.ItemType === 'Inventory' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
												{line.ItemType === 'Inventory' ? <Package className="h-6 w-6" /> : <ShoppingBag className="h-6 w-6" />}
											</div>
											<div>
												<div className="font-black text-gray-900 group-hover:text-primary transition-colors">{line.ItemName}</div>
												<div className="text-[10px] font-black tracking-widest text-gray-400 uppercase mt-1">{line.ItemType} &bull; {line.Measurement}</div>
											</div>
										</div>
										<div className="flex items-center gap-6">
											<div className="text-right">
												<div className="text-sm font-black text-gray-900">PHP {money(line.UnitCost)}</div>
												<div className="text-[10px] font-black tracking-widest text-gray-500 uppercase">Unit Cost</div>
											</div>
											<div className="text-right border-l pl-6 border-gray-100">
												<div className="text-xl font-black text-gray-900">{line.QuantityAdded}</div>
												<div className="text-[10px] font-black tracking-widest text-gray-500 uppercase">Quantity</div>
											</div>
											<div className="flex items-center gap-1">
												<button type="button" onClick={() => startEdit(line.ItemType === 'Inventory' ? 'inventoryLines' : 'productLines', line)} className="p-2.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all">
													<FileText className="h-5 w-5" />
												</button>
												<button type="button" onClick={() => removeLine(line.ItemType === 'Inventory' ? 'inventoryLines' : 'productLines', line.key)} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
													<Trash2 className="h-5 w-5" />
												</button>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>

						<div className="lg:col-span-3 bg-gray-50/50 p-8 overflow-y-auto">
							<h4 className="text-lg font-black text-gray-800 mb-8 flex items-center gap-3">
								<div className="h-8 w-8 rounded-lg bg-gray-900 flex items-center justify-center">
									<Info className="h-5 w-5 text-white" />
								</div>
								Batch Details
							</h4>
							<div className="space-y-6">
								<div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
									<div className="flex items-center gap-2 mb-4">
										<Calendar className="h-4 w-4 text-primary" />
										<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Entry Date</label>
									</div>
									<input type="date" value={draft?.details?.Date || ""} onChange={(e) => updateDraft("details.Date", e.target.value)} required className="w-full rounded-xl border-gray-200 text-sm font-bold focus:ring-primary transition-all bg-gray-50/30" />
								</div>

								<div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
									<div className="flex items-center gap-2 mb-4">
										<User className="h-4 w-4 text-primary" />
										<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Supplier Name *</label>
									</div>
									<input type="text" value={draft?.details?.Supplier || ""} onChange={(e) => updateDraft("details.Supplier", e.target.value)} required placeholder="Required" className="w-full rounded-xl border-gray-200 text-sm font-bold focus:ring-primary transition-all bg-gray-50/30" />
								</div>

								<div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
									<div className="flex items-center gap-2 mb-4">
										<Tag className="h-4 w-4 text-primary" />
										<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock-In Type</label>
									</div>
									<select value={draft?.details?.Type || "Restock"} onChange={(e) => updateDraft("details.Type", e.target.value)} className="w-full rounded-xl border-gray-200 text-sm font-bold focus:ring-primary transition-all bg-gray-50/30">
										<option value="Restock">Restock</option>
										<option value="Initial Entry">Initial Entry</option>
										<option value="Return">Return</option>
										<option value="Gift/Promo">Gift/Promo</option>
										<option value="Correction">Correction</option>
									</select>
								</div>

								<div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
									<div className="flex items-center gap-2 mb-4">
										<Receipt className="h-4 w-4 text-primary" />
										<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reference No.</label>
									</div>
									<input type="text" value={draft?.details?.Reference || ""} onChange={(e) => updateDraft("details.Reference", e.target.value)} placeholder="Auto-generated if empty" className="w-full rounded-xl border-gray-200 text-sm font-bold focus:ring-primary transition-all bg-gray-50/30" />
								</div>

								<div className="mt-8 bg-primary rounded-3xl p-8 shadow-2xl shadow-primary/30 relative overflow-hidden group">
									<div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
									<div className="relative z-10 text-white">
										<div className="flex items-center justify-between mb-4">
											<span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Total Batch Amount</span>
											<FileDigit className="h-5 w-5 text-white/50" />
										</div>
										<div className="flex items-baseline gap-1">
											<span className="text-sm font-bold text-white/80">PHP</span>
											<span className="text-4xl font-black tracking-tight">{money(totalAmount)}</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<div className="border-t bg-white px-10 py-8 flex items-center justify-end gap-6 shadow-2xl relative z-20">
						<button type="button" onClick={attemptClose} className="text-sm font-black text-gray-400 hover:text-red-500 uppercase tracking-widest transition-all">Discard Draft</button>
						<button type="button" onClick={() => onSaveAndClose(draft)} className="px-8 py-4 rounded-2xl border-2 border-primary/10 bg-primary/5 text-sm font-black text-primary hover:bg-primary/10 hover:border-primary/20 transition-all flex items-center gap-3">
							<FileText className="h-5 w-5" />
							Save to Drafts
						</button>
						<button type="submit" disabled={processing || allLines.length === 0} className="px-12 py-4 rounded-2xl bg-primary text-sm font-black text-white shadow-2xl shadow-primary/40 hover:bg-primary-hover hover:scale-[1.03] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none flex items-center gap-3 uppercase tracking-wider">
							<PlusCircle className="h-5 w-5" />
							{submitLabel || "Record Batch"}
						</button>
					</div>
				</form>
			</div>

			{editingLine && (
				<div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm" onClick={() => setEditingLine(null)} />
					<div className="relative w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in duration-300">
						<div className="flex items-center gap-4 mb-8">
							<div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
								<FileText className="h-6 w-6 text-primary" />
							</div>
							<div>
								<h4 className="text-xl font-black text-gray-900 tracking-tight">Edit Line Item</h4>
								<p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{editingLine.ItemName}</p>
							</div>
						</div>
						<div className="space-y-6">
							<div className="grid grid-cols-2 gap-6">
								<div className="space-y-2">
									<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quantity Added</label>
									<input type="number" min="0" value={editingLine.QuantityAdded} onChange={(e) => setEditingLine({...editingLine, QuantityAdded: e.target.value})} className="w-full rounded-2xl border-gray-100 bg-gray-50/50 p-4 font-black text-lg focus:ring-primary transition-all ring-1 ring-black/[0.03]" />
								</div>
								<div className="space-y-2">
									<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Unit Cost (PHP)</label>
									<input type="number" min="0" step="0.01" value={editingLine.UnitCost} onChange={(e) => setEditingLine({...editingLine, UnitCost: e.target.value})} className="w-full rounded-2xl border-gray-100 bg-gray-50/50 p-4 font-black text-lg focus:ring-primary transition-all ring-1 ring-black/[0.03]" />
								</div>
							</div>
							<div className="flex flex-col gap-3 pt-4">
								<button type="button" onClick={saveEdit} className="w-full py-4 rounded-2xl bg-primary text-sm font-black text-white shadow-xl shadow-primary/30 hover:bg-primary-hover active:scale-95 transition-all uppercase tracking-widest">Update Line Item</button>
								<button type="button" onClick={() => setEditingLine(null)} className="w-full py-4 rounded-2xl border-2 border-gray-100 text-sm font-black text-gray-400 hover:bg-gray-50 transition-all uppercase tracking-widest">Cancel Changes</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{showExitWarning && (
				<div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm" />
					<div className="relative w-full max-w-md rounded-3xl bg-white p-10 shadow-2xl ring-1 ring-black/5 animate-in slide-in-from-bottom-8 duration-300">
						<div className="h-16 w-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-8 mx-auto">
							<Trash2 className="h-8 w-8" />
						</div>
						<h4 className="text-2xl font-black text-gray-900 text-center mb-3">Discard Progress?</h4>
						<p className="text-gray-500 text-center mb-10 font-medium leading-relaxed">You have unsaved changes in this batch. What would you like to do before leaving?</p>
						<div className="flex flex-col gap-3">
							<button type="button" onClick={() => { setShowExitWarning(false); onCancelAndClear(); }} className="w-full py-4 rounded-2xl bg-red-50 text-red-600 font-black hover:bg-red-100 transition-all uppercase tracking-widest text-sm">Discard Everything</button>
							<button type="button" onClick={() => { setShowExitWarning(false); onSaveAndClose(draft); }} className="w-full py-4 rounded-2xl bg-primary text-white font-black shadow-xl shadow-primary/30 hover:bg-primary-hover active:scale-95 transition-all uppercase tracking-widest text-sm">Save to Drafts & Exit</button>
							<button type="button" onClick={() => setShowExitWarning(false)} className="w-full py-4 rounded-2xl border-2 border-gray-100 font-black text-gray-400 hover:bg-gray-50 transition-all text-sm uppercase tracking-widest mt-2">Continue Working</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
