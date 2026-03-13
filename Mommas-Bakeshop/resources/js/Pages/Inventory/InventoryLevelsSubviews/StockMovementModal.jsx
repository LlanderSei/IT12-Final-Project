import React from "react";
import StockInMovementModal, { createDefaultStockInDraft } from "./StockInMovementModal";
import StockOutMovementModal, { createDefaultStockOutDraft } from "./StockOutMovementModal";

export { createDefaultStockInDraft, createDefaultStockOutDraft };

export default function StockMovementModal(props) {
	if (props.mode === "in") {
		return <StockInMovementModal {...props} />;
	}
	return <StockOutMovementModal {...props} />;
}
