import React from "react";
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
import { ScrollArea } from "@/Components/ui/scroll-area";
import { Trash2, Edit2, Plus, X } from "lucide-react";
import { Separator } from "@/Components/ui/separator";

export default function CategoryManagementModal({
	open,
	onOpenChange,
	categories,
	catData,
	setCatData,
	catProcessing,
	catErrors,
	onSubmit,
	onEdit,
	onDelete,
	editingCategory,
	cancelEdit,
	canCreate = false,
	canUpdate = false,
	canDelete = false,
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[450px]">
				<DialogHeader>
					<DialogTitle>Product Categories</DialogTitle>
					<DialogDescription>
						Manage the categories used to group your finished goods.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-4">
					<div className="space-y-4">
						<Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
							Existing Categories
						</Label>
						<ScrollArea className="h-[200px] border rounded-xl bg-muted/20 p-2">
							<div className="space-y-1">
								{categories?.length === 0 && (
									<div className="py-10 text-center text-xs text-muted-foreground italic">
										No categories found.
									</div>
								)}
								{categories?.map((cat) => (
									<div
										key={cat.ID}
										className="flex justify-between items-center px-4 py-3 rounded-lg bg-card border shadow-sm group hover:border-primary/50 transition-all"
									>
										<span className="text-sm font-bold truncate pr-4">
											{cat.CategoryName}
										</span>
										<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-muted-foreground hover:text-primary"
												onClick={() => onEdit(cat)}
												disabled={!canUpdate}
											>
												<Edit2 className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-muted-foreground hover:text-destructive"
												onClick={() => onDelete(cat)}
												disabled={!canDelete}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</div>
								))}
							</div>
						</ScrollArea>
					</div>

					<Separator />

					<form onSubmit={onSubmit} className="space-y-4">
						<div className="flex items-center justify-between">
							<Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
								{editingCategory ? "Update Category" : "Create New Category"}
							</Label>
							{editingCategory && (
								<Button 
									type="button" 
									variant="ghost" 
									size="sm" 
									className="h-6 text-[10px] uppercase font-black"
									onClick={cancelEdit}
								>
									Cancel Edit
								</Button>
							)}
						</div>
						
						<div className="flex gap-2">
							<div className="flex-1 space-y-1">
								<Input
									value={catData.CategoryName}
									onChange={(e) => setCatData("CategoryName", e.target.value)}
									placeholder="Category Title"
									required
									className="font-bold h-11"
									disabled={editingCategory ? !canUpdate : !canCreate}
								/>
								{catErrors.CategoryName && (
									<p className="text-[10px] text-destructive font-bold pl-1 uppercase tracking-tight">
										{catErrors.CategoryName}
									</p>
								)}
							</div>
							<Button 
								type="submit" 
								disabled={catProcessing || (editingCategory ? !canUpdate : !canCreate)}
								className="h-11 px-6 shadow-md"
							>
								{editingCategory ? "Update" : <Plus className="h-5 w-5" />}
							</Button>
						</div>
					</form>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} className="w-full h-11 uppercase font-black tracking-widest text-[10px]">
						Close Manager
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
