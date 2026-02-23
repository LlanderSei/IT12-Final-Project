import React, { useState } from "react";
import { useForm } from "@inertiajs/react";
import ConfirmationModal from "@/Components/ConfirmationModal";

export default function ProductsTab({ products, categories }) {
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
	const {
		data: catData,
		setData: setCatData,
		post: postCat,
		processing: catProcessing,
		reset: catReset,
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

	const submitCategory = (e) => {
		e.preventDefault();
		postCat(route("inventory.categories.store"), {
			onSuccess: () => {
				setIsCategoryModalOpen(false);
				catReset();
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
		<div className="flex flex-col flex-1 w-full relative">
			<div className="flex-1">
				<div className="mx-auto w-full">
					<div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
						<div className="p-6">
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
							<div className="border rounded-lg border-gray-200 overflow-hidden">
								<table className="min-w-full divide-y divide-gray-200">
									<thead className="bg-gray-50">
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

			{/* Floating Add Product Button */}
			<div className="sticky bottom-0 w-full p-4 bg-white border-t border-gray-200 z-10 hidden sm:block">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<button
						onClick={openAddModal}
						className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#D97736] hover:bg-[#c2682e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D97736]"
					>
						Add Products
					</button>
				</div>
			</div>

			{/* Mobile-friendly Add Product Button */}
			<div className="sticky bottom-0 w-full p-4 bg-white border-t border-gray-200 z-10 sm:hidden">
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
														<button
															type="button"
															onClick={() => setIsCategoryModalOpen(true)}
															className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D97736]"
														>
															Add
														</button>
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

			{/* Add Category Modal */}
			{isCategoryModalOpen && (
				<div
					className="fixed inset-0 z-[60] overflow-y-auto"
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
						<div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm w-full">
							<form onSubmit={submitCategory}>
								<div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
									<h3
										className="text-lg leading-6 font-medium text-gray-900 mb-4"
										id="modal-title"
									>
										Add New Category
									</h3>
									<div className="space-y-4">
										<div>
											<label
												htmlFor="CategoryName"
												className="block text-sm font-medium text-gray-700"
											>
												Category Name
											</label>
											<input
												type="text"
												id="CategoryName"
												value={catData.CategoryName}
												onChange={(e) =>
													setCatData("CategoryName", e.target.value)
												}
												required
												className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#D97736] focus:border-[#D97736] sm:text-sm"
											/>
										</div>
									</div>
								</div>
								<div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
									<button
										type="submit"
										disabled={catProcessing}
										className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#D97736] text-base font-medium text-white hover:bg-[#c2682e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D97736] sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
									>
										Add
									</button>
									<button
										type="button"
										onClick={() => setIsCategoryModalOpen(false)}
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

			{/* Delete Confirmation Modal */}
			<ConfirmationModal
				show={isDeleteModalOpen}
				onClose={() => setIsDeleteModalOpen(false)}
				onConfirm={confirmDeleteProduct}
				title="Delete Product"
				message={`Are you sure you want to delete "${editingProduct?.ProductName}"? This action cannot be undone.`}
				confirmText="Delete"
				processing={processing}
			/>
		</div>
	);
}
