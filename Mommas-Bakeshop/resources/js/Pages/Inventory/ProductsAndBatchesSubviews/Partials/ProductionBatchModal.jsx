import React, { useState, useMemo } from "react";
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
import { Textarea } from "@/Components/ui/textarea";
import { 
	Package, 
	Plus, 
	Trash2, 
	Edit2, 
	Search, 
	PlusCircle, 
	Sparkles, 
	Box, 
	ChevronRight,
	ClipboardList,
	ChefHat,
	Info,
	ArrowRight
} from "lucide-react";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { Badge } from "@/Components/ui/badge";
import { Separator } from "@/Components/ui/separator";

export default function ProductionBatchModal({
	open,
	onOpenChange,
	draft,
	setDraft,
	products,
	categories,
	processing,
	onSubmit,
	attemptClose,
	addExistingProduct,
	addNewProduct,
	removeLine,
	startEditLine,
	totalItems
}) {
	const producedProducts = useMemo(() => 
		(products || []).filter(p => String(p.ProductFrom || "").toLowerCase() === "produced"),
	[products]);

	const filteredProducedProducts = useMemo(() => {
		const query = String(draft.searchQuery || "").trim().toLowerCase();
		if (!query) return producedProducts;
		return producedProducts.filter(p => 
			p.ProductName?.toLowerCase().includes(query) ||
			p.category?.CategoryName?.toLowerCase().includes(query)
		);
	}, [producedProducts, draft.searchQuery]);

	return (
		<Dialog open={open} onOpenChange={(open) => !open && attemptClose()}>
			<DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] p-0 overflow-hidden flex flex-col border-none shadow-2xl">
				<DialogHeader className="px-10 py-6 border-b bg-card flex-row items-center justify-between space-y-0">
					<div className="flex items-center gap-4">
						<div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
							<ChefHat className="h-7 w-7" />
						</div>
						<div>
							<DialogTitle className="text-3xl font-black italic uppercase tracking-tighter">Production Batch</DialogTitle>
							<DialogDescription className="font-medium text-muted-foreground">Log freshly produced items and consolidate your daily output.</DialogDescription>
						</div>
					</div>
					<div className="flex items-center gap-4 pr-10">
						<Badge variant="secondary" className="px-5 py-2 text-sm font-black uppercase tracking-widest gap-3 shadow-sm bg-muted">
							<ClipboardList className="h-4 w-4" />
							{draft.items.length} Product Lines
						</Badge>
					</div>
				</DialogHeader>

				<form onSubmit={onSubmit} className="flex-1 overflow-hidden flex flex-col bg-background">
					<div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
						{/* Left: Input Selection */}
						<div className="lg:col-span-4 border-r bg-muted/20 p-8 flex flex-col overflow-hidden">
							<div className="flex gap-2 bg-muted p-1.5 rounded-2xl mb-6 shadow-inner">
								<Button 
									type="button" 
									variant={draft.mode === "existing" ? "default" : "ghost"} 
									className={`flex-1 rounded-xl h-12 font-black uppercase text-[10px] tracking-widest transition-all ${draft.mode === 'existing' ? 'shadow-lg' : ''}`}
									onClick={() => setDraft(prev => ({ ...prev, mode: "existing" }))}
								>
									Existing Catalog
								</Button>
								<Button 
									type="button" 
									variant={draft.mode === "new" ? "default" : "ghost"} 
									className={`flex-1 rounded-xl h-12 font-black uppercase text-[10px] tracking-widest transition-all ${draft.mode === 'new' ? 'shadow-lg' : ''}`}
									onClick={() => setDraft(prev => ({ ...prev, mode: "new" }))}
								>
									<Plus className="mr-2 h-3 w-3" /> New Item
								</Button>
							</div>

							{draft.mode === "existing" ? (
								<div className="flex flex-col flex-1 overflow-hidden">
									<div className="relative mb-6">
										<Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
										<Input 
											value={draft.searchQuery} 
											onChange={(e) => setDraft(prev => ({ ...prev, searchQuery: e.target.value }))} 
											placeholder="Search produced goods..." 
											className="pl-11 h-12 bg-background border-2 border-muted hover:border-primary/30 transition-all font-medium"
										/>
									</div>
									<ScrollArea className="flex-1 -mr-4 pr-4">
										<div className="space-y-4 pb-10">
											{filteredProducedProducts.map((p) => (
												<div key={p.ID} className="group rounded-2xl border bg-card p-5 shadow-sm hover:shadow-xl hover:border-primary/50 transition-all duration-300 relative overflow-hidden">
													<div className="flex justify-between items-start mb-4">
														<div>
															<div className="font-black uppercase tracking-tight text-sm group-hover:text-primary transition-colors">{p.ProductName}</div>
															<div className="text-[10px] font-black tracking-widest text-muted-foreground uppercase opacity-70 mt-1 italic">{p.category?.CategoryName}</div>
														</div>
														<Badge variant="outline" className="text-[10px] font-black border-primary/20 text-primary">ID: {p.ID}</Badge>
													</div>
													<div className="grid grid-cols-12 gap-3 items-end">
														<div className="col-span-8 space-y-1">
															<Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Qty Produced</Label>
															<Input 
																type="number" 
																min="1" 
																value={draft.existingInputs[p.ID]?.QuantityProduced || ""} 
																onChange={(e) => {
																	const val = e.target.value;
																	setDraft(prev => ({
																		...prev,
																		existingInputs: { ...prev.existingInputs, [p.ID]: { QuantityProduced: val } }
																	}));
																}} 
																className="h-10 font-bold focus-visible:ring-primary"
															/>
														</div>
														<div className="col-span-4">
															<Button 
																type="button" 
																className="w-full h-10 shadow-lg shadow-primary/20 bg-primary group-hover:scale-105 active:scale-95 transition-all"
																onClick={() => addExistingProduct(p)}
															>
																<PlusCircle className="h-5 w-5" />
															</Button>
														</div>
													</div>
												</div>
											))}
										</div>
									</ScrollArea>
								</div>
							) : (
								<ScrollArea className="flex-1 -mr-4 pr-4">
									<div className="space-y-6 pb-10 animate-in fade-in slide-in-from-right-4 duration-500">
										<div className="p-6 rounded-3xl border bg-card/50 space-y-5">
											<div className="space-y-2">
												<Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Product Name *</Label>
												<Input 
													placeholder="Required" 
													value={draft.newProduct.ProductName} 
													onChange={(e) => setDraft(prev => ({ ...prev, newProduct: { ...prev.newProduct, ProductName: e.target.value } }))}
													className="h-11 font-bold"
												/>
											</div>
											<div className="space-y-2">
												<Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Category *</Label>
												<Select 
													value={String(draft.newProduct.CategoryID)} 
													onValueChange={(val) => setDraft(prev => ({ ...prev, newProduct: { ...prev.newProduct, CategoryID: val } }))}
												>
													<SelectTrigger className="h-11 font-bold">
														<SelectValue placeholder="Select Category" />
													</SelectTrigger>
													<SelectContent>
														{categories?.map(c => <SelectItem key={c.ID} value={String(c.ID)}>{c.CategoryName}</SelectItem>)}
													</SelectContent>
												</Select>
											</div>
											<div className="grid grid-cols-2 gap-4">
												<div className="space-y-2">
													<Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Price (₱)</Label>
													<Input 
														type="number" 
														step="0.01" 
														value={draft.newProduct.Price} 
														onChange={(e) => setDraft(prev => ({ ...prev, newProduct: { ...prev.newProduct, Price: e.target.value } }))}
														className="h-11 font-black"
													/>
												</div>
												<div className="space-y-2">
													<Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Low Alert</Label>
													<Input 
														type="number" 
														value={draft.newProduct.LowStockThreshold} 
														onChange={(e) => setDraft(prev => ({ ...prev, newProduct: { ...prev.newProduct, LowStockThreshold: e.target.value } }))}
														className="h-11 font-black"
													/>
												</div>
											</div>
											<div className="space-y-2">
												<Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Qty Produced *</Label>
												<Input 
													type="number" 
													value={draft.newProduct.QuantityProduced} 
													onChange={(e) => setDraft(prev => ({ ...prev, newProduct: { ...prev.newProduct, QuantityProduced: e.target.value } }))}
													className="h-14 text-xl font-black bg-muted/20 border-2"
												/>
											</div>
											<Button 
												type="button" 
												className="w-full h-14 rounded-2xl bg-foreground font-black uppercase tracking-widest text-[10px] gap-3 shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
												onClick={addNewProduct}
											>
												<Sparkles className="h-4 w-4" /> Create & Add to List
											</Button>
										</div>
									</div>
								</ScrollArea>
							)}
						</div>

						{/* Center: List of Items */}
						<div className="lg:col-span-5 bg-background p-10 flex flex-col overflow-hidden border-r shadow-inner">
							<div className="flex items-center justify-between mb-8">
								<h4 className="text-xl font-black flex items-center gap-4 italic uppercase tracking-tighter">
									<div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg">
										<ClipboardList className="h-6 w-6" />
									</div>
									Production List
								</h4>
								<span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-50">Draft Contents</span>
							</div>

							<ScrollArea className="flex-1 -mr-4 pr-4">
								<div className="space-y-5 pb-10">
									{draft.items.length === 0 && (
										<div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground py-20 border-2 border-dashed rounded-[3rem] bg-muted/5">
											<div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-6">
												<Package className="h-12 w-12 stroke-1 opacity-20" />
											</div>
											<p className="font-black uppercase tracking-[0.2em] text-[10px] text-center leading-relaxed">No production items identified.<br/>Use the left panel to begin your log.</p>
										</div>
									)}
									{draft.items.map((line) => (
										<div key={line.key} className="flex items-center justify-between p-6 rounded-[2rem] border bg-card shadow-sm hover:shadow-2xl hover:border-primary/20 transition-all duration-500 group relative">
											<div className="absolute inset-y-8 left-0 w-1 bg-primary rounded-r-full transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
											<div className="flex items-center gap-5">
												<div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center shadow-inner group-hover:bg-primary/10 transition-colors">
													<Box className="h-7 w-7 text-muted-foreground opacity-40 group-hover:text-primary transition-colors" />
												</div>
												<div>
													<div className="font-black text-base uppercase tracking-tight leading-tight group-hover:text-primary transition-colors">{line.ItemName}</div>
													<div className="flex items-center gap-2 mt-2">
														{line.CreateProduct ? (
															<Badge className="bg-foreground text-[8px] font-black tracking-widest uppercase h-4">NEW SKU</Badge>
														) : (
															<Badge variant="outline" className="text-[8px] font-black tracking-widest uppercase h-4 opacity-50">CATALOG</Badge>
														)}
														<span className="text-[10px] font-bold text-muted-foreground uppercase opacity-40">ITEM REF: {line.ProductID || 'GEN-SKU'}</span>
													</div>
												</div>
											</div>
											<div className="flex items-center gap-8">
												<div className="text-right pr-6 border-r border-muted">
													<div className="text-3xl font-black text-primary italic tracking-tighter">+{line.QuantityProduced}</div>
													<div className="text-[9px] font-black tracking-widest text-muted-foreground uppercase opacity-40 mt-1">Units Logged</div>
												</div>
												<div className="flex flex-col gap-2">
													<Button 
														type="button" 
														variant="ghost" 
														size="icon" 
														className="h-10 w-10 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-full shadow-sm"
														onClick={() => startEditLine(line)}
													>
														<Edit2 className="h-5 w-5" />
													</Button>
													<Button 
														type="button" 
														variant="ghost" 
														size="icon" 
														className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-full shadow-sm"
														onClick={() => removeLine(line.key)}
													>
														<Trash2 className="h-5 w-5" />
													</Button>
												</div>
											</div>
										</div>
									))}
								</div>
							</ScrollArea>
						</div>

						{/* Right: Finalization */}
						<div className="lg:col-span-3 bg-muted/20 p-10 overflow-y-auto">
							<h4 className="text-xl font-black mb-10 flex items-center gap-4 italic uppercase tracking-tighter">
								<div className="h-10 w-10 rounded-xl bg-foreground flex items-center justify-center text-background shadow-lg">
									<Info className="h-6 w-6" />
								</div>
								Finalize Log
							</h4>
							
							<div className="space-y-8">
								<div className="space-y-3">
									<Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 ml-1">
										<ClipboardList className="h-3 w-3" /> Batch Summary / Notes
									</Label>
									<Textarea 
										placeholder="Optional: Internal notes for this production run..."
										value={draft.details.BatchDescription}
										onChange={(e) => setDraft(prev => ({ ...prev, details: { ...prev.details, BatchDescription: e.target.value } }))}
										className="bg-background min-h-[160px] rounded-3xl p-6 font-medium focus-visible:ring-primary shadow-inner text-sm border-2"
									/>
								</div>

								<div className="mt-12 relative group">
									<div className="absolute -top-1 left-4 right-4 h-2 bg-primary rounded-full blur-sm opacity-30 group-hover:opacity-100 transition-opacity" />
									<div className="bg-primary rounded-[2.5rem] p-10 shadow-2xl shadow-primary/40 relative overflow-hidden transition-all group-hover:scale-[1.02]">
										<div className="absolute top-0 right-0 -mr-10 -mt-10 h-40 w-40 bg-white/10 rounded-full blur-3xl transform group-hover:scale-150 transition-transform duration-1000" />
										<div className="relative z-10 text-primary-foreground">
											<div className="flex items-center justify-between mb-6">
												<span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Total Production Run</span>
												<div className="h-8 w-8 bg-white/20 rounded-xl flex items-center justify-center">
													<ChevronRight className="h-5 w-5" />
												</div>
											</div>
											<div className="flex items-baseline gap-2">
												<span className="text-5xl font-black tracking-tighter drop-shadow-lg">{totalItems}</span>
												<span className="text-xs font-black uppercase tracking-widest opacity-70">Finished Units</span>
											</div>
											<div className="mt-6 pt-6 border-t border-white/10 flex items-center gap-3">
												<Info className="h-4 w-4 opacity-50" />
												<p className="text-[9px] font-bold opacity-60 uppercase tracking-tight">Stock will be instantly updated upon submission.</p>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Layout Footer */}
					<DialogFooter className="p-8 border-t bg-card h-[130px] items-center px-10">
						<div className="flex-1 flex items-center gap-10">
							<Button 
								type="button" 
								variant="ghost" 
								className="text-muted-foreground hover:text-destructive font-black uppercase tracking-widest text-[10px] h-12 px-6 hover:bg-destructive/5 rounded-2xl transition-all"
								onClick={attemptClose}
							>
								Abandon Production
							</Button>
							<Separator orientation="vertical" className="h-8" />
							<Button 
								type="button" 
								variant="outline" 
								className="gap-3 font-black uppercase tracking-widest text-[10px] h-14 px-8 border-2 rounded-[1.25rem] shadow-sm hover:bg-muted/50 active:scale-95 transition-all"
								onClick={() => { onOpenChange(false); }}
							>
								<History className="h-4 w-4" /> Keep as Draft
							</Button>
						</div>
						<div className="flex items-center gap-6">
							<Button 
								type="submit" 
								disabled={processing || draft.items.length === 0}
								className="h-16 px-16 rounded-[1.5rem] bg-primary text-sm font-black text-white shadow-2xl shadow-primary/50 hover:scale-[1.05] active:scale-95 transition-all gap-4 uppercase tracking-[0.1em]"
							>
								<PlusCircle className="h-6 w-6" /> Complete Batch Log
							</Button>
						</div>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

const History = ({ className }) => <ArrowRight className={className} />;
