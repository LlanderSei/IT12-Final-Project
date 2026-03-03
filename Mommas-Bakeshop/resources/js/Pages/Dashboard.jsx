import Sidebar from "@/Layouts/Partials/Sidebar";
import { Head } from "@inertiajs/react";

export default function Dashboard() {
	return (
		<div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
			<Head title="Dashboard" />

			{/* Sidebar */}
			<Sidebar />

			{/* Main Content */}
			<div style={{ flex: 1, overflowY: "auto", backgroundColor: "#F9FAFB" }}>
				{/* Top Header */}
				<header
					style={{
						height: "70px",
						backgroundColor: "#FFFFFF",
						borderBottom: "1px solid #E5E7EB",
						display: "flex",
						alignItems: "center",
						padding: "0 2rem",
						flexShrink: 0,
					}}
				>
					<h2
						style={{
							fontFamily: "'Outfit', sans-serif",
							fontWeight: 600,
							fontSize: "1.25rem",
							color: "#1F2937",
						}}
					>
						Dashboard
					</h2>
				</header>

				{/* Content Body */}
				<main style={{ padding: "2rem" }}>
					<div
						style={{
							background: "linear-gradient(135deg, var(--color-primary-hex), #E5B25D)",
							borderRadius: "0.75rem",
							padding: "2rem",
							color: "white",
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: "2rem",
							boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
						}}
					>
						<div>
							<h1
								style={{
									color: "white",
									fontFamily: "'Outfit', sans-serif",
									marginBottom: "0.5rem",
								}}
							>
								Welcome back!
							</h1>
							<p style={{ opacity: 0.9 }}>
								Here's what's happening at Momma's Bakeshop today.
							</p>
						</div>
						<span style={{ fontSize: "4rem", opacity: 0.8 }}>🧁</span>
					</div>

					<div
						style={{
							backgroundColor: "#FFFFFF",
							borderRadius: "0.75rem",
							border: "1px solid #E5E7EB",
							padding: "1.5rem",
							boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
						}}
					>
						<p style={{ color: "#6B7280", fontFamily: "'Inter', sans-serif" }}>
							You're logged in! Use the sidebar to navigate.
						</p>
					</div>
				</main>
			</div>
		</div>
	);
}


