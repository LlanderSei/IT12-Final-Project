import React, { useEffect, useState } from "react";
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
import { Image as ImageIcon, X, Upload, Trash2, Box, Tag, DollarSign, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { Separator } from "@/Components/ui/separator";

export default function ProductFormModal({
	open,
	onOpenChange,
	data,
	setData,
	processing,
	errors,
	onSubmit,
	onDelete,
	editingProduct,
	categories,
	selectedImagePreview,
	existingImageUrl,
	removeSelectedImage,
	handleImageSelection,
	imageInputKey,
	canDelete = false,
}) {
	const previewUrl = selectedImagePreview || existingImageUrl;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[700px] h-[90vh] p-0 flex flex-col overflow-hidden">
				<DialogHeader className="px-8 py-6 border-b bg-card">
					<DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">
						{editingProduct ? "Revise Finished Good" : "New Product Entry"}
					</DialogTitle>
					<DialogDescription>
						{editingProduct ? "Modify specifications for this production item." : "Introduce a new finished product to the distribution list."}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={onSubmit} className="flex-1 overflow-hidden flex flex-col">
					<ScrollArea className="flex-1 p-8">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-10 pb-8">
							{/* Left Column: Core Info */}
							<div className="space-y-6">
								<div className="space-y-2">
									<Label htmlFor="ProductName" className="text-[10px] font-black uppercase text-muted-foreground ml-1">Product Name *</Label>
									<div className="relative">
										<Box className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
										<Input
											id="ProductName"
											value={data.ProductName}
											onChange={(e) => setData("ProductName", e.target.value)}
											required
											placeholder="e.g. Classic Pandesal"
											className="pl-10 font-bold h-12 text-base focus-visible:ring-primary"
										/>
									</div>
									{errors.ProductName && <p className="text-[10px] text-destructive font-black uppercase pl-1">{errors.ProductName}</p>}
								</div>

								<div className="space-y-2">
									<Label htmlFor="CategoryID" className="text-[10px] font-black uppercase text-muted-foreground ml-1">Category *</Label>
									<Select 
										value={String(data.CategoryID)} 
										onValueChange={(val) => setData("CategoryID", val)}
									>
										<SelectTrigger id="CategoryID" className="h-12 font-bold focus:ring-primary">
											<div className="flex items-center gap-3">
												<Tag className="h-4 w-4 text-muted-foreground opacity-50" />
												<SelectValue placeholder="Select Category" />
											</div>
										</SelectTrigger>
										<SelectContent>
											{categories?.map((cat) => (
												<SelectItem key={cat.ID} value={String(cat.ID)} className="font-bold">
													{cat.CategoryName}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{errors.CategoryID && <p className="text-[10px] text-destructive font-black uppercase pl-1">{errors.CategoryID}</p>}
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="Price" className="text-[10px] font-black uppercase text-muted-foreground ml-1">Unit Price (₱) *</Label>
										<div className="relative">
											<span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-muted-foreground opacity-50 text-xs">P</span>
											<Input
												id="Price"
												type="number"
												step="0.01"
												min="0"
												value={data.Price}
												onChange={(e) => setData("Price", e.target.value)}
												required
												className="pl-8 font-black h-12 text-lg focus-visible:ring-primary"
											/>
										</div>
										{errors.Price && <p className="text-[10px] text-destructive font-black uppercase pl-1">{errors.Price}</p>}
									</div>

									<div className="space-y-2">
										<Label htmlFor="LowStockThreshold" className="text-[10px] font-black uppercase text-muted-foreground ml-1">Low Alert Qty *</Label>
										<div className="relative">
											<AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
											<Input
												id="LowStockThreshold"
												type="number"
												min="0"
												value={data.LowStockThreshold}
												onChange={(e) => setData("LowStockThreshold", e.target.value)}
												required
												className="pl-10 font-black h-12 text-lg focus-visible:ring-primary"
											/>
										</div>
										{errors.LowStockThreshold && <p className="text-[10px] text-destructive font-black uppercase pl-1">{errors.LowStockThreshold}</p>}
									</div>
								</div>

								<div className="space-y-2 pt-2">
									<Label htmlFor="ProductDescription" className="text-[10px] font-black uppercase text-muted-foreground ml-1">Short Description</Label>
									<Textarea
										id="ProductDescription"
										value={data.ProductDescription}
										onChange={(e) => setData("ProductDescription", e.target.value)}
										rows={3}
										placeholder="Describe flavor profile, ingredients, or allergens..."
										className="resize-none font-medium h-24"
									/>
								</div>
							</div>

							{/* Right Column: Visuals */}
							<div className="space-y-6">
								<div className="space-y-4">
									<Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-2">
										<ImageIcon className="h-3 w-3" /> Product Visual
									</Label>
									
									<div className="relative group rounded-[2rem] overflow-hidden border-2 border-dashed aspect-square bg-muted flex flex-col items-center justify-center transition-all hover:bg-muted/50 hover:border-primary/30">
										{previewUrl ? (
											<div className="absolute inset-0 w-full h-full">
												<img
													src={previewUrl}
													alt="Product preview"
													className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
												/>
												<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
													<Button 
														type="button" 
														variant="destructive" 
														size="icon" 
														className="rounded-full h-12 w-12 shadow-2xl"
														onClick={removeSelectedImage}
													>
														<Trash2 className="h-6 w-6" />
													</Button>
													<Button 
														type="button" 
														variant="secondary" 
														className="rounded-full h-12 px-6 font-black uppercase tracking-widest text-[10px]"
														onClick={() => document.getElementById("ProductImage").click()}
													>
														Replace
													</Button>
												</div>
											</div>
										) : (
											<div className="flex flex-col items-center gap-4 text-muted-foreground cursor-pointer" onClick={() => document.getElementById("ProductImage").click()}>
												<div className="h-20 w-20 rounded-3xl bg-background flex items-center justify-center shadow-inner">
													<Upload className="h-10 w-10 opacity-30" />
												</div>
												<div className="text-center">
													<p className="text-xs font-black uppercase tracking-widest">Upload Photo</p>
													<p className="text-[10px] mt-1 opacity-50 font-medium">JPG, PNG or WEBP &bull; Max 2MB</p>
												</div>
											</div>
										)}
										<input
											key={imageInputKey}
											type="file"
											id="ProductImage"
											accept="image/*"
											onChange={handleImageSelection}
											className="hidden"
										/>
									</div>
									{errors.ProductImage && <p className="text-[10px] text-destructive font-black uppercase pl-1 text-center">{errors.ProductImage}</p>}
								</div>
							</div>
						</div>
					</ScrollArea>

					<DialogFooter className="p-8 border-t bg-card h-[120px] items-center px-10 gap-6">
						<div className="flex-1 flex items-center gap-4">
							{editingProduct && (
								<Button
									type="button"
									variant="ghost"
									className="text-muted-foreground hover:text-destructive font-black uppercase tracking-widest text-[10px] gap-2 h-12"
									onClick={onDelete}
									disabled={!canDelete || processing}
								>
									<Trash2 className="h-4 w-4" /> Delete Product
								</Button>
							)}
						</div>
						<div className="flex items-center gap-4">
							<Button
								type="button"
								variant="ghost"
								onClick={() => onOpenChange(false)}
								className="font-black uppercase tracking-widest text-[10px] h-12 px-8"
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={processing}
								className="h-14 px-12 rounded-2xl bg-primary text-sm font-black text-white shadow-2xl shadow-primary/40 hover:scale-[1.05] active:scale-95 transition-all gap-3 uppercase tracking-wider"
							>
								{editingProduct ? "Consolidate Changes" : "Confirm Entry"}
							</Button>
						</div>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
