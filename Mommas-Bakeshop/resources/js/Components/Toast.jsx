import React, { useState, useEffect } from "react";
import { usePage } from "@inertiajs/react";

export default function Toast() {
	const { flash } = usePage().props;
	const [visible, setVisible] = useState(false);
	const [message, setMessage] = useState("");
	const [type, setType] = useState("success"); // 'success' or 'error'

	useEffect(() => {
		if (flash.success) {
			setMessage(flash.success);
			setType("success");
			setVisible(true);
			const timer = setTimeout(() => setVisible(false), 3000);
			return () => clearTimeout(timer);
		} else if (flash.error) {
			setMessage(flash.error);
			setType("error");
			setVisible(true);
			const timer = setTimeout(() => setVisible(false), 3000);
			return () => clearTimeout(timer);
		}
	}, [flash]);

	if (!visible) return null;

	const toastStyles = {
		position: "fixed",
		top: "20px",
		right: "20px",
		padding: "12px 24px",
		borderRadius: "8px",
		color: "#fff",
		fontSize: "14px",
		fontWeight: "500",
		zIndex: 9999,
		boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
		display: "flex",
		alignItems: "center",
		gap: "10px",
		animation: "slideIn 0.3s ease-out",
		backgroundColor: type === "success" ? "#10b981" : "#ef4444",
	};

	return (
		<>
			<style>
				{`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
			</style>
			<div style={toastStyles}>
				{type === "success" ? (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<polyline points="20 6 9 17 4 12"></polyline>
					</svg>
				) : (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<circle cx="12" cy="12" r="10"></circle>
						<line x1="15" y1="9" x2="9" y2="15"></line>
						<line x1="9" y1="9" x2="15" y2="15"></line>
					</svg>
				)}
				{message}
			</div>
		</>
	);
}
