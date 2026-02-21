import { Head, useForm } from "@inertiajs/react";
import { useState } from "react";

export default function Login({ status }) {
	const { data, setData, post, processing, errors, reset } = useForm({
		email: "",
		password: "",
		remember: false,
	});

	const [focusedField, setFocusedField] = useState(null);

	const submit = (e) => {
		e.preventDefault();
		post(route("login"), {
			onFinish: () => reset("password"),
		});
	};

	return (
		<>
			<Head title="Login — Momma's Bakeshop" />

			<div style={styles.page}>
				{/* Card */}
				<div style={styles.card}>
					{/* Logo & Brand */}
					<div style={styles.brandRow}>
						<div style={styles.logoCircle}>🥐</div>
						<div style={styles.brandText}>
							<span style={styles.brandName}>Momma's</span>
							<span style={styles.brandName}>Bakeshop</span>
						</div>
					</div>

					<h1 style={styles.heading}>Welcome back</h1>
					<p style={styles.subheading}>Sign in to your account to continue</p>

					{/* Status flash message */}
					{status && <div style={styles.statusMsg}>{status}</div>}

					<form onSubmit={submit} style={styles.form}>
						{/* Email */}
						<div style={styles.fieldGroup}>
							<label htmlFor="login-email" style={styles.label}>
								Email
							</label>
							<input
								id="login-email"
								type="email"
								name="email"
								value={data.email}
								autoComplete="username"
								autoFocus
								onChange={(e) => setData("email", e.target.value)}
								onFocus={() => setFocusedField("email")}
								onBlur={() => setFocusedField(null)}
								style={{
									...styles.input,
									borderColor: focusedField === "email" ? "#D97736" : "#D1D5DB",
									boxShadow:
										focusedField === "email"
											? "0 0 0 3px rgba(217,119,54,0.15)"
											: "none",
								}}
							/>
							{errors.email && <p style={styles.error}>{errors.email}</p>}
						</div>

						{/* Password */}
						<div style={styles.fieldGroup}>
							<label htmlFor="login-password" style={styles.label}>
								Password
							</label>
							<input
								id="login-password"
								type="password"
								name="password"
								value={data.password}
								autoComplete="current-password"
								onChange={(e) => setData("password", e.target.value)}
								onFocus={() => setFocusedField("password")}
								onBlur={() => setFocusedField(null)}
								style={{
									...styles.input,
									borderColor:
										focusedField === "password" ? "#D97736" : "#D1D5DB",
									boxShadow:
										focusedField === "password"
											? "0 0 0 3px rgba(217,119,54,0.15)"
											: "none",
								}}
							/>
							{errors.password && <p style={styles.error}>{errors.password}</p>}
						</div>

						{/* Remember me */}
						<div style={styles.rememberRow}>
							<label style={styles.checkboxLabel}>
								<input
									type="checkbox"
									checked={data.remember}
									onChange={(e) => setData("remember", e.target.checked)}
									style={styles.checkbox}
								/>
								<span style={styles.checkboxText}>Remember me</span>
							</label>
						</div>

						{/* Submit */}
						<button
							type="submit"
							disabled={processing}
							style={{
								...styles.button,
								opacity: processing ? 0.65 : 1,
								cursor: processing ? "not-allowed" : "pointer",
							}}
							onMouseEnter={(e) => {
								if (!processing)
									e.currentTarget.style.backgroundColor = "#B8622A";
							}}
							onMouseLeave={(e) => {
								if (!processing)
									e.currentTarget.style.backgroundColor = "#D97736";
							}}
						>
							{processing ? "Signing in…" : "Sign in"}
						</button>
					</form>
				</div>

				{/* Footer */}
				<p style={styles.footer}>
					© 2026 Momma's Bakeshop. All rights reserved.
				</p>
			</div>
		</>
	);
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
	page: {
		minHeight: "100vh",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#FFF8F3",
		fontFamily: "'Inter', sans-serif",
		padding: "1rem",
	},
	card: {
		width: "100%",
		maxWidth: "420px",
		backgroundColor: "#FFFFFF",
		borderRadius: "16px",
		border: "1px solid #E5E7EB",
		boxShadow: "0 4px 24px rgba(217,119,54,0.08), 0 1px 4px rgba(0,0,0,0.04)",
		padding: "2.5rem 2rem 2rem",
	},
	brandRow: {
		display: "flex",
		alignItems: "center",
		gap: "0.75rem",
		marginBottom: "1.75rem",
		justifyContent: "center",
	},
	logoCircle: {
		width: "48px",
		height: "48px",
		borderRadius: "9999px",
		backgroundColor: "#FDEFE6",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		fontSize: "1.5rem",
		boxShadow: "0 2px 6px rgba(217,119,54,0.12)",
	},
	brandText: {
		display: "flex",
		flexDirection: "column",
		lineHeight: 1.2,
	},
	brandName: {
		fontFamily: "'Outfit', sans-serif",
		fontWeight: 700,
		fontSize: "1.15rem",
		color: "#D97736",
	},
	heading: {
		fontFamily: "'Outfit', sans-serif",
		fontWeight: 700,
		fontSize: "1.5rem",
		color: "#1F2937",
		textAlign: "center",
		margin: "0 0 0.25rem",
	},
	subheading: {
		fontSize: "0.875rem",
		color: "#6B7280",
		textAlign: "center",
		margin: "0 0 1.75rem",
	},
	statusMsg: {
		marginBottom: "1rem",
		padding: "0.6rem 0.75rem",
		borderRadius: "8px",
		backgroundColor: "rgba(16,185,129,0.08)",
		color: "#059669",
		fontSize: "0.85rem",
		fontWeight: 500,
		textAlign: "center",
	},
	form: {
		display: "flex",
		flexDirection: "column",
		gap: "1.1rem",
	},
	fieldGroup: {
		display: "flex",
		flexDirection: "column",
		gap: "0.35rem",
	},
	label: {
		fontSize: "0.8rem",
		fontWeight: 600,
		color: "#374151",
		letterSpacing: "0.02em",
	},
	input: {
		width: "100%",
		padding: "0.65rem 0.85rem",
		borderRadius: "10px",
		border: "1px solid #D1D5DB",
		fontSize: "0.9rem",
		color: "#1F2937",
		outline: "none",
		transition: "border-color 0.2s, box-shadow 0.2s",
		fontFamily: "'Inter', sans-serif",
		boxSizing: "border-box",
	},
	error: {
		fontSize: "0.78rem",
		color: "#EF4444",
		margin: 0,
	},
	rememberRow: {
		display: "flex",
		alignItems: "center",
	},
	checkboxLabel: {
		display: "flex",
		alignItems: "center",
		gap: "0.5rem",
		cursor: "pointer",
	},
	checkbox: {
		accentColor: "#D97736",
		width: "16px",
		height: "16px",
		cursor: "pointer",
	},
	checkboxText: {
		fontSize: "0.85rem",
		color: "#6B7280",
	},
	button: {
		width: "100%",
		padding: "0.7rem",
		borderRadius: "10px",
		border: "none",
		backgroundColor: "#D97736",
		color: "#FFFFFF",
		fontFamily: "'Inter', sans-serif",
		fontWeight: 600,
		fontSize: "0.95rem",
		transition: "background-color 0.2s",
		marginTop: "0.25rem",
	},
	footer: {
		marginTop: "1.5rem",
		fontSize: "0.75rem",
		color: "#9CA3AF",
	},
};
