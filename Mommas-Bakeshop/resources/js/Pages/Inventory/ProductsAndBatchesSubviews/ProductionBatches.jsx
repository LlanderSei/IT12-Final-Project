import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "@inertiajs/react";
import ConfirmationModal from "@/Components/ConfirmationModal";
import { formatCountLabel } from "@/utils/countLabel";
import {
	clearPendingProductsBatchesFooterAction,
	getPendingProductsBatchesFooterAction,
	PRODUCTS_BATCHES_FOOTER_ACTIONS,
} from "@/utils/productsAndBatchesFooterActions";
import usePermissions from "@/hooks/usePermissions";

const BATCH_DRAFT_KEY = "inventory.production_batch_draft.v1";

const createDefaultBatchDraft = () => ({
	mode: "existing",
	searchQuery: "",
	existingInputs: {},
	newProduct: {
		ProductName: "",
		ProductDescription: "",
		CategoryID: "",
		Price: "",
		LowStockThreshold: 10,
		QuantityProduced: "",
	},
	items: [],
	details: {
		BatchDescription: "",
	},
});

function showValidationToast(messages) {
	window.dispatchEvent(
		new CustomEvent("app-toast", {
			detail: { type: "error", messages },
		}),
	);
}

function toComparableDate(value) {
	if (!value) return null;
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return null;
	return d;
}

function hasProgress(draft) {
	return (
		(draft.items || []).length > 0 ||
		String(draft.details?.BatchDescription || "").trim() !== "" ||
		String(draft.newProduct?.ProductName || "").trim() !== "" ||
		String(draft.newProduct?.QuantityProduced || "").trim() !== ""
	);
}

export default function ProductionBatches({
	products,
	categories,
	batches,
	onHeaderMetaChange,
	setFooterActions,
	canCreateProductionBatch = false,
	canUpdateProductionBatch = false,
}) {
	const { requirePermission } = usePermissions();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [showExitWarning, setShowExitWarning] = useState(false);
	const [editingLine, setEditingLine] = useState(null);
	const [lineToDelete, setLineToDelete] = useState(null);
	const [draft, setDraft] = useState(createDefaultBatchDraft);

	const [searchQuery, setSearchQuery] = useState("");
	const [addedByFilter, setAddedByFilter] = useState("all");
	const [itemFilter, setItemFilter] = useState("all");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [minTotalQty, setMinTotalQty] = useState("");
	const [maxTotalQty, setMaxTotalQty] = useState("");
	const [sortConfig, setSortConfig] = useState({
		key: "DateAdded",
		direction: "desc",
	});
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(25);

	const batchForm = useForm({});

	useEffect(() => {
		try {
			const raw = sessionStorage.getItem(BATCH_DRAFT_KEY);
			if (raw) {
				setDraft(JSON.parse(raw));
			}
		} catch (_e) {}
	}, []);

	useEffect(() => {
		try {
			sessionStorage.setItem(BATCH_DRAFT_KEY, JSON.stringify(draft));
		} catch (_e) {}
	}, [draft]);

	useEffect(() => {
		if (!batchForm.errors) return;
		const messages = Object.values(batchForm.errors)
			.flatMap((v) => (Array.isArray(v) ? v : [v]))
			.filter(Boolean)
			.map(String);
		if (messages.length > 0) {
			showValidationToast(messages);
		}
	}, [batchForm.errors]);

	const producedProducts = useMemo(
		() =>
			(products || []).filter(
				(p) => String(p.ProductFrom || "").toLowerCase() === "produced",
			),
		[products],
	);

	const filteredProducedProducts = useMemo(() => {
		const query = String(draft.searchQuery || "").trim().toLowerCase();
		if (!query) return producedProducts;
		return producedProducts.filter(
			(item) =>
				item.ProductName?.toLowerCase().includes(query) ||
				item.category?.CategoryName?.toLowerCase().includes(query),
		);
	}, [producedProducts, draft.searchQuery]);

	const totalItems = useMemo(
		() =>
			(draft.items || []).reduce(
				(sum, line) => sum + Number(line.QuantityProduced || 0),
				0,
			),
		[draft.items],
	);

	const addedByOptions = useMemo(
		() => [...new Set((batches || []).map((b) => b.user?.FullName).filter(Boolean))],
		[batches],
	);

	const itemNameOptions = useMemo(
		() =>
			[
				...new Set(
					(batches || [])
						.flatMap((b) => b.ItemsProduced || [])
						.map((i) => i.ItemName)
						.filter(Boolean),
				),
			],
		[batches],
	);

	const resetFilters = () => {
		setSearchQuery("");
		setAddedByFilter("all");
		setItemFilter("all");
		setDateFrom("");
		setDateTo("");
		setMinTotalQty("");
		setMaxTotalQty("");
	};

	const requestSort = (key) => {
		let direction = "asc";
		if (sortConfig.key === key && sortConfig.direction === "asc") {
			direction = "desc";
		}
		setSortConfig({ key, direction });
	};

	const getSortValue = (record, key) => {
		switch (key) {
			case "AddedBy":
				return String(record.user?.FullName || "").toLowerCase();
			case "ItemsProduced":
				return String(
					(record.ItemsProduced || []).map((item) => item.ItemName || "").join(" "),
				).toLowerCase();
			case "TotalQuantity":
				return Number(record.TotalQuantity || 0);
			case "BatchDescription":
				return String(record.BatchDescription || "").toLowerCase();
			case "DateAdded":
				return record.DateAdded ? new Date(record.DateAdded).getTime() : 0;
			default:
				return "";
		}
	};

	const filteredBatches = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		const from = toComparableDate(dateFrom);
		const to = toComparableDate(dateTo);
		if (to) to.setHours(23, 59, 59, 999);
		const minQty = Number(minTotalQty);
		const maxQty = Number(maxTotalQty);

		const filtered = (batches || []).filter((record) => {
			if (query) {
				const matches =
					record.user?.FullName?.toLowerCase().includes(query) ||
					String(record.BatchDescription || "").toLowerCase().includes(query) ||
					record.ItemsProduced?.some((item) =>
						item.ItemName?.toLowerCase().includes(query),
					);
				if (!matches) return false;
			}

			if (addedByFilter !== "all" && record.user?.FullName !== addedByFilter) {
				return false;
			}

			if (itemFilter !== "all") {
				const hasItem = (record.ItemsProduced || []).some(
					(item) => item.ItemName === itemFilter,
				);
				if (!hasItem) return false;
			}

			const batchDate = toComparableDate(record.DateAdded);
			if (from && (!batchDate || batchDate < from)) return false;
			if (to && (!batchDate || batchDate > to)) return false;

			if (String(minTotalQty).trim() !== "" && !Number.isNaN(minQty)) {
				if (Number(record.TotalQuantity || 0) < minQty) return false;
			}
			if (String(maxTotalQty).trim() !== "" && !Number.isNaN(maxQty)) {
				if (Number(record.TotalQuantity || 0) > maxQty) return false;
			}

			return true;
		});

		if (!sortConfig.key) return filtered;
		return [...filtered].sort((a, b) => {
			const aValue = getSortValue(a, sortConfig.key);
			const bValue = getSortValue(b, sortConfig.key);
			if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
			if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
			return 0;
		});
	}, [
		batches,
		searchQuery,
		addedByFilter,
		itemFilter,
		dateFrom,
		dateTo,
		minTotalQty,
		maxTotalQty,
		sortConfig,
	]);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, addedByFilter, itemFilter, dateFrom, dateTo, minTotalQty, maxTotalQty, sortConfig, itemsPerPage]);

	const totalPages = Math.max(1, Math.ceil(filteredBatches.length / itemsPerPage));
	const safeCurrentPage = Math.min(currentPage, totalPages);
	const startIndex = (safeCurrentPage - 1) * itemsPerPage;
	const paginatedBatches = filteredBatches.slice(startIndex, startIndex + itemsPerPage);
	const pageNumberWindow = 2;
	const pageStart = Math.max(1, safeCurrentPage - pageNumberWindow);
	const pageEnd = Math.min(totalPages, safeCurrentPage + pageNumberWindow);
	const pageNumbers = Array.from({ length: pageEnd - pageStart + 1 }, (_, idx) => pageStart + idx);
	const canGoPrevious = safeCurrentPage > 1;
	const canGoNext = safeCurrentPage < totalPages;
	const countLabel = formatCountLabel(filteredBatches.length, "record");

	const goToPage = (page) => {
		setCurrentPage(Math.min(totalPages, Math.max(1, page)));
	};

	useEffect(() => {
		onHeaderMetaChange?.({
			subtitle: "Batches History",
			countLabel,
		});
	}, [onHeaderMetaChange, countLabel]);

	useEffect(() => {
		setFooterActions?.({
			openAddProduct: null,
			openRecordBatch: openCreateModal,
			openModifyCategories: null,
		});

		return () => {
			setFooterActions?.({
				openAddProduct: null,
				openRecordBatch: null,
				openModifyCategories: null,
			});
		};
	}, [setFooterActions, canCreateProductionBatch]);

	const openModal = () => setIsModalOpen(true);
	const openCreateModal = () => {
		if (!canCreateProductionBatch) return requirePermission("CanCreateProductionBatch");
		setIsModalOpen(true);
	};

	useEffect(() => {
		const pendingAction = getPendingProductsBatchesFooterAction();
		if (pendingAction !== PRODUCTS_BATCHES_FOOTER_ACTIONS.RECORD_BATCH) {
			return;
		}

		clearPendingProductsBatchesFooterAction();
		openCreateModal();
	}, [canCreateProductionBatch]);

	const openEditBatchDraft = (batch) => {
		if (!canUpdateProductionBatch) return requirePermission("CanUpdateProductionBatch");
		const items = (batch.ItemsProduced || []).map((item, idx) => ({
			key: `batch-${batch.ID}-line-${idx}`,
			ProductID: item.ProductID,
			ItemName: item.ItemName,
			QuantityProduced: Number(item.QuantityProduced || 0),
		}));

		if (items.length === 0) {
			showValidationToast(["This batch has no editable line items."]);
			return;
		}

		setDraft({
			mode: "existing",
			searchQuery: "",
			existingInputs: {},
			newProduct: {
				ProductName: "",
				ProductDescription: "",
				CategoryID: "",
				Price: "",
				LowStockThreshold: 10,
				QuantityProduced: "",
			},
			items,
			details: {
				BatchDescription: batch.BatchDescription || "",
			},
		});
		setIsModalOpen(true);
	};

	const saveAndClose = () => {
		setIsModalOpen(false);
	};

	const cancelAndClear = () => {
		setDraft(createDefaultBatchDraft());
		sessionStorage.removeItem(BATCH_DRAFT_KEY);
		setIsModalOpen(false);
	};

	const attemptClose = () => {
		if (!hasProgress(draft)) {
			cancelAndClear();
			return;
		}
		setShowExitWarning(true);
	};

	const setExistingQty = (id, value) => {
		setDraft((prev) => ({
			...prev,
			existingInputs: {
				...prev.existingInputs,
				[id]: { QuantityProduced: value },
			},
		}));
	};

	const addExistingProduct = (product) => {
		const row = draft.existingInputs[product.ID] || {};
		const qty = Number(row.QuantityProduced || 0);
		const issues = [];
		if (!String(row.QuantityProduced ?? "").trim()) issues.push(`"${product.ProductName}": Quantity is required.`);
		if (qty <= 0) issues.push(`"${product.ProductName}": Quantity must be greater than 0.`);
		if (!Number.isInteger(qty)) issues.push(`"${product.ProductName}": Quantity must be a whole number.`);
		if (issues.length) {
			showValidationToast(issues);
			return;
		}

		setDraft((prev) => ({
			...prev,
			items: [
				...prev.items,
				{
					key: `prod-existing-${product.ID}-${Date.now()}`,
					ProductID: product.ID,
					ItemName: product.ProductName,
					QuantityProduced: qty,
				},
			],
			existingInputs: {
				...prev.existingInputs,
				[product.ID]: { QuantityProduced: "" },
			},
		}));
	};

	const addNewProduct = () => {
		const np = draft.newProduct;
		const qty = Number(np.QuantityProduced || 0);
		const price = Number(np.Price || 0);
		const issues = [];
		if (!String(np.ProductName || "").trim()) issues.push("New Product: Product Name is required.");
		if (!String(np.CategoryID || "").trim()) issues.push("New Product: Category is required.");
		if (!String(np.Price || "").trim()) issues.push("New Product: Price is required.");
		if (!String(np.QuantityProduced || "").trim()) issues.push("New Product: Quantity is required.");
		if (qty <= 0) issues.push("New Product: Quantity must be greater than 0.");
		if (!Number.isInteger(qty)) issues.push("New Product: Quantity must be a whole number.");
		if (price < 0) issues.push("New Product: Price cannot be negative.");
		if (issues.length) {
			showValidationToast(issues);
			return;
		}

		setDraft((prev) => ({
			...prev,
			items: [
				...prev.items,
				{
					key: `prod-new-${Date.now()}`,
					ItemName: np.ProductName,
					QuantityProduced: qty,
					CreateProduct: {
						ProductName: np.ProductName,
						ProductDescription: np.ProductDescription,
						CategoryID: Number(np.CategoryID),
						Price: price,
						LowStockThreshold: Number(np.LowStockThreshold || 10),
					},
				},
			],
			newProduct: {
				ProductName: "",
				ProductDescription: "",
				CategoryID: "",
				Price: "",
				LowStockThreshold: 10,
				QuantityProduced: "",
			},
		}));
	};

	const requestRemoveLine = (key) => {
		setLineToDelete(key);
	};

	const removeLine = () => {
		if (!lineToDelete) {
			showValidationToast(["Select an item to delete first."]);
			return;
		}
		setDraft((prev) => ({
			...prev,
			items: prev.items.filter((line) => line.key !== lineToDelete),
		}));
		setLineToDelete(null);
	};

	const beginEditLine = (line) => {
		setEditingLine({ ...JSON.parse(JSON.stringify(line)), originalKey: line.key });
	};

	const saveEditLine = () => {
		if (!editingLine) return;
		const qty = Number(editingLine.QuantityProduced || 0);
		const issues = [];
		if (!String(editingLine.QuantityProduced ?? "").trim()) {
			issues.push("Edit line: Quantity is required.");
		}
		if (qty <= 0) issues.push("Edit line: Quantity must be greater than 0.");
		if (!Number.isInteger(qty)) issues.push("Edit line: Quantity must be a whole number.");

		if (editingLine.CreateProduct) {
			if (!String(editingLine.ItemName || "").trim()) {
				issues.push("Edit line: Product name is required.");
			}
			if (!String(editingLine.CreateProduct.CategoryID || "").trim()) {
				issues.push("Edit line: Category is required.");
			}
			if (Number(editingLine.CreateProduct.Price || 0) < 0) {
				issues.push("Edit line: Price cannot be negative.");
			}
		}

		if (issues.length) {
			showValidationToast(issues);
			return;
		}

		const nextLine = {
			...editingLine,
			key: editingLine.originalKey,
			QuantityProduced: qty,
		};

		if (nextLine.CreateProduct) {
			nextLine.CreateProduct = {
				...nextLine.CreateProduct,
				ProductName: nextLine.ItemName,
				Price: Number(nextLine.CreateProduct.Price || 0),
				CategoryID: Number(nextLine.CreateProduct.CategoryID),
			};
		}

		setDraft((prev) => ({
			...prev,
			items: prev.items.map((line) =>
				line.key === editingLine.originalKey ? nextLine : line,
			),
		}));
		setEditingLine(null);
	};

	const submitBatch = (e) => {
		e.preventDefault();
		if (!canCreateProductionBatch) return requirePermission("CanCreateProductionBatch");
		const issues = [];
		if ((draft.items || []).length === 0) {
			issues.push("Add at least one product item.");
		}
		if (issues.length) {
			showValidationToast(issues);
			return;
		}

		const payload = {
			BatchDescription: draft.details.BatchDescription || null,
			items: (draft.items || []).map((line) => ({
				ProductID: line.ProductID || null,
				QuantityProduced: Number(line.QuantityProduced),
				CreateProduct: line.CreateProduct || null,
			})),
		};

		batchForm.transform(() => payload);
		batchForm.post(route("inventory.batches.store"), {
			onSuccess: () => {
				setDraft(createDefaultBatchDraft());
				sessionStorage.removeItem(BATCH_DRAFT_KEY);
				setIsModalOpen(false);
			},
			preserveScroll: true,
		});
	};

	return (
		<div className="flex flex-col flex-1 w-full relative overflow-hidden min-h-0">
			<div className="flex-1 flex flex-col overflow-hidden min-h-0">
				<div className="mx-auto w-full flex-1 flex flex-col overflow-hidden min-h-0">
					<div className="bg-white shadow-sm sm:rounded-lg flex-1 flex flex-col overflow-hidden min-h-0">
						<div className="p-6 flex-1 flex flex-col overflow-hidden min-h-0">
							<div className="mb-6 flex items-start gap-3">
								<div className="relative w-full max-w-xl shrink-0">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
										</svg>
									</div>
									<input
										type="text"
										className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
										placeholder="Search by item, user, or batch description..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
									/>
								</div>
								<div className="flex flex-1 min-w-0 items-center gap-2">
									<div className="relative flex-1 min-w-0">
										<div className="overflow-x-auto pb-1 pr-4">
											<div className="flex min-w-max items-center gap-2 pr-3">
												<select value={addedByFilter} onChange={(e) => setAddedByFilter(e.target.value)} className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
													<option value="all">All Added By</option>
													{addedByOptions.map((name) => (
														<option key={name} value={name}>{name}</option>
													))}
												</select>
												<select value={itemFilter} onChange={(e) => setItemFilter(e.target.value)} className="w-44 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary">
													<option value="all">All Produced Items</option>
													{itemNameOptions.map((name) => (
														<option key={name} value={name}>{name}</option>
													))}
												</select>
												<input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
												<span className="text-sm text-gray-500">~</span>
												<input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
												<input type="number" min="0" placeholder="Min Qty" value={minTotalQty} onChange={(e) => setMinTotalQty(e.target.value)} className="w-32 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
												<input type="number" min="0" placeholder="Max Qty" value={maxTotalQty} onChange={(e) => setMaxTotalQty(e.target.value)} className="w-32 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary" />
											</div>
										</div>
										<div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
									</div>
									<button type="button" onClick={resetFilters} className="shrink-0 rounded-md border border-primary bg-white px-3 py-2 text-xs font-medium text-primary shadow-sm hover:bg-primary-soft">
										Reset Filters
									</button>
								</div>
							</div>

							<div className="border rounded-lg border-gray-200 flex-1 min-h-0 flex flex-col overflow-hidden">
								<div className="flex-1 overflow-y-auto">
								<table className="min-w-full table-fixed divide-y divide-gray-200">
									<thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
										<tr>
											<th className="w-28 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort("AddedBy")}>Added By {sortConfig.key === "AddedBy" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction.toUpperCase()}</span>}</th>
											<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort("ItemsProduced")}>Items Produced {sortConfig.key === "ItemsProduced" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction.toUpperCase()}</span>}</th>
											<th className="w-24 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort("TotalQuantity")}>Total Quantity {sortConfig.key === "TotalQuantity" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction.toUpperCase()}</span>}</th>
											<th className="w-52 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort("BatchDescription")}>Batch Description {sortConfig.key === "BatchDescription" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction.toUpperCase()}</span>}</th>
											<th className="w-32 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort("DateAdded")}>Batch Date {sortConfig.key === "DateAdded" && <span className="ml-1 text-[10px] text-gray-400">{sortConfig.direction.toUpperCase()}</span>}</th>
											<th className="w-24 px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{paginatedBatches.map((batch) => (
											<tr key={batch.ID} className="hover:bg-gray-50 align-top">
												<td className="px-4 py-4 text-sm text-gray-900 break-words">{batch.user?.FullName || "Unknown"}</td>
												<td className="px-4 py-4 text-sm text-gray-900 break-words">
													<div className="space-y-1">
														{(batch.ItemsProduced || []).map((item, idx) => (
															<div key={`${batch.ID}-${idx}`}>{item.ItemName} x{item.QuantityProduced}</div>
														))}
													</div>
												</td>
												<td className="px-4 py-4 text-sm font-semibold text-gray-900">{batch.TotalQuantity}</td>
												<td className="px-4 py-4 text-sm text-gray-500 break-words">{batch.BatchDescription || "-"}</td>
												<td className="px-4 py-4 text-sm text-gray-500 break-words">{new Date(batch.DateAdded).toLocaleString()}</td>
												<td className="px-4 py-4 text-right">
													{canUpdateProductionBatch ? (
														<button
															type="button"
															onClick={() => openEditBatchDraft(batch)}
															className="rounded border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary-soft"
														>
															Edit
														</button>
													) : (
														<span className="text-xs text-gray-400">No access</span>
													)}
												</td>
											</tr>
										))}
										{filteredBatches.length === 0 && (
											<tr>
												<td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">No Batch Records</td>
											</tr>
										)}
									</tbody>
								</table>
								</div>
								<div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
									<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
										<div className="text-sm text-gray-600">
											Showing {filteredBatches.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredBatches.length)} of {filteredBatches.length}
										</div>
										<div className="flex flex-wrap items-center gap-2">
											<label htmlFor="production-batches-items-per-page" className="text-sm text-gray-600">Items per page</label>
											<select
												id="production-batches-items-per-page"
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

			{isModalOpen && (
				<div className="fixed inset-0 z-50 overflow-y-auto">
					<div className="flex min-h-screen items-center justify-center p-4">
						<div className="fixed inset-0 bg-gray-500/75" onClick={attemptClose} />
						<form onSubmit={submitBatch} className="relative w-full max-w-7xl rounded-lg bg-white shadow-xl">
							<div className="border-b px-6 py-4">
								<h3 className="text-lg font-semibold text-gray-900">Record Production Batch</h3>
							</div>
							<div className="grid gap-4 p-6 lg:grid-cols-3">
								<div className="rounded-lg border p-4">
									<h4 className="mb-3 font-semibold">Product Input</h4>
									<select value={draft.mode} onChange={(e) => setDraft((prev) => ({ ...prev, mode: e.target.value }))} className="mb-3 w-full rounded border-gray-300 text-sm">
										<option value="existing">Existing products</option>
										<option value="new">New product</option>
									</select>

									{draft.mode === "existing" ? (
										<div className="max-h-80 space-y-2 overflow-y-auto rounded border p-3">
											<input type="text" value={draft.searchQuery} onChange={(e) => setDraft((prev) => ({ ...prev, searchQuery: e.target.value }))} placeholder="Search produced products..." className="w-full rounded border-gray-300 text-sm" />
											{filteredProducedProducts.map((product) => (
												<div key={product.ID} className="rounded border p-2 text-sm">
													<div className="font-medium">{product.ProductName}</div>
													<div className="mb-2 text-xs text-gray-500">{product.category?.CategoryName || "Uncategorized"}</div>
													<div className="flex items-center gap-2">
														<input type="number" min="1" placeholder="Qty" value={draft.existingInputs?.[product.ID]?.QuantityProduced || ""} onChange={(e) => setExistingQty(product.ID, e.target.value)} className="min-w-0 flex-1 rounded border-gray-300 text-sm" />
														<button type="button" onClick={() => addExistingProduct(product)} className="shrink-0 rounded bg-primary px-3 py-2 text-xs text-white">Add</button>
													</div>
												</div>
											))}
											{filteredProducedProducts.length === 0 && <div className="text-xs text-gray-500">No produced products found.</div>}
										</div>
									) : (
										<div className="space-y-2 text-sm rounded border p-3">
											<input type="text" placeholder="Product Name" value={draft.newProduct.ProductName} onChange={(e) => setDraft((prev) => ({ ...prev, newProduct: { ...prev.newProduct, ProductName: e.target.value } }))} className="w-full rounded border-gray-300" />
											<input type="text" placeholder="Product Description" value={draft.newProduct.ProductDescription} onChange={(e) => setDraft((prev) => ({ ...prev, newProduct: { ...prev.newProduct, ProductDescription: e.target.value } }))} className="w-full rounded border-gray-300" />
											<select value={draft.newProduct.CategoryID} onChange={(e) => setDraft((prev) => ({ ...prev, newProduct: { ...prev.newProduct, CategoryID: e.target.value } }))} className="w-full rounded border-gray-300">
												<option value="">Select Category</option>
												{(categories || []).map((cat) => (
													<option key={cat.ID} value={cat.ID}>{cat.CategoryName}</option>
												))}
											</select>
											<div className="grid grid-cols-2 gap-2">
												<input type="number" min="0" step="0.01" placeholder="Price" value={draft.newProduct.Price} onChange={(e) => setDraft((prev) => ({ ...prev, newProduct: { ...prev.newProduct, Price: e.target.value } }))} className="rounded border-gray-300" />
												<input type="number" min="0" placeholder="Low Stock Threshold" value={draft.newProduct.LowStockThreshold} onChange={(e) => setDraft((prev) => ({ ...prev, newProduct: { ...prev.newProduct, LowStockThreshold: e.target.value } }))} className="rounded border-gray-300" />
											</div>
											<div className="grid grid-cols-2 gap-2">
												<input type="number" min="1" placeholder="Qty Produced" value={draft.newProduct.QuantityProduced} onChange={(e) => setDraft((prev) => ({ ...prev, newProduct: { ...prev.newProduct, QuantityProduced: e.target.value } }))} className="rounded border-gray-300" />
												<button type="button" onClick={addNewProduct} className="rounded bg-primary px-3 py-2 text-xs text-white">Add New Product</button>
											</div>
										</div>
									)}
								</div>

								<div className="rounded-lg border p-4">
									<h4 className="mb-3 font-semibold">Added Items</h4>
									<div className="h-[26rem] overflow-y-auto rounded border p-2 text-sm">
										{(draft.items || []).length === 0 && (
											<div className="text-gray-500">No batch items yet.</div>
										)}
										{(draft.items || []).map((line) => (
											<div key={line.key} className="mb-2 rounded border p-2">
												<div className="font-medium">{line.ItemName}</div>
												<div>Qty: {line.QuantityProduced}</div>
												<div className="mt-1 flex gap-2">
													<button type="button" onClick={() => beginEditLine(line)} className="text-xs text-blue-600">Edit</button>
													<button type="button" onClick={() => requestRemoveLine(line.key)} className="text-xs text-red-600">Delete</button>
												</div>
											</div>
										))}
									</div>
								</div>

								<div className="rounded-lg border p-4">
									<h4 className="mb-3 font-semibold">Details</h4>
									<div className="space-y-3 text-sm">
										<textarea rows={4} placeholder="Batch Description" value={draft.details.BatchDescription} onChange={(e) => setDraft((prev) => ({ ...prev, details: { ...prev.details, BatchDescription: e.target.value } }))} className="w-full rounded border-gray-300" />
										<div className="rounded bg-gray-50 p-3">
											<div className="text-gray-600">Total Items</div>
											<div className="text-xl font-bold">{totalItems}</div>
										</div>
									</div>
								</div>
							</div>

							<div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-3">
								<button type="button" onClick={attemptClose} className="rounded border border-primary bg-white px-4 py-2 text-sm text-primary hover:bg-primary-soft">Cancel</button>
								<button type="button" onClick={saveAndClose} className="rounded border border-primary bg-white px-4 py-2 text-sm text-primary hover:bg-primary-soft">Save and Close</button>
								<button type="submit" disabled={batchForm.processing || (draft.items || []).length === 0} className="rounded bg-primary px-4 py-2 text-sm text-white disabled:opacity-50">Record Batch</button>
							</div>
						</form>
					</div>

					{editingLine && (
						<div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
							<div className="absolute inset-0 bg-gray-500/75" />
							<div className="relative w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
								<h4 className="mb-3 text-lg font-semibold">Edit Batch Item</h4>
								<div className="space-y-2 text-sm">
									{editingLine.CreateProduct && (
										<>
											<input className="w-full rounded border-gray-300" value={editingLine.ItemName} onChange={(e) => setEditingLine((p) => ({ ...p, ItemName: e.target.value }))} placeholder="Product Name" />
											<select className="w-full rounded border-gray-300" value={editingLine.CreateProduct.CategoryID || ""} onChange={(e) => setEditingLine((p) => ({ ...p, CreateProduct: { ...p.CreateProduct, CategoryID: e.target.value } }))}>
												<option value="">Select Category</option>
												{(categories || []).map((cat) => (
													<option key={cat.ID} value={cat.ID}>{cat.CategoryName}</option>
												))}
											</select>
											<input type="number" min="0" step="0.01" className="w-full rounded border-gray-300" value={editingLine.CreateProduct.Price || ""} onChange={(e) => setEditingLine((p) => ({ ...p, CreateProduct: { ...p.CreateProduct, Price: e.target.value } }))} placeholder="Price" />
										</>
									)}
									<input type="number" min="1" className="w-full rounded border-gray-300" value={editingLine.QuantityProduced} onChange={(e) => setEditingLine((p) => ({ ...p, QuantityProduced: e.target.value }))} placeholder="Quantity" />
								</div>
								<div className="mt-4 flex justify-end gap-2">
									<button type="button" className="rounded border border-primary bg-white px-3 py-2 text-sm text-primary hover:bg-primary-soft" onClick={() => setEditingLine(null)}>Cancel</button>
									<button type="button" className="rounded bg-primary px-3 py-2 text-sm text-white" onClick={saveEditLine}>Save Changes</button>
								</div>
							</div>
						</div>
					)}

					<ConfirmationModal
						show={Boolean(lineToDelete)}
						onClose={() => setLineToDelete(null)}
						onConfirm={removeLine}
						title="Delete Batch Item"
						message="Are you sure you want to remove this item from the current batch list?"
						confirmText="Delete"
						processing={false}
					/>

					{showExitWarning && (
						<div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
							<div className="absolute inset-0 bg-gray-500/75" />
							<div className="relative w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
								<h4 className="text-lg font-semibold">Unsaved Batch Progress</h4>
								<p className="mt-2 text-sm text-gray-600">You have draft changes. What do you want to do?</p>
								<div className="mt-4 flex flex-wrap justify-end gap-2">
									<button type="button" onClick={() => { setShowExitWarning(false); cancelAndClear(); }} className="rounded border border-red-300 px-3 py-2 text-sm text-red-600">Confirm Exit</button>
									<button type="button" onClick={() => { setShowExitWarning(false); saveAndClose(); }} className="rounded border border-primary bg-white px-3 py-2 text-sm text-primary hover:bg-primary-soft">Save and Exit</button>
									<button type="button" onClick={() => setShowExitWarning(false)} className="rounded border border-primary bg-white px-3 py-2 text-sm text-primary hover:bg-primary-soft">Continue</button>
								</div>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
