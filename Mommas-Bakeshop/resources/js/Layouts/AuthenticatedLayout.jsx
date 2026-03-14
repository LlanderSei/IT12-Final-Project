import Sidebar from "@/Layouts/Partials/Sidebar";
import Toast from "@/Components/Toast";
import { router, usePage } from "@inertiajs/react";
import { useEffect, useRef } from "react";
import { AlertCircle } from "lucide-react";

export default function AuthenticatedLayout({
	header,
	children,
	disableScroll = false,
}) {
	const system = usePage().props.system || {};
	const maintenance = system.maintenance || null;
	const recentMaintenanceOperations = system.recentMaintenanceOperations || [];
	const maintenanceStatusRef = useRef(null);

	useEffect(() => {
		if (!maintenance) return undefined;

		const interval = window.setInterval(() => {
			router.reload({
				only: ["system"],
				preserveScroll: true,
				preserveState: true,
			});
		}, 5000);

		return () => window.clearInterval(interval);
	}, [maintenance]);

	useEffect(() => {
		const currentStatuses = new Map(
			recentMaintenanceOperations.map((operation) => [operation.id, operation.status]),
		);

		if (!maintenanceStatusRef.current) {
			maintenanceStatusRef.current = currentStatuses;
			return;
		}

		for (const operation of recentMaintenanceOperations) {
			const previousStatus = maintenanceStatusRef.current.get(operation.id);
			if (
				previousStatus &&
				previousStatus !== operation.status &&
				["Completed", "Failed"].includes(operation.status)
			) {
				window.dispatchEvent(
					new CustomEvent("app-toast", {
						detail: {
							type: operation.status === "Completed" ? "success" : "error",
							message:
								operation.status === "Completed"
									? `${operation.title} finished successfully.`
									: `${operation.title} failed.${operation.failureMessage ? ` ${operation.failureMessage}` : ""}`,
						},
					}),
				);
			}
		}

		maintenanceStatusRef.current = currentStatuses;
	}, [recentMaintenanceOperations]);

	return (
		<div className="h-screen flex overflow-hidden bg-slate-50 font-sans selection:bg-primary/20">
			<Toast />
			<Sidebar />
			
			<div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
				{/* Maintenance Overlay (High Visibility) */}
				{maintenance && (
					<div className="shrink-0 bg-amber-500 text-white px-8 py-3 flex items-center justify-between shadow-lg z-50 animate-in slide-in-from-top duration-500">
						<div className="flex items-center gap-4">
							<div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
								<AlertCircle className="h-5 w-5" />
							</div>
							<div>
								<div className="text-[10px] font-black uppercase tracking-widest opacity-80 leading-none mb-1">System Advisory</div>
								<div className="text-sm font-black uppercase tracking-tight italic">
									{maintenance.title} &bull; Write Actions Restricted
								</div>
							</div>
						</div>
						{maintenance.createdBy && (
							<div className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
								Initiated by {maintenance.createdBy}
							</div>
						)}
					</div>
				)}

				<div className={`flex-1 flex flex-col min-w-0 min-h-0 ${disableScroll ? "overflow-hidden" : "overflow-y-auto"}`}>
					{/* Legacy Header Support (Deprecated but kept for safety) */}
					{/* Most pages now use the PageHeader component directly in the children */}
					{header && (
						<header className="bg-white border-b shrink-0">
							<div className="mx-auto px-10 py-6">{header}</div>
						</header>
					)}

					<main className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-bottom-2 duration-700 ease-out">
						{children}
					</main>
				</div>
			</div>
		</div>
	);
}
