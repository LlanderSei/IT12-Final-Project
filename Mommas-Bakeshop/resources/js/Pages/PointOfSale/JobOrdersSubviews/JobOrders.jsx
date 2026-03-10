import React, { useMemo, useState } from "react";
import { useForm } from "@inertiajs/react";
import Modal from "@/Components/Modal";
import usePermissions from "@/hooks/usePermissions";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;

const todayISO = () => {
	const date = new Date();
	return date.toISOString().split("T")[0];
};

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
	const [editQtyOpen, setEditQtyOpen] = useState(false);
	const [editQtyItem, setEditQtyItem] = useState(null);
	const [editQtyValue, setEditQtyValue] = useState("");
	const [editQtyError, setEditQtyError] = useState("");
	const [customOrderEditorOpen, setCustomOrderEditorOpen] = useState(false);
	const [customOrderEditIndex, setCustomOrderEditIndex] = useState(null);
	const [customOrderDraft, setCustomOrderDraft] = useState({
		description: "",
		quantity: "1",
		pricePerUnit: "",
	});
	const [customOrderDraftError, setCustomOrderDraftError] = useState("");
	const [customOrders, setCustomOrders] = useState([]);
	const [checkoutOpen, setCheckoutOpen] = useState(false);
	const [customerSearch, setCustomerSearch] = useState("");
	const [submitError, setSubmitError] = useState("");

	const jobOrderForm = useForm({
		items: [],
		customOrders: [],
		customerMode: "existing",
		CustomerID: "",
		newCustomer: {
			CustomerName: "",
			CustomerType: "Retail",
			ContactDetails: "",
			Address: "",
		},
		deliveryDate: tomorrowISO(),
		deliveryTime: "08:00",
		notes: "",
	});

	const availableProducts = useMemo(() => {
		return products
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

	const customOrdersTotal = useMemo(
		() =>
			customOrders.reduce(
				(sum, item) => sum + Number(item.pricePerUnit) * Number(item.quantity),
				0,
			),
		[customOrders],
	);

	const grandTotal = useMemo(
		() => Number(cartTotal) + Number(customOrdersTotal),
		[cartTotal, customOrdersTotal],
	);

	const cartToPayload = () =>
		cartItems.map((item) => ({
			ProductID: item.ID,
			Quantity: item.quantity,
		}));

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

	const addToCart = (product) => {
		if (!requirePermission("CanCreateJobOrders")) return;
		setCartItems((prev) => {
			const existing = prev.find((item) => item.ID === product.ID);
			if (existing) {
				return prev.map((item) =>
					item.ID === product.ID
						? { ...item, quantity: item.quantity + 1 }
						: item,
				);
			}
			return [
				...prev,
				{
					ID: product.ID,
					ProductName: product.ProductName,
					pricePerUnit: Number(product.Price),
					quantity: 1,
				},
			];
		});
	};

	const removeItem = (id) => {
		if (!requirePermission("CanCreateJobOrders")) return;
		setCartItems((prev) => prev.filter((item) => item.ID !== id));
	};

	const incrementItem = (id) => {
		if (!requirePermission("CanCreateJobOrders")) return;
		setCartItems((prev) =>
			prev.map((item) =>
				item.ID === id ? { ...item, quantity: item.quantity + 1 } : item,
			),
		);
	};

	const decrementItem = (id) => {
		if (!requirePermission("CanCreateJobOrders")) return;
		setCartItems((prev) =>
			prev.flatMap((item) => {
				if (item.ID !== id) return [item];
				if (item.quantity <= 1) return [];
				return [{ ...item, quantity: item.quantity - 1 }];
			}),
		);
	};

	const openEditQtyModal = (item) => {
		if (!requirePermission("CanCreateJobOrders")) return;
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
		setCartItems((prev) =>
			prev.map((item) =>
				item.ID === editQtyItem.ID ? { ...item, quantity } : item,
			),
		);
		closeEditQtyModal();
	};

	const openCustomOrderEditor = (index = null) => {
		if (!requirePermission("CanCreateJobOrders")) return;
		const existing = index === null ? null : customOrders[index];
		setCustomOrderEditIndex(index);
		setCustomOrderDraft({
			description: existing?.description || "",
			quantity: String(existing?.quantity || 1),
			pricePerUnit:
				existing?.pricePerUnit === 0 || existing?.pricePerUnit
					? String(existing.pricePerUnit)
					: "",
		});
		setCustomOrderDraftError("");
		setCustomOrderEditorOpen(true);
	};

	const closeCustomOrderEditor = () => {
		setCustomOrderEditorOpen(false);
		setCustomOrderEditIndex(null);
		setCustomOrderDraft({
			description: "",
			quantity: "1",
			pricePerUnit: "",
		});
		setCustomOrderDraftError("");
	};

	const saveCustomOrderDraft = (e) => {
		e.preventDefault();
		if (!requirePermission("CanCreateJobOrders")) return;
		const description = String(customOrderDraft.description || "").trim();
		const quantity = Number(customOrderDraft.quantity);
		const pricePerUnit = Number(customOrderDraft.pricePerUnit);

		if (!description) {
			setCustomOrderDraftError("Description is required.");
			return;
		}
		if (!Number.isInteger(quantity) || quantity < 1) {
			setCustomOrderDraftError(
				"Quantity must be a whole number greater than 0.",
			);
			return;
		}
		if (!Number.isFinite(pricePerUnit) || pricePerUnit <= 0) {
			setCustomOrderDraftError("Price per unit must be greater than 0.");
			return;
		}

		const normalized = {
			description,
			quantity,
			pricePerUnit: Number(pricePerUnit.toFixed(2)),
		};
		const current = [...customOrders];
		if (customOrderEditIndex === null) {
			current.push(normalized);
		} else {
			current[customOrderEditIndex] = normalized;
		}
		setCustomOrders(current);
		closeCustomOrderEditor();
	};

	const removeCustomOrder = (index) => {
		if (!requirePermission("CanCreateJobOrders")) return;
		const current = [...customOrders];
		current.splice(index, 1);
		setCustomOrders(current);
	};

	const clearAllCustomOrders = () => {
		if (!requirePermission("CanCreateJobOrders")) return;
		setCustomOrders([]);
	};

	const clearAll = () => {
		if (!requirePermission("CanCreateJobOrders")) return;
		setCartItems([]);
		setCustomOrders([]);
	};

	const openCheckoutModal = () => {
		if (!requirePermission("CanCreateJobOrders")) return;
		if (!cartItems.length && !customOrders.length) return;
		jobOrderForm.setData("items", cartToPayload());
		jobOrderForm.setData("customOrders", customOrders);
		jobOrderForm.clearErrors();
		setSubmitError("");
		setCheckoutOpen(true);
	};

	const submitJobOrder = (e) => {
		e.preventDefault();
		if (!canCreateJobOrders) {
			return requirePermission(
				"CanCreateJobOrders",
				"You do not have permission to create job orders.",
			);
		}
		if (!cartItems.length && !customOrders.length) {
			setSubmitError("Add at least one product or custom order item.");
			return;
		}
		jobOrderForm.transform((data) => ({
			...data,
			items: cartToPayload(),
			customOrders: customOrders.map((item) => ({
				description: String(item.description || "").trim(),
				quantity: Number(item.quantity || 0),
				pricePerUnit: Number(item.pricePerUnit || 0),
			})),
		}));
		jobOrderForm.post(route("pos.job-orders.store"), {
			preserveScroll: true,
			onSuccess: () => {
				setCheckoutOpen(false);
				clearAll();
				jobOrderForm.reset("items", "CustomerID");
				jobOrderForm.setData("customOrders", []);
				jobOrderForm.setData("customerMode", "existing");
				jobOrderForm.setData("deliveryDate", tomorrowISO());
				jobOrderForm.setData("deliveryTime", "08:00");
				jobOrderForm.setData("notes", "");
				jobOrderForm.setData("newCustomer", {
					CustomerName: "",
					CustomerType: "Retail",
					ContactDetails: "",
					Address: "",
				});
				setCustomerSearch("");
				setSubmitError("");
			},
			onError: (errors) => {
				setSubmitError(
					Object.values(errors).find(Boolean) ||
						"Failed to create job order. Please review your input.",
				);
			},
		});
	};

	const newCustomerFieldErrors = [
		jobOrderForm.errors["newCustomer.CustomerName"],
		jobOrderForm.errors["newCustomer.CustomerType"],
		jobOrderForm.errors["newCustomer.ContactDetails"],
		jobOrderForm.errors["newCustomer.Address"],
	].filter(Boolean);

	return (
		<div className="h-full min-h-0 flex flex-col">
			{!canCreateJobOrders && (
				<div className="mb-3 shrink-0 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
					You can view job orders, but creation actions are disabled for your
					account.
				</div>
			)}
			<div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_0.8fr] gap-4">
				<div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col min-h-0">
					<div className="flex flex-col md:flex-row gap-3 mb-3">
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
					<div className="flex-1 min-h-0 overflow-y-auto space-y-2">
						{availableProducts.map((product) => (
							<button
								key={product.ID}
								type="button"
								onClick={() => addToCart(product)}
								disabled={!canCreateJobOrders}
								className="w-full text-left border border-gray-200 rounded-md px-3 py-2 hover:border-primary hover:bg-primary-soft transition-colors disabled:opacity-60"
							>
								<div className="flex items-center justify-between text-sm">
									<span className="font-semibold text-gray-900">
										{product.ProductName}
									</span>
									<span className="text-gray-700">
										{currency(product.Price)}
									</span>
								</div>
								<div className="text-xs text-gray-500 mt-1">
									Qty {product.Quantity ?? 0}
								</div>
							</button>
						))}
					</div>
				</div>

				<div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col min-h-0">
					<div className="flex items-center justify-between mb-3">
						<h3 className="text-sm font-semibold text-gray-700">Custom Orders</h3>
						<button
							type="button"
							onClick={() => openCustomOrderEditor(null)}
							disabled={!canCreateJobOrders}
							className="rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-soft disabled:opacity-50"
						>
							Add
						</button>
					</div>
					<div className="flex-1 min-h-0 overflow-y-auto space-y-2">
						{customOrders.length === 0 && (
							<p className="text-sm text-gray-500">No custom orders yet.</p>
						)}
						{customOrders.map((item, index) => (
							<div
								key={`custom-${index}`}
								className="rounded-md border border-gray-200 p-3"
							>
								<div className="text-sm font-semibold text-gray-900">
									{item.description}
								</div>
								<div className="text-xs text-gray-500 mt-1">
									Qty {item.quantity} - {currency(item.pricePerUnit)}
								</div>
								<div className="mt-2 flex items-center justify-between text-xs">
									<span className="text-gray-600">
										{currency(
											Number(item.quantity || 0) *
												Number(item.pricePerUnit || 0),
										)}
									</span>
									<div className="flex gap-2">
										<button
											type="button"
											onClick={() => openCustomOrderEditor(index)}
											disabled={!canCreateJobOrders}
											className="text-primary hover:underline disabled:opacity-50"
										>
											Edit
										</button>
										<button
											type="button"
											onClick={() => removeCustomOrder(index)}
											disabled={!canCreateJobOrders}
											className="text-red-600 hover:underline disabled:opacity-50"
										>
											Remove
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
					<div className="mt-3 flex items-center justify-between text-sm">
						<span className="text-gray-600">Custom Total</span>
						<span className="font-semibold text-gray-900">
							{currency(customOrdersTotal)}
						</span>
					</div>
					<button
						type="button"
						onClick={clearAllCustomOrders}
						disabled={!customOrders.length || !canCreateJobOrders}
						className="mt-2 text-xs text-red-600 hover:underline disabled:opacity-50"
					>
						Clear custom orders
					</button>
				</div>

				<div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col min-h-0">
					<div className="flex items-center justify-between mb-3">
						<h3 className="text-sm font-semibold text-gray-700">Current Cart</h3>
						<button
							type="button"
							onClick={clearAll}
							disabled={!cartItems.length && !customOrders.length}
							className="text-xs text-red-600 hover:underline disabled:opacity-50"
						>
							Clear all
						</button>
					</div>
					<div className="flex-1 min-h-0 overflow-y-auto space-y-2">
						{cartItems.length === 0 && (
							<p className="text-sm text-gray-500">No products added.</p>
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
						{customOrders.length > 0 && (
							<div className="pt-2 border-t border-gray-200">
								<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
									Custom Items
								</p>
								{customOrders.map((item, index) => (
									<div
										key={`cart-custom-${index}`}
										className="rounded-md border border-gray-200 p-3 mb-2"
									>
										<div className="flex items-start justify-between">
											<div className="text-sm font-semibold text-gray-900">
												{item.description}
											</div>
											<button
												type="button"
												onClick={() => removeCustomOrder(index)}
												disabled={!canCreateJobOrders}
												className="text-xs text-red-600 hover:underline disabled:opacity-50"
											>
												Remove
											</button>
										</div>
										<div className="mt-1 text-xs text-gray-500">
											Qty {item.quantity} - {currency(item.pricePerUnit)}
										</div>
										<div className="mt-2 flex items-center justify-between text-xs">
											<button
												type="button"
												onClick={() => openCustomOrderEditor(index)}
												disabled={!canCreateJobOrders}
												className="text-primary hover:underline disabled:opacity-50"
											>
												Edit
											</button>
											<span className="text-gray-500">
												{currency(
													Number(item.quantity || 0) *
														Number(item.pricePerUnit || 0),
												)}
											</span>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
					<div className="border-t pt-3 mt-3">
						<div className="flex items-center justify-between text-sm">
							<span className="text-gray-600">Total</span>
							<span className="font-semibold text-gray-900">
								{currency(grandTotal)}
							</span>
						</div>
						<button
							type="button"
							onClick={openCheckoutModal}
							disabled={
								(!cartItems.length && !customOrders.length) || !canCreateJobOrders
							}
							className="mt-3 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
						>
							Proceed to Checkout
						</button>
					</div>
				</div>
			</div>

			<Modal show={editQtyOpen} onClose={closeEditQtyModal} maxWidth="md">
				<form onSubmit={submitEditQty} className="p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">
						Edit Quantity
					</h3>
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

			<Modal
				show={customOrderEditorOpen}
				onClose={closeCustomOrderEditor}
				maxWidth="md"
			>
				<form onSubmit={saveCustomOrderDraft} className="p-6">
					<h3 className="mb-4 text-lg font-semibold text-gray-900">
						{customOrderEditIndex === null
							? "Add Custom Order"
							: "Edit Custom Order"}
					</h3>
					<div className="space-y-3">
						<div>
							<label className="mb-1 block text-sm font-medium text-gray-700">
								Description
							</label>
							<textarea
								rows={3}
								value={customOrderDraft.description}
								onChange={(e) =>
									setCustomOrderDraft((prev) => ({
										...prev,
										description: e.target.value,
									}))
								}
								placeholder="Custom order description"
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-primary"
							/>
						</div>
						<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
							<div>
								<label className="mb-1 block text-sm font-medium text-gray-700">
									Quantity
								</label>
								<input
									type="number"
									step="1"
									min="1"
									value={customOrderDraft.quantity}
									onChange={(e) =>
										setCustomOrderDraft((prev) => ({
											...prev,
											quantity: e.target.value,
										}))
									}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-primary"
								/>
							</div>
							<div>
								<label className="mb-1 block text-sm font-medium text-gray-700">
									Price Per Unit
								</label>
								<input
									type="number"
									step="0.01"
									min="0.01"
									value={customOrderDraft.pricePerUnit}
									onChange={(e) =>
										setCustomOrderDraft((prev) => ({
											...prev,
											pricePerUnit: e.target.value,
										}))
									}
									className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-primary"
								/>
							</div>
						</div>
					</div>
					{customOrderDraftError && (
						<p className="mt-3 text-sm text-red-600">
							{customOrderDraftError}
						</p>
					)}
					<div className="mt-6 flex justify-end gap-2">
						<button
							type="button"
							onClick={closeCustomOrderEditor}
							className="rounded-md border border-primary bg-white px-4 py-2 text-sm text-primary hover:bg-primary-soft"
						>
							Cancel
						</button>
						<button
							type="submit"
							className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover"
						>
							Save Custom Order
						</button>
					</div>
				</form>
			</Modal>

			<Modal
				show={checkoutOpen}
				onClose={() => setCheckoutOpen(false)}
				maxWidth="2xl"
			>
				<form onSubmit={submitJobOrder} className="p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">
						Job Order Checkout
					</h3>
					<div className="space-y-4">
						<div className="rounded-lg border border-gray-200 p-4">
							<p className="text-sm font-semibold text-gray-700 mb-2">
								Summary
							</p>
							<div className="max-h-52 overflow-y-auto space-y-2 text-sm">
								{cartItems.map((item) => (
									<div
										key={`summary-${item.ID}`}
										className="flex justify-between"
									>
										<span>
											{item.ProductName} x{item.quantity}
										</span>
										<span>{currency(item.pricePerUnit * item.quantity)}</span>
									</div>
								))}
								{customOrders.map((item, index) => (
									<div
										key={`summary-custom-${index}`}
										className="flex justify-between"
									>
										<span>
											{item.description} x{item.quantity}
										</span>
										<span>
											{currency(
												Number(item.quantity || 0) *
													Number(item.pricePerUnit || 0),
											)}
										</span>
									</div>
								))}
								{!cartItems.length && !customOrders.length && (
									<p className="text-gray-500">No items added.</p>
								)}
							</div>
							<p className="mt-3 flex items-center justify-between text-sm font-semibold text-gray-900">
								<span>Total</span>
								<span>{currency(grandTotal)}</span>
							</p>
						</div>

						<div className="rounded-lg border border-gray-200 p-4">
							<p className="text-sm font-semibold text-gray-700 mb-2">
								Customer Selection
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
										onChange={(e) =>
											jobOrderForm.setData("CustomerID", e.target.value)
										}
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
												<p
													key={`new-customer-error-${index}`}
													className="text-sm text-red-600"
												>
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
								Delivery Schedule
							</p>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Delivery Date
									</label>
									<input
										type="date"
										min={todayISO()}
										value={jobOrderForm.data.deliveryDate}
										onChange={(e) =>
											jobOrderForm.setData("deliveryDate", e.target.value)
										}
										className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
									/>
									{jobOrderForm.errors.deliveryDate && (
										<p className="text-sm text-red-600">
											{jobOrderForm.errors.deliveryDate}
										</p>
									)}
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Delivery Time
									</label>
									<input
										type="time"
										value={jobOrderForm.data.deliveryTime}
										onChange={(e) =>
											jobOrderForm.setData("deliveryTime", e.target.value)
										}
										className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
									/>
									{jobOrderForm.errors.deliveryTime && (
										<p className="text-sm text-red-600">
											{jobOrderForm.errors.deliveryTime}
										</p>
									)}
								</div>
							</div>
							<div className="mt-3">
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Notes
								</label>
								<textarea
									rows={3}
									value={jobOrderForm.data.notes}
									onChange={(e) =>
										jobOrderForm.setData("notes", e.target.value)
									}
									placeholder="Delivery instructions or notes (optional)"
									className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
								/>
								{jobOrderForm.errors.notes && (
									<p className="text-sm text-red-600">
										{jobOrderForm.errors.notes}
									</p>
								)}
							</div>
						</div>
					</div>

					{submitError && (
						<p className="mt-4 text-sm text-red-600">{submitError}</p>
					)}

					<div className="mt-6 flex justify-end gap-2">
						<button
							type="button"
							onClick={() => setCheckoutOpen(false)}
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
			</Modal>
		</div>
	);
}
