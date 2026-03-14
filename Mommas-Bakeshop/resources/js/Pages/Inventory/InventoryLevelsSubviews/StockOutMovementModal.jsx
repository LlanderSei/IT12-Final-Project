import React, { useEffect, useMemo, useState } from "react";
import { 
	Package, 
	ShoppingCart, 
	Plus, 
	Trash2, 
	ClipboardList, 
	ShoppingBag, 
	PlusCircle,
	Calendar as CalendarIcon,
	Tag,
	FileText,
	FileDigit,
	Info,
	Search,
	AlertTriangle,
	X,
	Box
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
import { Textarea } from "@/Components/ui/textarea";

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
	const [activeTab, setActiveTab] = useState("inventory");
	const [searchQuery, setSearchQuery] = useState("");

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

	const filteredList = useMemo(() => {
		const list = activeTab === "inventory" ? (inventory || []) : (products || []);
		const query = searchQuery.trim().toLowerCase();
		if (!query) return list;
		return list.filter((item) =>
			(item.ItemName || item.ProductName || "").toLowerCase().includes(query)
		);
	}, [activeTab, inventory, products, searchQuery]);

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

	const addLine = (item) => {
		const group = activeTab === "inventory" ? "inventoryInputs" : "productInputs";
		const row = (draft?.[group] || {})[item.ID] || {};
		const issues = [];
		const itemName = item.ItemName || item.ProductName;
		
		if (!String(row.QuantityRemoved ?? "").trim()) issues.push(`"${itemName}": Quantity is required.`);
		const qty = Number(row.QuantityRemoved || 0);
		if (qty <= 0) issues.push(`"${itemName}": Quantity must be greater than 0.`);
		if (qty > (item.Quantity || 0)) issues.push(`"${itemName}": Only ${item.Quantity} available.`);
		
		if (issues.length > 0) {
			showValidationToast(issues);
			return;
		}

		setDraft((prev) => ({
			...prev,
			[activeTab === "inventory" ? "inventoryLines" : "productLines"]: [
				...(prev[activeTab === "inventory" ? "inventoryLines" : "productLines"] || []),
				{
					key: `${activeTab}-${item.ID}-${Date.now()}`,
					ItemType: activeTab === "inventory" ? "Inventory" : "Product",
					InventoryID: activeTab === "inventory" ? item.ID : null,
					ProductID: activeTab === "inventory" ? null : item.ID,
					ItemName: itemName,
					QuantityRemoved: qty,
					Measurement: item.Measurement || "units"
				},
			],
			[group]: {
				...(prev[group] || {}),
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

	const submitRecord = (e) => {
		e.preventDefault();
		const issues = [];
		if (!allLines.length) issues.push("Add at least one item to stock-out.");
		if (!(draft?.details?.ReasonType || "").trim()) issues.push("Please select a reason for stock-out.");
		
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

	return (
		<Dialog open={show} onOpenChange={(open) => !open && attemptClose()}>
			<DialogContent className="max-w-[95vw] w-[1300px] h-[90vh] p-0 overflow-hidden flex flex-col">
				<DialogHeader className="px-8 py-4 border-b bg-card flex-row items-center justify-between space-y-0">
					<div>
						<DialogTitle className="text-2xl font-black uppercase italic tracking-tighter text-destructive">
							{title || "Stock-Out Batch"}
						</DialogTitle>
						<DialogDescription>Record stock reduction due to usage, waste, or other reasons.</DialogDescription>
					</div>
					<div className="flex items-center gap-3 pr-8">
						<Badge variant="destructive" className="px-4 py-2 text-sm font-bold gap-2">
							<AlertTriangle className="h-4 w-4" />
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
									className={`flex-1 rounded-lg ${activeTab === "inventory" ? "bg-destructive hover:bg-destructive/90" : ""}`}
									onClick={() => setActiveTab("inventory")}
								>
									Raw Materials
								</Button>
								<Button 
									type="button" 
									variant={activeTab === "products" ? "default" : "ghost"} 
									className={`flex-1 rounded-lg ${activeTab === "products" ? "bg-destructive hover:bg-destructive/90" : ""}`}
									onClick={() => setActiveTab("products")}
								>
									Manufactured
								</Button>
							</div>

							<div className="relative mb-4">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input 
									value={searchQuery} 
									onChange={(e) => setSearchQuery(e.target.value)} 
									placeholder={`Search ${activeTab === "inventory" ? "raw materials" : "products"}...`} 
									className="pl-9 bg-background focus-visible:ring-destructive"
								/>
							</div>

							<ScrollArea className="flex-1 pr-4">
								<div className="space-y-3 pb-4">
									{filteredList.map((item) => (
										<div key={item.ID} className="group rounded-xl border bg-card p-4 shadow-sm hover:shadow-md hover:border-destructive/50 transition-all duration-200">
											<div className="flex justify-between items-start mb-3">
												<div className="font-bold uppercase tracking-tight text-sm">{item.ItemName || item.ProductName}</div>
												<Badge variant="outline" className="text-[10px] font-black uppercase text-muted-foreground">
													Bal: {item.Quantity} {item.Measurement || 'units'}
												</Badge>
											</div>
											<div className="flex gap-2 items-end">
												<div className="flex-1 space-y-1">
													<Label className="text-[9px] font-black uppercase text-muted-foreground">Qty To Remove</Label>
													<Input 
														type="number" 
														min="0" 
														value={draft?.[activeTab === "inventory" ? "inventoryInputs" : "productInputs"]?.[item.ID]?.QuantityRemoved || ""} 
														onChange={(e) => setInputValue(activeTab === "inventory" ? "inventoryInputs" : "productInputs", item.ID, "QuantityRemoved", e.target.value)} 
														className="h-10 focus-visible:ring-destructive"
													/>
												</div>
												<Button 
													type="button" 
													variant="outline"
													className="h-10 border-destructive text-destructive hover:bg-destructive/10"
													onClick={() => addLine(item)} 
												>
													ADD
												</Button>
											</div>
										</div>
									))}
								</div>
							</ScrollArea>
						</div>

						{/* Center Panel: Current Selection */}
						<div className="lg:col-span-5 bg-background p-8 flex flex-col overflow-hidden border-r">
							<div className="flex items-center justify-between mb-6">
								<h4 className="text-lg font-black flex items-center gap-3 italic uppercase tracking-tighter text-destructive">
									<div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive">
										<ClipboardList className="h-5 w-5" />
									</div>
									Reduction List
								</h4>
								<span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pending Removal</span>
							</div>

							<ScrollArea className="flex-1 pr-4">
								<div className="space-y-4 pb-4">
									{allLines.length === 0 && (
										<div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20 border-2 border-dashed rounded-3xl opacity-50">
											<ShoppingCart className="h-16 w-16 mb-4 stroke-1" />
											<p className="font-bold uppercase tracking-widest text-xs text-center leading-relaxed">No items selected.<br/>Identify stock to remove.</p>
										</div>
									)}
									{allLines.map((line) => (
										<div key={line.key} className="flex items-center justify-between p-5 rounded-2xl border bg-card shadow-sm hover:shadow-xl hover:border-destructive/20 transition-all duration-300 group relative overflow-hidden">
											<div className="absolute inset-y-0 left-0 w-1 bg-destructive transform -translate-x-full group-hover:translate-x-0 transition-transform" />
											<div className="flex items-center gap-4">
												<div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-inner ${line.ItemType === 'Inventory' ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-500/10 text-blue-600'}`}>
													{line.ItemType === 'Inventory' ? <Box className="h-6 w-6" /> : <ShoppingBag className="h-6 w-6" />}
												</div>
												<div>
													<div className="font-black text-sm uppercase tracking-tight group-hover:text-destructive transition-colors">{line.ItemName}</div>
													<div className="text-[10px] font-black tracking-widest text-muted-foreground uppercase mt-1 opacity-70">{line.ItemType} &bull; {line.Measurement}</div>
												</div>
											</div>
											<div className="flex items-center gap-8">
												<div className="text-right">
													<div className="text-2xl font-black text-destructive italic tracking-tighter">-{line.QuantityRemoved}</div>
													<div className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase opacity-60">Qty Removed</div>
												</div>
												<Button 
													type="button" 
													variant="ghost" 
													size="icon"
													onClick={() => removeLine(line.ItemType === 'Inventory' ? 'inventoryLines' : 'productLines', line.key)} 
													className="text-muted-foreground hover:text-destructive h-10 w-10"
												>
													<Trash2 className="h-5 w-5" />
												</Button>
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
								Batch Finalization
							</h4>
							
							<div className="space-y-6 pb-20">
								<div className="space-y-2">
									<Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
										<Tag className="h-3 w-3" /> Reason Category *
									</Label>
									<Select 
										value={draft?.details?.ReasonType || ""} 
										onValueChange={(val) => updateDraft("details.ReasonType", val)}
									>
										<SelectTrigger className="bg-background font-bold h-11 focus:ring-destructive">
											<SelectValue placeholder="Select reason" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="Kitchen Usage">Kitchen Usage</SelectItem>
											<SelectItem value="Production">Production</SelectItem>
											<SelectItem value="Waste / Spoilage">Waste / Spoilage</SelectItem>
											<SelectItem value="Damaged Goods">Damaged Goods</SelectItem>
											<SelectItem value="Store Display">Store Display</SelectItem>
											<SelectItem value="Inventory Correction">Inventory Correction</SelectItem>
											<SelectItem value="Other">Other</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
										<FileDigit className="h-3 w-3" /> Stock Source
									</Label>
									<Select 
										value={draft?.details?.Source || "Business"} 
										onValueChange={(val) => updateDraft("details.Source", val)}
									>
										<SelectTrigger className="bg-background font-bold h-11 focus:ring-destructive">
											<SelectValue placeholder="Select source" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="Business">Business</SelectItem>
											<SelectItem value="Purchased">Purchased</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
										<FileText className="h-3 w-3" /> Reason Notes
									</Label>
									<Textarea 
										value={draft?.details?.ReasonNote || ""} 
										onChange={(e) => updateDraft("details.ReasonNote", e.target.value)} 
										placeholder="Additional context..." 
										className="bg-background font-medium focus-visible:ring-destructive min-h-[120px]"
									/>
								</div>

								<div className="mt-8 relative pt-6 group">
									<div className="absolute top-0 left-0 w-full h-[2px] bg-destructive" />
									<div className="bg-destructive rounded-3xl p-8 shadow-2xl shadow-destructive/30 relative overflow-hidden">
										<div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
										<div className="relative z-10 text-white">
											<div className="flex items-center justify-between mb-4">
												<span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Total Qty Reduction</span>
												<FileDigit className="h-5 w-5 opacity-50" />
											</div>
											<div className="flex items-baseline gap-1">
												<span className="text-4xl font-black tracking-tighter">{totalItems}</span>
												<span className="text-xs font-bold opacity-80 uppercase tracking-widest">Units Total</span>
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
								className="gap-2 font-bold uppercase tracking-widest text-xs h-12 px-6 border-destructive text-destructive hover:bg-destructive/10"
								onClick={() => onSaveAndClose(draft)}
							>
								<FileText className="h-4 w-4" />
								Keep as Draft
							</Button>
						</div>
						<div className="flex items-center gap-4">
							<Button 
								type="submit" 
								disabled={processing || allLines.length === 0}
								className="h-14 px-12 rounded-2xl bg-destructive text-sm font-black text-white shadow-2xl shadow-destructive/40 hover:scale-[1.02] active:scale-95 transition-all gap-3 uppercase tracking-wider"
							>
								<PlusCircle className="h-5 w-5" />
								{submitLabel || "Record Stock-Out"}
							</Button>
						</div>
					</DialogFooter>
				</form>
			</DialogContent>

			{/* Warnings */}
			<Dialog open={showExitWarning} onOpenChange={setShowExitWarning}>
				<DialogContent className="sm:max-w-[450px] p-10 rounded-3xl">
					<DialogHeader>
						<div className="h-16 w-16 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center mb-6 mx-auto">
							<X className="h-8 w-8" />
						</div>
						<DialogTitle className="text-2xl font-black text-center mb-2">Unsaved Work</DialogTitle>
						<DialogDescription className="text-center text-muted-foreground font-medium text-base mb-6 leading-relaxed">
							You have items in your stock-out list. Discarding will lose current progress.
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
							variant="outline"
							className="h-14 rounded-2xl border-destructive text-destructive font-black shadow-xl shadow-destructive/10 uppercase tracking-widest text-sm"
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
