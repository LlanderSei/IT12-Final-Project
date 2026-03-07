export const PRODUCTS_BATCHES_PENDING_ACTION_KEY =
	"inventory.products-batches.pending-footer-action.v1";

export const PRODUCTS_BATCHES_FOOTER_ACTIONS = {
	ADD_PRODUCT: "add-product",
	RECORD_BATCH: "record-batch",
	MODIFY_CATEGORIES: "modify-categories",
};

export const setPendingProductsBatchesFooterAction = (action) => {
	if (typeof window === "undefined") return;
	try {
		window.sessionStorage.setItem(
			PRODUCTS_BATCHES_PENDING_ACTION_KEY,
			String(action || ""),
		);
	} catch (_error) {}
};

export const getPendingProductsBatchesFooterAction = () => {
	if (typeof window === "undefined") return null;
	try {
		return window.sessionStorage.getItem(
			PRODUCTS_BATCHES_PENDING_ACTION_KEY,
		);
	} catch (_error) {
		return null;
	}
};

export const clearPendingProductsBatchesFooterAction = () => {
	if (typeof window === "undefined") return;
	try {
		window.sessionStorage.removeItem(
			PRODUCTS_BATCHES_PENDING_ACTION_KEY,
		);
	} catch (_error) {}
};
