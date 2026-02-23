import React, { useState } from "react";
import { useForm } from "@inertiajs/react";

export default function BatchesTab({ products, batches }) {
	const [isModalOpen, setIsModalOpen] = useState(false);

	// Form for recording a batch
	const { data, setData, post, processing, errors, reset } = useForm({
		ProductID: "",
		QuantityAdded: "",
		BatchDescription: "",
	});

	const openAddModal = () => {
		reset();
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
		reset();
	};

	const submitBatch = (e) => {
		e.preventDefault();
		post(route("inventory.batches.store"), {
			onSuccess: () => closeModal(),
		});
	};

	// Find selected product to show current quantity
	const selectedProduct = products?.find((p) => p.ID == data.ProductID);

	return (
		<div className="flex flex-col flex-1 w-full relative">
			<div className="flex-1">
				<div className="mx-auto w-full">
					<div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
						<div className="p-6">
							{/* Header */}
							<div className="flex justify-between items-center mb-6">
								<h3 className="text-xl font-bold text-gray-900">
									Batches History
								</h3>
								<div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
									{batches?.length || 0} Records
								</div>
							</div>

							{/* Table */}
							<div className="border rounded-lg border-gray-200 overflow-hidden">
								<table className="min-w-full divide-y divide-gray-200">
									<thead className="bg-gray-50">
										<tr>
											<th
												scope="col"
												className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
											>
												Product Name
											</th>
											<th
												scope="col"
												className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
											>
												Added By
											</th>
											<th
												scope="col"
												className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
											>
												Quantity Added
											</th>
											<th
												scope="col"
												className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
											>
												Reason
											</th>
											<th
												scope="col"
												className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
											>
												Date Added
											</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{batches?.map((batch) => (
											<tr key={batch.ID} className="hover:bg-gray-50">
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm font-medium text-gray-900">
														{batch.product?.ProductName || "Unknown Product"}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													{batch.user?.FullName || "Unknown User"}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
													{batch.QuantityAdded} units
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													{batch.BatchDescription || "None"}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													{new Date(batch.DateAdded).toLocaleString()}
												</td>
											</tr>
										))}
										{batches?.length === 0 && (
											<tr>
												<td
													colSpan="5"
													className="px-6 py-4 text-center text-sm text-gray-500"
												>
													No Batch Records
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

			{/* Floating Action Button */}
			<div className="sticky bottom-0 w-full p-4 bg-white border-t border-gray-200 z-10">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<button
						onClick={openAddModal}
						className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#D97736] hover:bg-[#c2682e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D97736]"
					>
						Record a Batch
					</button>
				</div>
			</div>

			{/* Record Batch Modal */}
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
							<form onSubmit={submitBatch}>
								<div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
									<div className="sm:flex sm:items-start">
										<div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
											<h3
												className="text-lg leading-6 font-medium text-gray-900"
												id="modal-title"
											>
												Record Production Batch
											</h3>
											<div className="mt-4 space-y-4">
												{/* Product Dropdown */}
												<div>
													<label
														htmlFor="ProductID"
														className="block text-sm font-medium text-gray-700"
													>
														Product
													</label>
													<div className="mt-1 flex gap-2 items-center">
														<select
															id="ProductID"
															value={data.ProductID}
															onChange={(e) =>
																setData("ProductID", e.target.value)
															}
															required
															className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#D97736] focus:border-[#D97736] sm:text-sm"
														>
															<option value="" disabled>
																Select a product
															</option>
															{products?.map((product) => (
																<option key={product.ID} value={product.ID}>
																	{product.ProductName}
																</option>
															))}
														</select>
														{selectedProduct && (
															<div className="text-sm text-gray-500 whitespace-nowrap">
																Current:{" "}
																<span className="font-bold">
																	{selectedProduct.Quantity}
																</span>
															</div>
														)}
													</div>
													{errors.ProductID && (
														<p className="mt-2 text-sm text-red-600">
															{errors.ProductID}
														</p>
													)}
												</div>

												{/* Quantity field */}
												<div>
													<label
														htmlFor="QuantityAdded"
														className="block text-sm font-medium text-gray-700"
													>
														Quantity to Add
													</label>
													<input
														type="number"
														id="QuantityAdded"
														min="1"
														value={data.QuantityAdded}
														onChange={(e) =>
															setData("QuantityAdded", e.target.value)
														}
														required
														className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#D97736] focus:border-[#D97736] sm:text-sm"
														placeholder="Enter quantity"
													/>
													{errors.QuantityAdded && (
														<p className="mt-2 text-sm text-red-600">
															{errors.QuantityAdded}
														</p>
													)}
												</div>

												{/* Batch Description (Optional) */}
												<div>
													<label
														htmlFor="BatchDescription"
														className="block text-sm font-medium text-gray-700"
													>
														Batch Description (Optional)
													</label>
													<input
														type="text"
														id="BatchDescription"
														value={data.BatchDescription}
														onChange={(e) =>
															setData("BatchDescription", e.target.value)
														}
														className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#D97736] focus:border-[#D97736] sm:text-sm"
														placeholder="e.g. Morning Batch"
													/>
												</div>
											</div>
										</div>
									</div>
								</div>
								<div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
									<button
										type="submit"
										disabled={
											processing ||
											!data.ProductID ||
											!data.QuantityAdded ||
											data.QuantityAdded <= 0
										}
										className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#D97736] text-base font-medium text-white hover:bg-[#c2682e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D97736] sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
									>
										Save Record
									</button>
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
		</div>
	);
}
