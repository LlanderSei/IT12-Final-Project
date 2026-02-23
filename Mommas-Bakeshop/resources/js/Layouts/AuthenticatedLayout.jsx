import Sidebar from "@/Layouts/Partials/Sidebar";
import Toast from "@/Components/Toast";

export default function AuthenticatedLayout({
	header,
	children,
	disableScroll = false,
}) {
	return (
		<div className="h-screen flex overflow-hidden">
			<Toast />
			<Sidebar />
			<div
				className={`flex-1 flex flex-col min-w-0 min-h-0 ${disableScroll ? "overflow-hidden" : "overflow-y-auto"}`}
			>
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
