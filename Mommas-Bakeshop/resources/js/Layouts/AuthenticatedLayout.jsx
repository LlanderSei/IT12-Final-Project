import Sidebar from "@/Layouts/Partials/Sidebar";
import Toast from "@/Components/Toast";

export default function AuthenticatedLayout({ header, children }) {
	return (
		<div className="min-h-screen flex">
			<Toast />
			<Sidebar />
			<div className="flex-1 flex flex-col min-w-0">
				{header && (
					<header className="bg-white shadow">
						<div className="mx-auto px-6 py-4">{header}</div>
					</header>
				)}

				<main className="flex-1 flex flex-col">{children}</main>
			</div>
		</div>
	);
}
