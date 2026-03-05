import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link } from "@inertiajs/react";
import {
	Coins,
	PackageCheck,
	TriangleAlert,
	Trash2,
	Clock3,
	BadgeAlert,
	CakeSlice,
} from "lucide-react";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;

const toneClassMap = {
	good: "text-green-600",
	bad: "text-red-600",
	neutral: "text-gray-500",
};

const icons = {
	todayRevenue: Coins,
	unitsSoldToday: PackageCheck,
	lowStockAlerts: TriangleAlert,
	spoilages: Trash2,
	upcomingPaymentDue: Clock3,
	paymentOverdue: BadgeAlert,
};

const metricDefinitions = [
	{ key: "todayRevenue", label: "Today's Revenue", format: "currency" },
	{ key: "unitsSoldToday", label: "Units Sold Today", format: "number" },
	{ key: "lowStockAlerts", label: "Low Stock Alerts", format: "number" },
	{ key: "spoilages", label: "Spoilages", format: "number" },
	{ key: "upcomingPaymentDue", label: "Upcoming Payment Due", format: "number", conditional: true },
	{ key: "paymentOverdue", label: "Payment Overdue", format: "number", conditional: true },
];

function MetricCard({ label, value, trendText, trendTone, icon: Icon, format }) {
	const formattedValue = format === "currency" ? currency(value) : Number(value || 0).toLocaleString();
	return (
		<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<div className="mb-3 flex items-center justify-between">
				<p className="text-sm font-medium text-gray-600">{label}</p>
				<div className="rounded-md bg-primary-soft p-2 text-primary">
					<Icon size={20} strokeWidth={1.9} />
				</div>
			</div>
			<p className="text-2xl font-semibold text-gray-900">{formattedValue}</p>
			<p className={`mt-2 text-xs font-medium ${toneClassMap[trendTone] || toneClassMap.neutral}`}>
				{trendText || "No change from yesterday"}
			</p>
		</div>
	);
}

export default function Dashboard({
	currentUserFullName = "User",
	metrics = {},
	recentSalesToday = [],
}) {
	const cards = metricDefinitions
		.filter((item) => !item.conditional || Number(metrics[item.key]?.value || 0) > 0)
		.map((item) => ({
			...item,
			...metrics[item.key],
		}));

	return (
		<AuthenticatedLayout
			header={
				<h2 className="font-semibold text-xl text-gray-800 leading-tight">
					Dashboard
				</h2>
			}
			disableScroll={true}
		>
			<Head title="Dashboard" />

			<div className="flex-1 p-4 md:p-6 min-h-0">
				<div className="h-full flex flex-col min-h-0">
					<div
						className="rounded-xl text-white p-6 shadow-sm mb-4 shrink-0"
						style={{
							background:
								"linear-gradient(135deg, var(--color-primary-hex), #E5B25D)",
						}}
					>
						<div className="flex items-center justify-between gap-4">
							<div>
								<h1 className="font-semibold text-2xl mb-2">
									Welcome back, {currentUserFullName}!
								</h1>
								<p className="text-white/90">
									Here&apos;s what&apos;s happening at Momma&apos;s Bakeshop today.
								</p>
							</div>
							<CakeSlice size={54} strokeWidth={1.9} className="text-white/90" />
						</div>
					</div>

					<div className="flex-1 min-h-0 flex flex-row gap-4 overflow-hidden">
						<div className="rounded-lg border border-gray-200 bg-gray-50 p-3 min-h-0 overflow-y-auto w-[340px] shrink-0">
							<div className="space-y-3">
								{cards.map((card) => (
									<MetricCard
										key={card.key}
										label={card.label}
										value={card.value}
										trendText={card.trendText}
										trendTone={card.trendTone}
										icon={icons[card.key]}
										format={card.format}
									/>
								))}
							</div>
						</div>

						<div className="rounded-lg border border-gray-200 bg-white min-h-0 flex-1 flex flex-col overflow-hidden min-w-0">
							<div className="px-4 py-3 border-b border-gray-200">
								<h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">
									Recent Sales Today
								</h3>
							</div>
							<div className="flex-1 overflow-y-auto">
								<table className="min-w-full divide-y divide-gray-200">
									<thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
										<tr>
											<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
											<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sold Products</th>
											<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Amount</th>
											<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment Status</th>
											<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{recentSalesToday.map((sale) => (
											<tr key={sale.ID} className="hover:bg-gray-50 align-top">
												<td className="px-4 py-4 text-sm text-gray-900">{sale.customer?.CustomerName || "Walk-In"}</td>
												<td className="px-4 py-4 text-sm text-gray-900">
													<div className="w-fit max-w-full overflow-x-auto">
														<table className="min-w-[22rem] text-xs">
															<thead className="bg-gray-50">
																<tr>
																	<th className="px-2 py-1 text-left font-semibold text-gray-600">Product</th>
																	<th className="px-2 py-1 text-left font-semibold text-gray-600">Qty</th>
																	<th className="px-2 py-1 text-left font-semibold text-gray-600">Price</th>
																	<th className="px-2 py-1 text-left font-semibold text-gray-600">Subtotal</th>
																</tr>
															</thead>
															<tbody className="divide-y divide-gray-100">
																{(sale.sold_products || []).map((line) => (
																	<tr key={line.ID}>
																		<td className="px-2 py-1 text-gray-900">{line.product?.ProductName || "-"}</td>
																		<td className="px-2 py-1 text-gray-700">{line.Quantity}</td>
																		<td className="px-2 py-1 text-gray-700">{currency(line.PricePerUnit)}</td>
																		<td className="px-2 py-1 text-gray-700">{currency(line.SubAmount)}</td>
																	</tr>
																))}
															</tbody>
														</table>
													</div>
												</td>
												<td className="px-4 py-4 text-sm font-semibold text-gray-900">{currency(sale.totalAmount)}</td>
												<td className="px-4 py-4 text-sm text-gray-700">{sale.payment?.PaymentStatus || "-"}</td>
												<td className="px-4 py-4 text-right">
													<Link
														href={route("pos.sale-history")}
														className="inline-flex rounded border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary-soft"
													>
														View
													</Link>
												</td>
											</tr>
										))}
										{recentSalesToday.length === 0 && (
											<tr>
												<td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
													No sales recorded today.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
