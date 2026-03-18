import React, { useEffect, useMemo, useState } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import Modal from "@/Components/Modal";
import SaleDocumentPreviewModal from "@/Components/SaleDocumentPreviewModal";
import JobOrders from "./JobOrdersSubviews/JobOrders";
import PendingJobOrders from "./JobOrdersSubviews/PendingJobOrders";
import PendingPayments from "./JobOrdersSubviews/PendingPayments";
import JobOrdersHistory from "./JobOrdersSubviews/JobOrdersHistory";
import usePermissions from "@/hooks/usePermissions";
import { countOverdueDeliveries } from "@/utils/jobOrders";
import { formatCountLabel } from "@/utils/countLabel";
import { computePaymentFlow, PAYMENT_METHODS } from "@/utils/paymentFlow";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value) => {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString();
};

const normalizeMoney = (value) => Number(value || 0);

export default function JobOrdersTabs({
	initialTab = "Job Orders",
	jobOrders = [],
	pendingJobOrders = [],
	pendingSales = [],
	historyJobOrders = [],
	products = [],
	categories = [],
	customers = [],
}) {
	const { can, deny, requirePermission } = usePermissions();
	const canViewJobOrders = can("CanViewJobOrders");
	const canViewPending = can("CanViewPendingJobOrders");
	const canViewPendingPayments =
		can("CanViewSalesHistory") && can("CanViewSalesHistoryPendingPayments");
	const canViewHistory = can("CanViewJobOrdersHistory");
	const canRecordSalePayment = can("CanRecordSalePayment");
	const canViewInvoices = can("CanViewJobOrderInvoices");
	const canExportInvoices = can("CanExportJobOrderInvoices");
	const canViewReceipts = can("CanViewPaymentReceipts");
	const canExportReceipts = can("CanExportPaymentReceipts");
	const overduePendingCount = useMemo(
		() => countOverdueDeliveries(pendingJobOrders),
		[pendingJobOrders],
	);
	const pendingPaymentRows = useMemo(() => {
		return (pendingSales || [])
			.map((sale) => {
				const totalAmount = normalizeMoney(
					sale.payment?.TotalAmount ?? sale.TotalAmount,
				);
				const paymentPaidAmount = normalizeMoney(sale.payment?.PaidAmount);
				const totalPartialPaid = (sale.partial_payments || []).reduce(
					(sum, payment) => sum + normalizeMoney(payment.PaidAmount),
					0,
				);
				const paidAmount = Math.max(paymentPaidAmount, totalPartialPaid);
				const amountLeft = Math.max(0, totalAmount - paidAmount);
				return {
					...sale,
					totalAmount,
					paidAmount,
					totalPartialPaid,
					amountLeft,
				};
			})
			.filter((sale) => sale.amountLeft > 0);
	}, [pendingSales]);
	const pendingPaymentsCount = pendingPaymentRows.length;

	const tabs = [
		canViewJobOrders
			? { label: "Job Orders", routeName: "pos.job-orders" }
			: null,
		canViewPending
			? {
					label: "Pending Job Orders",
					routeName: "pos.job-orders.pending",
					badgeCount: pendingJobOrders.length,
				}
			: null,
		canViewPendingPayments
			? {
					label: "Pending Payments",
					routeName: "pos.job-orders.pending-payments",
					badgeCount: pendingPaymentsCount,
				}
			: null,
		canViewHistory
			? { label: "Job Orders History", routeName: "pos.job-orders.history" }
			: null,
	].filter(Boolean);

	const tabLabels = tabs.map((tab) => tab.label);
	const activeTab = tabLabels.includes(initialTab)
		? initialTab
		: tabLabels[0] || "Job Orders";
	const getDefaultHeaderMeta = (tab) => {
		if (tab === "Pending Job Orders") {
			const overdueCount = countOverdueDeliveries(pendingJobOrders);
			return {
				subtitle: "Pending Job Orders",
				countLabel: formatCountLabel(pendingJobOrders.length, "pending job order"),
				alertLabel:
					overdueCount > 0
						? `${overdueCount} overdue ${overdueCount === 1 ? "delivery" : "deliveries"}`
						: "",
			};
		}
		if (tab === "Pending Payments") {
			return {
				subtitle: "Pending Payments",
				countLabel: formatCountLabel(pendingPaymentsCount, "pending payment"),
			};
		}
		if (tab === "Job Orders History") {
			return {
				subtitle: "Job Orders History",
				countLabel: formatCountLabel(historyJobOrders.length, "job order"),
			};
		}
		return { subtitle: "Job Orders" };
	};
	const [headerMeta, setHeaderMeta] = useState(() => getDefaultHeaderMeta(activeTab));
	const [selectedSale, setSelectedSale] = useState(null);
	const [documentPreview, setDocumentPreview] = useState({
		type: null,
		sale: null,
		receiptPayment: null,
	});
	const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
	const [paymentSubmitAttempted, setPaymentSubmitAttempted] = useState(false);
	const paymentForm = useForm({
		SalesID: "",
		paymentType: "partial",
		PaidAmount: "",
		PaymentMethod: "Cash",
		AdditionalDetails: "",
	});

	useEffect(() => {
		setHeaderMeta(getDefaultHeaderMeta(activeTab));
	}, [activeTab, pendingJobOrders, historyJobOrders, pendingPaymentsCount]);

	const selectedPendingSale = useMemo(
		() =>
			pendingPaymentRows.find(
				(sale) => String(sale.ID) === String(paymentForm.data.SalesID || ""),
			) || null,
		[pendingPaymentRows, paymentForm.data.SalesID],
	);
	const paymentFlowState = useMemo(
		() =>
			computePaymentFlow({
				paymentSelection: "pay_now",
				paymentMethod: paymentForm.data.PaymentMethod,
				paidAmount: paymentForm.data.PaidAmount,
				amountDue: selectedPendingSale?.amountLeft || 0,
			}),
		[
			paymentForm.data.PaymentMethod,
			paymentForm.data.PaidAmount,
			selectedPendingSale,
		],
	);
	const selectedSaleCustomOrderLines = useMemo(() => {
		if (!selectedSale) return [];
		return (
			selectedSale.job_order?.custom_items ||
			selectedSale.jobOrder?.customItems ||
			selectedSale.jobOrder?.custom_items ||
			[]
		);
	}, [selectedSale]);
	const isPreviewOpen = Boolean(documentPreview.type && documentPreview.sale);

	const openPaymentModal = () => {
		if (!requirePermission("CanRecordSalePayment")) return;
		setPaymentSubmitAttempted(false);
		paymentForm.reset();
		paymentForm.setData({
			SalesID: pendingPaymentRows[0]?.ID ? String(pendingPaymentRows[0].ID) : "",
			paymentType: "partial",
			PaidAmount: "",
			PaymentMethod: "Cash",
			AdditionalDetails: "",
		});
		paymentForm.clearErrors();
		setIsPaymentModalOpen(true);
	};

	const openInvoicePreview = (sale) => {
		if (!requirePermission("CanViewJobOrderInvoices")) return;
		if (sale?.SaleType !== "JobOrder" || !sale?.payment?.InvoiceNumber) {
			return deny("Only job orders with an issued invoice can be previewed.");
		}
		setDocumentPreview({
			type: "invoice",
			sale,
			receiptPayment: null,
		});
	};

	const openReceiptPreview = (sale, receiptPayment = null) => {
		if (!requirePermission("CanViewPaymentReceipts")) return;
		const receiptNumber = receiptPayment?.ReceiptNumber || sale?.payment?.ReceiptNumber;
		if (!receiptNumber) {
			return deny("Only sales with an issued receipt can be previewed.");
		}
		setDocumentPreview({
			type: "receipt",
			sale,
			receiptPayment,
		});
	};

	const submitPayment = (e) => {
		e.preventDefault();
		if (!requirePermission("CanRecordSalePayment")) return;
		setPaymentSubmitAttempted(true);
		if (paymentFlowState.amountError) return;
		paymentForm.transform((data) => ({
			...data,
			SalesID: Number(data.SalesID),
			PaidAmount: Number(data.PaidAmount),
			paymentType: paymentFlowState.effectivePaymentType,
			AdditionalDetails:
				String(data.AdditionalDetails || "").trim() === ""
					? null
					: data.AdditionalDetails,
		}));
		paymentForm.post(route("pos.sale-history.payments.store"), {
			preserveScroll: true,
			onSuccess: () => {
				setIsPaymentModalOpen(false);
				setPaymentSubmitAttempted(false);
				paymentForm.reset();
			},
		});
	};

	return (
		<AuthenticatedLayout
			header={
				<div className="flex items-center justify-between gap-4">
					<h2 className="font-semibold text-xl text-gray-800 leading-tight">
						Job Orders
						<span className="ml-2 text-base font-medium text-gray-500">
							&gt; {headerMeta?.subtitle || activeTab}
						</span>
					</h2>
					<div className="flex items-center gap-2">
						{headerMeta?.alertLabel && (
							<div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
								{headerMeta.alertLabel}
							</div>
						)}
						{headerMeta?.countLabel && (
							<div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
								{headerMeta.countLabel}
							</div>
						)}
					</div>
				</div>
			}
			disableScroll={true}
		>
			<Head title="Job Orders" />

			{tabs.length > 0 && (
				<div className="bg-white border-b border-gray-200 mt-0">
					<div className="mx-auto px-4">
						<nav className="-mb-px flex gap-2" aria-label="Tabs">
							{tabs.map((tab) => {
								const active = tab.label === activeTab;
								const badgeCount = Number(tab.badgeCount || 0);
								return (
									<Link
										key={tab.routeName}
										href={route(tab.routeName)}
										className={`${
											active
												? "bg-primary-soft border-primary text-primary"
												: "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300"
										} relative whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors duration-200 rounded-t-lg`}
									>
										{tab.label}
										{badgeCount > 0 && (
											<span className="pointer-events-none absolute -bottom-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white shadow-sm ring-2 ring-white">
												{badgeCount}
											</span>
										)}
									</Link>
								);
							})}
						</nav>
					</div>
				</div>
			)}

			<div className="flex-1 p-4 md:p-6 min-h-0 flex flex-col">
				{tabs.length === 0 ? (
					<div className="h-full bg-white rounded-lg border border-gray-200 p-6 text-sm text-gray-500">
						You do not have access to job orders.
					</div>
				) : !canViewJobOrders && activeTab === "Job Orders" ? (
					<div className="h-full bg-white rounded-lg border border-gray-200 p-6 text-sm text-gray-500">
						You do not have access to job orders.
					</div>
				) : !canViewPending && activeTab === "Pending Job Orders" ? (
					<div className="h-full bg-white rounded-lg border border-gray-200 p-6 text-sm text-gray-500">
						You do not have access to pending job orders.
					</div>
				) : !canViewPendingPayments && activeTab === "Pending Payments" ? (
					<div className="h-full bg-white rounded-lg border border-gray-200 p-6 text-sm text-gray-500">
						You do not have access to pending payments.
					</div>
				) : !canViewHistory && activeTab === "Job Orders History" ? (
					<div className="h-full bg-white rounded-lg border border-gray-200 p-6 text-sm text-gray-500">
						You do not have access to job order history.
					</div>
				) : activeTab === "Job Orders" ? (
					<JobOrders
						products={products}
						categories={categories}
						customers={customers}
					/>
				) : activeTab === "Pending Job Orders" ? (
					<PendingJobOrders
						rows={pendingJobOrders}
						onHeaderMetaChange={setHeaderMeta}
					/>
				) : activeTab === "Pending Payments" ? (
					<PendingPayments
						rows={pendingPaymentRows}
						onView={setSelectedSale}
						onInvoice={openInvoicePreview}
						canViewInvoices={canViewInvoices}
					/>
				) : (
					<JobOrdersHistory
						rows={historyJobOrders}
						onHeaderMetaChange={setHeaderMeta}
					/>
				)}
			</div>

			{activeTab === "Pending Payments" && canRecordSalePayment && (
				<div className="sticky bottom-0 w-full p-4 bg-white border-t border-gray-200 z-10">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<button
							type="button"
							onClick={openPaymentModal}
							disabled={pendingPaymentRows.length === 0}
							className="w-full inline-flex justify-center py-3 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed"
						>
							Record Payment
						</button>
					</div>
				</div>
			)}

			<Modal
				show={Boolean(selectedSale)}
				onClose={() => setSelectedSale(null)}
				closeable={!isPreviewOpen}
				maxWidth="2xl"
			>
				{selectedSale && (
					<div className="p-6 max-h-[80vh] overflow-y-auto">
						<div className="mb-4 flex flex-wrap items-start justify-between gap-3">
							<div>
								<h3 className="text-lg font-semibold text-gray-900">
									Sale Details
								</h3>
								<div className="mt-1 space-y-1 text-xs text-gray-500">
									<div>Sale Type: {selectedSale.SaleType || "-"}</div>
									{selectedSale.payment?.InvoiceNumber && (
										<div>
											Invoice: {selectedSale.payment.InvoiceNumber}
											{selectedSale.payment?.InvoiceIssuedAt
												? ` - ${formatDateTime(selectedSale.payment.InvoiceIssuedAt)}`
												: ""}
										</div>
									)}
									{selectedSale.payment?.ReceiptNumber && (
										<div>
											Initial receipt: {selectedSale.payment.ReceiptNumber}
											{selectedSale.payment?.ReceiptIssuedAt
												? ` - ${formatDateTime(selectedSale.payment.ReceiptIssuedAt)}`
												: ""}
										</div>
									)}
								</div>
							</div>
							<div className="flex flex-wrap justify-end gap-2">
								{selectedSale.payment?.InvoiceNumber && (
									<button
										type="button"
										onClick={() => openInvoicePreview(selectedSale)}
										className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
									>
										Preview Invoice
									</button>
								)}
								{selectedSale.payment?.ReceiptNumber && (
									<button
										type="button"
										onClick={() => openReceiptPreview(selectedSale)}
										className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
									>
										Preview Receipt
									</button>
								)}
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
							<div><span className="font-semibold text-gray-700">Customer:</span> <span className="text-gray-900">{selectedSale.customer?.CustomerName || "Walk-In"}</span></div>
							<div><span className="font-semibold text-gray-700">Cashier:</span> <span className="text-gray-900">{selectedSale.user?.FullName || "Unknown"}</span></div>
							<div><span className="font-semibold text-gray-700">Total Amount:</span> <span className="text-gray-900">{currency(selectedSale.totalAmount || selectedSale.TotalAmount)}</span></div>
							<div><span className="font-semibold text-gray-700">Status:</span> <span className="text-gray-900">{selectedSale.payment?.PaymentStatus || "-"}</span></div>
							<div><span className="font-semibold text-gray-700">Paid:</span> <span className="text-gray-900">{currency(selectedSale.paidAmount)}</span></div>
							<div><span className="font-semibold text-gray-700">Amount Left:</span> <span className="text-gray-900">{currency(selectedSale.amountLeft)}</span></div>
							<div><span className="font-semibold text-gray-700">Due Date:</span> <span className="text-gray-900">{selectedSale.payment?.PaymentDueDate ? formatDateTime(selectedSale.payment.PaymentDueDate) : "-"}</span></div>
							<div><span className="font-semibold text-gray-700">Payment Method:</span> <span className="text-gray-900">{selectedSale.payment?.PaymentMethod || "-"}</span></div>
						</div>
						<div className="mt-4">
							<h4 className="text-sm font-semibold text-gray-700 mb-2">Products</h4>
							<div className="max-h-56 overflow-y-auto rounded border border-gray-200">
								<table className="min-w-full text-sm">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subtotal</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200 bg-white">
										{(selectedSale.sold_products || []).map((line) => (
											<tr key={line.ID}>
												<td className="px-3 py-2 text-gray-900">{line.product?.ProductName || "-"}</td>
												<td className="px-3 py-2 text-gray-700">{line.Quantity}</td>
												<td className="px-3 py-2 text-gray-700">{currency(line.PricePerUnit)}</td>
												<td className="px-3 py-2 text-gray-700">{currency(line.SubAmount)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
						<div className="mt-4">
							<h4 className="text-sm font-semibold text-gray-700 mb-2">Custom Orders</h4>
							<div className="max-h-44 overflow-y-auto rounded border border-gray-200">
								<table className="min-w-full text-sm">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subtotal</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200 bg-white">
										{selectedSaleCustomOrderLines.map((line) => (
											<tr key={`custom-order-line-${line.ID}`}>
												<td className="px-3 py-2 text-gray-900 align-top"><div className="max-w-md whitespace-pre-wrap break-words">{line.CustomOrderDescription || "-"}</div></td>
												<td className="px-3 py-2 text-gray-700">{line.Quantity ?? "-"}</td>
												<td className="px-3 py-2 text-gray-700">{currency(line.PricePerUnit)}</td>
												<td className="px-3 py-2 text-gray-700">{currency(Number(line.Quantity || 0) * Number(line.PricePerUnit || 0))}</td>
											</tr>
										))}
										{selectedSaleCustomOrderLines.length === 0 && (
											<tr>
												<td colSpan="4" className="px-3 py-3 text-center text-gray-500">No custom orders recorded.</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>
						<div className="mt-4">
							<h4 className="text-sm font-semibold text-gray-700 mb-2">Partial Payments</h4>
							<div className="max-h-44 overflow-y-auto rounded border border-gray-200">
								<table className="min-w-full text-sm">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Receipt No.</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Applied</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tendered</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Change</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Method</th>
											<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
											<th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200 bg-white">
										{(selectedSale.partial_payments || []).map((payment) => (
											<tr key={payment.ID}>
												<td className="px-3 py-2 text-gray-700">{payment.ReceiptNumber || "-"}</td>
												<td className="px-3 py-2 text-gray-900">{currency(payment.PaidAmount)}</td>
												<td className="px-3 py-2 text-gray-700">{payment.TenderedAmount != null ? currency(payment.TenderedAmount) : "-"}</td>
												<td className="px-3 py-2 text-gray-700">{payment.Change != null ? currency(payment.Change) : "-"}</td>
												<td className="px-3 py-2 text-gray-700">{payment.PaymentMethod || "-"}</td>
												<td className="px-3 py-2 text-gray-700">{formatDateTime(payment.DateAdded)}</td>
												<td className="px-3 py-2 text-right">
													{canViewReceipts && payment.ReceiptNumber ? (
														<button
															type="button"
															onClick={() => openReceiptPreview(selectedSale, payment)}
															className="rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
														>
															Preview Receipt
														</button>
													) : (
														<span className="text-xs text-gray-400">-</span>
													)}
												</td>
											</tr>
										))}
										{(selectedSale.partial_payments || []).length === 0 && (
											<tr>
												<td colSpan="7" className="px-3 py-3 text-center text-gray-500">No partial payments recorded.</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>
						<div className="mt-6 flex justify-end">
							<button
								type="button"
								onClick={() => setSelectedSale(null)}
								className="px-4 py-2 text-sm rounded-md border border-primary bg-white text-primary hover:bg-primary-soft"
							>
								Close
							</button>
						</div>
					</div>
				)}
			</Modal>

			<SaleDocumentPreviewModal
				show={Boolean(documentPreview.type && documentPreview.sale)}
				onClose={() =>
					setDocumentPreview({
						type: null,
						sale: null,
						receiptPayment: null,
					})
				}
				sale={documentPreview.sale}
				type={documentPreview.type || "invoice"}
				receiptPayment={documentPreview.receiptPayment}
				canExport={
					documentPreview.type === "invoice"
						? canExportInvoices
						: canExportReceipts
				}
			/>

			<Modal
				show={isPaymentModalOpen && canRecordSalePayment}
				onClose={() => {
					setIsPaymentModalOpen(false);
					setPaymentSubmitAttempted(false);
				}}
				maxWidth="lg"
			>
				<form onSubmit={submitPayment} className="p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">
						Record Payment
					</h3>
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Sale
							</label>
							<select
								value={paymentForm.data.SalesID}
								onChange={(e) => paymentForm.setData("SalesID", e.target.value)}
								className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
							>
								<option value="">Select pending sale</option>
								{pendingPaymentRows.map((sale) => (
									<option key={sale.ID} value={sale.ID}>
										#{sale.ID} - {sale.customer?.CustomerName || "Walk-In"} -
										Left {currency(sale.amountLeft)}
									</option>
								))}
							</select>
							{paymentForm.errors.SalesID && (
								<p className="mt-1 text-sm text-red-600">
									{paymentForm.errors.SalesID}
								</p>
							)}
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Payment Type
								</label>
								<select
									value={paymentForm.data.paymentType}
									onChange={(e) =>
										paymentForm.setData("paymentType", e.target.value)
									}
									className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
								>
									<option value="partial">Partial Payment</option>
									<option value="full">Full Payment</option>
								</select>
								<p className="mt-1 text-xs text-gray-500">
									Recorded as{" "}
									{paymentFlowState.effectivePaymentType === "full"
										? "Full Payment"
										: "Partial Payment"}
									.
								</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Payment Method
								</label>
								<select
									value={paymentForm.data.PaymentMethod}
									onChange={(e) =>
										paymentForm.setData("PaymentMethod", e.target.value)
									}
									className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
								>
									{PAYMENT_METHODS.map((method) => (
										<option key={method} value={method}>
											{method}
										</option>
									))}
								</select>
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Amount Paid
							</label>
							<input
								type="number"
								min="0.01"
								step="0.01"
								value={paymentForm.data.PaidAmount}
								onChange={(e) =>
									paymentForm.setData("PaidAmount", e.target.value)
								}
								className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
							/>
							{selectedPendingSale && (
								<p className="mt-1 text-xs text-gray-500">
									Amount left: {currency(selectedPendingSale.amountLeft)} - Applied:{" "}
									{currency(paymentFlowState.appliedAmount)}
								</p>
							)}
							{paymentSubmitAttempted && paymentFlowState.amountError && (
								<p className="mt-1 text-sm text-red-600">
									{paymentFlowState.amountError}
								</p>
							)}
							{paymentForm.errors.PaidAmount && (
								<p className="mt-1 text-sm text-red-600">
									{paymentForm.errors.PaidAmount}
								</p>
							)}
						</div>
						{paymentForm.data.PaymentMethod === "Cash" && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Change
								</label>
								<div className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50">
									{currency(paymentFlowState.change)}
								</div>
							</div>
						)}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Additional Details
							</label>
							<input
								type="text"
								value={paymentForm.data.AdditionalDetails}
								onChange={(e) =>
									paymentForm.setData("AdditionalDetails", e.target.value)
								}
								placeholder="Reference no., notes, etc. (optional)"
								className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary"
							/>
						</div>
					</div>
					<div className="mt-6 flex justify-end gap-2">
						<button
							type="button"
							onClick={() => {
								setIsPaymentModalOpen(false);
								setPaymentSubmitAttempted(false);
							}}
							className="px-4 py-2 text-sm rounded-md border border-primary bg-white text-primary hover:bg-primary-soft"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={paymentForm.processing}
							className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
						>
							Save Payment
						</button>
					</div>
				</form>
			</Modal>
		</AuthenticatedLayout>
	);
}
