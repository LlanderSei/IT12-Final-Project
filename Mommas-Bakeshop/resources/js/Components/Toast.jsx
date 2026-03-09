import React, { useEffect, useState } from "react";
import { usePage } from "@inertiajs/react";

const TOAST_DURATION_MS = 15000;
let toastQueue = [];
let toastListeners = new Set();
let toastTimeouts = new Map();
let lastFlashKey = null;

const notifyListeners = () => {
	toastListeners.forEach((listener) => listener([...toastQueue]));
};

const removeToastFromStore = (id) => {
	const timeout = toastTimeouts.get(id);
	if (timeout) {
		window.clearTimeout(timeout);
		toastTimeouts.delete(id);
	}

	if (!toastQueue.some((toast) => toast.id === id)) {
		return;
	}

	toastQueue = toastQueue.filter((toast) => toast.id !== id);
	notifyListeners();
};

const pushToastToStore = ({ type = "success", message = "", messages = [] }) => {
	const normalizedMessages = (messages || [])
		.flatMap((value) => (Array.isArray(value) ? value : [value]))
		.filter(Boolean)
		.map(String);
	const normalizedMessage = String(message || "");

	if (!normalizedMessage && normalizedMessages.length === 0) {
		return;
	}

	const id =
		typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
			? crypto.randomUUID()
			: `${Date.now()}-${Math.random().toString(36).slice(2)}`;

	toastQueue = [
		...toastQueue,
		{
			id,
			type: type === "success" ? "success" : "error",
			message: normalizedMessage,
			messages: normalizedMessages,
			expiresAt: Date.now() + TOAST_DURATION_MS,
		},
	];
	notifyListeners();

	const timeout = window.setTimeout(
		() => removeToastFromStore(id),
		TOAST_DURATION_MS,
	);
	toastTimeouts.set(id, timeout);
};

const subscribeToToasts = (listener) => {
	toastListeners.add(listener);
	listener([...toastQueue]);
	return () => {
		toastListeners.delete(listener);
	};
};

export default function Toast() {
	const { flash } = usePage().props;
	const [toasts, setToasts] = useState(() => [...toastQueue]);

	useEffect(() => subscribeToToasts(setToasts), []);

	useEffect(() => {
		const flashKey = JSON.stringify({
			success: flash.success || null,
			error: flash.error || null,
		});

		if (flashKey === lastFlashKey) {
			return;
		}

		lastFlashKey = flashKey;

		if (flash.success) {
			pushToastToStore({ type: "success", message: flash.success });
		}
		if (flash.error) {
			pushToastToStore({ type: "error", message: flash.error });
		}
	}, [flash]);

	useEffect(() => {
		const handler = (event) => {
			const detail = event?.detail || {};
			pushToastToStore({
				type: detail.type,
				message: detail.message,
				messages: detail.messages,
			});
		};

		window.addEventListener("app-toast", handler);
		return () => window.removeEventListener("app-toast", handler);
	}, []);

	if (toasts.length === 0) return null;

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
			<div
				style={{
					position: "fixed",
					top: "20px",
					right: "20px",
					zIndex: 9999,
					display: "flex",
					flexDirection: "column",
					gap: "12px",
					maxWidth: "420px",
					width: "min(420px, calc(100vw - 32px))",
				}}
			>
				{toasts.map((toast) => {
					const isSuccess = toast.type === "success";
					return (
						<div
							key={toast.id}
							style={{
								padding: "12px 16px",
								borderRadius: "8px",
								color: "#fff",
								fontSize: "14px",
								fontWeight: "500",
								boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
								display: "flex",
								alignItems: "flex-start",
								gap: "10px",
								animation: "slideIn 0.3s ease-out",
								backgroundColor: isSuccess ? "#10b981" : "#ef4444",
							}}
						>
							<div style={{ marginTop: "2px", flexShrink: 0 }}>
								{isSuccess ? (
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
							</div>
							<div style={{ flex: 1, minWidth: 0 }}>
								{toast.messages.length > 0 ? (
									<div>
										<div style={{ fontWeight: 700, marginBottom: "4px" }}>
											Please fix the following:
										</div>
										<ul style={{ margin: 0, paddingLeft: "18px" }}>
											{toast.messages.map((msg, index) => (
												<li key={index}>{msg}</li>
											))}
										</ul>
									</div>
								) : (
									<div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
										{toast.message}
									</div>
								)}
							</div>
							<button
								type="button"
								onClick={() => removeToastFromStore(toast.id)}
								aria-label="Close toast"
								style={{
									background: "transparent",
									border: "none",
									color: "#fff",
									cursor: "pointer",
									fontSize: "18px",
									lineHeight: 1,
									padding: 0,
									marginTop: "1px",
									flexShrink: 0,
								}}
							>
								x
							</button>
						</div>
					);
				})}
			</div>
		</>
	);
}
