
import React, { useEffect, useMemo, useState } from "react";
import { Head, useForm } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import Modal from "@/Components/Modal";
import ConfirmationModal from "@/Components/ConfirmationModal";
import { formatCountLabel } from "@/utils/countLabel";
import usePermissions from "@/hooks/usePermissions";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value) => {
	if (!value) return "-";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "-";
	return parsed.toLocaleString();
};

const normalizeItems = (items = []) =>
	items.map((item) => ({
		ProductID: String(item.ProductID),
		Quantity: String(item.Quantity),
	}));

const buildGroupedQuantities = (items = [], excludeIndex = null) =>
	items.reduce((accumulator, item, index) => {
		if (index === excludeIndex) return accumulator;
		const productId = String(item.ProductID || "");
		const quantity = Number(item.Quantity || 0);
		if (!productId || quantity <= 0) return accumulator;
		accumulator[productId] = (accumulator[productId] || 0) + quantity;
		return accumulator;
	}, {});

export default function ShrinkageHistory({
	shrinkages = [],
	products = [],
	allowedReasons = [],
}) {
	const { can, requirePermission } = usePermissions();
	const canCreateShrinkage = can("CanCreateShrinkageRecord");
	const canUpdateShrinkage = can("CanUpdateShrinkageRecord");
	const canDeleteShrinkage = can("CanDeleteShrinkageRecord");
	const canVerifyShrinkage = can("CanVerifyShrinkageRecord");

	const [searchQuery, setSearchQuery] = useState("");
	const [reasonFilter, setReasonFilter] = useState("all");
	const [sortConfig, setSortConfig] = useState({
		key: "DateAdded",
		direction: "desc",
	});
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(25);
	const [selectedShrinkage, setSelectedShrinkage] = useState(null);
	const [isFormModalOpen, setIsFormModalOpen] = useState(false);
	const [editingShrinkage, setEditingShrinkage] = useState(null);
	const [shrinkageToDelete, setShrinkageToDelete] = useState(null);
	const [verifyTarget, setVerifyTarget] = useState(null);
	const [selectedProductId, setSelectedProductId] = useState("");
	const [selectedQuantity, setSelectedQuantity] = useState("1");
	const [formError, setFormError] = useState("");

	const form = useForm({
		reason: allowedReasons[0] || "Spoiled",
		items: [],
	});
	const verifyForm = useForm({
		status: "Verified",
	});

	const productsById = useMemo(
		() =>
			(products || []).reduce((accumulator, product) => {
				accumulator[String(product.ID)] = product;
				return accumulator;
			}, {}),
		[products],
	);

	const reasonOptions = useMemo(() => {
		const options = [...allowedReasons];
		if (editingShrinkage?.Reason && !options.includes(editingShrinkage.Reason)) {
			options.push(editingShrinkage.Reason);
		}
		return options;
	}, [allowedReasons, editingShrinkage]);

	const filterReasonOptions = useMemo(
		() => [...new Set((shrinkages || []).map((item) => item.Reason).filter(Boolean))],
		[shrinkages],
	);

	const getBaseAvailable = (productId) =>
		Number(productsById[String(productId)]?.Quantity || 0);

	const getRemainingAllowance = (productId, excludeIndex = null) => {
		const grouped = buildGroupedQuantities(form.data.items || [], excludeIndex);
		return Math.max(
			0,
			getBaseAvailable(productId) - Number(grouped[String(productId)] || 0),
		);
	};

	const filteredShrinkages = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		const records = [...(shrinkages || [])].filter((record) => {
			if (reasonFilter !== "all" && record.Reason !== reasonFilter) {
				return false;
			}

			if (!query) return true;

			const haystack = [
				record.ID,
				record.UserID,
				record.CreatedBy,
				record.Quantity,
				record.TotalAmount,
				record.Reason,
				record.VerificationStatus,
				...(record.items || []).map((item) => item.ProductName),
			]
				.join(" ")
				.toLowerCase();

			return haystack.includes(query);
		});

		return records.sort((a, b) => {
			const getValue = (record) => {
				if (["ID", "UserID", "Quantity", "TotalAmount"].includes(sortConfig.key)) {
					return Number(record[sortConfig.key] || 0);
				}
				if (sortConfig.key === "DateAdded") {
					return record.DateAdded ? new Date(record.DateAdded).getTime() : 0;
				}
				return String(record[sortConfig.key] || "").toLowerCase();
			};

			const aValue = getValue(a);
			const bValue = getValue(b);
			if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
			if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
			return 0;
		});
	}, [reasonFilter, searchQuery, shrinkages, sortConfig]);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, reasonFilter, sortConfig, itemsPerPage]);

	const totalPages = Math.max(1, Math.ceil(filteredShrinkages.length / itemsPerPage));
	const safeCurrentPage = Math.min(currentPage, totalPages);
	const startIndex = (safeCurrentPage - 1) * itemsPerPage;
	const paginatedShrinkages = filteredShrinkages.slice(
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
	const countLabel = formatCountLabel(filteredShrinkages.length, "record");

	const requestSort = (key) => {
		let direction = "asc";
		if (sortConfig.key === key && sortConfig.direction === "asc") {
			direction = "desc";
		}
		setSortConfig({ key, direction });
	};

	const goToPage = (page) => {
		setCurrentPage(Math.min(totalPages, Math.max(1, page)));
	};

	const resetFilters = () => {
		setSearchQuery("");
		setReasonFilter("all");
	};

	const resetFormState = () => {
		setSelectedProductId("");
		setSelectedQuantity("1");
		setFormError("");
		form.clearErrors();
	};

	const closeFormModal = () => {
		setIsFormModalOpen(false);
		setEditingShrinkage(null);
		form.reset();
		form.setData({
			reason: allowedReasons[0] || "Spoiled",
			items: [],
		});
		resetFormState();
	};

	const openCreateModal = () => {
		if (!canCreateShrinkage) return requirePermission("CanCreateShrinkageRecord");
		setEditingShrinkage(null);
		form.setData({
			reason: allowedReasons[0] || "Spoiled",
			items: [],
		});
		resetFormState();
		setIsFormModalOpen(true);
	};

	const openEditModal = (record) => {
		if (!canUpdateShrinkage) return requirePermission("CanUpdateShrinkageRecord");
		if (record?.VerificationStatus && record.VerificationStatus !== "Pending") {
			setFormError("Only pending shrinkage records can be edited.");
			return;
		}
		setEditingShrinkage(record);
		form.setData({
			reason: record.Reason,
			items: normalizeItems(record.items || []),
		});
		resetFormState();
		setIsFormModalOpen(true);
	};
	const addProductLine = () => {
		const productId = String(selectedProductId || "");
		const quantity = Number(selectedQuantity || 0);
		if (!productId) {
			setFormError("Select a product to add.");
			return;
		}
		if (!Number.isInteger(quantity) || quantity < 1) {
			setFormError("Quantity must be a whole number greater than 0.");
			return;
		}

		const allowance = getRemainingAllowance(productId);
		if (quantity > allowance) {
			setFormError(`Quantity cannot exceed available stock (${allowance}).`);
			return;
		}

		const currentItems = [...(form.data.items || [])];
		const existingIndex = currentItems.findIndex(
			(item) => String(item.ProductID) === productId,
		);
		if (existingIndex >= 0) {
			currentItems[existingIndex] = {
				...currentItems[existingIndex],
				Quantity: String(Number(currentItems[existingIndex].Quantity || 0) + quantity),
			};
		} else {
			currentItems.push({ ProductID: productId, Quantity: String(quantity) });
		}

		form.setData("items", currentItems);
		setSelectedProductId("");
		setSelectedQuantity("1");
		setFormError("");
	};

	const updateLineQuantity = (index, rawValue) => {
		const quantity = Number(rawValue);
		if (!Number.isInteger(quantity) || quantity < 1) {
			setFormError("Quantity must be a whole number greater than 0.");
			return;
		}

		const productId = form.data.items[index]?.ProductID;
		const allowance = getRemainingAllowance(productId, index);
		if (quantity > allowance) {
			setFormError(`Quantity cannot exceed available stock (${allowance}).`);
			return;
		}

		const nextItems = [...(form.data.items || [])];
		nextItems[index] = {
			...nextItems[index],
			Quantity: String(quantity),
		};
		form.setData("items", nextItems);
		setFormError("");
	};

	const adjustLineQuantity = (index, delta) => {
		const currentQuantity = Number(form.data.items[index]?.Quantity || 0);
		const nextQuantity = currentQuantity + delta;
		if (nextQuantity < 1) {
			setFormError("Quantity cannot go below 1. Remove the line instead.");
			return;
		}
		updateLineQuantity(index, String(nextQuantity));
	};

	const removeLine = (index) => {
		const nextItems = [...(form.data.items || [])];
		nextItems.splice(index, 1);
		form.setData("items", nextItems);
		setFormError("");
	};

	const submitForm = (e) => {
		e.preventDefault();
		setFormError("");
		if (
			editingShrinkage &&
			editingShrinkage.VerificationStatus &&
			editingShrinkage.VerificationStatus !== "Pending"
		) {
			setFormError("Only pending shrinkage records can be updated.");
			return;
		}
		if ((form.data.items || []).length === 0) {
			setFormError("Add at least one shrinkage item.");
			return;
		}

		form.transform((data) => ({
			...data,
			items: (data.items || []).map((item) => ({
				ProductID: Number(item.ProductID),
				Quantity: Number(item.Quantity),
			})),
		}));

		const options = {
			preserveScroll: true,
			onSuccess: () => closeFormModal(),
			onError: (errors) => {
				setFormError(
					(errors && Object.values(errors).find(Boolean)) ||
						"Failed to save shrinkage record.",
				);
			},
		};

		if (editingShrinkage) {
			if (!canUpdateShrinkage) return requirePermission("CanUpdateShrinkageRecord");
			form.put(route("inventory.shrinkage-history.update", editingShrinkage.ID), options);
			return;
		}

		if (!canCreateShrinkage) return requirePermission("CanCreateShrinkageRecord");
		form.post(route("inventory.shrinkage-history.store"), options);
	};

	const confirmDelete = () => {
		if (!shrinkageToDelete) return;
		if (!canDeleteShrinkage) return requirePermission("CanDeleteShrinkageRecord");
		form.delete(route("inventory.shrinkage-history.destroy", shrinkageToDelete.ID), {
			preserveScroll: true,
			onSuccess: () => setShrinkageToDelete(null),
		});
	};

	const openVerifyModal = (record) => {
		if (!canVerifyShrinkage) return requirePermission("CanVerifyShrinkageRecord");
		if (record?.VerificationStatus && record.VerificationStatus !== "Pending") return;
		setVerifyTarget(record);
		verifyForm.setData("status", "Verified");
		verifyForm.clearErrors();
	};

	const closeVerifyModal = () => {
		setVerifyTarget(null);
	};

	const submitVerification = (status) => {
		if (!verifyTarget) return;
		if (!canVerifyShrinkage) return requirePermission("CanVerifyShrinkageRecord");
		verifyForm.setData("status", status);
		verifyForm.post(route("inventory.shrinkage-history.verify", verifyTarget.ID), {
			preserveScroll: true,
			onSuccess: () => closeVerifyModal(),
		});
	};

	const availableProducts = useMemo(
		() =>
			(products || []).filter(
				(product) => getRemainingAllowance(product.ID) > 0,
			),
		[products, form.data.items, editingShrinkage],
	);

	const formItemsWithMeta = useMemo(
		() =>
			(form.data.items || []).map((item, index) => {
				const product = productsById[String(item.ProductID)] || null;
				const quantity = Number(item.Quantity || 0);
				const pricePerUnit = Number(product?.Price || 0);
				return {
					index,
					ProductID: String(item.ProductID),
					ProductName: product?.ProductName || "Unknown Product",
					Quantity: quantity,
					PricePerUnit: pricePerUnit,
					SubAmount: quantity * pricePerUnit,
					MaxQuantity: getRemainingAllowance(item.ProductID, index),
				};
			}),
		[form.data.items, productsById, editingShrinkage],
	);

	const modalTotalAmount = useMemo(
		() => formItemsWithMeta.reduce((sum, item) => sum + Number(item.SubAmount || 0), 0),
		[formItemsWithMeta],
	);
	const modalTotalQuantity = useMemo(
		() => formItemsWithMeta.reduce((sum, item) => sum + Number(item.Quantity || 0), 0),
		[formItemsWithMeta],
	);

	return (
		<AuthenticatedLayout
			header={
				<div className="flex items-center justify-between gap-4">
					<h2 className="font-semibold text-xl text-gray-800 leading-tight">
						Shrinkage History
					</h2>
					<div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
						{countLabel}
					</div>
				</div>
			}
			disableScroll={true}
		>
			<Head title="Shrinkage History" />

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
										placeholder="Search by record ID, user, reason, or product..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
									/>
								</div>
								<div className="flex flex-1 min-w-0 items-center gap-2">
									<div className="relative flex-1 min-w-0">
										<div className="overflow-x-auto pb-1 pr-4">
											<div className="flex min-w-max items-center gap-2 pr-3">
												<select
													value={reasonFilter}
													onChange={(e) => setReasonFilter(e.target.value)}
													className="w-44 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
												>
													<option value="all">All Reasons</option>
													{filterReasonOptions.map((reason) => (
														<option key={reason} value={reason}>
															{reason}
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
													["UserID", "User ID"],
													["Quantity", "Quantity"],
													["TotalAmount", "Total Amount"],
													["Reason", "Reason"],
													["VerificationStatus", "Verification"],
													["DateAdded", "Date Added"],
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
											{paginatedShrinkages.map((record) => {
												const isPending =
													!record.VerificationStatus ||
													record.VerificationStatus === "Pending";
												return (
													<tr key={record.ID} className="hover:bg-gray-50">
													<td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
														{record.ID}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
														<div>{record.UserID}</div>
														<p className="text-xs text-gray-400">{record.CreatedBy}</p>
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
														{record.Quantity}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
														{currency(record.TotalAmount)}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
														{record.Reason}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
														{record.VerificationStatus || "Pending"}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
														{formatDateTime(record.DateAdded)}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
														<div className="flex items-center gap-2">
															<button
																type="button"
																onClick={() => setSelectedShrinkage(record)}
																className="rounded border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary-soft"
															>
																View
															</button>
															{isPending && (
																<button
																	type="button"
																	onClick={() => openVerifyModal(record)}
																	disabled={!canVerifyShrinkage}
																	className="rounded border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
																>
																	Confirm Shrinkage
																</button>
															)}
															<button
																type="button"
																onClick={() => openEditModal(record)}
																disabled={!canUpdateShrinkage || !isPending}
																className="rounded border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary-soft disabled:opacity-50 disabled:cursor-not-allowed"
															>
																Edit
															</button>
															<button
																type="button"
																onClick={() =>
																	canDeleteShrinkage
																		? setShrinkageToDelete(record)
																		: requirePermission("CanDeleteShrinkageRecord")
																}
																disabled={!canDeleteShrinkage || !isPending}
																className="rounded border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
															>
																Delete
															</button>
														</div>
													</td>
												</tr>
												);
											})}
											{filteredShrinkages.length === 0 && (
												<tr>
												<td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
													No shrinkage records found.
												</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>

								<div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
									<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
										<div className="text-sm text-gray-600">
											Showing {filteredShrinkages.length === 0 ? 0 : startIndex + 1}-
											{Math.min(startIndex + itemsPerPage, filteredShrinkages.length)} of {" "}
											{filteredShrinkages.length}
										</div>
										<div className="flex flex-wrap items-center gap-2">
											<label htmlFor="shrinkage-items-per-page" className="text-sm text-gray-600">
												Items per page
											</label>
											<select
												id="shrinkage-items-per-page"
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
						onClick={openCreateModal}
						disabled={!canCreateShrinkage}
						className="w-full inline-flex justify-center py-3 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Record Shrinkage
					</button>
				</div>
			</div>

			<Modal show={Boolean(selectedShrinkage)} onClose={() => setSelectedShrinkage(null)} maxWidth="4xl">
				{selectedShrinkage && (
					<div className="p-6 max-h-[80vh] overflow-y-auto">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">Shrinkage Details</h3>
						<div className="grid grid-cols-1 gap-3 md:grid-cols-2 text-sm">
							<div>
								<span className="font-semibold text-gray-700">ID:</span>{" "}
								<span className="text-gray-900">{selectedShrinkage.ID}</span>
							</div>
							<div>
								<span className="font-semibold text-gray-700">User ID:</span>{" "}
								<span className="text-gray-900">{selectedShrinkage.UserID}</span>
							</div>
							<div>
								<span className="font-semibold text-gray-700">Recorded By:</span>{" "}
								<span className="text-gray-900">{selectedShrinkage.CreatedBy}</span>
							</div>
							<div>
								<span className="font-semibold text-gray-700">Reason:</span>{" "}
								<span className="text-gray-900">{selectedShrinkage.Reason}</span>
							</div>
							<div>
								<span className="font-semibold text-gray-700">Verification:</span>{" "}
								<span className="text-gray-900">
									{selectedShrinkage.VerificationStatus || "Pending"}
								</span>
							</div>
							<div>
								<span className="font-semibold text-gray-700">Total Quantity:</span>{" "}
								<span className="text-gray-900">{selectedShrinkage.Quantity}</span>
							</div>
							<div>
								<span className="font-semibold text-gray-700">Total Amount:</span>{" "}
								<span className="text-gray-900">{currency(selectedShrinkage.TotalAmount)}</span>
							</div>
							<div className="md:col-span-2">
								<span className="font-semibold text-gray-700">Date Added:</span>{" "}
								<span className="text-gray-900">{formatDateTime(selectedShrinkage.DateAdded)}</span>
							</div>
						</div>

						<div className="mt-6">
							<h4 className="text-sm font-semibold text-gray-700 mb-2">Shrinked Items</h4>
							<div className="max-h-80 overflow-y-auto rounded border border-gray-200">
								<table className="min-w-full text-sm">
									<thead className="bg-gray-50 sticky top-0 z-10">
										<tr>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
												Product
											</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
												Qty
											</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
												Price / Unit
											</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
												Subtotal
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200 bg-white">
										{(selectedShrinkage.items || []).map((item) => (
											<tr key={item.ID}>
												<td className="px-3 py-2 text-gray-900">{item.ProductName}</td>
												<td className="px-3 py-2 text-gray-700">{item.Quantity}</td>
												<td className="px-3 py-2 text-gray-700">{currency(item.PricePerUnit)}</td>
												<td className="px-3 py-2 text-gray-900 font-medium">{currency(item.SubAmount)}</td>
											</tr>
										))}
										{(selectedShrinkage.items || []).length === 0 && (
											<tr>
												<td colSpan="4" className="px-3 py-4 text-center text-gray-500">
													No shrinkage items found.
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
								onClick={() => setSelectedShrinkage(null)}
								className="px-4 py-2 text-sm rounded-md border border-primary bg-white text-primary hover:bg-primary-soft"
							>
								Close
							</button>
						</div>
					</div>
				)}
			</Modal>

			<Modal show={isFormModalOpen} onClose={closeFormModal} maxWidth="4xl">
				<form onSubmit={submitForm} className="p-6 max-h-[85vh] overflow-y-auto">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">
						{editingShrinkage ? "Edit Shrinkage Record" : "Record Shrinkage"}
					</h3>

					<div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
						<div className="space-y-4">
							<div className="rounded-lg border border-gray-200 p-4">
								<p className="text-sm font-semibold text-gray-700 mb-3">Shrinkage Items</p>
								<div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_120px_auto]">
									<select
										value={selectedProductId}
										onChange={(e) => setSelectedProductId(e.target.value)}
										className="w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
									>
										<option value="">Select product</option>
										{availableProducts.map((product) => (
											<option key={product.ID} value={product.ID}>
												{product.ProductName} ({getRemainingAllowance(product.ID)} available)
											</option>
										))}
									</select>
									<input
										type="number"
										min="1"
										step="1"
										value={selectedQuantity}
										onChange={(e) => setSelectedQuantity(e.target.value)}
										className="w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
									/>
									<button
										type="button"
										onClick={addProductLine}
										className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
									>
										Add Item
									</button>
								</div>
								<div className="mt-4 max-h-80 overflow-y-auto rounded-md border border-gray-200">
									<table className="min-w-full divide-y divide-gray-200 text-sm">
										<thead className="sticky top-0 z-10 bg-gray-50">
											<tr>
												<th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
													Product
												</th>
												<th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
													Qty
												</th>
												<th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
													Available
												</th>
												<th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
													Subtotal
												</th>
												<th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
													Actions
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-gray-200 bg-white">
											{formItemsWithMeta.map((item) => (
												<tr key={item.ProductID}>
													<td className="px-3 py-2 text-gray-900">{item.ProductName}</td>
													<td className="px-3 py-2 text-gray-700">
														<div className="flex items-center gap-2">
															<button
																type="button"
																onClick={() => adjustLineQuantity(item.index, -1)}
																className="h-8 w-8 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
															>
																-
															</button>
															<input
																type="number"
																min="1"
																max={item.MaxQuantity}
																value={item.Quantity}
																onChange={(e) => updateLineQuantity(item.index, e.target.value)}
																className="w-20 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
															/>
															<button
																type="button"
																onClick={() => adjustLineQuantity(item.index, 1)}
																className="h-8 w-8 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
															>
																+
															</button>
														</div>
													</td>
													<td className="px-3 py-2 text-gray-500">{item.MaxQuantity}</td>
													<td className="px-3 py-2 text-gray-900 font-medium">{currency(item.SubAmount)}</td>
													<td className="px-3 py-2">
														<button
															type="button"
															onClick={() => removeLine(item.index)}
															className="rounded border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
														>
															Remove
														</button>
													</td>
												</tr>
											))}
											{formItemsWithMeta.length === 0 && (
												<tr>
													<td colSpan="5" className="px-3 py-4 text-center text-gray-500">
														No shrinkage items added.
													</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>
							</div>
						</div>

						<div className="space-y-4">
							<div className="rounded-lg border border-gray-200 p-4">
								<p className="text-sm font-semibold text-gray-700 mb-3">Record Details</p>
								<label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
								<select
									value={form.data.reason}
									onChange={(e) => form.setData("reason", e.target.value)}
									className="w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
								>
									{reasonOptions.map((reason) => (
										<option key={reason} value={reason}>
											{reason}
										</option>
									))}
								</select>
								{form.errors.reason && (
									<p className="mt-2 text-sm text-red-600">{form.errors.reason}</p>
								)}
							</div>

							<div className="rounded-lg border border-gray-200 p-4 space-y-2 text-sm">
								<div className="flex items-center justify-between">
									<span className="text-gray-600">Total Items</span>
									<span className="font-semibold text-gray-900">{modalTotalQuantity}</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-gray-600">Total Amount</span>
									<span className="font-semibold text-gray-900">{currency(modalTotalAmount)}</span>
								</div>
							</div>

							<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
								Stock is deducted only after verification. Quantities are validated against current stock at the time of verification.
							</div>
						</div>
					</div>

					{form.errors.items && (
						<p className="mt-4 text-sm text-red-600">{form.errors.items}</p>
					)}
					{formError && <p className="mt-4 text-sm text-red-600">{formError}</p>}

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
							disabled={form.processing}
							className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
						>
							{editingShrinkage ? "Save Changes" : "Record Shrinkage"}
						</button>
					</div>
				</form>
			</Modal>

			<Modal show={Boolean(verifyTarget)} onClose={closeVerifyModal} maxWidth="md">
				{verifyTarget && (
					<div className="p-6">
						<h3 className="text-lg font-semibold text-gray-900">
							Confirm Shrinkage #{verifyTarget.ID}
						</h3>
						<p className="mt-2 text-sm text-gray-600">
							Verification will deduct stock quantities. Rejection keeps stock unchanged.
						</p>
						<div className="mt-4 space-y-2 text-sm text-gray-700">
							<div>
								<span className="font-semibold">Reason:</span>{" "}
								{verifyTarget.Reason || "-"}
							</div>
							<div>
								<span className="font-semibold">Total Quantity:</span>{" "}
								{verifyTarget.Quantity}
							</div>
							<div>
								<span className="font-semibold">Total Amount:</span>{" "}
								{currency(verifyTarget.TotalAmount)}
							</div>
						</div>
						{verifyForm.errors.status && (
							<p className="mt-2 text-sm text-red-600">
								{verifyForm.errors.status}
							</p>
						)}
						<div className="mt-6 flex justify-end gap-2">
							<button
								type="button"
								onClick={closeVerifyModal}
								className="rounded-md border border-primary bg-white px-4 py-2 text-sm text-primary hover:bg-primary-soft"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={() => submitVerification("Rejected")}
								disabled={verifyForm.processing}
								className="rounded-md border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
							>
								Reject
							</button>
							<button
								type="button"
								onClick={() => submitVerification("Verified")}
								disabled={verifyForm.processing}
								className="rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
							>
								Verify
							</button>
						</div>
					</div>
				)}
			</Modal>

			<ConfirmationModal
				show={Boolean(shrinkageToDelete)}
				onClose={() => setShrinkageToDelete(null)}
				onConfirm={confirmDelete}
				title="Delete Shrinkage Record"
				message={`Delete shrinkage record #${shrinkageToDelete?.ID || ""}? Stock is only adjusted after verification.`}
				confirmText="Delete Record"
				processing={form.processing}
			/>
		</AuthenticatedLayout>
	);
}
