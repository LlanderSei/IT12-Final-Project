import React, { useMemo, useState } from "react";
import { useForm } from "@inertiajs/react";
import PageHeader from "@/Components/PageHeader";
import { Input } from "@/Components/ui/input";
import { 
	Select, 
	SelectContent, 
	SelectItem, 
	SelectTrigger, 
	SelectValue 
} from "@/Components/ui/select";
import { Button } from "@/Components/ui/button";
import { Separator } from "@/Components/ui/separator";
import { Badge } from "@/Components/ui/badge";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { Search, ShoppingBasket, Wand2, Plus, ArrowRight, FilterX, AlertTriangle } from "lucide-react";

// Partials
import ProductCard from "../Partials/ProductCard";
import JobOrderCartItem from "./Partials/JobOrderCartItem";
import CustomItemDialog from "./Partials/CustomItemDialog";
import JobOrderCheckoutDialog from "./Partials/JobOrderCheckoutDialog";
import { EditQtyDialog } from "../Partials/CheckoutDialogs";

import usePermissions from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;

const tomorrowISO = () => {
	const date = new Date();
	date.setDate(date.getDate() + 1);
	return date.toISOString().split("T")[0];
};

export default function JobOrders({ products = [], categories = [], customers = [] }) {
	const { can, requirePermission } = usePermissions();
	const canCreateJobOrders = can("CanCreateJobOrders");

	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("all");
	const [cartItems, setCartItems] = useState([]);
	const [customOrders, setCustomOrders] = useState([]);
	
	// Modal States
	const [editQtyOpen, setEditQtyOpen] = useState(false);
	const [editQtyItem, setEditQtyItem] = useState(null);
	const [editQtyValue, setEditQtyValue] = useState("");
	const [editQtyError, setEditQtyError] = useState("");

	const [customEditorOpen, setCustomEditorOpen] = useState(false);
	const [customEditIndex, setCustomEditIndex] = useState(null);
	const [customDraft, setCustomDraft] = useState({ description: "", quantity: "1", pricePerUnit: "" });
	const [customError, setCustomError] = useState("");

	const [checkoutOpen, setCheckoutOpen] = useState(false);
	const [customerSearch, setCustomerSearch] = useState("");
	const [submitError, setSubmitError] = useState("");

	const jobOrderForm = useForm({
		items: [],
		customOrders: [],
		customerMode: "existing",
		CustomerID: "",
		newCustomer: { CustomerName: "", CustomerType: "Retail", ContactDetails: "", Address: "" },
		deliveryDate: tomorrowISO(),
		deliveryTime: "08:00",
		notes: "",
	});

	const availableProducts = useMemo(() => {
		return products
			.filter((product) => selectedCategory === "all" || String(product.CategoryID) === String(selectedCategory))
			.filter((product) => {
				if (!searchQuery.trim()) return true;
				return product.ProductName.toLowerCase().includes(searchQuery.toLowerCase());
			});
	}, [products, searchQuery, selectedCategory]);

	const cartTotal = useMemo(() => cartItems.reduce((sum, item) => sum + Number(item.pricePerUnit) * Number(item.quantity), 0), [cartItems]);
	const customTotal = useMemo(() => customOrders.reduce((sum, item) => sum + Number(item.pricePerUnit) * Number(item.quantity), 0), [customOrders]);
	const grandTotal = cartTotal + customTotal;

	const cartToPayload = () => cartItems.map((item) => ({ ProductID: item.ID, Quantity: item.quantity }));

	const addToCart = (product) => {
		if (!requirePermission("CanCreateJobOrders")) return;
		setCartItems((prev) => {
			const existing = prev.find((item) => item.ID === product.ID);
			if (existing) {
				return prev.map((item) => item.ID === product.ID ? { ...item, quantity: item.quantity + 1 } : item);
			}
			return [...prev, { ID: product.ID, ProductName: product.ProductName, pricePerUnit: Number(product.Price), maxQuantity: Number(product.Quantity), quantity: 1 }];
		});
	};

	const removeItem = (id) => setCartItems(prev => prev.filter(i => i.ID !== id));
	const incrementItem = (id) => setCartItems(prev => prev.map(i => i.ID === id ? { ...i, quantity: i.quantity + 1 } : i));
	const decrementItem = (id) => setCartItems(prev => prev.flatMap(i => i.ID === id ? (i.quantity <= 1 ? [] : [{ ...i, quantity: i.quantity - 1 }]) : [i]));

	const openEditQty = (item) => {
		setEditQtyItem(item);
		setEditQtyValue(String(item.quantity));
		setEditQtyError("");
		setEditQtyOpen(true);
	};

	const submitEditQty = () => {
		const q = Number(editQtyValue);
		if (!Number.isInteger(q) || q < 1) return setEditQtyError("Minimum qty is 1.");
		setCartItems(prev => prev.map(i => i.ID === editQtyItem.ID ? { ...i, quantity: q } : i));
		setEditQtyOpen(false);
	};

	const openCustomEditor = (index = null) => {
		const existing = index === null ? null : customOrders[index];
		setCustomEditIndex(index);
		setCustomDraft({
			description: existing?.description || "",
			quantity: String(existing?.quantity || 1),
			pricePerUnit: existing?.pricePerUnit ? String(existing.pricePerUnit) : ""
		});
		setCustomError("");
		setCustomEditorOpen(true);
	};

	const saveCustomOrder = () => {
		const d = customDraft.description.trim();
		const q = Number(customDraft.quantity);
		const p = Number(customDraft.pricePerUnit);

		if (!d) return setCustomError("Description required.");
		if (!q || q < 1) return setCustomError("Qty must be > 0.");
		if (!p || p <= 0) return setCustomError("Price must be > 0.");

		const normalized = { description: d, quantity: q, pricePerUnit: Number(p.toFixed(2)) };
		if (customEditIndex === null) setCustomOrders([...customOrders, normalized]);
		else setCustomOrders(customOrders.map((o, i) => i === customEditIndex ? normalized : o));
		
		setCustomEditorOpen(false);
	};

	const openCheckout = () => {
		if (!cartItems.length && !customOrders.length) return;
		jobOrderForm.setData({ ...jobOrderForm.data, items: cartToPayload(), customOrders });
		setSubmitError("");
		setCheckoutOpen(true);
	};

	const submitJobOrder = (e) => {
		e.preventDefault();
		jobOrderForm.post(route("pos.job-orders.store"), {
			onSuccess: () => {
				setCheckoutOpen(false);
				setCartItems([]);
				setCustomOrders([]);
				jobOrderForm.reset();
			},
			onError: (err) => setSubmitError(Object.values(err)[0] || "Order failed."),
		});
	};

	return (
		<div className="flex-1 flex overflow-hidden min-h-0 -m-6 h-[calc(100%+3rem)]">
			{/* Left Column: Product Selection */}
			<div className="flex-1 flex flex-col min-h-0 bg-accent/5">
				<div className="p-4 border-b bg-card shadow-sm flex items-center gap-3">
					<div className="relative flex-1 max-w-md">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input 
							placeholder="Search standard products..." 
							className="pl-9 bg-accent/5 focus:bg-card transition-all"
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
						/>
					</div>
					<Select value={selectedCategory} onValueChange={setSelectedCategory}>
						<SelectTrigger className="w-[200px] h-10 bg-accent/5">
							<SelectValue placeholder="All Categories" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Categories</SelectItem>
							{categories.map(c => <SelectItem key={c.ID} value={String(c.ID)}>{c.CategoryName}</SelectItem>)}
						</SelectContent>
					</Select>
					<Button variant="outline" className="gap-2" onClick={() => openCustomEditor(null)} disabled={!canCreateJobOrders}>
						<Wand2 className="h-4 w-4" />
						Custom Item
					</Button>
				</div>
				
				<ScrollArea className="flex-1 p-6">
					{!canCreateJobOrders && (
						<div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 flex gap-3 text-sm">
							<AlertTriangle className="h-5 w-5 shrink-0" />
							<p>Review-only mode. Job order creation is restricted for your role.</p>
						</div>
					)}
					<div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-10">
						{availableProducts.map(p => (
							<ProductCard key={p.ID} product={p} onAdd={addToCart} disabled={!canCreateJobOrders} />
						))}
					</div>
				</ScrollArea>
			</div>

			{/* Right Column: Order Cart */}
			<div className="w-[380px] border-l bg-card flex flex-col shadow-xl z-20">
				<div className="p-5 border-b bg-accent/5 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<ShoppingBasket className="h-5 w-5 text-primary" />
						<h3 className="font-bold text-foreground">Order Items</h3>
					</div>
					<Badge variant="secondary" className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider">
						{cartItems.length + customOrders.length} Items
					</Badge>
				</div>

				<ScrollArea className="flex-1">
					<div className="p-5 space-y-4">
						{cartItems.length === 0 && customOrders.length === 0 ? (
							<div className="py-20 text-center flex flex-col items-center gap-3">
								<div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center">
									<ShoppingBasket className="h-6 w-6 text-muted-foreground/50" />
								</div>
								<p className="text-sm text-muted-foreground">The order list is empty.</p>
							</div>
						) : (
							<>
								{cartItems.map(item => (
									<JobOrderCartItem 
										key={item.ID} 
										item={item} 
										type="product"
										onIncrement={() => incrementItem(item.ID)}
										onDecrement={() => decrementItem(item.ID)}
										onRemove={() => removeItem(item.ID)}
										onEdit={() => openEditQty(item)}
									/>
								))}
								{customOrders.map((item, index) => (
									<JobOrderCartItem 
										key={`custom-${index}`} 
										item={item} 
										type="custom"
										onRemove={() => setCustomOrders(customOrders.filter((_, i) => i !== index))}
										onEdit={() => openCustomEditor(index)}
									/>
								))}
							</>
						)}
					</div>
				</ScrollArea>

				<div className="p-5 border-t bg-accent/5 space-y-4">
					<div className="space-y-2">
						<div className="flex justify-between text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
							<span>Order Items</span>
							<span>{currency(cartTotal)}</span>
						</div>
						<div className="flex justify-between text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
							<span>Custom Items</span>
							<span>{currency(customTotal)}</span>
						</div>
						<Separator />
						<div className="flex justify-between items-center py-1">
							<span className="font-bold text-foreground">Grand Total</span>
							<span className="text-2xl font-black text-primary-hex tracking-tighter">
								{currency(grandTotal)}
							</span>
						</div>
					</div>
					
					<div className="grid grid-cols-2 gap-3">
						<Button variant="outline" className="font-semibold" onClick={() => {setCartItems([]); setCustomOrders([]);}} disabled={!cartItems.length && !customOrders.length}>
							Clear
						</Button>
						<Button className="font-bold tracking-wide shadow-lg shadow-primary/20" onClick={openCheckout} disabled={(!cartItems.length && !customOrders.length) || !canCreateJobOrders}>
							Checkout
							<ArrowRight className="ml-2 h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>

			<EditQtyDialog 
				open={editQtyOpen} 
				onOpenChange={setEditQtyOpen} 
				item={editQtyItem} 
				value={editQtyValue} 
				onChange={setEditQtyValue} 
				error={editQtyError} 
				onSave={submitEditQty} 
			/>

			<CustomItemDialog 
				open={customEditorOpen} 
				onOpenChange={setCustomEditorOpen}
				draft={customDraft}
				onChange={(f, v) => setCustomDraft({ ...customDraft, [f]: v })}
				error={customError}
				onSave={saveCustomOrder}
				isEditing={customEditIndex !== null}
			/>

			<JobOrderCheckoutDialog 
				open={checkoutOpen}
				onOpenChange={setCheckoutOpen}
				form={jobOrderForm}
				customers={customers}
				customerSearch={customerSearch}
				setCustomerSearch={setCustomerSearch}
				cartItems={cartItems}
				customOrders={customOrders}
				total={grandTotal}
				error={submitError}
				onSubmit={submitJobOrder}
			/>
		</div>
	);
}
