import { Head, useForm } from "@inertiajs/react";
import { useEffect } from "react";

export default function Login({ status }) {
	const { data, setData, post, processing, errors, reset } = useForm({
		email: "",
		password: "",
		remember: false,
	});

	useEffect(() => {
		if (typeof window === "undefined") return;
		const savedTheme = window.localStorage.getItem("site:theme");
		const root = window.document.documentElement;
		root.classList.remove("theme-dark", "theme-light");
		root.classList.add(savedTheme === "dark" ? "theme-dark" : "theme-light");
	}, []);

	const submit = (e) => {
		e.preventDefault();
		post(route("login"), {
			onFinish: () => reset("password"),
		});
	};

	return (
		<>
			<Head title="Login - Momma's Bakeshop" />

			<div className="auth-login-page">
				<div className="auth-login-overlay" />

				<div className="auth-login-card">
					<div className="auth-login-brand-row">
						<div className="auth-login-logo-circle">MB</div>
						<div className="auth-login-brand-text">
							<span className="auth-login-brand-name">Momma's</span>
							<span className="auth-login-brand-name">Bakeshop</span>
						</div>
					</div>

					<h1 className="auth-login-heading">Welcome back</h1>
					<p className="auth-login-subheading">
						Sign in to your account to continue
					</p>

					{status && <div className="auth-login-status">{status}</div>}

					<form onSubmit={submit} className="auth-login-form">
						<div className="auth-login-field-group">
							<label htmlFor="login-email" className="auth-login-label">
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
								className="auth-login-input"
							/>
							{errors.email && (
								<p className="auth-login-error">{errors.email}</p>
							)}
						</div>

						<div className="auth-login-field-group">
							<label htmlFor="login-password" className="auth-login-label">
								Password
							</label>
							<input
								id="login-password"
								type="password"
								name="password"
								value={data.password}
								autoComplete="current-password"
								onChange={(e) => setData("password", e.target.value)}
								className="auth-login-input"
							/>
							{errors.password && (
								<p className="auth-login-error">{errors.password}</p>
							)}
						</div>

						<div className="auth-login-remember-row">
							<label className="auth-login-checkbox-label">
								<input
									type="checkbox"
									checked={data.remember}
									onChange={(e) => setData("remember", e.target.checked)}
									className="auth-login-checkbox"
								/>
								<span className="auth-login-checkbox-text">Remember me</span>
							</label>
						</div>

						<button
							type="submit"
							disabled={processing}
							className="auth-login-button"
						>
							{processing ? "Signing in..." : "Sign in"}
						</button>
					</form>
				</div>

				<p className="auth-login-footer">
					(c) 2026 Momma's Bakeshop. All rights reserved.
				</p>
			</div>
		</>
	);
}
