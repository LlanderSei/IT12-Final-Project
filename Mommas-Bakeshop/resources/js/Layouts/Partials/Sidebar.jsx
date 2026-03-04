import React, { useEffect, useState } from "react";
import { Link, usePage } from "@inertiajs/react";

const Icon = ({ name, size = 20, style }) => {
	const common = {
		width: size,
		height: size,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: 1.9,
		strokeLinecap: "round",
		strokeLinejoin: "round",
		style,
		"aria-hidden": true,
		focusable: false,
	};

	const icons = {
		dashboard: (
			<svg {...common}>
				<rect x="3" y="3" width="7" height="7" rx="1.5" />
				<rect x="14" y="3" width="7" height="4" rx="1.5" />
				<rect x="14" y="10" width="7" height="11" rx="1.5" />
				<rect x="3" y="13" width="7" height="8" rx="1.5" />
			</svg>
		),
		cashier: (
			<svg {...common}>
				<circle cx="9" cy="20" r="1.5" />
				<circle cx="18" cy="20" r="1.5" />
				<path d="M3 4h2l2.4 10.5a1 1 0 0 0 1 .8h9.8a1 1 0 0 0 1-.8L21 8H7" />
			</svg>
		),
		saleHistory: (
			<svg {...common}>
				<path d="M4 4v16h16" />
				<path d="M8 14l3-3 2 2 4-5" />
			</svg>
		),
		inventory: (
			<svg {...common}>
				<path d="M3 8.5 12 4l9 4.5-9 4.5L3 8.5Z" />
				<path d="M3 8.5V16l9 4 9-4V8.5" />
				<path d="M12 13v7" />
			</svg>
		),
		products: (
			<svg {...common}>
				<rect x="3" y="4" width="8" height="8" rx="1.5" />
				<rect x="13" y="4" width="8" height="8" rx="1.5" />
				<rect x="8" y="14" width="8" height="6" rx="1.5" />
			</svg>
		),
		reports: (
			<svg {...common}>
				<path d="M4 20V10" />
				<path d="M10 20V6" />
				<path d="M16 20v-8" />
				<path d="M22 20V4" />
			</svg>
		),
		users: (
			<svg {...common}>
				<circle cx="9" cy="9" r="3" />
				<path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
				<circle cx="17.5" cy="10" r="2.5" />
				<path d="M14.5 19a4.5 4.5 0 0 1 7 0" />
			</svg>
		),
		audits: (
			<svg {...common}>
				<path d="M8 3h8l4 4v14H8z" />
				<path d="M16 3v4h4" />
				<path d="M11 12h6" />
				<path d="M11 16h6" />
			</svg>
		),
		logout: (
			<svg {...common}>
				<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
				<path d="M10 16l4-4-4-4" />
				<path d="M14 12H3" />
			</svg>
		),
	};

	return icons[name] ?? null;
};

// ─── Navigation Structure (mirrors reference app.js navStructure) ────────────
const NAV_STRUCTURE = [
	{
		section: "Dashboard",
		items: [
			{
				id: "dashboard",
				label: "Overview",
				icon: "dashboard",
				href: route("dashboard"),
			},
		],
	},
	{
		section: "Point of Sale",
		items: [
			{
				id: "pos.cash-sale",
				activeRoutes: ["pos.cash-sale", "pos.consignments", "pos.cashier"],
				label: "Cashier",
				icon: "cashier",
				href: route("pos.cash-sale"),
			},
			{
				id: "pos.sale-history",
				activeRoutes: ["pos.sale-history", "pos.sale-history.pending"],
				label: "Sale History",
				icon: "saleHistory",
				href: route("pos.sale-history"),
			},
		],
	},
	{
		section: "Inventory",
		items: [
			{
				id: "inventory.levels",
				activeRoutes: [
					"inventory.levels",
					"inventory.index",
					"inventory.stock-in",
					"inventory.stock-out",
				],
				label: "Inventory Levels",
				icon: "inventory",
				href: route("inventory.index"),
			},
			{
				id: "inventory.products",
				activeRoutes: ["inventory.products", "products.index", "products.batches"],
				label: "Products & Batches",
				icon: "products",
				href: route("products.index"),
			},
		],
	},
	{
		section: "Administration",
		items: [
			{
				id: "admin.reports",
				activeRoutes: ["admin.reports", "admin.reports.sales", "admin.reports.shrinkage"],
				label: "Reports",
				icon: "reports",
				href: route("admin.reports"),
			},
			{
				id: "admin.users",
				activeRoutes: ["admin.users", "admin.permissions"],
				label: "User Management",
				icon: "users",
				href: route("admin.users"),
			},
			{
				id: "admin.audits",
				label: "Audits",
				icon: "audits",
				href: route("admin.audits"),
			},
		],
	},
];

// ─── Role badge colour variants (matches reference .badge.admin/.cashier/.clerk) ─
const ROLE_BADGE = {
	owner: {
		label: "Owner",
		bg: "rgba(37,99,235,0.12)",
		color: "#2563EB",
	},
	admin: {
		label: "Administrator",
		bg: "rgba(139,92,246,0.12)",
		color: "#7C3AED",
	},
	cashier: { label: "Cashier", bg: "rgb(var(--color-primary) / 0.12)", color: "var(--color-primary-hex)" },
	clerk: {
		label: "Inventory Clerk",
		bg: "rgba(16,185,129,0.12)",
		color: "#10B981",
	},
};

// ─── Sidebar Component ────────────────────────────────────────────────────────
const Sidebar = () => {
	const { auth } = usePage().props;
	const user = auth?.user ?? { name: "Admin User", role: "admin" };

	const [isExpanded, setIsExpanded] = useState(() => {
		if (typeof window === "undefined") return true;
		const saved = window.localStorage.getItem("sidebar:isExpanded");
		return saved === null ? true : saved === "true";
	});
	const [collapsedSections, setCollapsedSections] = useState(() => {
		if (typeof window === "undefined") return {};
		const saved = window.localStorage.getItem("sidebar:collapsedSections");
		if (!saved) return {};
		try {
			return JSON.parse(saved);
		} catch {
			return {};
		}
	});

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem("sidebar:isExpanded", String(isExpanded));
	}, [isExpanded]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(
			"sidebar:collapsedSections",
			JSON.stringify(collapsedSections),
		);
	}, [collapsedSections]);

	const currentRoute = route().current?.() ?? "";
	const roleMeta = ROLE_BADGE[user.role] ?? ROLE_BADGE.admin;
	const avatarInitials = user.name
		? user.name.substring(0, 2).toUpperCase()
		: "MB";

	return (
		<aside
			style={{
				width: isExpanded ? "260px" : "72px",
				minWidth: isExpanded ? "260px" : "72px",
				backgroundColor: "#FFFFFF",
				borderRight: "1px solid #E5E7EB",
				display: "flex",
				flexDirection: "column",
				height: "100vh",
				transition:
					"width 0.3s cubic-bezier(0.4,0,0.2,1), min-width 0.3s cubic-bezier(0.4,0,0.2,1)",
				overflow: "hidden",
				fontFamily: "'Inter', sans-serif",
				zIndex: 20,
				flexShrink: 0,
			}}
		>
			{/* ── Header ── */}
			<div
				style={{
					height: "70px",
					display: "flex",
					alignItems: "center",
					padding: "0 1.25rem",
					borderBottom: "1px solid #E5E7EB",
					gap: "0.75rem",
					justifyContent: isExpanded ? "flex-start" : "center",
					flexShrink: 0,
				}}
			>
				{/* Logo Circle */}
				<div
					style={{
						width: "38px",
						height: "38px",
						minWidth: "38px",
						borderRadius: "9999px",
						backgroundColor: "rgb(var(--color-primary-soft))",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontSize: "1.2rem",
						boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
						cursor: "pointer",
						transition: "transform 0.2s",
					}}
					onClick={() => setIsExpanded(!isExpanded)}
					title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
				>
					🥐
				</div>

				{/* Brand name + toggle button */}
				{isExpanded && (
					<>
						<span
							style={{
								fontFamily: "'Outfit', sans-serif",
								fontWeight: 700,
								fontSize: "0.95rem",
								color: "var(--color-primary-hex)",
								flex: 1,
								lineHeight: 1.25,
								display: "flex",
								flexDirection: "column",
							}}
						>
							<span>Momma's</span>
							<span>Bakeshop</span>
						</span>

						{/* Collapse chevron */}
						<button
							onClick={() => setIsExpanded(false)}
							title="Collapse sidebar"
							style={{
								background: "none",
								border: "none",
								cursor: "pointer",
								padding: "4px",
								borderRadius: "6px",
								color: "#6B7280",
								display: "flex",
								alignItems: "center",
								transition: "background 0.2s, color 0.2s",
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.backgroundColor = "#F9FAFB";
								e.currentTarget.style.color = "var(--color-primary-hex)";
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.backgroundColor = "transparent";
								e.currentTarget.style.color = "#6B7280";
							}}
						>
							{/* Left-arrow chevron */}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<polyline points="15 18 9 12 15 6" />
							</svg>
						</button>
					</>
				)}
			</div>

			{/* ── User Profile Widget ── */}
			<div
				style={{
					padding: isExpanded ? "1.25rem 1.5rem" : "1.25rem 0",
					display: "flex",
					alignItems: "center",
					gap: "0.875rem",
					borderBottom: "1px solid #E5E7EB",
					justifyContent: isExpanded ? "flex-start" : "center",
					flexShrink: 0,
				}}
			>
				{/* Avatar */}
				<div
					style={{
						width: "42px",
						height: "42px",
						minWidth: "42px",
						borderRadius: "9999px",
						backgroundColor: "rgb(var(--color-primary-soft))",
						color: "var(--color-primary-hex)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontFamily: "'Outfit', sans-serif",
						fontWeight: 700,
						fontSize: "1rem",
					}}
				>
					{avatarInitials}
				</div>

				{/* User info — hidden when collapsed */}
				{isExpanded && (
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "0.2rem",
							overflow: "hidden",
						}}
					>
						<span
							style={{
								fontWeight: 600,
								fontSize: "0.9rem",
								color: "#1F2937",
								whiteSpace: "nowrap",
								overflow: "hidden",
								textOverflow: "ellipsis",
							}}
						>
							{user.name}
						</span>
						<span
							style={{
								display: "inline-flex",
								alignItems: "center",
								width: "fit-content",
								padding: "0.1rem 0.5rem",
								borderRadius: "9999px",
								fontSize: "0.7rem",
								fontWeight: 600,
								textTransform: "uppercase",
								letterSpacing: "0.04em",
								backgroundColor: roleMeta.bg,
								color: roleMeta.color,
								whiteSpace: "nowrap",
							}}
						>
							{roleMeta.label}
						</span>
					</div>
				)}
			</div>

			{/* ── Navigation ── */}
			<nav
				style={{
					flex: 1,
					overflowY: "auto",
					overflowX: "hidden",
					padding: "0.75rem 0",
				}}
			>
				{NAV_STRUCTURE.map((section) => {
					const isSectionCollapsed = collapsedSections[section.section];

					return (
						<div key={section.section} style={{ marginBottom: "1.25rem" }}>
							{/* Section title */}
							{isExpanded && (
								<div
									style={{
										padding: "0 1.5rem",
										fontSize: "0.7rem",
										fontWeight: 700,
										textTransform: "uppercase",
										letterSpacing: "0.06em",
										color: "#9CA3AF",
										marginBottom: "0.35rem",
										fontFamily: "'Outfit', sans-serif",
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										cursor: "pointer",
									}}
									onClick={() =>
										setCollapsedSections((prev) => ({
											...prev,
											[section.section]: !prev[section.section],
										}))
									}
									title={isSectionCollapsed ? "Expand group" : "Collapse group"}
								>
									<span>{section.section}</span>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										style={{
											transform: isSectionCollapsed
												? "rotate(-90deg)"
												: "rotate(0deg)",
											transition: "transform 0.2s",
										}}
									>
										<polyline points="6 9 12 15 18 9" />
									</svg>
								</div>
							)}

							{/* Nav items */}
							<div
								style={{
									display: isExpanded && isSectionCollapsed ? "none" : "block",
								}}
							>
								{section.items.map((item) => {
									const activeRoutes = item.activeRoutes || [item.id];
									const isActive = activeRoutes.some(
										(routeName) =>
											currentRoute === routeName ||
											route().current(routeName) ||
											route().current(routeName + ".*"),
									);

									return (
										<NavItem
											key={item.id}
											item={item}
											isActive={isActive}
											isExpanded={isExpanded}
										/>
									);
								})}
							</div>
						</div>
					);
				})}
			</nav>

			{/* ── Footer / Logout ── */}
			<div
				style={{
					padding: isExpanded ? "1rem 1.25rem" : "1rem 0",
					borderTop: "1px solid #E5E7EB",
					display: "flex",
					justifyContent: isExpanded ? "flex-start" : "center",
					flexShrink: 0,
				}}
			>
				<Link
					href={route("logout")}
					method="post"
					as="button"
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "0.6rem",
						padding: isExpanded ? "0.5rem 0.75rem" : "0.5rem",
						borderRadius: "8px",
						background: "none",
						border: "none",
						cursor: "pointer",
						color: "#EF4444",
						fontSize: "0.875rem",
						fontWeight: 500,
						fontFamily: "'Inter', sans-serif",
						transition: "background 0.2s",
						width: isExpanded ? "100%" : "auto",
					}}
					onMouseEnter={(e) =>
						(e.currentTarget.style.backgroundColor = "#FEE2E2")
					}
					onMouseLeave={(e) =>
						(e.currentTarget.style.backgroundColor = "transparent")
					}
					title="Logout"
				>
					<Icon name="logout" size={19} />
					{isExpanded && <span>Logout</span>}
				</Link>
			</div>
		</aside>
	);
};

// ─── NavItem sub-component ────────────────────────────────────────────────────
const NavItem = ({ item, isActive, isExpanded }) => {
	const [hovered, setHovered] = useState(false);

	const bgColor = isActive ? "rgb(var(--color-primary-soft))" : hovered ? "#F9FAFB" : "transparent";

	const textColor = isActive || hovered ? "var(--color-primary-hex)" : "#374151";

	return (
		<Link
			href={item.href}
			style={{
				display: "flex",
				alignItems: "center",
				gap: "0.75rem",
				padding: isExpanded ? "0.6rem 1.5rem" : "0.6rem 0",
				justifyContent: isExpanded ? "flex-start" : "center",
				backgroundColor: bgColor,
				color: textColor,
				textDecoration: "none",
				fontSize: "0.9rem",
				fontWeight: 500,
				cursor: "pointer",
				borderRight: isActive ? "3px solid var(--color-primary-hex)" : "3px solid transparent",
				transition: "background 0.15s, color 0.15s, border-color 0.15s",
				whiteSpace: "nowrap",
				overflow: "hidden",
			}}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			title={!isExpanded ? item.label : undefined}
		>
			<Icon
				name={item.icon}
				size={20}
				style={{
					opacity: isActive ? 1 : 0.75,
					flexShrink: 0,
					lineHeight: 1,
				}}
			/>
			{isExpanded && (
				<span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
					{item.label}
				</span>
			)}
		</Link>
	);
};

export default Sidebar;





