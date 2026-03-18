import React, { useEffect, useMemo, useState } from "react";
import { Head, useForm } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import Modal from "@/Components/Modal";
import ConfirmationModal from "@/Components/ConfirmationModal";
import { formatCountLabel } from "@/utils/countLabel";
import usePermissions from "@/hooks/usePermissions";
import { Eye, Pencil, Trash2 } from "lucide-react";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value) => {
	if (!value) return "-";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "-";
	return parsed.toLocaleString();
};

export default function Customers({ customers = [] }) {
	const { can, requirePermission } = usePermissions();
	const canCreateCustomer = can("CanCreateCustomer");
	const canUpdateCustomer = can("CanUpdateCustomer");
	const canDeleteCustomer = can("CanDeleteCustomer");

	const [searchQuery, setSearchQuery] = useState("");
	const [customerTypeFilter, setCustomerTypeFilter] = useState("all");
	const [sortConfig, setSortConfig] = useState({
		key: "CustomerName",
		direction: "asc",
	});
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(25);
	const [selectedCustomer, setSelectedCustomer] = useState(null);
	const [isFormModalOpen, setIsFormModalOpen] = useState(false);
	const [editingCustomer, setEditingCustomer] = useState(null);
	const [customerToDelete, setCustomerToDelete] = useState(null);

	const customerForm = useForm({
		CustomerName: "",
		CustomerType: "Retail",
		ContactDetails: "",
		Address: "",
	});

	const customerTypeOptions = useMemo(
		() =>
			[
				...new Set(
					(customers || [])
						.map((customer) => customer.CustomerType)
						.filter(Boolean),
				),
			],
		[customers],
	);

	const requestSort = (key) => {
		let direction = "asc";
		if (sortConfig.key === key && sortConfig.direction === "asc") {
			direction = "desc";
		}
		setSortConfig({ key, direction });
	};

	const filteredCustomers = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		const items = [...(customers || [])].filter((customer) => {
			if (customerTypeFilter !== "all" && customer.CustomerType !== customerTypeFilter) {
				return false;
			}

			if (!query) return true;

			return [
				customer.ID,
				customer.CustomerName,
				customer.CustomerType,
				customer.ContactDetails,
				customer.Address,
				customer.SalesRecords,
			]
				.join(" ")
				.toLowerCase()
				.includes(query);
		});

		return items.sort((a, b) => {
			const getValue = (record) => {
				if (sortConfig.key === "ID") return Number(record.ID || 0);
				if (sortConfig.key === "SalesRecords") return Number(record.SalesRecords || 0);
				if (sortConfig.key === "DateAdded" || sortConfig.key === "DateModified") {
					return record[sortConfig.key]
						? new Date(record[sortConfig.key]).getTime()
						: 0;
				}
				return String(record[sortConfig.key] || "").toLowerCase();
			};

			const aValue = getValue(a);
			const bValue = getValue(b);
			if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
			if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
			return 0;
		});
	}, [customers, customerTypeFilter, searchQuery, sortConfig]);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, customerTypeFilter, sortConfig, itemsPerPage]);

	const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / itemsPerPage));
	const safeCurrentPage = Math.min(currentPage, totalPages);
	const startIndex = (safeCurrentPage - 1) * itemsPerPage;
	const paginatedCustomers = filteredCustomers.slice(
		startIndex,
		startIndex + itemsPerPage,
	);
	const pageNumberWindow = 2;
	const pageStart = Math.max(1, safeCurrentPage - pageNumberWindow);
	const pageEnd = Math.min(totalPages, safeCurrentPage + pageNumberWindow);
	const pageNumbers = Array.from(
		{ length: pageEnd - pageStart + 1 },
		(_, idx) => pageStart + idx,
	);
	const canGoPrevious = safeCurrentPage > 1;
	const canGoNext = safeCurrentPage < totalPages;
	const countLabel = formatCountLabel(filteredCustomers.length, "customer");

	const goToPage = (page) => {
		setCurrentPage(Math.min(totalPages, Math.max(1, page)));
	};

	const resetFilters = () => {
		setSearchQuery("");
		setCustomerTypeFilter("all");
	};

	const closeFormModal = () => {
		setIsFormModalOpen(false);
		setEditingCustomer(null);
		customerForm.reset();
		customerForm.clearErrors();
	};

	const openAddModal = () => {
		if (!canCreateCustomer) return requirePermission("CanCreateCustomer");
		setEditingCustomer(null);
		customerForm.reset();
		customerForm.setData({
			CustomerName: "",
			CustomerType: "Retail",
			ContactDetails: "",
			Address: "",
		});
		customerForm.clearErrors();
		setIsFormModalOpen(true);
	};

	const openEditModal = (customer) => {
		if (!canUpdateCustomer) return requirePermission("CanUpdateCustomer");
		setEditingCustomer(customer);
		customerForm.setData({
			CustomerName: customer.CustomerName || "",
			CustomerType: customer.CustomerType || "Retail",
			ContactDetails: customer.ContactDetails || "",
			Address: customer.Address || "",
		});
		customerForm.clearErrors();
		setIsFormModalOpen(true);
	};

	const submitCustomer = (e) => {
		e.preventDefault();
		if (editingCustomer) {
			if (!canUpdateCustomer) return requirePermission("CanUpdateCustomer");
			customerForm.put(route("pos.customers.update", editingCustomer.ID), {
				preserveScroll: true,
				onSuccess: () => closeFormModal(),
			});
			return;
		}

		if (!canCreateCustomer) return requirePermission("CanCreateCustomer");
		customerForm.post(route("pos.customers.store"), {
			preserveScroll: true,
			onSuccess: () => closeFormModal(),
		});
	};

	const openDeleteModal = (customer) => {
		if (!canDeleteCustomer) return requirePermission("CanDeleteCustomer");
		if (Number(customer.SalesRecords || 0) > 0) {
			window.dispatchEvent(
				new CustomEvent("app-toast", {
					detail: {
						type: "error",
						message: "Cannot delete a customer with sales history.",
					},
				}),
			);
			return;
		}
		setCustomerToDelete(customer);
	};

	const confirmDeleteCustomer = () => {
		if (!customerToDelete) return;
		if (!canDeleteCustomer) return requirePermission("CanDeleteCustomer");
		customerForm.delete(route("pos.customers.destroy", customerToDelete.ID), {
			preserveScroll: true,
			onSuccess: () => setCustomerToDelete(null),
			onFinish: () => customerForm.clearErrors(),
		});
	};

	return (
		<AuthenticatedLayout
			header={
				<div className="flex items-center justify-between gap-4">
					<h2 className="font-semibold text-xl text-gray-800 leading-tight">
						Customers
					</h2>
					<div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
						{countLabel}
					</div>
				</div>
			}
			disableScroll={true}
		>
			<Head title="Customers" />

			<div className="flex flex-col flex-1 overflow-hidden min-h-0">
				<div className="mx-auto flex-1 flex flex-col overflow-hidden min-h-0 w-full">
					<div className="bg-white shadow-sm sm:rounded-lg flex-1 flex flex-col overflow-hidden min-h-0">
						<div className="p-6 flex-1 flex flex-col overflow-hidden min-h-0">
							<div className="mb-6 flex items-start gap-3">
								<div className="relative w-full max-w-xl shrink-0">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<svg
											className="h-5 w-5 text-gray-400"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
											/>
										</svg>
									</div>
									<input
										type="text"
										className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
										placeholder="Search by name, type, contact, address, or sales count..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
									/>
								</div>
								<div className="flex flex-1 min-w-0 items-center gap-2">
									<div className="relative flex-1 min-w-0">
										<div className="overflow-x-auto pb-1 pr-4">
											<div className="flex min-w-max items-center gap-2 pr-3">
												<select
													value={customerTypeFilter}
													onChange={(e) => setCustomerTypeFilter(e.target.value)}
													className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
												>
													<option value="all">All Types</option>
													{customerTypeOptions.map((type) => (
														<option key={type} value={type}>
															{type}
														</option>
													))}
												</select>
											</div>
										</div>
										<div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
									</div>
									<button
										type="button"
										onClick={resetFilters}
										className="shrink-0 rounded-md border border-primary bg-white px-3 py-2 text-xs font-medium text-primary shadow-sm hover:bg-primary-soft"
									>
										Reset Filters
									</button>
								</div>
							</div>

							<div className="border rounded-lg border-gray-200 flex-1 min-h-0 flex flex-col overflow-hidden">
								<div className="flex-1 overflow-y-auto">
									<table className="min-w-full divide-y divide-gray-200">
										<thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
											<tr>
												{[
													["ID", "ID"],
													["CustomerName", "Customer Name"],
													["CustomerType", "Customer Type"],
													["ContactDetails", "Contact Details"],
													["Address", "Address"],
													["DateAdded", "Date Added"],
													["DateModified", "Date Modified"],
													["SalesRecords", "Sales Records"],
												].map(([key, label]) => (
													<th
														key={key}
														className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
														onClick={() => requestSort(key)}
													>
														<div className="flex items-center">
															{label}
															{sortConfig.key === key && (
																<span className="ml-1 text-[10px] text-gray-400">
																	{sortConfig.direction}
																</span>
															)}
														</div>
													</th>
												))}
												<th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
													Actions
												</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200">
											{paginatedCustomers.map((customer) => (
												<tr key={customer.ID} className="hover:bg-gray-50">
													<td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
														{customer.ID}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
														{customer.CustomerName}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
														{customer.CustomerType}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
														{customer.ContactDetails}
													</td>
													<td className="px-6 py-4 text-sm text-gray-600">
														{customer.Address}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
														{formatDateTime(customer.DateAdded)}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
														{formatDateTime(customer.DateModified)}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
														{customer.SalesRecords}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
														<div className="flex items-center gap-2">
															<button
																type="button"
																onClick={() => setSelectedCustomer(customer)}
																className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary-hover"
															>
																<Eye className="h-3.5 w-3.5" />
																View
															</button>
															<button
																type="button"
																onClick={() => openEditModal(customer)}
																disabled={!canUpdateCustomer}
																className="inline-flex items-center gap-1.5 rounded border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary-soft disabled:opacity-50 disabled:cursor-not-allowed"
															>
																<Pencil className="h-3.5 w-3.5" />
																Edit
															</button>
															<button
																type="button"
																onClick={() => openDeleteModal(customer)}
																disabled={!canDeleteCustomer || Number(customer.SalesRecords || 0) > 0}
																className="inline-flex items-center gap-1.5 rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
															>
																<Trash2 className="h-3.5 w-3.5" />
																Delete
															</button>
														</div>
													</td>
												</tr>
											))}
											{filteredCustomers.length === 0 && (
												<tr>
													<td
														colSpan="9"
														className="px-6 py-4 text-center text-sm text-gray-500"
													>
														No customers found.
													</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>

								<div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
									<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
										<div className="text-sm text-gray-600">
											Showing {filteredCustomers.length === 0 ? 0 : startIndex + 1}-
											{Math.min(startIndex + itemsPerPage, filteredCustomers.length)} of{" "}
											{filteredCustomers.length}
										</div>
										<div className="flex flex-wrap items-center gap-2">
											<label
												htmlFor="customers-items-per-page"
												className="text-sm text-gray-600"
											>
												Items per page
											</label>
											<select
												id="customers-items-per-page"
												value={itemsPerPage}
												onChange={(e) => setItemsPerPage(Number(e.target.value))}
												className="rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
											>
												<option value={25}>25</option>
												<option value={50}>50</option>
												<option value={100}>100</option>
												<option value={500}>500</option>
											</select>
											<button
												type="button"
												onClick={() => goToPage(1)}
												disabled={!canGoPrevious}
												className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
											>
												First
											</button>
											<button
												type="button"
												onClick={() => goToPage(safeCurrentPage - 1)}
												disabled={!canGoPrevious}
												className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
											>
												Previous
											</button>
											{pageNumbers.map((page) => (
												<button
													key={page}
													type="button"
													onClick={() => goToPage(page)}
													className={`rounded-md px-3 py-1.5 text-sm ${
														page === safeCurrentPage
															? "border border-primary bg-primary text-white"
															: "border border-gray-300 text-gray-700 hover:bg-gray-50"
													}`}
												>
													{page}
												</button>
											))}
											<button
												type="button"
												onClick={() => goToPage(safeCurrentPage + 1)}
												disabled={!canGoNext}
												className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
											>
												Next
											</button>
											<button
												type="button"
												onClick={() => goToPage(totalPages)}
												disabled={!canGoNext}
												className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
											>
												Last
											</button>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="sticky bottom-0 w-full p-4 bg-white border-t border-gray-200 z-10">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<button
						type="button"
						onClick={openAddModal}
						disabled={!canCreateCustomer}
						className="w-full inline-flex justify-center py-3 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Add Customer
					</button>
				</div>
			</div>

			<Modal show={isFormModalOpen} onClose={closeFormModal} maxWidth="lg">
				<form onSubmit={submitCustomer} className="p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">
						{editingCustomer ? "Edit Customer" : "Add Customer"}
					</h3>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Full Name
							</label>
							<input
								type="text"
								value={customerForm.data.CustomerName}
								onChange={(e) => customerForm.setData("CustomerName", e.target.value)}
								className="w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
							/>
							{customerForm.errors.CustomerName && (
								<p className="mt-1 text-sm text-red-600">
									{customerForm.errors.CustomerName}
								</p>
							)}
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Customer Type
							</label>
							<select
								value={customerForm.data.CustomerType}
								onChange={(e) => customerForm.setData("CustomerType", e.target.value)}
								className="w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
							>
								<option value="Retail">Retail</option>
								<option value="Business">Business</option>
							</select>
							{customerForm.errors.CustomerType && (
								<p className="mt-1 text-sm text-red-600">
									{customerForm.errors.CustomerType}
								</p>
							)}
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Contact Details
							</label>
							<input
								type="text"
								value={customerForm.data.ContactDetails}
								onChange={(e) =>
									customerForm.setData("ContactDetails", e.target.value)
								}
								className="w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
							/>
							{customerForm.errors.ContactDetails && (
								<p className="mt-1 text-sm text-red-600">
									{customerForm.errors.ContactDetails}
								</p>
							)}
						</div>
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Address
							</label>
							<textarea
								rows={3}
								value={customerForm.data.Address}
								onChange={(e) => customerForm.setData("Address", e.target.value)}
								className="w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
							/>
							{customerForm.errors.Address && (
								<p className="mt-1 text-sm text-red-600">
									{customerForm.errors.Address}
								</p>
							)}
						</div>
					</div>
					<div className="mt-6 flex justify-end gap-2">
						<button
							type="button"
							onClick={closeFormModal}
							className="px-4 py-2 text-sm rounded-md border border-primary bg-white text-primary hover:bg-primary-soft"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={customerForm.processing}
							className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
						>
							{editingCustomer ? "Save Changes" : "Add Customer"}
						</button>
					</div>
				</form>
			</Modal>

			<Modal show={Boolean(selectedCustomer)} onClose={() => setSelectedCustomer(null)} maxWidth="4xl">
				{selectedCustomer && (
					<div className="p-6 max-h-[80vh] overflow-y-auto">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">
							Customer Details
						</h3>
						<div className="grid grid-cols-1 gap-3 md:grid-cols-2 text-sm">
							<div>
								<span className="font-semibold text-gray-700">ID:</span>{" "}
								<span className="text-gray-900">{selectedCustomer.ID}</span>
							</div>
							<div>
								<span className="font-semibold text-gray-700">Customer Name:</span>{" "}
								<span className="text-gray-900">{selectedCustomer.CustomerName}</span>
							</div>
							<div>
								<span className="font-semibold text-gray-700">Customer Type:</span>{" "}
								<span className="text-gray-900">{selectedCustomer.CustomerType}</span>
							</div>
							<div>
								<span className="font-semibold text-gray-700">Contact Details:</span>{" "}
								<span className="text-gray-900">{selectedCustomer.ContactDetails}</span>
							</div>
							<div>
								<span className="font-semibold text-gray-700">Sales Records:</span>{" "}
								<span className="text-gray-900">{selectedCustomer.SalesRecords}</span>
							</div>
							<div>
								<span className="font-semibold text-gray-700">Date Added:</span>{" "}
								<span className="text-gray-900">
									{formatDateTime(selectedCustomer.DateAdded)}
								</span>
							</div>
							<div>
								<span className="font-semibold text-gray-700">Date Modified:</span>{" "}
								<span className="text-gray-900">
									{formatDateTime(selectedCustomer.DateModified)}
								</span>
							</div>
							<div className="md:col-span-2">
								<span className="font-semibold text-gray-700">Address:</span>{" "}
								<span className="text-gray-900">{selectedCustomer.Address}</span>
							</div>
						</div>

						<div className="mt-6">
							<h4 className="text-sm font-semibold text-gray-700 mb-2">
								Sales History
							</h4>
							<div className="max-h-80 overflow-y-auto rounded border border-gray-200">
								<table className="min-w-full text-sm">
									<thead className="bg-gray-50 sticky top-0 z-10">
										<tr>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
												Sale ID
											</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
												Cashier
											</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
												Items
											</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
												Total
											</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
												Status
											</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
												Date Added
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200 bg-white">
										{(selectedCustomer.sales || []).map((sale) => {
											const customOrderLines =
												sale.job_order?.custom_items ||
												sale.jobOrder?.customItems ||
												sale.jobOrder?.custom_items ||
												[];
											return (
												<tr key={sale.ID} className="align-top">
													<td className="px-3 py-2 text-gray-900">#{sale.ID}</td>
													<td className="px-3 py-2 text-gray-700">
														{sale.user?.FullName || "Unknown"}
													</td>
													<td className="px-3 py-2 text-gray-700">
														<div className="space-y-1">
															{(sale.sold_products || []).map((line) => (
																<p key={`sale-product-${sale.ID}-${line.ID}`}>
																	{line.product?.ProductName || "-"} x{line.Quantity}
																</p>
															))}
															{customOrderLines.map((line) => (
																<p
																	key={`sale-custom-${sale.ID}-${line.ID}`}
																	className="max-w-md whitespace-pre-wrap break-words"
																>
																	{line.CustomOrderDescription || "-"} x{line.Quantity}
																</p>
															))}
															{(sale.sold_products || []).length === 0 &&
																customOrderLines.length === 0 && <p>-</p>}
														</div>
													</td>
													<td className="px-3 py-2 text-gray-900 font-medium">
														{currency(sale.totalAmount)}
													</td>
													<td className="px-3 py-2 text-gray-700">
														{sale.payment?.PaymentStatus || "-"}
													</td>
													<td className="px-3 py-2 text-gray-500">
														{formatDateTime(sale.DateAdded)}
													</td>
												</tr>
											);
										})}
										{(selectedCustomer.sales || []).length === 0 && (
											<tr>
												<td
													colSpan="6"
													className="px-3 py-4 text-center text-gray-500"
												>
													No sales history found.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>

						<div className="mt-6 flex justify-end">
							<button
								type="button"
								onClick={() => setSelectedCustomer(null)}
								className="px-4 py-2 text-sm rounded-md border border-primary bg-white text-primary hover:bg-primary-soft"
							>
								Close
							</button>
						</div>
					</div>
				)}
			</Modal>

			<ConfirmationModal
				show={Boolean(customerToDelete)}
				onClose={() => setCustomerToDelete(null)}
				onConfirm={confirmDeleteCustomer}
				title="Delete Customer"
				message={`Are you sure you want to delete "${customerToDelete?.CustomerName || ""}"?`}
				confirmText="Delete"
				processing={customerForm.processing}
			/>
		</AuthenticatedLayout>
	);
}
