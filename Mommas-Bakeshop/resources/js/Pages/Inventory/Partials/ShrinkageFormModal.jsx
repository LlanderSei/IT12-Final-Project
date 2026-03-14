import React, { useMemo, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
    DialogFooter
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { 
    Plus, 
    Trash2, 
    ChevronRight, 
    AlertCircle, 
    Info, 
    Minus, 
    History,
    Package,
    AlertTriangle,
    Coins,
    Hash
} from "lucide-react";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/Components/ui/select";
import { Badge } from "@/Components/ui/badge";
import { Separator } from "@/Components/ui/separator";

export default function ShrinkageFormModal({ 
    open, 
    onOpenChange, 
    form, 
    products, 
    allowedReasons, 
    editingShrinkage, 
    onSubmit,
    processing,
    onClose,
    formError,
    setFormError,
    selectedProductId,
    setSelectedProductId,
    selectedQuantity,
    setSelectedQuantity,
    bypassVerification,
    setBypassVerification,
    canVerifyShrinkage,
    addProductLine,
    removeLine,
    adjustLineQuantity,
    productsById,
    getBaseAvailable,
    getRemainingAllowance
}) {
    const totalAmount = useMemo(() => {
        return (form.data.items || []).reduce((sum, item) => {
            const product = productsById[item.ProductID];
            return sum + (Number(item.Quantity || 0) * Number(product?.Price || 0));
        }, 0);
    }, [form.data.items, productsById]);

    const totalQuantity = useMemo(() => {
        return (form.data.items || []).reduce((sum, item) => sum + Number(item.Quantity || 0), 0);
    }, [form.data.items]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[1000px] p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="px-8 py-8 bg-card border-b relative">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <History className="h-24 w-24" />
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                        <Badge variant="secondary" className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border-none">
                            Inventory Log
                        </Badge>
                        {editingShrinkage && (
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">Editing Log #{editingShrinkage.ID}</span>
                        )}
                    </div>
                    <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter leading-none">
                        {editingShrinkage ? 'Modify Shrinkage' : 'Record Shrinkage'}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground font-medium mt-2">
                        Log lost, damaged, or expired inventory items for audit trails.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={onSubmit} className="flex flex-col">
                    <div className="grid grid-cols-1 lg:grid-cols-12">
                        {/* Left: Form Controls */}
                        <div className="lg:col-span-4 p-8 bg-muted/10 border-r space-y-8">
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Log Reason</Label>
                                <Select 
                                    value={form.data.reason} 
                                    onValueChange={(val) => form.setData("reason", val)}
                                >
                                    <SelectTrigger className="h-12 rounded-2xl border-2 bg-background font-bold">
                                        <SelectValue placeholder="Select Reason" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allowedReasons.map(r => (
                                            <SelectItem key={r} value={r} className="font-bold">{r}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Separator />

                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Add Products</Label>
                                    <Badge variant="outline" className="text-[9px] font-bold h-5 px-2 opacity-50">Stock Validation Hot</Badge>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Select 
                                            value={selectedProductId} 
                                            onValueChange={setSelectedProductId}
                                        >
                                            <SelectTrigger className="h-12 rounded-2xl border-2 bg-background font-bold">
                                                <SelectValue placeholder="Search Item..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {products.map(p => {
                                                    const rem = getRemainingAllowance(p.ID);
                                                    return (
                                                        <SelectItem key={p.ID} value={p.ID.toString()} disabled={rem <= 0}>
                                                            <div className="flex justify-between w-full gap-4">
                                                                <span>{p.ProductName}</span>
                                                                <span className="text-[10px] font-black opacity-30 uppercase">{rem} in stock</span>
                                                            </div>
                                                        </SelectItem>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex gap-2">
                                        <Input 
                                            type="number" 
                                            placeholder="Qty" 
                                            className="h-12 rounded-2xl border-2 bg-background font-black text-center text-lg w-24"
                                            value={selectedQuantity}
                                            onChange={(e) => setSelectedQuantity(e.target.value)}
                                        />
                                        <Button 
                                            type="button" 
                                            onClick={addProductLine}
                                            className="h-12 flex-1 rounded-2xl bg-foreground text-white font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-95 transition-all gap-2"
                                        >
                                            <Plus className="h-4 w-4" /> Add Line
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {!editingShrinkage && canVerifyShrinkage && (
                                <div className="pt-4">
                                    <div 
                                        onClick={() => setBypassVerification(!bypassVerification)}
                                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${bypassVerification ? 'bg-orange-50 border-orange-200' : 'bg-background hover:border-muted-foreground/30'}`}
                                    >
                                        <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors ${bypassVerification ? 'bg-orange-500 border-orange-500' : 'border-muted-foreground/20'}`}>
                                            {bypassVerification && <Plus className="h-3 w-3 text-white stroke-[4]" />}
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black uppercase tracking-tight">Auto-Verify Log</p>
                                            <p className="text-[9px] font-medium text-muted-foreground">Skip pending approval stage</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {formError && (
                                <div className="p-4 rounded-2xl bg-destructive/10 border-2 border-destructive/20 flex gap-3 animate-in fade-in slide-in-from-top-2">
                                    <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                                    <p className="text-xs font-bold text-destructive leading-tight">{formError}</p>
                                </div>
                            )}
                        </div>

                        {/* Right: Items List */}
                        <div className="lg:col-span-8 p-8 flex flex-col min-h-[500px]">
                            <div className="flex items-center justify-between mb-8">
                                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                    <ClipboardList className="h-4 w-4" /> Shrinkage Line Items
                                </h4>
                                <div className="flex gap-4">
                                    <div className="text-right">
                                        <div className="text-[10px] font-black uppercase text-muted-foreground opacity-40">Total Items</div>
                                        <div className="text-lg font-black">{totalQuantity}</div>
                                    </div>
                                    <Separator orientation="vertical" className="h-8" />
                                    <div className="text-right">
                                        <div className="text-[10px] font-black uppercase text-primary opacity-40">Total Value</div>
                                        <div className="text-lg font-black text-primary italic">₱{totalAmount.toFixed(2)}</div>
                                    </div>
                                </div>
                            </div>

                            <ScrollArea className="flex-1 -mx-4 px-4 overflow-x-hidden">
                                {form.data.items.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-20 border-2 border-dashed rounded-3xl">
                                        <AlertTriangle className="h-12 w-12 mb-4" />
                                        <p className="text-sm font-black uppercase tracking-widest">No Items Added</p>
                                        <p className="text-xs font-medium max-w-[200px] mt-2 italic leading-relaxed">Select products from the left panel to begin logging shrinkage.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {form.data.items.map((line, idx) => {
                                            const product = productsById[line.ProductID];
                                            const sub = Number(line.Quantity) * Number(product?.Price || 0);
                                            return (
                                                <div key={idx} className="group flex items-center justify-between p-5 rounded-2xl border-2 bg-card hover:border-primary/30 transition-all">
                                                    <div className="flex items-center gap-5">
                                                        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                                                            <Package className="h-6 w-6 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black uppercase tracking-tight group-hover:text-primary transition-colors">{product?.ProductName || 'Unknown'}</div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge variant="secondary" className="px-1.5 py-0 text-[9px] font-black border-none opacity-60">₱{Number(product?.Price || 0).toFixed(2)}/EA</Badge>
                                                                <span className="text-[10px] font-bold text-muted-foreground opacity-30 uppercase tracking-widest">Max Avail: {getRemainingAllowance(line.ProductID, idx) + Number(line.Quantity)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-8">
                                                        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl">
                                                            <Button 
                                                                type="button" 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-8 w-8 rounded-lg hover:bg-background"
                                                                onClick={() => adjustLineQuantity(idx, -1)}
                                                            >
                                                                <Minus className="h-3 w-3" />
                                                            </Button>
                                                            <div className="w-10 text-center font-black text-sm">{line.Quantity}</div>
                                                            <Button 
                                                                type="button" 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-8 w-8 rounded-lg hover:bg-background"
                                                                onClick={() => adjustLineQuantity(idx, 1)}
                                                            >
                                                                <Plus className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                        <div className="text-right w-24">
                                                            <div className="text-[10px] font-black uppercase text-muted-foreground opacity-40">Subtotal</div>
                                                            <div className="font-black text-primary italic">₱{sub.toFixed(2)}</div>
                                                        </div>
                                                        <Button 
                                                            type="button" 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-10 w-10 text-destructive/40 hover:text-destructive hover:bg-destructive/5 rounded-xl border border-transparent hover:border-destructive/20"
                                                            onClick={() => removeLine(idx)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    </div>

                    <div className="p-8 bg-card border-t flex items-center justify-between">
                        <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={onClose}
                            className="px-10 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                        >
                            Cancel Logging
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={processing || form.data.items.length === 0}
                            className="px-14 h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all gap-3"
                        >
                            {editingShrinkage ? 'Update Record' : 'Confirm & Finalize Log'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

const ClipboardList = ({ className }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" height="24" viewBox="0 0 24 24" 
        fill="none" stroke="currentColor" strokeWidth="2" 
        strokeLinecap="round" strokeLinejoin="round" 
        className={className}
    >
        <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
        <path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>
    </svg>
);
