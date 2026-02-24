import React, { useState } from "react";
import { useForm } from "@inertiajs/react";
import ConfirmationModal from "@/Components/ConfirmationModal";

export default function Products({ products, categories }) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingProduct, setEditingProduct] = useState(null);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [sortConfig, setSortConfig] = useState({
		key: "ProductName",
		direction: "asc",
	});

	// Form handling
	const {
		data,
		setData,
		post,
		put,
		delete: destroy,
		processing,
		errors,
		reset,
	} = useForm({
		ProductName: "",
		ProductDescription: "",
		CategoryID: "",
		Price: "",
		ProductImage: "",
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
		setEditingProduct(null);
		reset();
		setIsModalOpen(true);
	};

	const openEditModal = (product) => {
		setEditingProduct(product);
		setData({
			ProductName: product.ProductName,
			ProductDescription: product.ProductDescription || "",
			CategoryID: product.CategoryID,
			Price: product.Price,
			ProductImage: product.ProductImage || "",
			LowStockThreshold: product.LowStockThreshold ?? 10,
		});
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
		reset();
	};

	const submitProduct = (e) => {
		e.preventDefault();
		if (editingProduct) {
			put(route("inventory.products.update", editingProduct.ID), {
				onSuccess: () => closeModal(),
			});
		} else {
			post(route("inventory.products.store"), {
				onSuccess: () => closeModal(),
			});
		}
	};

	const deleteProduct = () => {
		setIsDeleteModalOpen(true);
	};

	const confirmDeleteProduct = () => {
		destroy(route("inventory.products.destroy", editingProduct.ID), {
			onSuccess: () => {
				setIsDeleteModalOpen(false);
				closeModal();
			},
		});
	};

	const openModifyCategories = () => {
		setEditingCategory(null);
		catReset();
		setIsCategoryModalOpen(true);
	};

	const submitCategory = (e) => {
		e.preventDefault();
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
		setCategoryToDelete(category);
		setIsCategoryDeleteModalOpen(true);
	};

	const confirmDeleteCategory = () => {
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

	const getStatus = (product) => {
		if (product.Quantity == 0) return "No Stock";
		if (product.Quantity <= product.LowStockThreshold) return "Low Stock";
		return "On Stock";
	};

	const filteredAndSortedProducts = React.useMemo(() => {
		let items = [...(products || [])];

		// Search filtering
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			items = items.filter((product) => {
				const status = getStatus(product).toLowerCase();
				return (
					product.ProductName.toLowerCase().includes(query) ||
					product.Price.toString().includes(query) ||
					product.Quantity.toString().includes(query) ||
					status.includes(query)
				);
			});
		}

		// Sorting
		if (sortConfig.key) {
			items.sort((a, b) => {
				let aValue = a[sortConfig.key];
				let bValue = b[sortConfig.key];

				// Handle numeric values
				if (
					["Price", "Quantity", "LowStockThreshold"].includes(sortConfig.key)
				) {
					aValue = Number(aValue);
					bValue = Number(bValue);
				} else {
					aValue = (aValue || "").toString().toLowerCase();
					bValue = (bValue || "").toString().toLowerCase();
				}

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
	}, [products, searchQuery, sortConfig]);

	return (
		<div className="flex flex-col flex-1 w-full relative overflow-hidden min-h-0">
			<div className="flex-1 flex flex-col overflow-hidden min-h-0">
				<div className="mx-auto w-full flex-1 flex flex-col overflow-hidden min-h-0">
					<div className="bg-white shadow-sm sm:rounded-lg flex-1 flex flex-col overflow-hidden min-h-0">
						<div className="p-6 flex-1 flex flex-col overflow-hidden min-h-0">
							{/* Header */}
							<div className="flex justify-between items-center mb-6">
								<h3 className="text-xl font-bold text-gray-900">
									Finished Goods
								</h3>
								<div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
									{filteredAndSortedProducts.length} Products
								</div>
							</div>

							{/* Search Bar */}
							<div className="mb-6">
								<div className="relative">
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
										className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#D97736] focus:border-[#D97736] sm:text-sm"
										placeholder="Search products by name, price, quantity, or status..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
									/>
								</div>
							</div>

							{/* Table */}
							<div className="border rounded-lg border-gray-200 flex-1 overflow-y-auto">
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
														<span className="ml-1">
															{sortConfig.direction === "asc" ? "↑" : "↓"}
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
														<span className="ml-1">
															{sortConfig.direction === "asc" ? "↑" : "↓"}
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
														<span className="ml-1">
															{sortConfig.direction === "asc" ? "↑" : "↓"}
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
														<span className="ml-1">
															{sortConfig.direction === "asc" ? "↑" : "↓"}
														</span>
													)}
												</div>
											</th>
											<th
												scope="col"
												className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
											>
												Status
											</th>
											<th scope="col" className="relative px-6 py-3">
												<span className="sr-only">Edit</span>
											</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{filteredAndSortedProducts.map((product) => (
											<tr key={product.ID} className="hover:bg-gray-50">
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm font-medium text-gray-900">
														{product.ProductName}
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
														className="text-gray-400 hover:text-[#D97736]"
													>
														<svg
															xmlns="http://www.w3.org/2000/svg"
															className="h-5 w-5 inline-block"
															fill="none"
															viewBox="0 0 24 24"
															stroke="currentColor"
															strokeWidth={2}
														>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
															/>
														</svg>
													</button>
												</td>
											</tr>
										))}
										{filteredAndSortedProducts.length === 0 && (
											<tr>
												<td
													colSpan="6"
													className="px-6 py-4 text-center text-sm text-gray-500"
												>
													No products found.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Floating Buttons */}
			<div className="sticky bottom-0 w-full p-4 bg-white border-t border-gray-200 z-10 hidden sm:block">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-4">
					<button
						onClick={openModifyCategories}
						className="flex-1 flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D97736]"
					>
						Modify Categories
					</button>
					<button
						onClick={openAddModal}
						className="flex-1 flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#D97736] hover:bg-[#c2682e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D97736]"
					>
						Add Products
					</button>
				</div>
			</div>

			{/* Mobile-friendly Buttons */}
			<div className="sticky bottom-0 w-full p-4 bg-white border-t border-gray-200 z-10 sm:hidden flex flex-col space-y-2">
				<button
					onClick={openModifyCategories}
					className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D97736]"
				>
					Modify Categories
				</button>
				<button
					onClick={openAddModal}
					className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#D97736] hover:bg-[#c2682e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D97736]"
				>
					Add Products
				</button>
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
														className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#D97736] focus:border-[#D97736] sm:text-sm"
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
														className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#D97736] focus:border-[#D97736] sm:text-sm"
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
															className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#D97736] focus:border-[#D97736] sm:text-sm"
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
														className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#D97736] focus:border-[#D97736] sm:text-sm"
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
														className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#D97736] focus:border-[#D97736] sm:text-sm"
													/>
													{errors.LowStockThreshold && (
														<p className="mt-2 text-sm text-red-600">
															{errors.LowStockThreshold}
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
										className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#D97736] text-base font-medium text-white hover:bg-[#c2682e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D97736] sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
									>
										{editingProduct ? "Save Changes" : "Add Product"}
									</button>
									{editingProduct && (
										<button
											type="button"
											onClick={deleteProduct}
											className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
										>
											Delete
										</button>
									)}
									<button
										type="button"
										onClick={closeModal}
										className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D97736] sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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
													className="p-1 text-gray-400 hover:text-[#D97736]"
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
													className="p-1 text-gray-400 hover:text-red-500"
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
												className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#D97736] focus:border-[#D97736] sm:text-sm"
											/>
										</div>
										<button
											type="submit"
											disabled={catProcessing}
											className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#D97736] text-sm font-medium text-white hover:bg-[#c2682e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D97736] disabled:opacity-50"
										>
											{editingCategory ? "Update" : "Save"}
										</button>
										{editingCategory && (
											<button
												type="button"
												onClick={cancelEditCategory}
												className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D97736]"
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
									className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D97736] sm:w-auto sm:text-sm"
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
