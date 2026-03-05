import React, { useMemo, useState } from "react";
import { Head, useForm } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import Modal from "@/Components/Modal";
import CashierTabs from "./CashierTabs";
import usePermissions from "@/hooks/usePermissions";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;

const tomorrowISO = () => {
	const date = new Date();
	date.setDate(date.getDate() + 1);
	return date.toISOString().split("T")[0];
};

const plusThirtyDaysISO = () => {
	const date = new Date();
	date.setDate(date.getDate() + 30);
	return date.toISOString().split("T")[0];
};

export default function CashSale({
	products = [],
	categories = [],
	customers = [],
}) {
	const { can, requirePermission } = usePermissions();
	const canProcessSales = can("CanProcessSales");

	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("all");
	const [cartItems, setCartItems] = useState([]);
	const [transactionType, setTransactionType] = useState("Walk-In");
	const [editQtyOpen, setEditQtyOpen] = useState(false);
	const [editQtyItem, setEditQtyItem] = useState(null);
	const [editQtyValue, setEditQtyValue] = useState("");
	const [editQtyError, setEditQtyError] = useState("");
	const [walkInOpen, setWalkInOpen] = useState(false);
	const [jobOrderOpen, setJobOrderOpen] = useState(false);
	const [shrinkageOpen, setShrinkageOpen] = useState(false);
	const [walkInSubmitError, setWalkInSubmitError] = useState("");
	const [jobOrderSubmitError, setJobOrderSubmitError] = useState("");
	const [shrinkageSubmitError, setShrinkageSubmitError] = useState("");
	const [customerSearch, setCustomerSearch] = useState("");

	const walkInForm = useForm({
		items: [],
		paidAmount: "",
		paymentMethod: "Cash",
		additionalDetails: "",
	});

	const jobOrderForm = useForm({
		items: [],
		customerMode: "existing",
		CustomerID: "",
		newCustomer: {
			CustomerName: "",
			CustomerType: "Retail",
			ContactDetails: "",
			Address: "",
		},
		paymentSelection: "pay_later",
		paidAmount: "",
		paymentMethod: "Cash",
		additionalDetails: "",
		dueDate: plusThirtyDaysISO(),
	});

	const shrinkageForm = useForm({
		items: [],
		reason: "Spoiled",
	});

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

	const addToCart = (product) => {
		if (!canProcessSales) return requirePermission("CanProcessSales");
		setCartItems((prev) => {
			const existing = prev.find((item) => item.ID === product.ID);
			if (existing) {
				return prev.map((item) =>
					item.ID === product.ID
						? {
								...item,
								quantity: Math.min(item.quantity + 1, Number(product.Quantity)),
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
		if (!canProcessSales) return requirePermission("CanProcessSales");
		setCartItems((prev) => prev.filter((item) => item.ID !== id));
	};

	const incrementItem = (id) => {
		if (!canProcessSales) return requirePermission("CanProcessSales");
		setCartItems((prev) =>
			prev.map((item) =>
				item.ID === id
					? { ...item, quantity: Math.min(item.quantity + 1, item.maxQuantity) }
					: item,
			),
		);
	};

	const decrementItem = (id) => {
		if (!canProcessSales) return requirePermission("CanProcessSales");
		setCartItems((prev) =>
			prev.flatMap((item) => {
				if (item.ID !== id) return [item];
				if (item.quantity <= 1) return [];
				return [{ ...item, quantity: item.quantity - 1 }];
			}),
		);
	};

	const openEditQtyModal = (item) => {
		if (!canProcessSales) return requirePermission("CanProcessSales");
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
		if (!canProcessSales) return requirePermission("CanProcessSales");
		setCartItems([]);
	};
	const firstErrorMessage = (errors, fallback) =>
		(errors && Object.values(errors).find(Boolean)) || fallback;

	const openCheckoutModal = () => {
		if (!canProcessSales) return requirePermission("CanProcessSales");
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
		if (transactionType === "Job Orders") {
			jobOrderForm.setData("items", cartToPayload());
			jobOrderForm.setData("customerMode", "existing");
			jobOrderForm.setData("CustomerID", "");
			jobOrderForm.setData("newCustomer", {
				CustomerName: "",
				CustomerType: "Retail",
				ContactDetails: "",
				Address: "",
			});
			jobOrderForm.setData("paymentSelection", "pay_later");
			jobOrderForm.setData("paidAmount", "");
			jobOrderForm.setData("paymentMethod", "Cash");
			jobOrderForm.setData("additionalDetails", "");
			jobOrderForm.setData("dueDate", plusThirtyDaysISO());
			jobOrderForm.clearErrors();
			setCustomerSearch("");
			setJobOrderSubmitError("");
			setJobOrderOpen(true);
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
	const newCustomerFieldErrors = [
		jobOrderForm.errors["newCustomer.CustomerName"],
		jobOrderForm.errors["newCustomer.CustomerType"],
		jobOrderForm.errors["newCustomer.ContactDetails"],
		jobOrderForm.errors["newCustomer.Address"],
	].filter(Boolean);
	const filteredCustomers = useMemo(() => {
		const query = customerSearch.trim().toLowerCase();
		if (!query) return customers;
		return customers.filter((customer) => {
			const name = String(customer.CustomerName || "").toLowerCase();
			const type = String(customer.CustomerType || "").toLowerCase();
			const contact = String(customer.ContactDetails || "").toLowerCase();
			return (
				name.includes(query) || type.includes(query) || contact.includes(query)
			);
		});
	}, [customers, customerSearch]);

	const submitWalkIn = (e) => {
		e.preventDefault();
		if (!canProcessSales) return requirePermission("CanProcessSales");
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
					firstErrorMessage(
						errors,
						"Failed to process walk-in sale. Please review your input.",
					),
				);
			},
		});
	};

	const submitJobOrder = (e) => {
		e.preventDefault();
		if (!canProcessSales) return requirePermission("CanProcessSales");
		jobOrderForm.transform((data) => ({
			...data,
			items: cartToPayload(),
			paidAmount:
				data.paymentSelection === "pay_now"
					? data.paidAmount === ""
						? null
						: Number(data.paidAmount)
					: null,
		}));
		jobOrderForm.post(route("pos.checkout.job-order"), {
			preserveScroll: true,
			onSuccess: () => {
				setJobOrderOpen(false);
				clearCart();
				jobOrderForm.reset("items", "CustomerID");
				jobOrderForm.setData("customerMode", "existing");
				jobOrderForm.setData("dueDate", plusThirtyDaysISO());
				jobOrderForm.setData("paymentSelection", "pay_later");
				jobOrderForm.setData("paidAmount", "");
				jobOrderForm.setData("paymentMethod", "Cash");
				jobOrderForm.setData("additionalDetails", "");
				jobOrderForm.setData("newCustomer", {
					CustomerName: "",
					CustomerType: "Retail",
					ContactDetails: "",
					Address: "",
				});
				setCustomerSearch("");
				setJobOrderSubmitError("");
			},
			onError: (errors) => {
				setJobOrderSubmitError(
					firstErrorMessage(
						errors,
						"Failed to process job order. Please review your input.",
					),
				);
			},
		});
	};

	const submitShrinkage = (e) => {
		e.preventDefault();
		if (!canProcessSales) return requirePermission("CanProcessSales");
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
					firstErrorMessage(
						errors,
						"Failed to record shrinkage. Please review your input.",
					),
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
			<Head title="Cash Sale" />
			<CashierTabs />

			<div className="flex-1 p-4 md:p-6 min-h-0">
				<div className="h-full min-h-0 flex flex-col">
					{!canProcessSales && (
						<div className="mb-3 shrink-0 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
							You can view cashier data, but sales processing actions are disabled for your account.
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
										disabled={!canProcessSales}
										className="text-left border border-gray-200 rounded-lg p-3 hover:border-primary hover:bg-primary-soft transition-colors"
									>
										<div className="h-28 bg-gray-100 rounded-md mb-2 overflow-hidden">
											{product.ProductImage ? (
												<img
													src={product.ProductImage}
													alt={product.ProductName}
													className="w-full h-full object-cover"
													onError={(e) => {
														e.currentTarget.style.display = "none";
														e.currentTarget.nextSibling.style.display = "flex";
													}}
												/>
											) : null}
											<div
												className="w-full h-full flex items-center justify-center text-xs text-gray-500"
												style={{
													display: product.ProductImage ? "none" : "flex",
												}}
											>
												No Image
											</div>
										</div>
										<p className="font-semibold text-gray-900 text-sm truncate">
											{product.ProductName}
										</p>
										<p className="text-primary font-bold text-sm">
											{currency(product.Price)}
										</p>
										<p className="text-xs text-gray-500">
											Qty: {Number(product.Quantity)}
										</p>
									</button>
								))}
								{availableProducts.length === 0 && (
									<div className="col-span-full border border-dashed border-gray-300 rounded-lg p-6 text-sm text-gray-500 text-center">
										No products found.
									</div>
								)}
							</div>
						</div>
					</div>

					<div className="w-full md:w-96 min-h-0 bg-white border border-gray-200 rounded-lg p-4 flex flex-col">
						<h3 className="font-semibold text-gray-900 mb-3">Current Cart</h3>

						<div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
							{cartItems.map((item) => (
								<div
									key={item.ID}
									className="border border-gray-200 rounded-md p-3"
								>
									<div className="flex justify-between gap-3">
										<p className="font-semibold text-sm text-gray-900 truncate">
											{item.ProductName}
										</p>
										<p className="font-semibold text-sm text-gray-900">
											{currency(item.pricePerUnit * item.quantity)}
										</p>
									</div>
									<div className="mt-1 text-xs text-gray-600">
										Price: {currency(item.pricePerUnit)} | Quantity:{" "}
										{item.quantity}
									</div>
									<div className="mt-2 flex gap-2">
										<button
											type="button"
											onClick={() => removeItem(item.ID)}
											disabled={!canProcessSales}
											className="px-2 py-1 text-xs rounded-md border border-red-200 text-red-600 hover:bg-red-50"
										>
											Delete
										</button>
										<button
											type="button"
											onClick={() => decrementItem(item.ID)}
											disabled={!canProcessSales}
											className="px-2 py-1 text-xs rounded-md border border-primary bg-white text-primary hover:bg-primary-soft"
										>
											-
										</button>
										<button
											type="button"
											onClick={() => incrementItem(item.ID)}
											disabled={!canProcessSales}
											className="px-2 py-1 text-xs rounded-md border border-primary bg-white text-primary hover:bg-primary-soft"
										>
											+
										</button>
										<button
											type="button"
											onClick={() => openEditQtyModal(item)}
											disabled={!canProcessSales}
											className="px-2 py-1 text-xs rounded-md border border-primary text-primary hover:bg-primary-soft"
										>
											Edit Qty.
										</button>
									</div>
								</div>
							))}
							{cartItems.length === 0 && (
								<div className="border border-dashed border-gray-300 rounded-md p-5 text-sm text-gray-500 text-center">
									No items in cart.
								</div>
							)}
						</div>

						<div className="pt-4 mt-4 border-t border-gray-200 space-y-3">
							<button
								type="button"
								onClick={clearCart}
								disabled={!canProcessSales || !cartItems.length}
								className="w-full border border-red-200 text-red-600 rounded-md px-3 py-2 text-sm hover:bg-red-50 disabled:opacity-40"
							>
								Clear Cart
							</button>
							<div className="flex justify-between text-sm">
								<span className="text-gray-600">Total Amount</span>
								<span className="font-semibold text-gray-900">
									{currency(cartTotal)}
								</span>
							</div>
							<select
								value={transactionType}
								onChange={(e) => setTransactionType(e.target.value)}
								disabled={!canProcessSales}
								className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
							>
								<option value="Walk-In">Walk-In</option>
								<option value="Job Orders">Job Orders</option>
								<option value="Shrinkage">Shrinkage</option>
							</select>
							<button
								type="button"
								onClick={openCheckoutModal}
								disabled={!canProcessSales || !cartItems.length}
								className="w-full bg-primary text-white rounded-md px-3 py-2 text-sm font-medium hover:bg-primary-hover disabled:opacity-40"
							>
								{transactionType === "Shrinkage"
									? "Record Shrinkage"
									: transactionType === "Job Orders"
										? "Create Job Order"
									: "Proceed to Checkout"}
							</button>
						</div>
					</div>
				</div>
				</div>
			</div>

			<Modal show={editQtyOpen} onClose={closeEditQtyModal} maxWidth="md">
				<form onSubmit={submitEditQty} className="p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">
						Edit Quantity
					</h3>
					<p className="text-sm text-gray-700">
						{editQtyItem?.ProductName || "Selected item"}
					</p>
					<p className="text-xs text-gray-500 mt-1 mb-4">
						Available stock: {editQtyItem?.maxQuantity ?? 0}
					</p>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Quantity
					</label>
					<input
						type="number"
						step="1"
						min="1"
						max={editQtyItem?.maxQuantity || 1}
						value={editQtyValue}
						onChange={(e) => setEditQtyValue(e.target.value)}
						className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
					/>
					{editQtyError && (
						<p className="mt-2 text-sm text-red-600">{editQtyError}</p>
					)}
					<div className="mt-6 flex justify-end gap-2">
						<button
							type="button"
							onClick={closeEditQtyModal}
							className="px-4 py-2 text-sm rounded-md border border-primary bg-white text-primary hover:bg-primary-soft"
						>
							Cancel
						</button>
						<button
							type="submit"
							className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary-hover"
						>
							Save Quantity
						</button>
					</div>
				</form>
			</Modal>

			<Modal
				show={walkInOpen}
				onClose={() => setWalkInOpen(false)}
				maxWidth="lg"
			>
				<form onSubmit={submitWalkIn} className="p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">
						Walk-In Sale
					</h3>
					<div className="max-h-52 overflow-y-auto border border-gray-200 rounded-md p-3 mb-4 space-y-2">
						{cartItems.map((item) => (
							<div
								key={`walk-${item.ID}`}
								className="flex justify-between text-sm"
							>
								<span>
									{item.ProductName} x{item.quantity}
								</span>
								<span>{currency(item.pricePerUnit * item.quantity)}</span>
							</div>
						))}
					</div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Amount
					</label>
					<input
						type="number"
						step="0.01"
						min="0"
						value={walkInForm.data.paidAmount}
						onChange={(e) => walkInForm.setData("paidAmount", e.target.value)}
						className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
						placeholder="Cash Amount"
					/>
					<div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
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
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Additional Details
							</label>
							<input
								type="text"
								value={walkInForm.data.additionalDetails}
								onChange={(e) =>
									walkInForm.setData("additionalDetails", e.target.value)
								}
								placeholder="Reference no., notes, etc. (optional)"
								className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
							/>
						</div>
					</div>
					{walkInForm.errors.paidAmount && (
						<p className="mt-1 text-sm text-red-600">
							{walkInForm.errors.paidAmount}
						</p>
					)}
					{walkInForm.errors.paymentMethod && (
						<p className="mt-1 text-sm text-red-600">
							{walkInForm.errors.paymentMethod}
						</p>
					)}
					{walkInForm.errors.additionalDetails && (
						<p className="mt-1 text-sm text-red-600">
							{walkInForm.errors.additionalDetails}
						</p>
					)}
					{!walkInForm.errors.paidAmount && walkInSubmitError && (
						<p className="mt-1 text-sm text-red-600">{walkInSubmitError}</p>
					)}
					<div className="mt-4 text-sm space-y-1">
						<p className="flex justify-between">
							<span className="text-gray-600">Total Amount</span>
							<span className="font-semibold">{currency(cartTotal)}</span>
						</p>
						<p className="flex justify-between">
							<span className="text-gray-600">Change</span>
							<span className="font-semibold">{currency(walkInChange)}</span>
						</p>
					</div>
					{walkInForm.errors.items && (
						<p className="mt-2 text-sm text-red-600">
							{walkInForm.errors.items}
						</p>
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

			{jobOrderOpen && (
				<div className="fixed inset-0 z-50 overflow-y-auto">
					<div className="flex min-h-screen items-center justify-center p-4">
						<div
							className="fixed inset-0 bg-gray-500/75"
							onClick={() => setJobOrderOpen(false)}
						/>
							<form
								onSubmit={submitJobOrder}
								className="relative w-full max-w-7xl rounded-lg bg-white shadow-xl max-h-[88vh] flex flex-col"
							>
							<div className="border-b px-6 py-4">
								<h3 className="text-lg font-semibold text-gray-900">Job Order</h3>
							</div>

								<div className="flex-1 min-h-0 grid gap-4 p-6 lg:grid-cols-[minmax(0,1fr)_420px] overflow-hidden">
					<div className="rounded-lg border border-gray-200 p-4 flex flex-col min-h-0">
						<p className="text-sm font-semibold text-gray-700 mb-2">
							1. Items Summary
						</p>
						<div className="flex-1 min-h-0 overflow-y-auto border border-gray-200 rounded-md p-3 space-y-2">
							{cartItems.map((item) => (
								<div key={`job-order-${item.ID}`} className="flex justify-between text-sm">
									<span>
										{item.ProductName} x{item.quantity}
									</span>
									<span>{currency(item.pricePerUnit * item.quantity)}</span>
								</div>
							))}
						</div>
					</div>

					<div className="space-y-4 min-h-0 overflow-y-auto pr-1">
					<div className="rounded-lg border border-gray-200 p-4">
							<p className="text-sm font-semibold text-gray-700 mb-2">
								2. Customer Selection
							</p>
						<select
							value={jobOrderForm.data.customerMode}
							onChange={(e) => {
								const mode = e.target.value;
								jobOrderForm.setData("customerMode", mode);
								if (mode === "new") {
									jobOrderForm.setData("CustomerID", "");
								}
							}}
							className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
						>
							<option value="existing">Existing Customer</option>
							<option value="new">New Customer</option>
						</select>

						{jobOrderForm.data.customerMode === "existing" ? (
							<div className="mt-3 space-y-2">
								<input
									type="text"
									value={customerSearch}
									onChange={(e) => setCustomerSearch(e.target.value)}
									placeholder="Search existing customer..."
									className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
								/>
								<select
									value={jobOrderForm.data.CustomerID}
									onChange={(e) => jobOrderForm.setData("CustomerID", e.target.value)}
									className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
								>
									<option value="">Select customer</option>
									{filteredCustomers.map((customer) => (
										<option key={customer.ID} value={customer.ID}>
											{customer.CustomerName} ({customer.CustomerType})
										</option>
									))}
								</select>
								{jobOrderForm.errors.CustomerID && (
									<p className="text-sm text-red-600">
										{jobOrderForm.errors.CustomerID}
									</p>
								)}
							</div>
						) : (
							<div className="mt-3">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									<input
										type="text"
										placeholder="Customer Name"
										value={jobOrderForm.data.newCustomer.CustomerName}
										onChange={(e) =>
											jobOrderForm.setData("newCustomer", {
												...jobOrderForm.data.newCustomer,
												CustomerName: e.target.value,
											})
										}
										className="border border-gray-300 rounded-md px-3 py-2 text-sm"
									/>
									<select
										value={jobOrderForm.data.newCustomer.CustomerType}
										onChange={(e) =>
											jobOrderForm.setData("newCustomer", {
												...jobOrderForm.data.newCustomer,
												CustomerType: e.target.value,
											})
										}
										className="border border-gray-300 rounded-md px-3 py-2 text-sm"
									>
										<option value="Retail">Retail</option>
										<option value="Business">Business</option>
									</select>
									<input
										type="text"
										placeholder="Contact Details"
										value={jobOrderForm.data.newCustomer.ContactDetails}
										onChange={(e) =>
											jobOrderForm.setData("newCustomer", {
												...jobOrderForm.data.newCustomer,
												ContactDetails: e.target.value,
											})
										}
										className="border border-gray-300 rounded-md px-3 py-2 text-sm"
									/>
									<input
										type="text"
										placeholder="Address"
										value={jobOrderForm.data.newCustomer.Address}
										onChange={(e) =>
											jobOrderForm.setData("newCustomer", {
												...jobOrderForm.data.newCustomer,
												Address: e.target.value,
											})
										}
										className="border border-gray-300 rounded-md px-3 py-2 text-sm"
									/>
								</div>
								{newCustomerFieldErrors.length > 0 && (
									<div className="mt-2 space-y-1">
										{newCustomerFieldErrors.map((message, index) => (
											<p key={`new-customer-error-${index}`} className="text-sm text-red-600">
												{message}
											</p>
										))}
									</div>
								)}
							</div>
						)}
						</div>

						<div className="rounded-lg border border-gray-200 p-4">
							<p className="text-sm font-semibold text-gray-700 mb-2">
								3. Payment Selection
							</p>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Payment Type
								</label>
								<select
									value={jobOrderForm.data.paymentSelection}
									onChange={(e) =>
										jobOrderForm.setData("paymentSelection", e.target.value)
									}
									className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
								>
									<option value="pay_later">Pay Later</option>
									<option value="pay_now">Pay Now</option>
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Total Amount
								</label>
								<div className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50">
									{currency(cartTotal)}
								</div>
							</div>
						</div>

						{jobOrderForm.data.paymentSelection === "pay_now" ? (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Amount Paid
									</label>
									<input
										type="number"
										step="0.01"
										min="0"
										value={jobOrderForm.data.paidAmount}
										onChange={(e) => jobOrderForm.setData("paidAmount", e.target.value)}
										className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
										placeholder="Enter amount paid"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Payment Method
									</label>
									<select
										value={jobOrderForm.data.paymentMethod}
										onChange={(e) => jobOrderForm.setData("paymentMethod", e.target.value)}
										className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
									>
										<option value="Cash">Cash</option>
										<option value="GCash">GCash</option>
										<option value="Bank Transfer">Bank Transfer</option>
										<option value="Card">Card</option>
									</select>
								</div>
								<div className="md:col-span-2">
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Additional Details
									</label>
									<input
										type="text"
										value={jobOrderForm.data.additionalDetails}
										onChange={(e) =>
											jobOrderForm.setData("additionalDetails", e.target.value)
										}
										placeholder="Reference no., notes, etc. (optional)"
										className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
									/>
								</div>
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Due Date
									</label>
									<input
										type="date"
										min={tomorrowISO()}
										value={jobOrderForm.data.dueDate}
										onChange={(e) => jobOrderForm.setData("dueDate", e.target.value)}
										className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
									/>
									<p className="mt-1 text-xs text-gray-500">
										Default is 30 days from today.
									</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Payment Method
									</label>
									<select
										value={jobOrderForm.data.paymentMethod}
										onChange={(e) => jobOrderForm.setData("paymentMethod", e.target.value)}
										className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
									>
										<option value="Cash">Cash</option>
										<option value="GCash">GCash</option>
										<option value="Bank Transfer">Bank Transfer</option>
										<option value="Card">Card</option>
									</select>
								</div>
								<div className="md:col-span-2">
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Additional Details
									</label>
									<input
										type="text"
										value={jobOrderForm.data.additionalDetails}
										onChange={(e) =>
											jobOrderForm.setData("additionalDetails", e.target.value)
										}
										placeholder="Reference no., notes, etc. (optional)"
										className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
									/>
								</div>
							</div>
							)}
						</div>
					</div>

						<div className="space-y-1 lg:col-span-2">
						{jobOrderForm.errors.paymentSelection && (
							<p className="text-sm text-red-600">
								{jobOrderForm.errors.paymentSelection}
							</p>
						)}
						{jobOrderForm.errors.paidAmount && (
							<p className="text-sm text-red-600">{jobOrderForm.errors.paidAmount}</p>
						)}
						{jobOrderForm.errors.paymentMethod && (
							<p className="text-sm text-red-600">
								{jobOrderForm.errors.paymentMethod}
							</p>
						)}
						{jobOrderForm.errors.additionalDetails && (
							<p className="text-sm text-red-600">
								{jobOrderForm.errors.additionalDetails}
							</p>
						)}
						{jobOrderForm.errors.dueDate && (
							<p className="text-sm text-red-600">{jobOrderForm.errors.dueDate}</p>
						)}
						{jobOrderForm.errors.items && (
							<p className="text-sm text-red-600">{jobOrderForm.errors.items}</p>
						)}
						{jobOrderSubmitError && (
							<p className="text-sm text-red-600">{jobOrderSubmitError}</p>
						)}
					</div>

							</div>

							<div className="border-t px-6 py-4 flex justify-end gap-2">
								<button
									type="button"
									onClick={() => setJobOrderOpen(false)}
									className="px-4 py-2 text-sm rounded-md border border-primary bg-white text-primary hover:bg-primary-soft"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={jobOrderForm.processing}
									className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
								>
									Confirm Job Order
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			<Modal
				show={shrinkageOpen}
				onClose={() => setShrinkageOpen(false)}
				maxWidth="lg"
			>
				<form onSubmit={submitShrinkage} className="p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">
						Record Shrinkage
					</h3>
					<div className="max-h-52 overflow-y-auto border border-gray-200 rounded-md p-3 mb-4 space-y-2">
						{cartItems.map((item) => (
							<div
								key={`shrinkage-${item.ID}`}
								className="flex justify-between text-sm"
							>
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
						</select>
					</div>
					{shrinkageForm.errors.reason && (
						<p className="mt-2 text-sm text-red-600">
							{shrinkageForm.errors.reason}
						</p>
					)}
					{shrinkageForm.errors.items && (
						<p className="mt-2 text-sm text-red-600">
							{shrinkageForm.errors.items}
						</p>
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
