import Sidebar from "@/Layouts/Partials/Sidebar";
import Toast from "@/Components/Toast";
import { router, usePage } from "@inertiajs/react";
import { useEffect, useRef } from "react";

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
		<div className="h-screen flex overflow-hidden">
			<Toast />
			<Sidebar />
			<div
				className={`flex-1 flex flex-col min-w-0 min-h-0 ${disableScroll ? "overflow-hidden" : "overflow-y-auto"}`}
			>
				{maintenance && (
					<div className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-900">
						<div className="font-medium">
							Database maintenance in progress: {maintenance.title}
						</div>
						<div className="mt-1 text-xs text-amber-800">
							Write actions are temporarily disabled.
							{maintenance.createdBy ? ` Started by ${maintenance.createdBy}.` : ""}
						</div>
					</div>
				)}
				{header && (
					<header className="bg-white shadow">
						<div className="mx-auto px-6 py-4">{header}</div>
					</header>
				)}

				<main className="flex-1 flex flex-col min-h-0">{children}</main>
			</div>
		</div>
	);
}
