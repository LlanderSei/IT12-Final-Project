import Sidebar from "@/Layouts/Partials/Sidebar";

export default function AuthenticatedLayout({ header, children }) {
	return (
		<div className="min-h-screen flex">
			<Sidebar />
			<div className="flex-1">
				{header && (
					<header className="bg-white shadow">
						<div className="mx-auto px-6 py-4">{header}</div>
					</header>
				)}

				<main>{children}</main>
			</div>
		</div>
	);
}
