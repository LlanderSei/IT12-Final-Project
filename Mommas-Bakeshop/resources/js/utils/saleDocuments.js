import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value) => {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString();
};

const safeFileName = (value, fallback) =>
	String(value || fallback || "document")
		.replace(/[^a-z0-9-_]+/gi, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		.toLowerCase();

const getCustomOrderLines = (sale) =>
	(sale.custom_order_details || sale.customOrderDetails || []).flatMap(
		(detail) => detail.custom_orders || detail.customOrders || [],
	);

const getSoldLines = (sale) => sale.sold_products || [];

function addBrandingHeader(doc, title, documentNumber) {
	doc.setFillColor(245, 158, 11);
	doc.rect(0, 0, 210, 30, "F");
	doc.setTextColor(255, 255, 255);
	doc.setFont("helvetica", "bold");
	doc.setFontSize(18);
	doc.text("Momma's Bakeshop", 14, 15);
	doc.setFontSize(11);
	doc.setFont("helvetica", "normal");
	doc.text("Bakery Sales Documents", 14, 22);

	doc.setTextColor(17, 24, 39);
	doc.setFont("helvetica", "bold");
	doc.setFontSize(16);
	doc.text(title, 14, 42);
	doc.setFont("helvetica", "normal");
	doc.setFontSize(10);
	doc.text(documentNumber, 14, 48);
}

function invoiceRows(sale) {
	const productRows = getSoldLines(sale).map((line) => [
		line.product?.ProductName || "-",
		Number(line.Quantity || 0),
		currency(line.PricePerUnit),
		currency(line.SubAmount),
	]);
	const customRows = getCustomOrderLines(sale).map((line) => [
		line.CustomOrderDescription || "-",
		Number(line.Quantity || 0),
		currency(line.PricePerUnit),
		currency(Number(line.Quantity || 0) * Number(line.PricePerUnit || 0)),
	]);

	return [...productRows, ...customRows];
}

function partialPaymentRows(sale) {
	return (sale.partial_payments || []).map((payment) => [
		payment.ReceiptNumber || "-",
		currency(payment.PaidAmount),
		payment.PaymentMethod || "-",
		formatDateTime(payment.DateAdded),
	]);
}

function cumulativePaidAfterReceipt(sale, receiptPayment) {
	const basePayment = sale.payment?.ReceiptNumber
		? Number(sale.payment?.PaidAmount || 0)
		: 0;
	const rows = [...(sale.partial_payments || [])].sort((a, b) => {
		const timeA = new Date(a.DateAdded || 0).getTime();
		const timeB = new Date(b.DateAdded || 0).getTime();
		if (timeA !== timeB) return timeA - timeB;
		return Number(a.ID || 0) - Number(b.ID || 0);
	});

	let paid = basePayment;
	for (const row of rows) {
		paid += Number(row.PaidAmount || 0);
		if (String(row.ID) === String(receiptPayment.ID)) {
			break;
		}
	}

	return paid;
}

export function exportInvoicePdf(sale) {
	if (!sale?.payment?.InvoiceNumber) {
		throw new Error("No invoice number is available for this sale.");
	}

	const doc = new jsPDF();
	const invoiceNumber = sale.payment.InvoiceNumber;
	addBrandingHeader(doc, "Job Order Invoice", `Invoice No. ${invoiceNumber}`);

	doc.setFontSize(10);
	doc.setFont("helvetica", "normal");
	const customerName = sale.customer?.CustomerName || "Walk-In";
	const customerType = sale.customer?.CustomerType || "-";
	const customerContact = sale.customer?.ContactDetails || "-";
	const customerAddress = sale.customer?.Address || "-";
	const dueDate = sale.payment?.PaymentDueDate
		? new Date(sale.payment.PaymentDueDate).toLocaleDateString()
		: "Paid immediately";

	doc.text(`Sale ID: #${sale.ID}`, 14, 58);
	doc.text(`Issued: ${formatDateTime(sale.payment.InvoiceIssuedAt || sale.DateAdded)}`, 105, 58);
	doc.text(`Customer: ${customerName}`, 14, 64);
	doc.text(`Customer Type: ${customerType}`, 105, 64);
	doc.text(`Contact: ${customerContact}`, 14, 70);
	doc.text(`Due Date: ${dueDate}`, 105, 70);
	doc.text(`Address: ${customerAddress}`, 14, 76);
	doc.text(`Cashier: ${sale.user?.FullName || "Unknown"}`, 105, 76);
	doc.text(`Payment Status: ${sale.payment?.PaymentStatus || "-"}`, 14, 82);
	doc.text(`Amount Paid: ${currency(sale.paidAmount)}`, 105, 82);
	doc.text(`Balance Left: ${currency(sale.amountLeft)}`, 14, 88);

	autoTable(doc, {
		startY: 96,
		head: [["Item", "Qty", "Price", "Subtotal"]],
		body: invoiceRows(sale),
		styles: { fontSize: 9, cellPadding: 3 },
		headStyles: { fillColor: [245, 158, 11] },
	});

	let cursorY = doc.lastAutoTable.finalY + 8;
	doc.setFont("helvetica", "bold");
	doc.text(`Total Amount: ${currency(sale.totalAmount)}`, 14, cursorY);
	doc.text(`Paid: ${currency(sale.paidAmount)}`, 105, cursorY);
	cursorY += 6;
	doc.text(`Amount Left: ${currency(sale.amountLeft)}`, 14, cursorY);

	const paymentRows = partialPaymentRows(sale);
	if (paymentRows.length > 0) {
		autoTable(doc, {
			startY: cursorY + 8,
			head: [["Receipt No.", "Amount", "Method", "Date"]],
			body: paymentRows,
			styles: { fontSize: 9, cellPadding: 3 },
			headStyles: { fillColor: [31, 41, 55] },
		});
	}

	doc.save(`${safeFileName(invoiceNumber, "invoice")}.pdf`);
}

export function exportReceiptPdf(sale, receiptPayment = null) {
	const isInitialReceipt = !receiptPayment;
	const receiptNumber = isInitialReceipt
		? sale?.payment?.ReceiptNumber
		: receiptPayment?.ReceiptNumber;

	if (!receiptNumber) {
		throw new Error("No receipt number is available for this payment.");
	}

	const paidAmount = isInitialReceipt
		? Number(sale.payment?.PaidAmount || 0)
		: Number(receiptPayment?.PaidAmount || 0);
	const paidAt = isInitialReceipt
		? sale.payment?.ReceiptIssuedAt || sale.payment?.DateAdded || sale.DateAdded
		: receiptPayment?.ReceiptIssuedAt || receiptPayment?.DateAdded;
	const cumulativePaid = isInitialReceipt
		? paidAmount
		: cumulativePaidAfterReceipt(sale, receiptPayment);
	const balanceAfterPayment = Math.max(0, Number(sale.totalAmount || 0) - cumulativePaid);

	const doc = new jsPDF();
	addBrandingHeader(doc, "Payment Receipt", `Receipt No. ${receiptNumber}`);
	doc.setFont("helvetica", "normal");
	doc.setFontSize(10);
	doc.text(`Invoice No.: ${sale.payment?.InvoiceNumber || "-"}`, 14, 58);
	doc.text(`Sale ID: #${sale.ID}`, 105, 58);
	doc.text(`Customer: ${sale.customer?.CustomerName || "Walk-In"}`, 14, 64);
	doc.text(`Cashier: ${sale.user?.FullName || "Unknown"}`, 105, 64);
	doc.text(`Payment Date: ${formatDateTime(paidAt)}`, 14, 70);
	doc.text(
		`Method: ${isInitialReceipt ? sale.payment?.PaymentMethod || "-" : receiptPayment?.PaymentMethod || "-"}`,
		105,
		70,
	);
	doc.text(`Amount Received: ${currency(paidAmount)}`, 14, 76);
	doc.text(`Balance After Payment: ${currency(balanceAfterPayment)}`, 105, 76);

	autoTable(doc, {
		startY: 86,
		head: [["Item", "Qty", "Price", "Subtotal"]],
		body: invoiceRows(sale),
		styles: { fontSize: 9, cellPadding: 3 },
		headStyles: { fillColor: [245, 158, 11] },
	});

	let cursorY = doc.lastAutoTable.finalY + 8;
	doc.setFont("helvetica", "bold");
	doc.text(`Sale Total: ${currency(sale.totalAmount)}`, 14, cursorY);
	doc.text(`Paid This Receipt: ${currency(paidAmount)}`, 105, cursorY);
	cursorY += 6;
	doc.text(`Paid To Date: ${currency(cumulativePaid)}`, 14, cursorY);
	doc.text(`Remaining Balance: ${currency(balanceAfterPayment)}`, 105, cursorY);

	doc.save(`${safeFileName(receiptNumber, "receipt")}.pdf`);
}
