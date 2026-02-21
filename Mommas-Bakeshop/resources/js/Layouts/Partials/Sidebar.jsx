import React, { useState } from "react";
import { Link, usePage } from "@inertiajs/react";

// ─── Navigation Structure (mirrors reference app.js navStructure) ────────────
const NAV_STRUCTURE = [
	{
		section: "Dashboard",
		items: [
			{
				id: "dashboard",
				label: "Overview",
				icon: "📊",
				href: route("dashboard"),
			},
		],
	},
	{
		section: "Point of Sale",
		items: [
			{
				id: "pos.cashier",
				label: "Cashier",
				icon: "🛒",
				href: route("pos.cashier"),
			},
		],
	},
	{
		section: "Inventory",
		items: [
			{
				id: "inventory.levels",
				label: "Inventory Levels",
				icon: "📋",
				href: route("inventory.levels"),
			},
			{
				id: "inventory.products",
				label: "Products & Batches",
				icon: "📦",
				href: route("inventory.products"),
			},
		],
	},
	{
		section: "Administration",
		items: [
			{
				id: "admin.reports",
				label: "Reports",
				icon: "📈",
				href: route("admin.reports"),
			},
			{
				id: "admin.users",
				label: "User Management",
				icon: "👥",
				href: route("admin.users"),
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
	cashier: { label: "Cashier", bg: "rgba(217,119,54,0.12)", color: "#D97736" },
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

	const [isExpanded, setIsExpanded] = useState(true);
	const [collapsedSections, setCollapsedSections] = useState({});

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
						backgroundColor: "#FDEFE6",
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
								color: "#D97736",
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
								e.currentTarget.style.color = "#D97736";
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
						backgroundColor: "#FDEFE6",
						color: "#D97736",
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
									const isActive =
										currentRoute === item.id ||
										route().current(item.id) ||
										route().current(item.id + ".*");

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
					<span style={{ fontSize: "1.1rem" }}>🚪</span>
					{isExpanded && <span>Logout</span>}
				</Link>
			</div>
		</aside>
	);
};

// ─── NavItem sub-component ────────────────────────────────────────────────────
const NavItem = ({ item, isActive, isExpanded }) => {
	const [hovered, setHovered] = useState(false);

	const bgColor = isActive ? "#FDEFE6" : hovered ? "#F9FAFB" : "transparent";

	const textColor = isActive || hovered ? "#D97736" : "#374151";

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
				borderRight: isActive ? "3px solid #D97736" : "3px solid transparent",
				transition: "background 0.15s, color 0.15s, border-color 0.15s",
				whiteSpace: "nowrap",
				overflow: "hidden",
			}}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			title={!isExpanded ? item.label : undefined}
		>
			<span
				style={{
					fontSize: "1.2rem",
					opacity: isActive ? 1 : 0.75,
					flexShrink: 0,
					lineHeight: 1,
				}}
			>
				{item.icon}
			</span>
			{isExpanded && (
				<span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
					{item.label}
				</span>
			)}
		</Link>
	);
};

export default Sidebar;
