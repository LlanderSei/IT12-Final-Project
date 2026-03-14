import React, { useEffect, useMemo, useState } from "react";
import { Head, useForm, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import CashierTabs from "./CashierTabs";
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
import { Search, ShoppingCart, Trash2, ArrowRight, AlertTriangle, FilterX } from "lucide-react";

// Partials
import ProductCard from "./Partials/ProductCard";
import CartItem from "./Partials/CartItem";
import { EditQtyDialog, WalkInCheckoutDialog, ShrinkageCheckoutDialog } from "./Partials/CheckoutDialogs";

import usePermissions from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;

export default function CashSale({ products = [], categories = [] }) {
	const { can, requirePermission } = usePermissions();
	const { auth } = usePage().props;
	const canProcessWalkIn = can("CanProcessSalesWalkIn");
	const canProcessShrinkage = can("CanProcessSalesShrinkage");
	const canProcessAny = canProcessWalkIn || canProcessShrinkage;
	const userRole = String(auth?.user?.role || "").toLowerCase();
	const canUseAdvancedShrinkageReasons = userRole === "owner" || userRole === "admin";

	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("all");
	const [cartItems, setCartItems] = useState([]);
	const [transactionType, setTransactionType] = useState("Walk-In");
	
	// Modal States
	const [editQtyOpen, setEditQtyOpen] = useState(false);
	const [editQtyItem, setEditQtyItem] = useState(null);
	const [editQtyValue, setEditQtyValue] = useState("");
	const [editQtyError, setEditQtyError] = useState("");
	
	const [walkInOpen, setWalkInOpen] = useState(false);
	const [shrinkageOpen, setShrinkageOpen] = useState(false);
	const [walkInSubmitError, setWalkInSubmitError] = useState("");
	const [shrinkageSubmitError, setShrinkageSubmitError] = useState("");

	const walkInForm = useForm({
		items: [],
		paidAmount: "",
		paymentMethod: "Cash",
		additionalDetails: "",
	});

	const shrinkageForm = useForm({
		items: [],
		reason: "Spoiled",
	});

	const transactionPermissionMap = {
		"Walk-In": { allowed: canProcessWalkIn, label: "Walk-In Sale", permission: "CanProcessSalesWalkIn" },
		"Shrinkage": { allowed: canProcessShrinkage, label: "Record Shrinkage", permission: "CanProcessSalesShrinkage" },
	};

	const transactionOptions = Object.entries(transactionPermissionMap)
		.filter(([, config]) => config.allowed)
		.map(([key]) => key);

	useEffect(() => {
		if (transactionOptions.length && !transactionOptions.includes(transactionType)) {
			setTransactionType(transactionOptions[0]);
		}
	}, [transactionOptions, transactionType]);

	const availableProducts = useMemo(() => {
		return products
			.filter((product) => Number(product.Quantity) > 0)
			.filter((product) => selectedCategory === "all" || String(product.CategoryID) === String(selectedCategory))
			.filter((product) => {
				if (!searchQuery.trim()) return true;
				return product.ProductName.toLowerCase().includes(searchQuery.toLowerCase());
			});
	}, [products, searchQuery, selectedCategory]);

	const cartTotal = useMemo(
		() => cartItems.reduce((sum, item) => sum + Number(item.pricePerUnit) * Number(item.quantity), 0),
		[cartItems]
	);

	const cartToPayload = () => cartItems.map((item) => ({ ProductID: item.ID, Quantity: item.quantity }));

	const requireSelectedTransactionPermission = () => {
		const selected = transactionPermissionMap[transactionType];
		if (selected?.allowed) return true;
		return requirePermission(selected?.permission || "CanProcessSalesWalkIn", `Access denied.`);
	};

	const addToCart = (product) => {
		if (!requireSelectedTransactionPermission()) return;
		setCartItems((prev) => {
			const existing = prev.find((item) => item.ID === product.ID);
			if (existing) {
				return prev.map((item) =>
					item.ID === product.ID
						? { ...item, quantity: Math.min(item.quantity + 1, Number(product.Quantity)) }
						: item
				);
			}
			return [
				...prev,
				{
					ID: product.ID,
					ProductName: product.ProductName,
					pricePerUnit: Number(product.Price),
					maxQuantity: Number(product.Quantity),
					quantity: 1,
				},
			];
		});
	};

	const removeItem = (id) => setCartItems((prev) => prev.filter((item) => item.ID !== id));
	const incrementItem = (id) => setCartItems((prev) => prev.map((item) => item.ID === id ? { ...item, quantity: Math.min(item.quantity + 1, item.maxQuantity) } : item));
	const decrementItem = (id) => setCartItems((prev) => prev.flatMap((item) => item.ID === id ? (item.quantity <= 1 ? [] : [{ ...item, quantity: item.quantity - 1 }]) : [item]));

	const openEditQtyModal = (item) => {
		setEditQtyItem(item);
		setEditQtyValue(String(item.quantity));
		setEditQtyError("");
		setEditQtyOpen(true);
	};

	const submitEditQty = () => {
		const quantity = Number(editQtyValue);
		if (!Number.isInteger(quantity) || quantity < 1) return setEditQtyError("Must be a whole number > 0.");
		if (quantity > editQtyItem.maxQuantity) return setEditQtyError(`Max available: ${editQtyItem.maxQuantity}`);

		setCartItems((prev) => prev.map((item) => item.ID === editQtyItem.ID ? { ...item, quantity } : item));
		setEditQtyOpen(false);
	};

	const openCheckoutModal = () => {
		if (!cartItems.length) return;
		if (transactionType === "Walk-In") {
			walkInForm.setData({ items: cartToPayload(), paidAmount: "", paymentMethod: "Cash", additionalDetails: "" });
			setWalkInSubmitError("");
			setWalkInOpen(true);
		} else {
			shrinkageForm.setData({ items: cartToPayload(), reason: "Spoiled" });
			setShrinkageSubmitError("");
			setShrinkageOpen(true);
		}
	};

	const walkInChange = Math.max(0, Number(walkInForm.data.paidAmount || 0) - cartTotal);

	const submitWalkIn = (e) => {
		e.preventDefault();
		walkInForm.transform((data) => ({ ...data, paidAmount: data.paidAmount === "" ? null : Number(data.paidAmount) }));
		walkInForm.post(route("pos.checkout.walk-in"), {
			onSuccess: () => { setWalkInOpen(false); setCartItems([]); },
			onError: (err) => setWalkInSubmitError(err.paidAmount ? "" : Object.values(err)[0] || "Failed to process sale."),
		});
	};

	const submitShrinkage = (e) => {
		e.preventDefault();
		shrinkageForm.post(route("pos.checkout.shrinkage"), {
			onSuccess: () => { setShrinkageOpen(false); setCartItems([]); },
			onError: (err) => setShrinkageSubmitError(Object.values(err)[0] || "Failed to record shrinkage."),
		});
	};

	return (
		<AuthenticatedLayout disableScroll={true}>
			<Head title="Cashier" />
			<PageHeader 
				title="Cashier Terminal" 
				description="Process sales and manage inventory shrinkage."
				actions={
					<div className="flex items-center gap-2">
						<Select value={transactionType} onValueChange={setTransactionType}>
							<SelectTrigger className="w-[180px] bg-card h-9">
								<SelectValue placeholder="Transaction Type" />
							</SelectTrigger>
							<SelectContent>
								{transactionOptions.map(opt => (
									<SelectItem key={opt} value={opt}>{transactionPermissionMap[opt].label}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				}
			/>
			<CashierTabs />

			<div className="flex-1 flex overflow-hidden min-h-0">
				{/* Left Grid: Products */}
				<div className="flex-1 flex flex-col min-h-0 bg-accent/5">
					<div className="p-4 border-b bg-card shadow-sm flex items-center gap-3">
						<div className="relative flex-1 max-w-md">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input 
								placeholder="Search products..." 
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
						{(searchQuery || selectedCategory !== "all") && (
							<Button variant="ghost" size="icon" onClick={() => {setSearchQuery(""); setSelectedCategory("all")}}>
								<FilterX className="h-4 w-4" />
							</Button>
						)}
					</div>
					
					<ScrollArea className="flex-1 p-6">
						{!canProcessAny && (
							<div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 flex gap-3 text-sm">
								<AlertTriangle className="h-5 w-5 shrink-0" />
								<p>You have viewing access to the cashier terminal, but sales processing is restricted for your role.</p>
							</div>
						)}
						<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-10">
							{availableProducts.map(p => (
								<ProductCard 
									key={p.ID} 
									product={p} 
									onAdd={addToCart} 
									disabled={!canProcessAny} 
								/>
							))}
							{availableProducts.length === 0 && (
								<div className="col-span-full py-20 text-center">
									<p className="text-muted-foreground">No products found for this search/category.</p>
								</div>
							)}
						</div>
					</ScrollArea>
				</div>

				{/* Right Column: Checkout/Cart */}
				<div className="w-[380px] border-l bg-card flex flex-col shadow-xl z-20">
					<div className="p-5 border-b bg-accent/5 flex items-center justify-between">
						<div className="flex items-center gap-2">
							<ShoppingCart className="h-5 w-5 text-primary" />
							<h3 className="font-bold text-foreground">Current Cart</h3>
						</div>
						<Badge variant="secondary" className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider">
							{cartItems.length} {cartItems.length === 1 ? 'Item' : 'Items'}
						</Badge>
					</div>

					<ScrollArea className="flex-1">
						<div className="p-5 space-y-3">
							{cartItems.length === 0 ? (
								<div className="py-20 text-center flex flex-col items-center gap-3">
									<div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center">
										<ShoppingCart className="h-6 w-6 text-muted-foreground/50" />
									</div>
									<p className="text-sm text-muted-foreground">Your cart is empty.</p>
								</div>
							) : (
								cartItems.map(item => (
									<CartItem 
										key={item.ID}
										item={item}
										onIncrement={incrementItem}
										onDecrement={decrementItem}
										onRemove={removeItem}
										onEdit={openEditQtyModal}
									/>
								))
							)}
						</div>
					</ScrollArea>

					<div className="p-5 border-t bg-accent/5 space-y-4">
						<div className="space-y-2">
							<div className="flex justify-between text-sm text-muted-foreground">
								<span>Items Total</span>
								<span>{currency(cartTotal)}</span>
							</div>
							<Separator />
							<div className="flex justify-between items-center py-1">
								<span className="font-bold text-foreground">Net Total</span>
								<span className="text-2xl font-black text-primary-hex tracking-tighter">
									{currency(cartTotal)}
								</span>
							</div>
						</div>
						
						<div className="grid grid-cols-2 gap-3">
							<Button 
								variant="outline" 
								className="font-semibold"
								onClick={() => setCartItems([])}
								disabled={cartItems.length === 0}
							>
								Clear
							</Button>
							<Button 
								className="font-bold tracking-wide shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
								onClick={openCheckoutModal}
								disabled={cartItems.length === 0 || !canProcessAny}
							>
								Checkout
								<ArrowRight className="ml-2 h-4 w-4" />
							</Button>
						</div>
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

			<WalkInCheckoutDialog 
				open={walkInOpen}
				onOpenChange={setWalkInOpen}
				items={cartItems}
				total={cartTotal}
				change={walkInChange}
				form={walkInForm}
				error={walkInSubmitError}
				onSubmit={submitWalkIn}
			/>

			<ShrinkageCheckoutDialog 
				open={shrinkageOpen}
				onOpenChange={setShrinkageOpen}
				items={cartItems}
				total={cartTotal}
				form={shrinkageForm}
				error={shrinkageSubmitError}
				canUseAdvanced={canUseAdvancedShrinkageReasons}
				onSubmit={submitShrinkage}
			/>
		</AuthenticatedLayout>
	);
}
