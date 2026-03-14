import React, { useEffect, useState } from "react";
import { usePage } from "@inertiajs/react";
import usePermissions from "@/hooks/usePermissions";
import { ChevronLeft, ChevronDown, Croissant, Sun, Moon, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/Components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/Components/ui/tooltip";
import ProfileModal from "./ProfileModal";
import LogoutModal from "./LogoutModal";
import SidebarItem from "./SidebarItem";

const DEFAULT_ROLE_COLOR = "#6B7280";

const rgbaFromHex = (hex, alpha = 0.12) => {
	if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return `rgba(107,114,128,${alpha})`;
	const normalized = hex.replace("#", "");
	const red = parseInt(normalized.slice(0, 2), 16);
	const green = parseInt(normalized.slice(2, 4), 16);
	const blue = parseInt(normalized.slice(4, 6), 16);
	return `rgba(${red},${green},${blue},${alpha})`;
};

const NAV_STRUCTURE = [
	{
		section: "Dashboard",
		items: [{ id: "dashboard", label: "Overview", icon: "dashboard", href: route("dashboard") }],
	},
	{
		section: "Point of Sale",
		items: [
			{ id: "pos.cash-sale", activeRoutes: ["pos.cash-sale", "pos.cashier"], label: "Cashier", icon: "cashier", href: route("pos.cash-sale"), requiredPermissions: ["CanViewCashier"] },
			{ id: "pos.job-orders", activeRoutes: ["pos.job-orders", "pos.job-orders.pending", "pos.job-orders.history"], label: "Job Orders", icon: "jobOrders", href: route("pos.job-orders"), requiredPermissions: ["CanViewJobOrders", "CanViewPendingJobOrders", "CanViewJobOrdersHistory"] },
			{ id: "pos.sale-history", activeRoutes: ["pos.sale-history", "pos.sale-history.pending"], label: "Sale History", icon: "saleHistory", href: route("pos.sale-history"), requiredPermissions: ["CanViewSalesHistory", "CanViewSalesHistorySales", "CanViewSalesHistoryPendingPayments"] },
			{ id: "pos.customers", activeRoutes: ["pos.customers"], label: "Customers", icon: "users", href: route("pos.customers"), requiredPermissions: ["CanViewCustomers"] },
		],
	},
	{
		section: "Inventory",
		items: [
			{ id: "inventory.levels", activeRoutes: ["inventory.levels", "inventory.index", "inventory.stock-in", "inventory.stock-out", "inventory.snapshots"], label: "Inventory Levels", icon: "inventory", href: route("inventory.index"), requiredPermissions: ["CanViewInventoryLevels"] },
			{ id: "inventory.shrinkage-history", activeRoutes: ["inventory.shrinkage-history"], label: "Shrinkage History", icon: "audits", href: route("inventory.shrinkage-history"), requiredPermissions: ["CanViewShrinkageHistory"] },
			{ id: "inventory.products", activeRoutes: ["inventory.products", "products.index", "products.batches", "products.snapshots"], label: "Products & Batches", icon: "products", href: route("products.index"), requiredPermissions: ["CanViewProductsAndBatches"] },
		],
	},
	{
		section: "Administration",
		items: [
			{ id: "admin.reports", activeRoutes: ["admin.reports", "admin.reports.full-breakdown"], label: "Reports", icon: "reports", href: route("admin.reports"), requiredPermissions: ["CanViewReportsOverview", "CanViewReportsFullBreakdown"] },
			{ id: "admin.users", activeRoutes: ["admin.users", "admin.permissions", "admin.roles", "admin.permission-groups"], label: "User Management", icon: "users", href: route("admin.users"), requiredPermissions: ["CanViewUserManagementUsers", "CanViewUserManagementPermissions", "CanViewUserManagementRoles", "CanViewUserManagementPermissionGroups"] },
			{ id: "admin.database", activeRoutes: ["admin.database", "admin.database.connections", "admin.database.maintenance-jobs", "admin.database.schema", "admin.database.data-transfer", "admin.database.retention"], label: "Database", icon: "database", href: route("admin.database"), requiredPermissions: ["CanViewDatabaseBackups", "CanViewDatabaseConnections", "CanViewDatabaseMaintenanceJobs", "CanViewDatabaseSchemaReport", "CanViewDatabaseDataTransfer", "CanViewDatabaseRetentionCleanup"] },
			{ id: "admin.audits", label: "Audits", icon: "audits", href: route("admin.audits"), requiredPermissions: ["CanViewAudits"] },
		],
	},
];

const Sidebar = () => {
	const { auth } = usePage().props;
	const user = auth?.user ?? { name: "Admin User", role: "admin" };
	const { can, canAny } = usePermissions();

	const [isExpanded, setIsExpanded] = useState(() => {
		if (typeof window === "undefined") return true;
		const saved = window.localStorage.getItem("sidebar:isExpanded");
		return saved === null ? true : saved === "true";
	});

	const [collapsedSections, setCollapsedSections] = useState(() => {
		if (typeof window === "undefined") return {};
		const saved = window.localStorage.getItem("sidebar:collapsedSections");
		try { return saved ? JSON.parse(saved) : {}; } catch { return {}; }
	});

	const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
	const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
	const [theme, setTheme] = useState(() => {
		if (typeof window === "undefined") return "light";
		return window.localStorage.getItem("site:theme") === "dark" ? "dark" : "light";
	});

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem("sidebar:isExpanded", String(isExpanded));
	}, [isExpanded]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem("sidebar:collapsedSections", JSON.stringify(collapsedSections));
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

	const checkPermission = (item) => {
		if (!item.requiredPermissions?.length) return true;
		return canAny(item.requiredPermissions);
	};

	return (
		<aside
			className={cn(
				"flex flex-col h-screen bg-card border-r transition-all duration-300 ease-in-out z-20 shrink-0 font-inter overflow-hidden",
				isExpanded ? "w-[260px]" : "w-[72px]"
			)}
		>
			{/* Header */}
			<div className={cn("h-[70px] flex items-center px-5 border-b gap-3 flex-shrink-0", !isExpanded && "justify-center")}>
				<div
					className="size-[38px] min-w-[38px] rounded-full bg-primary-soft flex items-center justify-center cursor-pointer shadow-sm hover:scale-105 transition-transform"
					onClick={() => setIsExpanded(!isExpanded)}
					title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
				>
					<Croissant className="size-[19px] text-primary" strokeWidth={1.9} />
				</div>
				{isExpanded && (
					<>
						<span className="font-outfit font-bold text-[0.95rem] text-primary-hex flex-1 leading-tight flex flex-col">
							<span>Momma's</span>
							<span>Bakeshop</span>
						</span>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setIsExpanded(false)}
							className="text-muted-foreground hover:text-primary-hex h-8 w-8"
						>
							<ChevronLeft className="size-[18px]" strokeWidth={2} />
						</Button>
					</>
				)}
			</div>

			{/* User Profile Widget */}
			<div
				className={cn(
					"py-5 flex items-center border-b gap-3.5 flex-shrink-0 cursor-pointer hover:bg-accent/50 transition-colors",
					isExpanded ? "px-6" : "justify-center"
				)}
				onClick={() => setIsProfileModalOpen(true)}
				title="View profile details"
			>
				<div className="size-[42px] min-w-[42px] rounded-full bg-primary-soft text-primary-hex flex items-center justify-center font-outfit font-bold text-base shadow-sm">
					{user.name?.substring(0, 2).toUpperCase() || "MB"}
				</div>
				{isExpanded && (
					<div className="flex flex-col gap-0.5 overflow-hidden">
						<span className="font-semibold text-[0.9rem] text-foreground truncate">{user.name}</span>
						<span
							className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.7rem] font-bold uppercase tracking-wider w-fit"
							style={{ backgroundColor: roleMeta.bg, color: roleMeta.color }}
						>
							{roleMeta.label}
						</span>
					</div>
				)}
			</div>

			{/* Navigation */}
			<nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 no-scrollbar">
				{NAV_STRUCTURE.map((section) => {
					const visibleItems = section.items.filter(checkPermission);
					if (visibleItems.length === 0) return null;
					const isSectionCollapsed = collapsedSections[section.section];

					return (
						<div key={section.section} className="mb-5">
							{isExpanded && (
								<div
									className="px-6 text-[0.7rem] font-bold uppercase tracking-[0.06em] text-muted-foreground mb-1.5 flex justify-between items-center cursor-pointer font-outfit hover:text-foreground"
									onClick={() => setCollapsedSections(prev => ({ ...prev, [section.section]: !prev[section.section] }))}
								>
									<span>{section.section}</span>
									<ChevronDown
										className={cn("size-3.5 transition-transform duration-200", isSectionCollapsed && "-rotate-90")}
										strokeWidth={2}
									/>
								</div>
							)}
							<div className={cn(isExpanded && isSectionCollapsed && "hidden")}>
								{visibleItems.map(item => (
									<SidebarItem
										key={item.id}
										item={item}
										isActive={item.activeRoutes?.some(r => currentRoute === r || route().current(r) || route().current(r + ".*")) || currentRoute === item.id}
										isExpanded={isExpanded}
									/>
								))}
							</div>
						</div>
					);
				})}
			</nav>

			{/* Footer */}
			<div className={cn("p-4 border-t flex flex-col gap-2 flex-shrink-0", !isExpanded && "items-center")}>
				<TooltipProvider>
					<Tooltip delayDuration={0}>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								onClick={() => setTheme(p => p === "dark" ? "light" : "dark")}
								className={cn("w-full justify-start gap-2.5 text-muted-foreground font-medium h-9", !isExpanded && "w-10 h-9 justify-center p-0")}
							>
								{theme === "dark" ? <Sun className="size-[19px]" /> : <Moon className="size-[19px]" />}
								{isExpanded && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
							</Button>
						</TooltipTrigger>
						{!isExpanded && <TooltipContent side="right">Switch Theme</TooltipContent>}
					</Tooltip>
				</TooltipProvider>

				<TooltipProvider>
					<Tooltip delayDuration={0}>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								onClick={() => setIsLogoutModalOpen(true)}
								className={cn("w-full justify-start gap-2.5 text-destructive font-medium h-9 hover:bg-destructive/10 hover:text-destructive", !isExpanded && "w-10 h-9 justify-center p-0")}
							>
								<LogOut className="size-[19px]" />
								{isExpanded && <span>Logout</span>}
							</Button>
						</TooltipTrigger>
						{!isExpanded && <TooltipContent side="right">Logout</TooltipContent>}
					</Tooltip>
				</TooltipProvider>
			</div>

			<ProfileModal
				open={isProfileModalOpen}
				onOpenChange={setIsProfileModalOpen}
				user={user}
				roleMeta={roleMeta}
			/>
			<LogoutModal
				open={isLogoutModalOpen}
				onOpenChange={setIsLogoutModalOpen}
			/>
		</aside>
	);
};

export default Sidebar;
