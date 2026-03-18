const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

export const PAYMENT_METHODS = ["Cash", "GCash", "Bank Transfer", "Card"];

export function computePaymentFlow({
	paymentSelection = "pay_now",
	paymentMethod = "Cash",
	paidAmount = "",
	amountDue = 0,
}) {
	const normalizedDue = roundMoney(amountDue);
	if (paymentSelection === "pay_later") {
		return {
			enteredAmount: 0,
			appliedAmount: 0,
			change: 0,
			remainingAmount: normalizedDue,
			effectivePaymentType: "partial",
			requiresDueDate: true,
			amountError: "",
		};
	}

	const rawValue = String(paidAmount ?? "").trim();
	if (rawValue === "") {
		return {
			enteredAmount: 0,
			appliedAmount: 0,
			change: 0,
			remainingAmount: normalizedDue,
			effectivePaymentType: "partial",
			requiresDueDate: true,
			amountError: "Amount paid is required.",
		};
	}

	const enteredAmount = roundMoney(rawValue);
	if (!Number.isFinite(enteredAmount) || enteredAmount <= 0) {
		return {
			enteredAmount: 0,
			appliedAmount: 0,
			change: 0,
			remainingAmount: normalizedDue,
			effectivePaymentType: "partial",
			requiresDueDate: true,
			amountError: "Amount paid must be greater than 0.",
		};
	}

	if (paymentMethod !== "Cash" && enteredAmount > normalizedDue) {
		return {
			enteredAmount,
			appliedAmount: enteredAmount,
			change: 0,
			remainingAmount: 0,
			effectivePaymentType: "full",
			requiresDueDate: false,
			amountError: "Amount paid cannot exceed the amount due for non-cash payments.",
		};
	}

	const appliedAmount =
		paymentMethod === "Cash"
			? roundMoney(Math.min(enteredAmount, normalizedDue))
			: enteredAmount;
	const change =
		paymentMethod === "Cash"
			? roundMoney(Math.max(0, enteredAmount - normalizedDue))
			: 0;
	const remainingAmount = roundMoney(Math.max(0, normalizedDue - appliedAmount));
	const effectivePaymentType = remainingAmount <= 0 ? "full" : "partial";

	return {
		enteredAmount,
		appliedAmount,
		change,
		remainingAmount,
		effectivePaymentType,
		requiresDueDate: remainingAmount > 0,
		amountError: "",
	};
}

export function getReceiptAmountReceived(payment) {
	if (!payment) return 0;
	if (payment.TenderedAmount !== null && payment.TenderedAmount !== undefined) {
		return roundMoney(payment.TenderedAmount);
	}
	return roundMoney(Number(payment.PaidAmount || 0) + Number(payment.Change || 0));
}
