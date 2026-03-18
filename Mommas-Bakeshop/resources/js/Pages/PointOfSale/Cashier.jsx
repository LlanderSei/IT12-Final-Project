import React, { useEffect, useMemo, useState } from "react";
import { Head, useForm, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import Modal from "@/Components/Modal";
import usePermissions from "@/hooks/usePermissions";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;

export default function Cashier({ products = [], categories = [] }) {
	const { can, requirePermission } = usePermissions();
	const { auth } = usePage().props;
	const canProcessWalkIn = can("CanProcessSalesWalkIn");
	const canProcessShrinkage = can("CanProcessSalesShrinkage");
	const canProcessAny = canProcessWalkIn || canProcessShrinkage;
	const userRole = String(auth?.user?.role || "").toLowerCase();
	const canUseAdvancedShrinkageReasons =
		userRole === "owner" || userRole === "admin";

	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("all");
	const [cartItems, setCartItems] = useState([]);
	const [transactionType, setTransactionType] = useState("Walk-In");
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
		"Walk-In": {
			allowed: canProcessWalkIn,
			permission: "CanProcessSalesWalkIn",
			label: "walk-in sales",
		},
		Shrinkage: {
			allowed: canProcessShrinkage,
			permission: "CanProcessSalesShrinkage",
			label: "shrinkage",
		},
	};

	const transactionOptions = Object.entries(transactionPermissionMap)
		.filter(([, config]) => config.allowed)
		.map(([label]) => label);

	useEffect(() => {
		if (!transactionOptions.length) {
			return;
		}

		if (!transactionOptions.includes(transactionType)) {
			setTransactionType(transactionOptions[0]);
		}
	}, [transactionOptions, transactionType]);

	const availableProducts = useMemo(() => {
		return products
			.filter((product) => Number(product.Quantity) > 0)
			.filter((product) => {
				if (selectedCategory === "all") return true;
				return String(product.CategoryID) === String(selectedCategory);
			})
			.filter((product) => {
				if (!searchQuery.trim()) return true;
				const query = searchQuery.toLowerCase();
				return product.ProductName.toLowerCase().includes(query);
			});
	}, [products, searchQuery, selectedCategory]);

	const cartTotal = useMemo(
		() =>
			cartItems.reduce(
				(sum, item) => sum + Number(item.pricePerUnit) * Number(item.quantity),
				0,
			),
		[cartItems],
	);

	const cartToPayload = () =>
		cartItems.map((item) => ({
			ProductID: item.ID,
			Quantity: item.quantity,
		}));

	const requireSelectedTransactionPermission = () => {
		const selected = transactionPermissionMap[transactionType];
		if (selected?.allowed) {
			return true;
		}

		const permissionName = selected?.permission || "CanProcessSalesWalkIn";
		const transactionLabel = selected?.label || "this transaction";
		return requirePermission(
			permissionName,
			`You do not have permission to process ${transactionLabel}.`,
		);
	};

	const addToCart = (product) => {
		if (!requireSelectedTransactionPermission()) return;
		setCartItems((prev) => {
			const existing = prev.find((item) => item.ID === product.ID);
			if (existing) {
				return prev.map((item) =>
					item.ID === product.ID
						? {
								...item,
								quantity: Math.min(
									item.quantity + 1,
									Number(product.Quantity),
								),
							}
						: item,
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

	const removeItem = (id) => {
		if (!requireSelectedTransactionPermission()) return;
		setCartItems((prev) => prev.filter((item) => item.ID !== id));
	};

	const incrementItem = (id) => {
		if (!requireSelectedTransactionPermission()) return;
		setCartItems((prev) =>
			prev.map((item) =>
				item.ID === id
					? { ...item, quantity: Math.min(item.quantity + 1, item.maxQuantity) }
					: item,
			),
		);
	};

	const decrementItem = (id) => {
		if (!requireSelectedTransactionPermission()) return;
		setCartItems((prev) =>
			prev.flatMap((item) => {
				if (item.ID !== id) return [item];
				if (item.quantity <= 1) return [];
				return [{ ...item, quantity: item.quantity - 1 }];
			}),
		);
	};

	const openEditQtyModal = (item) => {
		if (!requireSelectedTransactionPermission()) return;
		setEditQtyItem(item);
		setEditQtyValue(String(item.quantity));
		setEditQtyError("");
		setEditQtyOpen(true);
	};

	const closeEditQtyModal = () => {
		setEditQtyOpen(false);
		setEditQtyItem(null);
		setEditQtyValue("");
		setEditQtyError("");
	};

	const submitEditQty = (e) => {
		e.preventDefault();
		if (!editQtyItem) return;

		const quantity = Number(editQtyValue);
		if (!Number.isInteger(quantity) || quantity < 1) {
			setEditQtyError("Quantity must be a whole number greater than 0.");
			return;
		}
		if (quantity > editQtyItem.maxQuantity) {
			setEditQtyError(
				`Quantity cannot exceed available stock (${editQtyItem.maxQuantity}).`,
			);
			return;
		}

		setCartItems((prev) =>
			prev.map((item) =>
				item.ID === editQtyItem.ID ? { ...item, quantity } : item,
			),
		);
		closeEditQtyModal();
	};

	const clearCart = () => {
		if (!requireSelectedTransactionPermission()) return;
		setCartItems([]);
	};

	const openCheckoutModal = () => {
		if (!requireSelectedTransactionPermission()) return;
		if (!cartItems.length) return;
		if (transactionType === "Walk-In") {
			walkInForm.setData("items", cartToPayload());
			walkInForm.setData("paidAmount", "");
			walkInForm.setData("paymentMethod", "Cash");
			walkInForm.setData("additionalDetails", "");
			walkInForm.clearErrors();
			setWalkInSubmitError("");
			setWalkInOpen(true);
			return;
		}
		shrinkageForm.setData("items", cartToPayload());
		shrinkageForm.setData("reason", "Spoiled");
		shrinkageForm.clearErrors();
		setShrinkageSubmitError("");
		setShrinkageOpen(true);
	};

	const walkInPaidAmount = walkInForm.data.paidAmount;
	const walkInChange =
		walkInPaidAmount === "" || Number(walkInPaidAmount) < cartTotal
			? 0
			: Number(walkInPaidAmount) - cartTotal;

	const submitWalkIn = (e) => {
		e.preventDefault();
		if (!canProcessWalkIn) {
			return requirePermission(
				"CanProcessSalesWalkIn",
				"You do not have permission to process walk-in sales.",
			);
		}
		walkInForm.transform((data) => ({
			...data,
			items: cartToPayload(),
			paidAmount: data.paidAmount === "" ? null : Number(data.paidAmount),
		}));
		walkInForm.post(route("pos.checkout.walk-in"), {
			preserveScroll: true,
			onSuccess: () => {
				setWalkInOpen(false);
				clearCart();
				walkInForm.reset();
				setWalkInSubmitError("");
			},
			onError: (errors) => {
				if (errors.paidAmount) {
					setWalkInSubmitError("");
					return;
				}
				setWalkInSubmitError(
					Object.values(errors).find(Boolean) ||
						"Failed to process walk-in sale. Please review your input.",
				);
			},
		});
	};

	const submitShrinkage = (e) => {
		e.preventDefault();
		if (!canProcessShrinkage) {
			return requirePermission(
				"CanProcessSalesShrinkage",
				"You do not have permission to record shrinkage.",
			);
		}
		shrinkageForm.transform((data) => ({
			items: cartToPayload(),
			reason: data.reason,
		}));
		shrinkageForm.post(route("pos.checkout.shrinkage"), {
			preserveScroll: true,
			onSuccess: () => {
				setShrinkageOpen(false);
				clearCart();
				shrinkageForm.reset("items");
				shrinkageForm.setData("reason", "Spoiled");
				setShrinkageSubmitError("");
			},
			onError: (errors) => {
				setShrinkageSubmitError(
					Object.values(errors).find(Boolean) ||
						"Failed to record shrinkage. Please review your input.",
				);
			},
		});
	};

	return (
		<AuthenticatedLayout
			header={
				<h2 className="font-semibold text-xl text-gray-800 leading-tight">
					Cashier
				</h2>
			}
			disableScroll={true}
		>
			<Head title="Cashier" />

			<div className="flex-1 p-4 md:p-6 min-h-0">
				<div className="h-full min-h-0 flex flex-col">
					{!canProcessAny && (
						<div className="mb-3 shrink-0 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
							You can view cashier data, but all sales processing actions are
							disabled for your account.
						</div>
					)}
					<div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4">
						<div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-lg p-4 md:p-5 flex flex-col">
							<div className="flex flex-col md:flex-row gap-3 mb-4">
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Search products..."
									className="w-full md:flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
								/>
								<select
									value={selectedCategory}
									onChange={(e) => setSelectedCategory(e.target.value)}
									className="w-full md:w-56 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
								>
									<option value="all">All Categories</option>
									{categories.map((category) => (
										<option key={category.ID} value={category.ID}>
											{category.CategoryName}
										</option>
									))}
								</select>
							</div>

							<div className="flex-1 min-h-0 overflow-y-auto pr-1">
								<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
									{availableProducts.map((product) => (
										<button
											key={product.ID}
											type="button"
											onClick={() => addToCart(product)}
											disabled={!canProcessAny}
											className="text-left border border-gray-200 rounded-lg p-3 hover:border-primary hover:bg-primary-soft transition-colors"
										>
											<div className="h-24 w-full rounded-md bg-gray-100 overflow-hidden mb-2 flex items-center justify-center">
												{product.ProductImageUrl ? (
													<img
														src={product.ProductImageUrl}
														alt={product.ProductName}
														className="h-full w-full object-cover"
													/>
												) : (
													<span className="text-xs text-gray-400">No image</span>
												)}
											</div>
											<div className="font-semibold text-gray-900">
												{product.ProductName}
											</div>
											<div className="text-xs text-gray-500 mt-1 line-clamp-2">
												{product.ProductDescription || "No description"}
											</div>
											<div className="mt-2 flex items-center justify-between text-sm">
												<span className="text-gray-700">
													{currency(product.Price)}
												</span>
												<span className="text-gray-500">
													Qty {product.Quantity ?? 0}
												</span>
											</div>
										</button>
									))}
								</div>
							</div>
						</div>

						<div className="w-full md:w-[360px] min-h-0 bg-white border border-gray-200 rounded-lg p-4 md:p-5 flex flex-col">
							<div className="flex items-center justify-between mb-3">
								<h3 className="text-base font-semibold text-gray-800">Current Cart</h3>
								<select
									value={transactionType}
									onChange={(e) => setTransactionType(e.target.value)}
									className="border border-gray-300 rounded-md px-2 py-1 text-xs"
								>
									{transactionOptions.map((option) => (
										<option key={option} value={option}>
											{option}
										</option>
									))}
								</select>
							</div>

							<div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
								{cartItems.length === 0 && (
									<p className="text-sm text-gray-500">No items added.</p>
								)}
								{cartItems.map((item) => (
									<div
										key={`cart-${item.ID}`}
										className="rounded-md border border-gray-200 p-3"
									>
										<div className="flex items-start justify-between">
											<div>
												<div className="text-sm font-semibold text-gray-900">
													{item.ProductName}
												</div>
												<div className="text-xs text-gray-500 mt-1">
													{currency(item.pricePerUnit)}
												</div>
											</div>
											<button
												type="button"
												onClick={() => removeItem(item.ID)}
												className="text-xs text-red-600 hover:underline"
											>
												Remove
											</button>
										</div>
										<div className="mt-2 flex items-center justify-between text-xs">
											<div className="flex items-center gap-2">
												<button
													type="button"
													onClick={() => decrementItem(item.ID)}
													className="h-6 w-6 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
												>
													-
												</button>
												<span className="text-sm font-semibold">
													{item.quantity}
												</span>
												<button
													type="button"
													onClick={() => incrementItem(item.ID)}
													className="h-6 w-6 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
												>
													+
												</button>
											</div>
											<div className="flex items-center gap-2">
												<button
													type="button"
													onClick={() => openEditQtyModal(item)}
													className="text-primary hover:underline"
												>
													Edit
												</button>
												<span className="text-gray-500">
													{currency(item.pricePerUnit * item.quantity)}
												</span>
											</div>
										</div>
									</div>
								))}
							</div>

							<div className="border-t pt-3 mt-3">
								<div className="flex items-center justify-between text-sm">
									<span className="text-gray-600">Total</span>
									<span className="font-semibold text-gray-900">
										{currency(cartTotal)}
									</span>
								</div>
								<div className="mt-3 flex gap-2">
									<button
										type="button"
										onClick={clearCart}
										disabled={!cartItems.length}
										className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
									>
										Clear
									</button>
									<button
										type="button"
										onClick={openCheckoutModal}
										disabled={!cartItems.length}
										className="flex-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary-hover disabled:opacity-50"
									>
										Proceed
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<Modal show={editQtyOpen} onClose={closeEditQtyModal} maxWidth="md">
				<form onSubmit={submitEditQty} className="p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Quantity</h3>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Quantity
					</label>
					<input
						type="number"
						step="1"
						min="1"
						value={editQtyValue}
						onChange={(e) => setEditQtyValue(e.target.value)}
						className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-primary"
					/>
					{editQtyError && (
						<p className="mt-2 text-sm text-red-600">{editQtyError}</p>
					)}
					<div className="mt-6 flex justify-end gap-2">
						<button
							type="button"
							onClick={closeEditQtyModal}
							className="rounded-md border border-primary bg-white px-4 py-2 text-sm text-primary hover:bg-primary-soft"
						>
							Cancel
						</button>
						<button
							type="submit"
							className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover"
						>
							Save
						</button>
					</div>
				</form>
			</Modal>

			<Modal show={walkInOpen} onClose={() => setWalkInOpen(false)} maxWidth="lg">
				<form onSubmit={submitWalkIn} className="p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">
						Walk-In Checkout
					</h3>
					<div className="max-h-52 overflow-y-auto border border-gray-200 rounded-md p-3 mb-4 space-y-2">
						{cartItems.map((item) => (
							<div key={`walkin-${item.ID}`} className="flex justify-between text-sm">
								<span>
									{item.ProductName} x{item.quantity}
								</span>
								<span>{currency(item.pricePerUnit * item.quantity)}</span>
							</div>
						))}
					</div>
					<p className="text-sm flex justify-between">
						<span className="text-gray-600">Total Amount</span>
						<span className="font-semibold">{currency(cartTotal)}</span>
					</p>
					<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Amount Paid
							</label>
							<input
								type="number"
								step="0.01"
								min="0"
								value={walkInForm.data.paidAmount}
								onChange={(e) => walkInForm.setData("paidAmount", e.target.value)}
								className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
							/>
							{walkInForm.errors.paidAmount && (
								<p className="mt-1 text-sm text-red-600">
									{walkInForm.errors.paidAmount}
								</p>
							)}
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Payment Method
							</label>
							<select
								value={walkInForm.data.paymentMethod}
								onChange={(e) => walkInForm.setData("paymentMethod", e.target.value)}
								className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
							>
								<option value="Cash">Cash</option>
								<option value="GCash">GCash</option>
								<option value="Bank Transfer">Bank Transfer</option>
								<option value="Card">Card</option>
							</select>
						</div>
					</div>
					<div className="mt-4">
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Additional Details
						</label>
						<input
							type="text"
							value={walkInForm.data.additionalDetails}
							onChange={(e) => walkInForm.setData("additionalDetails", e.target.value)}
							placeholder="Reference no., notes, etc. (optional)"
							className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
						/>
					</div>
					<p className="mt-3 text-sm text-gray-600">
						Change: {currency(walkInChange)}
					</p>
					{walkInSubmitError && (
						<p className="mt-2 text-sm text-red-600">{walkInSubmitError}</p>
					)}
					<div className="mt-6 flex justify-end gap-2">
						<button
							type="button"
							onClick={() => setWalkInOpen(false)}
							className="px-4 py-2 text-sm rounded-md border border-primary bg-white text-primary hover:bg-primary-soft"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={walkInForm.processing}
							className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
						>
							Confirm Sale
						</button>
					</div>
				</form>
			</Modal>

			<Modal show={shrinkageOpen} onClose={() => setShrinkageOpen(false)} maxWidth="lg">
				<form onSubmit={submitShrinkage} className="p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">
						Record Shrinkage
					</h3>
					<div className="max-h-52 overflow-y-auto border border-gray-200 rounded-md p-3 mb-4 space-y-2">
						{cartItems.map((item) => (
							<div key={`shrinkage-${item.ID}`} className="flex justify-between text-sm">
								<span>
									{item.ProductName} x{item.quantity}
								</span>
								<span>{currency(item.pricePerUnit * item.quantity)}</span>
							</div>
						))}
					</div>
					<p className="text-sm flex justify-between">
						<span className="text-gray-600">Shrinkage Total Amount</span>
						<span className="font-semibold">{currency(cartTotal)}</span>
					</p>
					<div className="mt-4">
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Shrinkage Reason
						</label>
						<select
							value={shrinkageForm.data.reason}
							onChange={(e) => shrinkageForm.setData("reason", e.target.value)}
							className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
						>
							<option value="Spoiled">Spoilage</option>
							{canUseAdvancedShrinkageReasons && (
								<>
									<option value="Theft">Theft</option>
									<option value="Lost">Lost</option>
								</>
							)}
						</select>
					</div>
					{shrinkageForm.errors.reason && (
						<p className="mt-2 text-sm text-red-600">{shrinkageForm.errors.reason}</p>
					)}
					{shrinkageForm.errors.items && (
						<p className="mt-2 text-sm text-red-600">{shrinkageForm.errors.items}</p>
					)}
					{shrinkageSubmitError && (
						<p className="mt-2 text-sm text-red-600">{shrinkageSubmitError}</p>
					)}
					<div className="mt-6 flex justify-end gap-2">
						<button
							type="button"
							onClick={() => setShrinkageOpen(false)}
							className="px-4 py-2 text-sm rounded-md border border-primary bg-white text-primary hover:bg-primary-soft"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={shrinkageForm.processing}
							className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
						>
							Record Shrinkage
						</button>
					</div>
				</form>
			</Modal>
		</AuthenticatedLayout>
	);
}
