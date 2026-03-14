import React, { useEffect, useMemo, useState } from "react";
import { 
	Package, 
	ShoppingCart, 
	Plus, 
	Trash2, 
	ClipboardList, 
	ShoppingBag, 
	Info,
	Calendar as CalendarIcon,
	User,
	Tag,
	Receipt,
	FileDigit,
	PlusCircle,
	FileText,
	Box,
	Truck,
	X,
	Search
} from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { 
	Select, 
	SelectContent, 
	SelectItem, 
	SelectTrigger, 
	SelectValue 
} from "@/Components/ui/select";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { Badge } from "@/Components/ui/badge";
import { Separator } from "@/Components/ui/separator";

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
		PurchaseDate: "",
		ReceiptNumber: "",
		InvoiceNumber: "",
		AdditionalDetails: "",
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

	return (
		<Dialog open={show} onOpenChange={(open) => !open && attemptClose()}>
			<DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] p-0 overflow-hidden flex flex-col">
				<DialogHeader className="px-8 py-4 border-b bg-card flex-row items-center justify-between space-y-0">
					<div>
						<DialogTitle className="text-2xl font-black">{title || "New Stock-In Batch"}</DialogTitle>
						<DialogDescription>Record incoming raw materials or purchased products.</DialogDescription>
					</div>
					<div className="flex items-center gap-3 pr-8">
						<Badge variant="secondary" className="px-4 py-2 text-sm font-bold gap-2">
							<ClipboardList className="h-4 w-4" />
							{allLines.length} Items Selected
						</Badge>
					</div>
				</DialogHeader>

				<form onSubmit={submitRecord} className="flex-1 overflow-hidden flex flex-col">
					<div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
						{/* Left Panel: Selection */}
						<div className="lg:col-span-4 border-r bg-muted/20 p-6 flex flex-col overflow-hidden">
							<div className="flex gap-1 bg-muted p-1 rounded-xl mb-4">
								<Button 
									type="button" 
									variant={activeTab === "inventory" ? "default" : "ghost"} 
									className="flex-1 rounded-lg"
									onClick={() => setActiveTab("inventory")}
								>
									Raw Materials
								</Button>
								<Button 
									type="button" 
									variant={activeTab === "products" ? "default" : "ghost"} 
									className="flex-1 rounded-lg"
									onClick={() => setActiveTab("products")}
								>
									Purchased Goods
								</Button>
							</div>

							<div className="relative mb-4">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input 
									value={searchQuery} 
									onChange={(e) => setSearchQuery(e.target.value)} 
									placeholder={`Search ${activeTab === "inventory" ? "raw materials" : "products"}...`} 
									className="pl-9 bg-background"
								/>
							</div>

							<ScrollArea className="flex-1 pr-4">
								<div className="space-y-3 pb-4">
									{filteredList.map((item) => (
										<div key={item.ID} className="group rounded-xl border bg-card p-4 shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-200">
											<div className="flex justify-between items-start mb-3">
												<div className="font-bold uppercase tracking-tight text-sm">{item.ItemName || item.ProductName}</div>
												<Badge variant="outline" className="text-[10px] font-black uppercase">
													{item.Measurement || "units"}
												</Badge>
											</div>
											<div className="grid grid-cols-12 gap-2 items-end">
												<div className="col-span-4 space-y-1">
													<Label className="text-[9px] font-black uppercase text-muted-foreground">Qty</Label>
													<Input 
														type="number" 
														min="0" 
														value={draft?.[activeTab === "inventory" ? "inventoryInputs" : "productInputs"]?.[item.ID]?.QuantityAdded || ""} 
														onChange={(e) => setInputValue(activeTab === "inventory" ? "inventoryInputs" : "productInputs", item.ID, "QuantityAdded", e.target.value)} 
														className="h-9"
													/>
												</div>
												<div className="col-span-5 space-y-1">
													<Label className="text-[9px] font-black uppercase text-muted-foreground">Unit Cost</Label>
													<div className="relative">
														<span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">P</span>
														<Input 
															type="number" 
															min="0" 
															step="0.01" 
															value={draft?.[activeTab === "inventory" ? "inventoryInputs" : "productInputs"]?.[item.ID]?.UnitCost || ""} 
															onChange={(e) => setInputValue(activeTab === "inventory" ? "inventoryInputs" : "productInputs", item.ID, "UnitCost", e.target.value)} 
															className="h-9 pl-5"
														/>
													</div>
												</div>
												<div className="col-span-3">
													<Button 
														type="button" 
														size="icon"
														onClick={() => addLine(item)} 
														className="w-full h-9 shadow-md"
													>
														<Plus className="h-4 w-4" />
													</Button>
												</div>
											</div>
										</div>
									))}
								</div>
							</ScrollArea>
						</div>

						{/* Center Panel: Current Selection */}
						<div className="lg:col-span-5 bg-background p-8 flex flex-col overflow-hidden border-r">
							<div className="flex items-center justify-between mb-6">
								<h4 className="text-lg font-black flex items-center gap-3 italic uppercase tracking-tighter">
									<div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
										<Package className="h-5 w-5 text-primary" />
									</div>
									Batch Contents
								</h4>
								<span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Selected Items</span>
							</div>

							<ScrollArea className="flex-1 pr-4">
								<div className="space-y-4 pb-4">
									{allLines.length === 0 && (
										<div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20 border-2 border-dashed rounded-3xl opacity-50">
											<ShoppingCart className="h-16 w-16 mb-4 stroke-1" />
											<p className="font-bold uppercase tracking-widest text-xs text-center leading-relaxed">Your batch is empty.<br/>Add items to begin.</p>
										</div>
									)}
									{allLines.map((line) => (
										<div key={line.key} className="flex items-center justify-between p-5 rounded-2xl border bg-card shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300 group relative overflow-hidden">
											<div className="absolute inset-y-0 left-0 w-1 bg-primary transform -translate-x-full group-hover:translate-x-0 transition-transform" />
											<div className="flex items-center gap-4">
												<div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-inner ${line.ItemType === 'Inventory' ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-500/10 text-blue-600'}`}>
													{line.ItemType === 'Inventory' ? <Box className="h-6 w-6" /> : <ShoppingBag className="h-6 w-6" />}
												</div>
												<div>
													<div className="font-black text-sm uppercase tracking-tight group-hover:text-primary transition-colors">{line.ItemName}</div>
													<div className="text-[10px] font-black tracking-widest text-muted-foreground uppercase mt-1 opacity-70">{line.ItemType} &bull; {line.Measurement}</div>
												</div>
											</div>
											<div className="flex items-center gap-6">
												<div className="text-right">
													<div className="text-xs font-black">P {money(line.UnitCost)}</div>
													<div className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase opacity-60">Unit</div>
												</div>
												<div className="text-right border-l pl-6">
													<div className="text-xl font-black text-primary">{line.QuantityAdded}</div>
													<div className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase opacity-60">Qty</div>
												</div>
												<div className="flex items-center gap-1">
													<Button 
														type="button" 
														variant="ghost" 
														size="icon"
														onClick={() => startEdit(line.ItemType === 'Inventory' ? 'inventoryLines' : 'productLines', line)} 
														className="text-muted-foreground hover:text-primary"
													>
														<FileText className="h-4 w-4" />
													</Button>
													<Button 
														type="button" 
														variant="ghost" 
														size="icon"
														onClick={() => removeLine(line.ItemType === 'Inventory' ? 'inventoryLines' : 'productLines', line.key)} 
														className="text-muted-foreground hover:text-destructive"
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											</div>
										</div>
									))}
								</div>
							</ScrollArea>
						</div>

						{/* Right Panel: Details */}
						<div className="lg:col-span-3 bg-muted/20 p-8 overflow-y-auto">
							<h4 className="text-lg font-black mb-8 flex items-center gap-3 italic uppercase tracking-tighter">
								<div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center">
									<Info className="h-5 w-5 text-background" />
								</div>
								Batch Details
							</h4>
							
							<div className="space-y-6 pb-20">
								<div className="space-y-2">
									<Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
										<CalendarIcon className="h-3 w-3" /> Entry Date
									</Label>
									<Input 
										type="date" 
										value={draft?.details?.Date || ""} 
										onChange={(e) => updateDraft("details.Date", e.target.value)} 
										required 
										className="bg-background font-bold h-11"
									/>
								</div>

								<div className="space-y-2">
									<Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
										<Truck className="h-3 w-3" /> Supplier Name *
									</Label>
									<Input 
										type="text" 
										value={draft?.details?.Supplier || ""} 
										onChange={(e) => updateDraft("details.Supplier", e.target.value)} 
										required 
										placeholder="Required" 
										className="bg-background font-bold h-11"
									/>
								</div>

								<div className="space-y-2">
									<Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
										<Tag className="h-3 w-3" /> Stock-In Type
									</Label>
									<Select 
										value={draft?.details?.Type || "Restock"} 
										onValueChange={(val) => updateDraft("details.Type", val)}
									>
										<SelectTrigger className="bg-background font-bold h-11">
											<SelectValue placeholder="Select type" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="Restock">Restock</SelectItem>
											<SelectItem value="Initial Entry">Initial Entry</SelectItem>
											<SelectItem value="Return">Return</SelectItem>
											<SelectItem value="Gift/Promo">Gift/Promo</SelectItem>
											<SelectItem value="Correction">Correction</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
										<Receipt className="h-3 w-3" /> Reference No.
									</Label>
									<Input 
										type="text" 
										value={draft?.details?.Reference || ""} 
										onChange={(e) => updateDraft("details.Reference", e.target.value)} 
										placeholder="Auto-generated if empty" 
										className="bg-background font-bold h-11"
									/>
								</div>

								<div className="mt-8 relative pt-6">
									<div className="absolute top-0 left-0 w-full h-[2px] bg-primary group" />
									<div className="bg-primary rounded-3xl p-8 shadow-2xl shadow-primary/30 relative overflow-hidden group">
										<div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
										<div className="relative z-10 text-primary-foreground">
											<div className="flex items-center justify-between mb-4">
												<span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Total Batch Amount</span>
												<FileDigit className="h-5 w-5 opacity-50" />
											</div>
											<div className="flex items-baseline gap-1">
												<span className="text-sm font-bold opacity-80">PHP</span>
												<span className="text-4xl font-black tracking-tighter">{money(totalAmount)}</span>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Footer */}
					<DialogFooter className="p-6 border-t bg-card h-[100px] items-center px-10">
						<div className="flex-1 flex items-center gap-8">
							<Button 
								type="button" 
								variant="ghost" 
								className="text-muted-foreground hover:text-destructive font-bold uppercase tracking-widest text-xs"
								onClick={attemptClose}
							>
								Discard Draft
							</Button>
							<Separator orientation="vertical" className="h-6" />
							<Button 
								type="button" 
								variant="outline" 
								className="gap-2 font-bold uppercase tracking-widest text-xs h-12 px-6"
								onClick={() => onSaveAndClose(draft)}
							>
								<FileText className="h-4 w-4" />
								Save to Drafts
							</Button>
						</div>
						<div className="flex items-center gap-4">
							<Button 
								type="submit" 
								disabled={processing || allLines.length === 0}
								className="h-14 px-12 rounded-2xl bg-primary text-sm font-black text-white shadow-2xl shadow-primary/40 hover:scale-[1.02] active:scale-95 transition-all gap-3 uppercase tracking-wider"
							>
								<PlusCircle className="h-5 w-5" />
								{submitLabel || "Record Batch"}
							</Button>
						</div>
					</DialogFooter>
				</form>
			</DialogContent>

			{/* Nested Dialogs (Warnings and Edits) */}
			<Dialog open={Boolean(editingLine)} onOpenChange={(open) => !open && setEditingLine(null)}>
				{editingLine && (
					<DialogContent className="sm:max-w-[500px] p-8 rounded-3xl">
						<DialogHeader className="mb-8">
							<div className="flex items-center gap-4">
								<div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
									<FileText className="h-6 w-6 text-primary" />
								</div>
								<div className="text-left">
									<DialogTitle className="text-2xl font-black tracking-tight">Edit Line Item</DialogTitle>
									<DialogDescription className="text-xs font-bold uppercase tracking-widest text-primary">{editingLine.ItemName}</DialogDescription>
								</div>
							</div>
						</DialogHeader>
						<div className="grid grid-cols-2 gap-6 mb-8">
							<div className="space-y-2">
								<Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Quantity Added</Label>
								<Input 
									type="number" 
									min="0" 
									value={editingLine.QuantityAdded} 
									onChange={(e) => setEditingLine({...editingLine, QuantityAdded: e.target.value})} 
									className="h-14 text-xl font-black rounded-2xl bg-muted/30"
								/>
							</div>
							<div className="space-y-2">
								<Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Unit Cost (PHP)</Label>
								<Input 
									type="number" 
									min="0" 
									step="0.01" 
									value={editingLine.UnitCost} 
									onChange={(e) => setEditingLine({...editingLine, UnitCost: e.target.value})} 
									className="h-14 text-xl font-black rounded-2xl bg-muted/30"
								/>
							</div>
						</div>
						<DialogFooter className="flex flex-col gap-3">
							<Button 
								type="button" 
								onClick={saveEdit} 
								className="w-full h-14 rounded-2xl bg-primary text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/30"
							>
								Update Item
							</Button>
							<Button 
								type="button" 
								variant="ghost" 
								onClick={() => setEditingLine(null)} 
								className="w-full h-12 rounded-2xl text-muted-foreground font-black uppercase tracking-widest"
							>
								Cancel Changes
							</Button>
						</DialogFooter>
					</DialogContent>
				)}
			</Dialog>

			<Dialog open={showExitWarning} onOpenChange={setShowExitWarning}>
				<DialogContent className="sm:max-w-[450px] p-10 rounded-3xl">
					<DialogHeader>
						<div className="h-16 w-16 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center mb-6 mx-auto">
							<Trash2 className="h-8 w-8" />
						</div>
						<DialogTitle className="text-2xl font-black text-center mb-2">Discard Progress?</DialogTitle>
						<DialogDescription className="text-center text-muted-foreground font-medium text-base mb-6 leading-relaxed">
							You have unsaved changes in this batch. What would you like to do before leaving?
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-3">
						<Button 
							type="button" 
							variant="destructive" 
							className="h-14 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-destructive/20"
							onClick={() => { setShowExitWarning(false); onCancelAndClear(); }}
						>
							Discard Everything
						</Button>
						<Button 
							type="button" 
							className="h-14 rounded-2xl bg-primary text-white font-black shadow-xl shadow-primary/30 uppercase tracking-widest text-sm"
							onClick={() => { setShowExitWarning(false); onSaveAndClose(draft); }}
						>
							Save to Drafts & Exit
						</Button>
						<Button 
							type="button" 
							variant="ghost" 
							className="h-12 rounded-2xl font-black text-muted-foreground uppercase tracking-widest text-xs mt-2"
							onClick={() => setShowExitWarning(false)}
						>
							Continue Working
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</Dialog>
	);
}
