import React, { useEffect, useMemo, useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import usePermissions from "@/hooks/usePermissions";
import Modal from "@/Components/Modal";
import { countOverdueDeliveries } from "@/utils/jobOrders";
import {
	ChevronLeft,
	ChevronDown,
	LayoutDashboard,
	ShoppingCart,
	ChartSpline,
	Package,
	Boxes,
	ChartColumn,
	Database,
	Users,
	FileText,
	LogOut,
	Croissant,
	Sun,
	Moon,
} from "lucide-react";

const Icon = ({ name, size = 20, style }) => {
	const icons = {
		dashboard: LayoutDashboard,
		cashier: ShoppingCart,
		jobOrders: FileText,
		saleHistory: ChartSpline,
		inventory: Package,
		products: Boxes,
		reports: ChartColumn,
		database: Database,
		users: Users,
		audits: FileText,
		logout: LogOut,
	};

	const LucideIcon = icons[name];
	if (!LucideIcon) return null;
	return (
		<LucideIcon
			size={size}
			style={style}
			aria-hidden="true"
			focusable="false"
			strokeWidth={1.9}
		/>
	);
};

const DEFAULT_ROLE_COLOR = "#6B7280";

const rgbaFromHex = (hex, alpha = 0.12) => {
	if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) {
		return `rgba(107,114,128,${alpha})`;
	}

	const normalized = hex.replace("#", "");
	const red = parseInt(normalized.slice(0, 2), 16);
	const green = parseInt(normalized.slice(2, 4), 16);
	const blue = parseInt(normalized.slice(4, 6), 16);
	return `rgba(${red},${green},${blue},${alpha})`;
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
				activeRoutes: ["pos.cash-sale", "pos.cashier"],
				label: "Cashier",
				icon: "cashier",
				href: route("pos.cash-sale"),
				requiredPermissions: ["CanViewCashier"],
			},
			{
				id: "pos.job-orders",
				activeRoutes: [
					"pos.job-orders",
					"pos.job-orders.pending",
					"pos.job-orders.history",
				],
				label: "Job Orders",
				icon: "jobOrders",
				href: route("pos.job-orders"),
				requiredPermissions: [
					"CanViewJobOrders",
					"CanViewPendingJobOrders",
					"CanViewJobOrdersHistory",
				],
			},
			{
				id: "pos.sale-history",
				activeRoutes: ["pos.sale-history", "pos.sale-history.pending"],
				label: "Sale History",
				icon: "saleHistory",
				href: route("pos.sale-history"),
				requiredPermissions: [
					"CanViewSalesHistory",
					"CanViewSalesHistorySales",
					"CanViewSalesHistoryPendingPayments",
				],
			},
			{
				id: "pos.customers",
				activeRoutes: ["pos.customers"],
				label: "Customers",
				icon: "users",
				href: route("pos.customers"),
				requiredPermissions: ["CanViewCustomers"],
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
					"inventory.snapshots",
				],
				label: "Inventory Levels",
				icon: "inventory",
				href: route("inventory.index"),
				requiredPermissions: ["CanViewInventoryLevels"],
			},
			{
				id: "inventory.shrinkage-history",
				activeRoutes: ["inventory.shrinkage-history"],
				label: "Shrinkage History",
				icon: "audits",
				href: route("inventory.shrinkage-history"),
				requiredPermissions: ["CanViewShrinkageHistory"],
			},
			{
				id: "inventory.products",
				activeRoutes: [
					"inventory.products",
					"products.index",
					"products.batches",
					"products.snapshots",
				],
				label: "Products & Batches",
				icon: "products",
				href: route("products.index"),
				requiredPermissions: ["CanViewProductsAndBatches"],
			},
		],
	},
	{
		section: "Administration",
		items: [
			{
				id: "admin.reports",
				activeRoutes: ["admin.reports", "admin.reports.full-breakdown"],
				label: "Reports",
				icon: "reports",
				href: route("admin.reports"),
				requiredPermissions: [
					"CanViewReportsOverview",
					"CanViewReportsFullBreakdown",
				],
			},
			{
				id: "admin.users",
				activeRoutes: [
					"admin.users",
					"admin.permissions",
					"admin.roles",
					"admin.permission-groups",
				],
				label: "User Management",
				icon: "users",
				href: route("admin.users"),
				requiredPermissions: [
					"CanViewUserManagementUsers",
					"CanViewUserManagementPermissions",
					"CanViewUserManagementRoles",
					"CanViewUserManagementPermissionGroups",
				],
			},
			{
				id: "admin.database",
				activeRoutes: [
					"admin.database",
					"admin.database.connections",
					"admin.database.maintenance-jobs",
					"admin.database.schema",
					"admin.database.data-transfer",
					"admin.database.retention",
				],
				label: "Database",
				icon: "database",
				href: route("admin.database"),
				requiredPermissions: [
					"CanViewDatabaseBackups",
					"CanViewDatabaseConnections",
					"CanViewDatabaseMaintenanceJobs",
					"CanViewDatabaseSchemaReport",
					"CanViewDatabaseDataTransfer",
					"CanViewDatabaseRetentionCleanup",
				],
			},
			{
				id: "admin.audits",
				label: "Audits",
				icon: "audits",
				href: route("admin.audits"),
				requiredPermissions: ["CanViewAudits"],
			},
		],
	},
];

// ─── Role badge colour variants (matches reference .badge.admin/.cashier/.clerk) ─
// ─── Sidebar Component ────────────────────────────────────────────────────────
const Sidebar = () => {
	const pageProps = usePage().props;
	const { auth } = pageProps;
	const user = auth?.user ?? { name: "Admin User", role: "admin" };
	const { can, canAny } = usePermissions();
	const hasAnyPermission = (requiredPermissions = []) => {
		if (!requiredPermissions.length) return true;
		return canAny(requiredPermissions);
	};
	const canViewSalesHistoryNav =
		can("CanViewSalesHistory") &&
		(can("CanViewSalesHistorySales") ||
			can("CanViewSalesHistoryPendingPayments"));
	const canViewReportsOverview = can("CanViewReportsOverview");
	const canViewReportsFullBreakdown = can("CanViewReportsFullBreakdown");
	const canViewReportsNav =
		canViewReportsOverview || canViewReportsFullBreakdown;
	const canViewUserMgmtUsers = can("CanViewUserManagementUsers");
	const canViewUserMgmtPermissions = can("CanViewUserManagementPermissions");
	const canViewUserMgmtRoles = can("CanViewUserManagementRoles");
	const canViewUserMgmtPermissionGroups = can(
		"CanViewUserManagementPermissionGroups",
	);
	const canViewUserMgmtNav =
		canViewUserMgmtUsers ||
		canViewUserMgmtPermissions ||
		canViewUserMgmtRoles ||
		canViewUserMgmtPermissionGroups;
	const canViewDatabaseBackups = can("CanViewDatabaseBackups");
	const canViewDatabaseConnections = can("CanViewDatabaseConnections");
	const canViewDatabaseMaintenanceJobs = can("CanViewDatabaseMaintenanceJobs");
	const canViewDatabaseSchemaReport = can("CanViewDatabaseSchemaReport");
	const canViewDatabaseDataTransfer = can("CanViewDatabaseDataTransfer");
	const canViewDatabaseRetentionCleanup = can(
		"CanViewDatabaseRetentionCleanup",
	);
	const canViewDatabaseNav =
		canViewDatabaseBackups ||
		canViewDatabaseConnections ||
		canViewDatabaseMaintenanceJobs ||
		canViewDatabaseSchemaReport ||
		canViewDatabaseDataTransfer ||
		canViewDatabaseRetentionCleanup;
	const pendingJobOrders = Array.isArray(pageProps?.pendingJobOrders)
		? pageProps.pendingJobOrders
		: [];
	const sharedOverdueCount = Number(pageProps?.overdueJobOrdersCount || 0);
	const noStockInventoryCount = Number(pageProps?.noStockInventoryCount || 0);
	const noStockProductsCount = Number(pageProps?.noStockProductsCount || 0);
	const unconfirmedShrinkageCount = Number(
		pageProps?.unconfirmedShrinkageCount || 0,
	);
	const overduePendingPaymentsCount = Number(
		pageProps?.overduePendingPaymentsCount || 0,
	);
	const overdueJobOrdersCount = useMemo(() => {
		if (pendingJobOrders.length > 0) {
			return countOverdueDeliveries(pendingJobOrders);
		}
		return Number.isFinite(sharedOverdueCount) ? sharedOverdueCount : 0;
	}, [pendingJobOrders, sharedOverdueCount]);

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
	const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
	const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
	const [theme, setTheme] = useState(() => {
		if (typeof window === "undefined") return "light";
		const stored = window.localStorage.getItem("site:theme");
		return stored === "dark" ? "dark" : "light";
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
	useEffect(() => {
		if (typeof window === "undefined") return;
		const root = window.document.documentElement;
		root.classList.remove("theme-dark", "theme-light");
		root.classList.add(theme === "dark" ? "theme-dark" : "theme-light");
		window.localStorage.setItem("site:theme", theme);
	}, [theme]);

	const currentRoute = route().current?.() ?? "";
	const resolvedRoleColor = /^#[0-9A-Fa-f]{6}$/.test(user.roleColor || "")
		? user.roleColor.toUpperCase()
		: DEFAULT_ROLE_COLOR;
	const roleMeta = {
		label: user.roleLabel || user.role || "User",
		bg: rgbaFromHex(resolvedRoleColor, 0.12),
		color: resolvedRoleColor,
	};
	const avatarInitials = user.name
		? user.name.substring(0, 2).toUpperCase()
		: "MB";
	const recentAudits = Array.isArray(user.recentAudits)
		? user.recentAudits
		: [];
	const formatAuditDateTime = (value) => {
		if (!value) return "-";
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) return "-";
		return parsed.toLocaleString();
	};

	return (
		<aside
			style={{
				width: isExpanded ? "260px" : "72px",
				minWidth: isExpanded ? "260px" : "72px",
				backgroundColor: "var(--color-surface)",
				borderRight: "1px solid var(--color-border)",
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
					borderBottom: "1px solid var(--color-border)",
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
					<Croissant size={19} strokeWidth={1.9} color="currentColor" />
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
								color: "var(--color-text-muted)",
								display: "flex",
								alignItems: "center",
								transition: "background 0.2s, color 0.2s",
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.backgroundColor =
									"rgba(156,163,175,0.15)";
								e.currentTarget.style.color = "var(--color-primary-hex)";
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.backgroundColor = "transparent";
								e.currentTarget.style.color = "var(--color-text-muted)";
							}}
						>
							{/* Left-arrow chevron */}
							<ChevronLeft size={18} strokeWidth={2} />
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
					borderBottom: "1px solid var(--color-border)",
					justifyContent: isExpanded ? "flex-start" : "center",
					flexShrink: 0,
					cursor: "pointer",
				}}
				onClick={() => setIsProfileModalOpen(true)}
				title="View profile details"
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
				<Modal
					show={isProfileModalOpen}
					onClose={() => setIsProfileModalOpen(false)}
					maxWidth="4xl"
				>
					<div className="p-6">
						<h3 className="text-lg font-semibold text-gray-900">My Profile</h3>
						<div className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-700 sm:grid-cols-2">
							<div>
								<span className="font-semibold text-gray-900">Full Name:</span>{" "}
								{user.name || "-"}
							</div>
							<div>
								<span className="font-semibold text-gray-900">Email:</span>{" "}
								{user.email || "-"}
							</div>
							<div>
								<span className="font-semibold text-gray-900">Role:</span>{" "}
								{roleMeta.label}
							</div>
							<div>
								<span className="font-semibold text-gray-900">
									Recent Actions:
								</span>{" "}
								{recentAudits.length}
							</div>
						</div>
						<div className="mt-6">
							<h4 className="text-sm font-semibold text-gray-900">
								Recent Actions (Application)
							</h4>
							<div className="mt-2 max-h-80 overflow-y-auto rounded-md border border-gray-200">
								<table className="min-w-full divide-y divide-gray-200 text-sm">
									<thead className="sticky top-0 z-10 bg-gray-50">
										<tr>
											<th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
												Date
											</th>
											<th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
												Action
											</th>
											<th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
												Table
											</th>
											<th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
												Changes
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-100 bg-white">
										{recentAudits.map((audit) => (
											<tr key={audit.ID}>
												<td className="px-3 py-2 text-gray-700">
													{formatAuditDateTime(audit.DateAdded)}
												</td>
												<td className="px-3 py-2 text-gray-700">
													{audit.Action || "-"}
												</td>
												<td className="px-3 py-2 text-gray-700">
													{audit.TableEdited || "-"}
												</td>
												<td className="px-3 py-2 text-gray-700">
													{audit.ReadableChanges || "-"}
												</td>
											</tr>
										))}
										{recentAudits.length === 0 && (
											<tr>
												<td
													colSpan="4"
													className="px-3 py-6 text-center text-gray-500"
												>
													No recent application actions found.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>
						<div className="mt-6 flex justify-end">
							<button
								type="button"
								onClick={() => setIsProfileModalOpen(false)}
								className="rounded-md border border-primary bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-primary-soft"
							>
								Close
							</button>
						</div>
					</div>
				</Modal>

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
								color: "var(--color-text-strong)",
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
					const visibleItems = (section.items || []).filter((item) => {
						if (item.id === "pos.sale-history") {
							return canViewSalesHistoryNav;
						}
						if (item.id === "admin.reports") {
							return canViewReportsNav;
						}
						if (item.id === "admin.users") {
							return canViewUserMgmtNav;
						}
						if (item.id === "admin.database") {
							return canViewDatabaseNav;
						}
						return hasAnyPermission(item.requiredPermissions || []);
					});
					if (visibleItems.length === 0) return null;
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
										color: "var(--color-text-muted)",
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
									<ChevronDown
										size={14}
										strokeWidth={2}
										style={{
											transform: isSectionCollapsed
												? "rotate(-90deg)"
												: "rotate(0deg)",
											transition: "transform 0.2s",
										}}
									/>
								</div>
							)}

							{/* Nav items */}
							<div
								style={{
									display: isExpanded && isSectionCollapsed ? "none" : "block",
								}}
							>
								{visibleItems.map((item) => {
									const activeRoutes = item.activeRoutes || [item.id];
									const isActive = activeRoutes.some(
										(routeName) =>
											currentRoute === routeName ||
											route().current(routeName) ||
											route().current(routeName + ".*"),
									);
									const resolvedHref =
										item.id === "pos.sale-history" &&
										can("CanViewSalesHistory") &&
										!can("CanViewSalesHistorySales") &&
										can("CanViewSalesHistoryPendingPayments")
											? route("pos.sale-history.pending")
											: item.id === "admin.reports" &&
												  !canViewReportsOverview &&
												  canViewReportsFullBreakdown
												? route("admin.reports.full-breakdown")
												: item.id === "admin.users" &&
													  !canViewUserMgmtUsers &&
													  canViewUserMgmtPermissions
													? route("admin.permissions")
													: item.id === "admin.users" &&
														  !canViewUserMgmtUsers &&
														  !canViewUserMgmtPermissions &&
														  canViewUserMgmtRoles
														? route("admin.roles")
														: item.id === "admin.users" &&
															  !canViewUserMgmtUsers &&
															  !canViewUserMgmtPermissions &&
															  !canViewUserMgmtRoles &&
															  canViewUserMgmtPermissionGroups
															? route("admin.permission-groups")
															: item.id === "admin.database" &&
																  canViewDatabaseConnections &&
																  !canViewDatabaseBackups
																? route("admin.database.connections")
																: item.id === "admin.database" &&
																	  !canViewDatabaseBackups &&
																	  !canViewDatabaseConnections &&
																	  canViewDatabaseMaintenanceJobs
																	? route("admin.database.maintenance-jobs")
																	: item.id === "admin.database" &&
																		  !canViewDatabaseBackups &&
																		  !canViewDatabaseConnections &&
																		  !canViewDatabaseMaintenanceJobs &&
																		  canViewDatabaseSchemaReport
																		? route("admin.database.schema")
																		: item.id === "admin.database" &&
																			  !canViewDatabaseBackups &&
																			  !canViewDatabaseConnections &&
																			  !canViewDatabaseMaintenanceJobs &&
																			  !canViewDatabaseSchemaReport &&
																			  canViewDatabaseDataTransfer
																			? route("admin.database.data-transfer")
																			: item.id === "admin.database" &&
																				  !canViewDatabaseBackups &&
																				  !canViewDatabaseConnections &&
																				  !canViewDatabaseMaintenanceJobs &&
																				  !canViewDatabaseSchemaReport &&
																				  !canViewDatabaseDataTransfer &&
																				  canViewDatabaseRetentionCleanup
																				? route("admin.database.retention")
																				: item.href;

									const enrichedItem = (() => {
										if (item.id === "pos.job-orders") {
											return { ...item, badgeCount: overdueJobOrdersCount };
										}
										if (item.id === "inventory.levels") {
											return { ...item, badgeCount: noStockInventoryCount };
										}
										if (item.id === "inventory.shrinkage-history") {
											return { ...item, badgeCount: unconfirmedShrinkageCount };
										}
										if (item.id === "inventory.products") {
											return { ...item, badgeCount: noStockProductsCount };
										}
										if (item.id === "pos.sale-history") {
											return {
												...item,
												badgeCount: overduePendingPaymentsCount,
											};
										}
										return item;
									})();

									return (
										<NavItem
											key={item.id}
											item={{ ...enrichedItem, href: resolvedHref }}
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
					borderTop: "1px solid var(--color-border)",
					display: "flex",
					flexDirection: "column",
					alignItems: isExpanded ? "stretch" : "center",
					gap: "0.5rem",
					justifyContent: isExpanded ? "flex-start" : "center",
					flexShrink: 0,
				}}
			>
				<button
					type="button"
					onClick={() =>
						setTheme((prev) => (prev === "dark" ? "light" : "dark"))
					}
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "0.6rem",
						padding: isExpanded ? "0.5rem 0.75rem" : "0.5rem",
						borderRadius: "8px",
						background: "none",
						border: "none",
						cursor: "pointer",
						color: "var(--color-text-muted)",
						fontSize: "0.875rem",
						fontWeight: 500,
						fontFamily: "'Inter', sans-serif",
						transition: "background 0.2s",
						width: isExpanded ? "100%" : "40px",
						justifyContent: "center",
					}}
					onMouseEnter={(e) =>
						(e.currentTarget.style.backgroundColor = "rgba(156,163,175,0.15)")
					}
					onMouseLeave={(e) =>
						(e.currentTarget.style.backgroundColor = "transparent")
					}
					title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
				>
					{theme === "dark" ? (
						<Sun size={19} strokeWidth={1.9} />
					) : (
						<Moon size={19} strokeWidth={1.9} />
					)}
					{isExpanded && (
						<span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
					)}
				</button>
				<button
					type="button"
					onClick={() => setIsLogoutModalOpen(true)}
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
						width: isExpanded ? "100%" : "40px",
						justifyContent: "center",
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
				</button>
			</div>
			<Modal
				show={isLogoutModalOpen}
				onClose={() => setIsLogoutModalOpen(false)}
				maxWidth="md"
			>
				<div className="p-6">
					<h3 className="text-lg font-semibold text-gray-900">
						Confirm Logout
					</h3>
					<p className="mt-2 text-sm text-gray-600">
						Are you sure you want to logout?
					</p>
					<div className="mt-6 flex justify-end gap-2">
						<button
							type="button"
							onClick={() => setIsLogoutModalOpen(false)}
							className="rounded-md border border-primary bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-primary-soft"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => router.post(route("logout"))}
							className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
						>
							Logout
						</button>
					</div>
				</div>
			</Modal>
		</aside>
	);
};

// ─── NavItem sub-component ────────────────────────────────────────────────────
const NavItem = ({ item, isActive, isExpanded }) => {
	const [hovered, setHovered] = useState(false);
	const badgeCount = Number(item.badgeCount || 0);
	const showBadge = badgeCount > 0;

	const bgColor = isActive
		? "rgb(var(--color-primary-soft))"
		: hovered
			? "rgba(156,163,175,0.15)"
			: "transparent";

	const textColor =
		isActive || hovered
			? "var(--color-primary-hex)"
			: "var(--color-text-muted)";

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
				borderRight: isActive
					? "3px solid var(--color-primary-hex)"
					: "3px solid transparent",
				transition: "background 0.15s, color 0.15s, border-color 0.15s",
				whiteSpace: "nowrap",
				overflow: "hidden",
				position: "relative",
			}}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			title={!isExpanded ? item.label : undefined}
		>
			<span
				style={{ position: "relative", display: "flex", alignItems: "center" }}
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
				{!isExpanded && showBadge && (
					<span
						style={{
							position: "absolute",
							right: -6,
							bottom: -6,
							minWidth: "18px",
							height: "18px",
							padding: "0 4px",
							borderRadius: "9999px",
							backgroundColor: "#EF4444",
							color: "#fff",
							fontSize: "0.65rem",
							fontWeight: 700,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
							pointerEvents: "none",
						}}
					>
						{badgeCount}
					</span>
				)}
			</span>
			{isExpanded && (
				<span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
					{item.label}
				</span>
			)}
			{isExpanded && showBadge && (
				<span
					style={{
						marginLeft: "auto",
						minWidth: "22px",
						height: "20px",
						padding: "0 6px",
						borderRadius: "9999px",
						backgroundColor: "#EF4444",
						color: "#fff",
						fontSize: "0.7rem",
						fontWeight: 700,
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						boxShadow: "0 2px 4px rgba(0,0,0,0.12)",
					}}
				>
					{badgeCount}
				</span>
			)}
		</Link>
	);
};

export default Sidebar;
