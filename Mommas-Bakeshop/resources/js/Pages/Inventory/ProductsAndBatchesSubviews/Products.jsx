import React, { useMemo, useState } from "react";
import { useForm } from "@inertiajs/react";
import { useEffect } from "react";
import ConfirmationModal from "@/Components/ConfirmationModal";
import { formatCountLabel } from "@/utils/countLabel";
import {
	clearPendingProductsBatchesFooterAction,
	getPendingProductsBatchesFooterAction,
	PRODUCTS_BATCHES_FOOTER_ACTIONS,
} from "@/utils/productsAndBatchesFooterActions";
import usePermissions from "@/hooks/usePermissions";

export default function Products({
	products,
	categories,
	onHeaderMetaChange,
	setFooterActions,
	canCreateProduct = false,
	canUpdateProduct = false,
	canDeleteProduct = false,
	canCreateProductCategory = false,
	canUpdateProductCategory = false,
	canDeleteProductCategory = false,
}) {
	const { requirePermission } = usePermissions();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingProduct, setEditingProduct] = useState(null);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [sortConfig, setSortConfig] = useState({
		key: "ProductName",
		direction: "asc",
	});
	const [categoryFilter, setCategoryFilter] = useState("all");
	const [productFromFilter, setProductFromFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [minPrice, setMinPrice] = useState("");
	const [maxPrice, setMaxPrice] = useState("");
	const [minQty, setMinQty] = useState("");
	const [maxQty, setMaxQty] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(25);
	const [imageInputKey, setImageInputKey] = useState(0);
	const [selectedImagePreview, setSelectedImagePreview] = useState(null);
	const [existingImageUrl, setExistingImageUrl] = useState(null);
	const [clientImageError, setClientImageError] = useState("");
	const maxImageBytes = 5 * 1024 * 1024; // 5MB limit

	const categoryOptions = useMemo(
		() => [...new Set((products || []).map((p) => p.category?.CategoryName).filter(Boolean))],
		[products],
	);

	const productFromOptions = useMemo(
		() => [...new Set((products || []).map((p) => p.ProductFrom).filter(Boolean))],
		[products],
	);

	// Form handling
	const {
		data,
		setData,
		post,
		delete: destroy,
		processing,
		errors,
		reset,
		transform,
		progress,
	} = useForm({
		ProductName: "",
		ProductDescription: "",
		CategoryID: "",
		Price: "",
		ProductImage: null,
		RemoveProductImage: false,
		LowStockThreshold: 10,
	});

	const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
	const [editingCategory, setEditingCategory] = useState(null);
	const [isCategoryDeleteModalOpen, setIsCategoryDeleteModalOpen] =
		useState(false);
	const [categoryToDelete, setCategoryToDelete] = useState(null);

	const {
		data: catData,
		setData: setCatData,
		post: postCat,
		put: putCat,
		delete: destroyCat,
		processing: catProcessing,
		reset: catReset,
		errors: catErrors,
	} = useForm({
		CategoryName: "",
		CategoryDescription: "",
	});

	const openAddModal = () => {
		if (!canCreateProduct) return requirePermission("CanCreateProduct");
		setEditingProduct(null);
		reset();
		setData("ProductImage", null);
		setData("RemoveProductImage", false);
		setSelectedImagePreview(null);
		setExistingImageUrl(null);
		setClientImageError("");
		setImageInputKey((prev) => prev + 1);
		setIsModalOpen(true);
	};

	const openEditModal = (product) => {
		if (!canUpdateProduct) return requirePermission("CanUpdateProduct");
		setEditingProduct(product);
		setData({
			ProductName: product.ProductName,
			ProductDescription: product.ProductDescription || "",
			CategoryID: product.CategoryID,
			Price: product.Price,
			ProductImage: null,
			RemoveProductImage: false,
			LowStockThreshold: product.LowStockThreshold ?? 10,
		});
		setSelectedImagePreview(null);
		setExistingImageUrl(product.ProductImageUrl || null);
		setClientImageError("");
		setImageInputKey((prev) => prev + 1);
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
		reset();
		setSelectedImagePreview(null);
		setExistingImageUrl(null);
		setClientImageError("");
		setImageInputKey((prev) => prev + 1);
	};

	useEffect(() => {
		if (typeof data.ProductImage !== "string" || !data.ProductImage.startsWith("data:image")) {
			return undefined;
		}

		setSelectedImagePreview(data.ProductImage);
	}, [data.ProductImage]);

	const removeSelectedImage = () => {
		setData("ProductImage", null);
		setSelectedImagePreview(null);
		setClientImageError("");
		if (existingImageUrl) {
			setData("RemoveProductImage", true);
			setExistingImageUrl(null);
		}
		setImageInputKey((prev) => prev + 1);
	};

	const handleImageSelection = (event) => {
		const file = event.target.files?.[0] || null;
		if (file && file.size > maxImageBytes) {
			setClientImageError("Image must be 5MB or smaller.");
			setData("ProductImage", null);
			setData("RemoveProductImage", false);
			setSelectedImagePreview(null);
			setImageInputKey((prev) => prev + 1);
			return;
		}

		if (file) {
			const reader = new FileReader();
			reader.onloadend = () => {
				setData("ProductImage", reader.result); // This will be the base64 string
				setData("RemoveProductImage", false);
				setClientImageError("");
				setExistingImageUrl(null);
			};
			reader.readAsDataURL(file);
		} else {
			setData("ProductImage", null);
			setData("RemoveProductImage", false);
			setClientImageError("");
		}
	};

	const submitProduct = (e) => {
		e.preventDefault();
		if (editingProduct && !canUpdateProduct) return;
		if (!editingProduct && !canCreateProduct) return;
		if (editingProduct) {
			transform((currentData) => ({ ...currentData, _method: "put" }));
			post(route("inventory.products.update", editingProduct.ID), {
				forceFormData: true,
				onSuccess: () => closeModal(),
				onFinish: () => transform((currentData) => currentData),
			});
		} else {
			post(route("inventory.products.store"), {
				forceFormData: true,
				onSuccess: () => closeModal(),
			});
		}
	};

	const deleteProduct = () => {
		if (!canDeleteProduct) return requirePermission("CanDeleteProduct");
		setIsDeleteModalOpen(true);
	};

	const confirmDeleteProduct = () => {
		if (!canDeleteProduct) return requirePermission("CanDeleteProduct");
		destroy(route("inventory.products.destroy", editingProduct.ID), {
			onSuccess: () => {
				setIsDeleteModalOpen(false);
				closeModal();
			},
		});
	};

	const openModifyCategories = () => {
		if (!(canCreateProductCategory || canUpdateProductCategory || canDeleteProductCategory)) {
			return requirePermission("CanUpdateProductCategory");
		}
		setEditingCategory(null);
		catReset();
		setIsCategoryModalOpen(true);
	};

	const submitCategory = (e) => {
		e.preventDefault();
		if (editingCategory && !canUpdateProductCategory) return requirePermission("CanUpdateProductCategory");
		if (!editingCategory && !canCreateProductCategory) return requirePermission("CanCreateProductCategory");
		if (editingCategory) {
			putCat(route("inventory.categories.update", editingCategory.ID), {
				onSuccess: () => {
					setEditingCategory(null);
					catReset();
				},
				preserveScroll: true,
			});
		} else {
			postCat(route("inventory.categories.store"), {
				onSuccess: () => {
					catReset();
				},
				preserveScroll: true,
			});
		}
	};

	const editCategory = (category) => {
		if (!canUpdateProductCategory) return requirePermission("CanUpdateProductCategory");
		setEditingCategory(category);
		setCatData({
			CategoryName: category.CategoryName,
			CategoryDescription: category.CategoryDescription || "",
		});
	};

	const cancelEditCategory = () => {
		setEditingCategory(null);
		catReset();
	};

	const deleteCategory = (category) => {
		if (!canDeleteProductCategory) return requirePermission("CanDeleteProductCategory");
		setCategoryToDelete(category);
		setIsCategoryDeleteModalOpen(true);
	};

	const confirmDeleteCategory = () => {
		if (!canDeleteProductCategory) return requirePermission("CanDeleteProductCategory");
		destroyCat(route("inventory.categories.destroy", categoryToDelete.ID), {
			onSuccess: () => {
				setIsCategoryDeleteModalOpen(false);
				setCategoryToDelete(null);
			},
			preserveScroll: true,
		});
	};

	const requestSort = (key) => {
		let direction = "asc";
		if (sortConfig.key === key && sortConfig.direction === "asc") {
			direction = "desc";
		}
		setSortConfig({ key, direction });
	};

	const resetFilters = () => {
		setSearchQuery("");
		setCategoryFilter("all");
		setProductFromFilter("all");
		setStatusFilter("all");
		setMinPrice("");
		setMaxPrice("");
		setMinQty("");
		setMaxQty("");
	};

	const getStatus = (product) => {
		if (product.Quantity == 0) return "No Stock";
		if (product.Quantity <= product.LowStockThreshold) return "Low Stock";
		return "On Stock";
	};

	const getSortValue = (product, key) => {
		switch (key) {
			case "ProductName":
				return String(product.ProductName || "").toLowerCase();
			case "ProductFrom":
				return String(product.ProductFrom || "").toLowerCase();
			case "Price":
				return Number(product.Price || 0);
			case "Quantity":
				return Number(product.Quantity || 0);
			case "LowStockThreshold":
				return Number(product.LowStockThreshold || 0);
			case "Status":
				return String(getStatus(product) || "").toLowerCase();
			default:
				return "";
		}
	};

	const filteredAndSortedProducts = useMemo(() => {
		let items = [...(products || [])];

		// Search filtering
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			items = items.filter((product) => {
				const status = getStatus(product).toLowerCase();
				return (
					product.ProductName.toLowerCase().includes(query) ||
					String(product.category?.CategoryName || "")
						.toLowerCase()
						.includes(query) ||
					String(product.ProductFrom || "").toLowerCase().includes(query) ||
					product.Price.toString().includes(query) ||
					product.Quantity.toString().includes(query) ||
					status.includes(query)
				);
			});
		}

		if (categoryFilter !== "all") {
			items = items.filter((product) => product.category?.CategoryName === categoryFilter);
		}

		if (productFromFilter !== "all") {
			items = items.filter((product) => product.ProductFrom === productFromFilter);
		}

		if (statusFilter !== "all") {
			items = items.filter((product) => {
				const status = getStatus(product);
				if (statusFilter === "on_stock") return status === "On Stock";
				if (statusFilter === "low_stock") return status === "Low Stock";
				if (statusFilter === "no_stock") return status === "No Stock";
				return true;
			});
		}

		const minPriceNum = Number(minPrice);
		const maxPriceNum = Number(maxPrice);
		const minQtyNum = Number(minQty);
		const maxQtyNum = Number(maxQty);
		if (String(minPrice).trim() !== "" && !Number.isNaN(minPriceNum)) {
			items = items.filter((product) => Number(product.Price || 0) >= minPriceNum);
		}
		if (String(maxPrice).trim() !== "" && !Number.isNaN(maxPriceNum)) {
			items = items.filter((product) => Number(product.Price || 0) <= maxPriceNum);
		}
		if (String(minQty).trim() !== "" && !Number.isNaN(minQtyNum)) {
			items = items.filter((product) => Number(product.Quantity || 0) >= minQtyNum);
		}
		if (String(maxQty).trim() !== "" && !Number.isNaN(maxQtyNum)) {
			items = items.filter((product) => Number(product.Quantity || 0) <= maxQtyNum);
		}

		// Sorting
		if (sortConfig.key) {
			items.sort((a, b) => {
				const aValue = getSortValue(a, sortConfig.key);
				const bValue = getSortValue(b, sortConfig.key);

				if (aValue < bValue) {
					return sortConfig.direction === "asc" ? -1 : 1;
				}
				if (aValue > bValue) {
					return sortConfig.direction === "asc" ? 1 : -1;
				}
				return 0;
			});
		}

		return items;
	}, [
		products,
		searchQuery,
		categoryFilter,
		productFromFilter,
		statusFilter,
		minPrice,
		maxPrice,
		minQty,
		maxQty,
		sortConfig,
	]);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, categoryFilter, productFromFilter, statusFilter, minPrice, maxPrice, minQty, maxQty, sortConfig, itemsPerPage]);

	const totalPages = Math.max(1, Math.ceil(filteredAndSortedProducts.length / itemsPerPage));
	const safeCurrentPage = Math.min(currentPage, totalPages);
	const startIndex = (safeCurrentPage - 1) * itemsPerPage;
	const paginatedProducts = filteredAndSortedProducts.slice(startIndex, startIndex + itemsPerPage);
	const pageNumberWindow = 2;
	const pageStart = Math.max(1, safeCurrentPage - pageNumberWindow);
	const pageEnd = Math.min(totalPages, safeCurrentPage + pageNumberWindow);
	const pageNumbers = Array.from({ length: pageEnd - pageStart + 1 }, (_, idx) => pageStart + idx);
	const canGoPrevious = safeCurrentPage > 1;
	const canGoNext = safeCurrentPage < totalPages;
	const countLabel = formatCountLabel(filteredAndSortedProducts.length, "product");
	const productPreviewImage = selectedImagePreview || existingImageUrl;

	const goToPage = (page) => {
		setCurrentPage(Math.min(totalPages, Math.max(1, page)));
	};

	useEffect(() => {
		onHeaderMetaChange?.({
			subtitle: "Finished Goods",
			countLabel,
		});
	}, [onHeaderMetaChange, countLabel]);

	useEffect(() => {
		setFooterActions?.({
			openAddProduct: openAddModal,
			openRecordBatch: null,
			openModifyCategories: openModifyCategories,
		});

		return () => {
			setFooterActions?.({
				openAddProduct: null,
				openRecordBatch: null,
				openModifyCategories: null,
			});
		};
	}, [setFooterActions, canCreateProduct, canCreateProductCategory, canUpdateProductCategory, canDeleteProductCategory]);

	useEffect(() => {
		const pendingAction = getPendingProductsBatchesFooterAction();
		if (pendingAction === PRODUCTS_BATCHES_FOOTER_ACTIONS.ADD_PRODUCT) {
			clearPendingProductsBatchesFooterAction();
			openAddModal();
			return;
		}
		if (pendingAction === PRODUCTS_BATCHES_FOOTER_ACTIONS.MODIFY_CATEGORIES) {
			clearPendingProductsBatchesFooterAction();
			openModifyCategories();
		}
	}, [canCreateProduct, canCreateProductCategory, canUpdateProductCategory, canDeleteProductCategory]);

	return (
		<div className="flex flex-col flex-1 w-full relative overflow-hidden min-h-0">
			<div className="flex-1 flex flex-col overflow-hidden min-h-0">
				<div className="mx-auto w-full flex-1 flex flex-col overflow-hidden min-h-0">
					<div className="bg-white shadow-sm sm:rounded-lg flex-1 flex flex-col overflow-hidden min-h-0">
						<div className="p-6 flex-1 flex flex-col overflow-hidden min-h-0">
							{/* Search + Filters */}
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
										className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
										placeholder="Search products by name, price, quantity, or status..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
									/>
								</div>
								<div className="flex flex-1 min-w-0 items-center gap-2">
									<div className="relative flex-1 min-w-0">
										<div className="overflow-x-auto pb-1 pr-4">
											<div className="flex min-w-max items-center gap-2 pr-3">
												<select
													value={categoryFilter}
													onChange={(e) => setCategoryFilter(e.target.value)}
													className="w-44 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
												>
													<option value="all">All Categories</option>
													{categoryOptions.map((categoryName) => (
														<option key={categoryName} value={categoryName}>
															{categoryName}
														</option>
													))}
												</select>
												<select
													value={productFromFilter}
													onChange={(e) => setProductFromFilter(e.target.value)}
													className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
												>
													<option value="all">All Sources</option>
													{productFromOptions.map((value) => (
														<option key={value} value={value}>
															{value}
														</option>
													))}
												</select>
												<select
													value={statusFilter}
													onChange={(e) => setStatusFilter(e.target.value)}
													className="w-36 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
												>
													<option value="all">All Status</option>
													<option value="on_stock">On Stock</option>
													<option value="low_stock">Low Stock</option>
													<option value="no_stock">No Stock</option>
												</select>
												<input
													type="number"
													min="0"
													step="0.01"
													placeholder="Min Price"
													value={minPrice}
													onChange={(e) => setMinPrice(e.target.value)}
													className="w-32 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
												/>
												<input
													type="number"
													min="0"
													step="0.01"
													placeholder="Max Price"
													value={maxPrice}
													onChange={(e) => setMaxPrice(e.target.value)}
													className="w-32 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
												/>
												<input
													type="number"
													min="0"
													placeholder="Min Qty"
													value={minQty}
													onChange={(e) => setMinQty(e.target.value)}
													className="w-32 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
												/>
												<input
													type="number"
													min="0"
													placeholder="Max Qty"
													value={maxQty}
													onChange={(e) => setMaxQty(e.target.value)}
													className="w-32 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
												/>
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

							{/* Table */}
								<div className="border rounded-lg border-gray-200 flex-1 min-h-0 flex flex-col overflow-hidden">
									<div className="flex-1 overflow-y-auto">
									<table className="min-w-full divide-y divide-gray-200">
									<thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
										<tr>
											<th
												scope="col"
												className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
												onClick={() => requestSort("ProductName")}
											>
												<div className="flex items-center">
													Product Name
													{sortConfig.key === "ProductName" && (
														<span className="ml-1 text-[10px] text-gray-400">
															{sortConfig.direction.toUpperCase()}
														</span>
													)}
												</div>
											</th>
											<th
												scope="col"
												className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
												onClick={() => requestSort("ProductFrom")}
											>
												<div className="flex items-center">
													Source
													{sortConfig.key === "ProductFrom" && (
														<span className="ml-1 text-[10px] text-gray-400">
															{sortConfig.direction.toUpperCase()}
														</span>
													)}
												</div>
											</th>
											<th
												scope="col"
												className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
												onClick={() => requestSort("Price")}
											>
												<div className="flex items-center">
													Price
													{sortConfig.key === "Price" && (
														<span className="ml-1 text-[10px] text-gray-400">
															{sortConfig.direction.toUpperCase()}
														</span>
													)}
												</div>
											</th>
											<th
												scope="col"
												className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
												onClick={() => requestSort("Quantity")}
											>
												<div className="flex items-center">
													Quantity
													{sortConfig.key === "Quantity" && (
														<span className="ml-1 text-[10px] text-gray-400">
															{sortConfig.direction.toUpperCase()}
														</span>
													)}
												</div>
											</th>
											<th
												scope="col"
												className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
												onClick={() => requestSort("LowStockThreshold")}
											>
												<div className="flex items-center">
													Low Stock Threshold
													{sortConfig.key === "LowStockThreshold" && (
														<span className="ml-1 text-[10px] text-gray-400">
															{sortConfig.direction.toUpperCase()}
														</span>
													)}
												</div>
											</th>
											<th
												scope="col"
												className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
												onClick={() => requestSort("Status")}
											>
												<div className="flex items-center">
													Status
													{sortConfig.key === "Status" && (
														<span className="ml-1 text-[10px] text-gray-400">
															{sortConfig.direction.toUpperCase()}
														</span>
													)}
												</div>
											</th>
											<th
												scope="col"
												className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
											>
												Actions
											</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
											{paginatedProducts.map((product) => (
											<tr key={product.ID} className="hover:bg-gray-50">
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm font-medium text-gray-900">
														{product.ProductName}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm text-gray-500">
														{product.ProductFrom || "N/A"}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm text-gray-900">
														₱{Number(product.Price).toFixed(2)}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm text-gray-900">
														{product.Quantity} units
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm text-gray-900">
														{product.LowStockThreshold ?? 10} units
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<span
														className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
															product.Quantity == 0
																? "bg-red-100 text-red-800"
																: product.Quantity <= product.LowStockThreshold
																	? "bg-yellow-100 text-yellow-800"
																	: "bg-green-100 text-green-800"
														}`}
													>
														{getStatus(product)}
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
													<button
														onClick={() => openEditModal(product)}
														disabled={!canUpdateProduct}
														className="rounded border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary-soft"
													>
														Edit
													</button>
												</td>
											</tr>
										))}
										{filteredAndSortedProducts.length === 0 && (
											<tr>
												<td
													colSpan="7"
													className="px-6 py-4 text-center text-sm text-gray-500"
												>
													No products found.
												</td>
											</tr>
										)}
									</tbody>
									</table>
									</div>
									<div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
										<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
											<div className="text-sm text-gray-600">
												Showing {filteredAndSortedProducts.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredAndSortedProducts.length)} of {filteredAndSortedProducts.length}
											</div>
											<div className="flex flex-wrap items-center gap-2">
												<label htmlFor="products-items-per-page" className="text-sm text-gray-600">Items per page</label>
												<select
													id="products-items-per-page"
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

			{/* Add/Edit Product Modal */}
			{isModalOpen && (
				<div
					className="fixed inset-0 z-50 overflow-y-auto"
					aria-labelledby="modal-title"
					role="dialog"
					aria-modal="true"
				>
					<div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
						<div
							className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
							aria-hidden="true"
							onClick={closeModal}
						></div>

						<span
							className="hidden sm:inline-block sm:align-middle sm:h-screen"
							aria-hidden="true"
						>
							&#8203;
						</span>

						<div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
							<form onSubmit={submitProduct}>
								<div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
									<div className="sm:flex sm:items-start">
										<div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
											<h3
												className="text-lg leading-6 font-medium text-gray-900"
												id="modal-title"
											>
												{editingProduct ? "Edit Product" : "Add Product"}
											</h3>
											<div className="mt-4 space-y-4">
												{/* Product Name */}
												<div>
													<label
														htmlFor="ProductName"
														className="block text-sm font-medium text-gray-700"
													>
														Product Name
													</label>
													<input
														type="text"
														id="ProductName"
														value={data.ProductName}
														onChange={(e) =>
															setData("ProductName", e.target.value)
														}
														required
														className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
													/>
													{errors.ProductName && (
														<p className="mt-2 text-sm text-red-600">
															{errors.ProductName}
														</p>
													)}
												</div>

												{/* Product Description */}
												<div>
													<label
														htmlFor="ProductDescription"
														className="block text-sm font-medium text-gray-700"
													>
														Description
													</label>
													<textarea
														id="ProductDescription"
														value={data.ProductDescription}
														onChange={(e) =>
															setData("ProductDescription", e.target.value)
														}
														rows={2}
														className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
													/>
												</div>

												{/* Category */}
												<div>
													<label
														htmlFor="CategoryID"
														className="block text-sm font-medium text-gray-700"
													>
														Category
													</label>
													<div className="mt-1 flex space-x-2">
														<select
															id="CategoryID"
															value={data.CategoryID}
															onChange={(e) =>
																setData("CategoryID", e.target.value)
															}
															required
															className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
														>
															<option value="" disabled>
																Select a category
															</option>
															{categories?.map((cat) => (
																<option key={cat.ID} value={cat.ID}>
																	{cat.CategoryName}
																</option>
															))}
														</select>
													</div>
													{errors.CategoryID && (
														<p className="mt-2 text-sm text-red-600">
															{errors.CategoryID}
														</p>
													)}
												</div>

												{/* Price */}
												<div>
													<label
														htmlFor="Price"
														className="block text-sm font-medium text-gray-700"
													>
														Price (₱)
													</label>
													<input
														type="number"
														step="0.01"
														min="0"
														id="Price"
														value={data.Price}
														onChange={(e) => setData("Price", e.target.value)}
														required
														className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
													/>
													{errors.Price && (
														<p className="mt-2 text-sm text-red-600">
															{errors.Price}
														</p>
													)}
												</div>

												{/* Low Stock Threshold */}
												<div>
													<label
														htmlFor="LowStockThreshold"
														className="block text-sm font-medium text-gray-700"
													>
														Low Stock Threshold
													</label>
													<input
														type="number"
														min="0"
														id="LowStockThreshold"
														value={data.LowStockThreshold}
														onChange={(e) =>
															setData("LowStockThreshold", e.target.value)
														}
														required
														className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
													/>
													{errors.LowStockThreshold && (
														<p className="mt-2 text-sm text-red-600">
															{errors.LowStockThreshold}
														</p>
													)}
												</div>

												<div>
													<label
														htmlFor="ProductImage"
														className="block text-sm font-medium text-gray-700"
													>
														Product Image
													</label>
													<div className="mt-1 space-y-3">
														<input
															key={imageInputKey}
															type="file"
															id="ProductImage"
															accept="image/*"
															onChange={handleImageSelection}
															className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-primary-soft file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary-soft"
														/>
														
														{/* Progress Bar */}
														{processing && progress && (
															<div className="mt-2 w-full">
																<div className="flex justify-between items-center mb-1">
																	<span className="text-xs font-medium text-primary">Uploading...</span>
																	<span className="text-xs font-medium text-primary">{progress.percentage}%</span>
																</div>
																<div className="w-full bg-gray-200 rounded-full h-1.5">
																	<div
																		className="bg-primary h-1.5 rounded-full transition-all duration-300"
																		style={{ width: `${progress.percentage}%` }}
																	/>
																</div>
															</div>
														)}

														{productPreviewImage ? (
															<div className="rounded-lg border border-gray-200 p-3">
																<img
																	src={productPreviewImage}
																	alt="Product preview"
																	className="h-40 w-full rounded-md object-cover"
																/>
																<div className="mt-3 flex justify-end">
																	<button
																		type="button"
																		onClick={removeSelectedImage}
																		className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
																	>
																		Remove Image
																	</button>
																</div>
															</div>
														) : (
															<div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
																No image selected.
															</div>
														)}
													</div>
													{errors.ProductImage && (
														<p className="mt-2 text-sm text-red-600">
															{errors.ProductImage}
														</p>
													)}
													{!errors.ProductImage && clientImageError && (
														<p className="mt-2 text-sm text-red-600">
															{clientImageError}
														</p>
													)}
												</div>
											</div>
										</div>
									</div>
								</div>
								<div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
									<button
										type="submit"
										disabled={processing}
										className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
									>
										{editingProduct ? "Save Changes" : "Add Product"}
									</button>
										{editingProduct && (
											<button
												type="button"
												disabled={!canDeleteProduct}
												onClick={deleteProduct}
												className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600"
											>
												Delete
											</button>
									)}
									<button
										type="button"
										onClick={closeModal}
										className="mt-3 w-full inline-flex justify-center rounded-md border border-primary shadow-sm px-4 py-2 bg-white text-base font-medium text-primary hover:bg-primary-soft focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
									>
										Cancel
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			)}

			{/* Modify Categories Modal */}
			{isCategoryModalOpen && (
				<div
					className="fixed inset-0 z-50 overflow-y-auto"
					aria-labelledby="modal-title"
					role="dialog"
					aria-modal="true"
				>
					<div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
						<div
							className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
							aria-hidden="true"
							onClick={() => setIsCategoryModalOpen(false)}
						></div>
						<span
							className="hidden sm:inline-block sm:align-middle sm:h-screen"
							aria-hidden="true"
						>
							&#8203;
						</span>
						<div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md w-full">
							<div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
								<h3
									className="text-lg leading-6 font-medium text-gray-900 mb-4"
									id="modal-title"
								>
									Modify Categories
								</h3>

								{/* Category List */}
								<div className="max-h-60 overflow-y-auto border rounded-md mb-4 divide-y">
									{categories?.map((cat) => (
										<div
											key={cat.ID}
											className="flex justify-between items-center p-3 hover:bg-gray-50"
										>
											<span className="text-gray-900 font-medium">
												{cat.CategoryName}
											</span>
											<div className="flex space-x-2">
													<button
														type="button"
														onClick={() => editCategory(cat)}
														disabled={!canUpdateProductCategory}
														className="p-1 text-gray-400 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-400"
													>
													<svg
														xmlns="http://www.w3.org/2000/svg"
														className="h-5 w-5"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
														/>
													</svg>
												</button>
													<button
														type="button"
														onClick={() => deleteCategory(cat)}
														disabled={!canDeleteProductCategory}
														className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-400"
													>
													<svg
														xmlns="http://www.w3.org/2000/svg"
														className="h-5 w-5"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
														/>
													</svg>
												</button>
											</div>
										</div>
									))}
								</div>

								{/* Add/Edit Form */}
								<form onSubmit={submitCategory} className="border-t pt-4">
									<h4 className="text-sm font-semibold text-gray-700 mb-2">
										{editingCategory ? "Rename Category" : "Add New Category"}
									</h4>
									<div className="flex space-x-2">
										<div className="flex-1">
											<input
												type="text"
												value={catData.CategoryName}
												onChange={(e) =>
													setCatData("CategoryName", e.target.value)
												}
												placeholder="Category Name"
												required
												className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
											/>
										</div>
											<button
												type="submit"
												disabled={catProcessing || (editingCategory ? !canUpdateProductCategory : !canCreateProductCategory)}
												className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
											>
											{editingCategory ? "Update" : "Save"}
										</button>
										{editingCategory && (
											<button
												type="button"
												onClick={cancelEditCategory}
												className="inline-flex justify-center rounded-md border border-primary shadow-sm px-4 py-2 bg-white text-sm font-medium text-primary hover:bg-primary-soft focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
											>
												Cancel
											</button>
										)}
									</div>
									{catErrors.CategoryName && (
										<p className="mt-2 text-sm text-red-600">
											{catErrors.CategoryName}
										</p>
									)}
								</form>
							</div>
							<div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
								<button
									type="button"
									onClick={() => setIsCategoryModalOpen(false)}
									className="w-full inline-flex justify-center rounded-md border border-primary shadow-sm px-4 py-2 bg-white text-base font-medium text-primary hover:bg-primary-soft focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:w-auto sm:text-sm"
								>
									Close
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Product Delete Confirmation Modal */}
			<ConfirmationModal
				show={isDeleteModalOpen}
				onClose={() => setIsDeleteModalOpen(false)}
				onConfirm={confirmDeleteProduct}
				title="Delete Product"
				message={`Are you sure you want to delete "${editingProduct?.ProductName}"? This action cannot be undone.`}
				confirmText="Delete"
				processing={processing}
			/>

			{/* Category Delete Confirmation Modal */}
			<ConfirmationModal
				show={isCategoryDeleteModalOpen}
				onClose={() => setIsCategoryDeleteModalOpen(false)}
				onConfirm={confirmDeleteCategory}
				title="Delete Category"
				message={`Are you sure you want to delete category "${categoryToDelete?.CategoryName}"? This action cannot be undone.`}
				confirmText="Delete"
				processing={catProcessing}
			/>
		</div>
	);
}
