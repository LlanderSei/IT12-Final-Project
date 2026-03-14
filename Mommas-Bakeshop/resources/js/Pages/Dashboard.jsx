import React from "react";
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
	ArrowUpRight,
	ArrowDownRight,
	TrendingUp,
	ExternalLink,
	ChevronRight,
	ShoppingBag,
	Plus,
	RotateCcw,
} from "lucide-react";
import PageHeader from "@/Components/PageHeader";
import { Button } from "@/Components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/Components/ui/card";
import { Badge } from "@/Components/ui/badge";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { Separator } from "@/Components/ui/separator";

const currency = (value) => `₱${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const icons = {
	todayRevenue: Coins,
	unitsSoldToday: PackageCheck,
	lowStockAlerts: TriangleAlert,
	spoilages: Trash2,
	upcomingPaymentDue: Clock3,
	paymentOverdue: BadgeAlert,
};

function MetricCard({ label, value, trendText, trendTone, icon: Icon, format }) {
	const formattedValue = format === "currency" ? currency(value) : Number(value || 0).toLocaleString();
	const isPositive = trendTone === "good";
	const isNegative = trendTone === "bad";

	return (
		<Card className="overflow-hidden border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white group hover:scale-[1.02] transition-all duration-300">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-6">
				<CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
					{label}
				</CardTitle>
				<div className="h-10 w-10 rounded-2xl bg-slate-50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-inner">
					<Icon className="h-5 w-5" strokeWidth={2.5} />
				</div>
			</CardHeader>
			<CardContent className="px-6 pb-6">
				<div className="text-3xl font-black tracking-tighter italic text-slate-900 mb-2">
					{formattedValue}
				</div>
				<div className="flex items-center gap-2">
					{trendText && (
						<div className={`flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
							isPositive ? 'bg-emerald-50 text-emerald-600' : 
							isNegative ? 'bg-destructive/10 text-destructive' : 
							'bg-slate-100 text-slate-500'
						}`}>
							{isPositive && <ArrowUpRight className="h-3 w-3" />}
							{isNegative && <ArrowDownRight className="h-3 w-3" />}
							{trendText}
						</div>
					)}
					{!trendText && (
						<div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
							Stable Performance
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

export default function Dashboard({
	currentUserFullName = "User",
	metrics = {},
	recentSalesToday = [],
}) {
	const metricDefinitions = [
		{ key: "todayRevenue", label: "Today's Revenue", format: "currency" },
		{ key: "unitsSoldToday", label: "Units Sold Today", format: "number" },
		{ key: "lowStockAlerts", label: "Low Stock Alerts", format: "number" },
		{ key: "spoilages", label: "Spoilages", format: "number" },
		{ key: "upcomingPaymentDue", label: "Upcoming Payments", format: "number", conditional: true },
		{ key: "paymentOverdue", label: "Overdue Payments", format: "number", conditional: true },
	];

	const activeMetrics = metricDefinitions
		.filter((item) => !item.conditional || Number(metrics[item.key]?.value || 0) > 0)
		.map((item) => ({
			...item,
			...metrics[item.key],
		}));

	return (
		<AuthenticatedLayout disableScroll={true}>
			<Head title="Dashboard" />

			<div className="flex flex-col h-full bg-slate-50/50">
				<PageHeader 
					title="Operations Hub" 
					subtitle="Live Insights"
					actions={
						<div className="flex items-center gap-3">
							<Button variant="outline" className="rounded-xl font-black uppercase tracking-widest text-[10px] h-10 px-5 gap-2 border-2 bg-white" asChild>
								<Link href={route('pos.sale-history')}>
									<TrendingUp className="h-4 w-4" /> Full Sales Report
								</Link>
							</Button>
							<Button className="rounded-xl font-black uppercase tracking-widest text-[10px] h-10 px-5 gap-2 bg-foreground text-white shadow-lg" asChild>
								<Link href={route('pos.cash-sale')}>
									<Plus className="h-4 w-4" /> New Transaction
								</Link>
							</Button>
						</div>
					}
				/>

				<main className="flex-1 overflow-hidden px-10 pt-6 pb-10 flex flex-col gap-8">
					{/* Welcome Section */}
					<div className="relative shrink-0 overflow-hidden rounded-[3rem] bg-slate-900 p-10 text-white shadow-2xl border-4 border-white">
						<div className="absolute top-0 right-0 p-12 opacity-10 blur-sm scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-0">
							<CakeSlice className="h-64 w-64" />
						</div>
						<div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
							<div className="space-y-4 max-w-2xl text-center md:text-left">
								<Badge className="bg-primary/20 text-primary border-none font-black text-[10px] uppercase tracking-[0.3em] px-4 py-1.5 mb-2">
									Production Day Active
								</Badge>
								<h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
									Welcome back, <span className="text-primary">{currentUserFullName.split(' ')[0]}!</span>
								</h1>
								<p className="text-lg text-slate-400 font-medium leading-relaxed max-w-xl italic">
									"Every batch tells a story. Freshness is the cornerstone of every masterpiece we create at Momma's Bakeshop."
								</p>
							</div>
							<div className="hidden lg:flex items-center gap-12 bg-white/5 backdrop-blur-md p-8 rounded-[2rem] border border-white/10 shrink-0">
								<div className="text-center">
									<div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 opacity-60">Status</div>
									<div className="text-sm font-black text-emerald-400 flex items-center justify-center gap-2">
										<div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> ONLINE
									</div>
								</div>
								<Separator orientation="vertical" className="h-10 bg-white/10" />
								<div className="text-center">
									<div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 opacity-60">Shift</div>
									<div className="text-sm font-black uppercase tracking-tighter">Morning Run</div>
								</div>
							</div>
						</div>
					</div>

					{/* Metrics Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
						{activeMetrics.map((card) => (
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

					{/* Main Dashboard Content */}
					<div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-8">
						{/* Recent Transactions */}
						<Card className="lg:col-span-8 flex flex-col overflow-hidden border-none shadow-2xl shadow-slate-200/50 rounded-[3rem] bg-white relative">
							<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />
							<CardHeader className="p-10 pb-6 flex flex-row items-center justify-between">
								<div>
									<CardTitle className="text-2xl font-black italic uppercase tracking-tight text-slate-900">
										Today's Transactions
									</CardTitle>
									<CardDescription className="font-bold text-slate-500 uppercase text-[10px] tracking-widest mt-1">
										Live sales feed for {new Date().toLocaleDateString()}
									</CardDescription>
								</div>
								<Button variant="ghost" className="rounded-xl h-10 px-4 font-black uppercase tracking-widest text-[9px] border gap-2" asChild>
									<Link href={route('pos.sale-history')}>
										History <ExternalLink className="h-3.5 w-3.5" />
									</Link>
								</Button>
							</CardHeader>
							<CardContent className="flex-1 overflow-hidden px-10 pb-10">
								<div className="h-full rounded-[2rem] border-2 border-slate-50 bg-slate-50/30 overflow-hidden flex flex-col">
									<table className="w-full border-collapse">
										<thead className="bg-slate-100/50 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] border-b">
											<tr>
												<th className="px-6 py-4 text-left">Transaction Ref</th>
												<th className="px-6 py-4 text-left">Customer</th>
												<th className="px-6 py-4 text-right">Amount</th>
												<th className="px-6 py-4 text-center">Status</th>
												<th className="px-6 py-4 text-right">Items</th>
											</tr>
										</thead>
									</table>
									<ScrollArea className="flex-1">
										<table className="w-full">
											<tbody className="divide-y divide-slate-100">
												{recentSalesToday.map((sale) => (
													<tr key={sale.ID} className="group hover:bg-white transition-colors">
														<td className="px-6 py-6 vertical-top">
															<div className="font-black text-xs text-slate-400 uppercase tracking-widest mb-1 group-hover:text-primary transition-colors">#{sale.ID}</div>
															<div className="text-[10px] font-bold text-slate-300 uppercase">POS-LINK-D</div>
														</td>
														<td className="px-6 py-6 vertical-top">
															<div className="font-black text-sm uppercase tracking-tight text-slate-900">{sale.customer?.CustomerName || "Walk-In Customer"}</div>
															<div className="text-[10px] font-bold text-slate-400 mt-0.5">DIRECT SALE</div>
														</td>
														<td className="px-6 py-6 text-right vertical-top">
															<div className="font-black text-lg italic text-primary">{currency(sale.totalAmount)}</div>
														</td>
														<td className="px-6 py-6 text-center vertical-top">
															<div className={`inline-flex px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
																sale.payment?.PaymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
															}`}>
																{sale.payment?.PaymentStatus || 'N/A'}
															</div>
														</td>
														<td className="px-6 py-6 text-right vertical-top">
															<div className="flex flex-col items-end gap-1">
																<div className="flex -space-x-2">
																	{sale.sold_products?.slice(0, 3).map((lp, i) => (
																		<div key={i} className="h-7 w-7 rounded-lg border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 shadow-sm overflow-hidden" title={lp.product?.ProductName}>
																			{lp.product?.ProductName?.charAt(0)}
																		</div>
																	))}
																	{sale.sold_products?.length > 3 && (
																		<div className="h-7 w-7 rounded-lg border-2 border-white bg-foreground flex items-center justify-center text-[9px] font-black text-white shadow-sm">
																			+{sale.sold_products.length - 3}
																		</div>
																	)}
																</div>
																<Link href={route('pos.sale-history')} className="text-[9px] font-black uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
																	View Items <ChevronRight className="h-3 w-3" />
																</Link>
															</div>
														</td>
													</tr>
												))}
												{recentSalesToday.length === 0 && (
													<tr>
														<td colSpan="5" className="px-6 py-20 text-center">
															<ShoppingBag className="h-12 w-12 mx-auto text-slate-200 mb-4" />
															<div className="text-sm font-black uppercase tracking-widest text-slate-300 italic">No Sales Activity Today Yet</div>
														</td>
													</tr>
												)}
											</tbody>
										</table>
									</ScrollArea>
								</div>
							</CardContent>
						</Card>

						{/* Quick Links / Operations */}
						<div className="lg:col-span-4 flex flex-col gap-8">
							<Card className="flex-1 border-none shadow-2xl shadow-slate-200/50 rounded-[3rem] bg-indigo-600 text-white overflow-hidden relative group">
								<div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-700 opacity-90" />
								<div className="absolute top-0 right-0 p-8 opacity-10 -rotate-12 scale-150 group-hover:rotate-0 transition-transform duration-700">
									<TrendingUp className="h-48 w-48" />
								</div>
								<CardHeader className="relative z-10 p-10">
									<CardTitle className="text-2xl font-black italic uppercase tracking-tight">Operation Links</CardTitle>
									<CardDescription className="text-indigo-200 font-bold uppercase text-[10px] tracking-widest mt-1">Direct access to core modules</CardDescription>
								</CardHeader>
								<CardContent className="relative z-10 px-10 space-y-4">
									<Button variant="secondary" className="w-full h-14 rounded-2xl justify-between px-6 font-black uppercase tracking-widest text-[10px] shadow-lg group-hover:translate-x-1 transition-transform" asChild>
										<Link href={route('pos.cash-sale')}>
											Launch POS Terminal <ChevronRight className="h-4 w-4" />
										</Link>
									</Button>
									<Button variant="secondary" className="w-full h-14 rounded-2xl justify-between px-6 font-black uppercase tracking-widest text-[10px] shadow-lg bg-indigo-400/20 text-white border-indigo-400/30 hover:bg-white hover:text-indigo-600 group-hover:translate-x-1 transition-transform" asChild>
										<Link href={route('inventory.levels')}>
											Check Inventory Levels <ChevronRight className="h-4 w-4" />
										</Link>
									</Button>
									<Button variant="secondary" className="w-full h-14 rounded-2xl justify-between px-6 font-black uppercase tracking-widest text-[10px] shadow-lg bg-indigo-400/20 text-white border-indigo-400/30 hover:bg-white hover:text-indigo-600 group-hover:translate-x-1 transition-transform" asChild>
										<Link href={route('products.index')}>
											Manage Product List <ChevronRight className="h-4 w-4" />
										</Link>
									</Button>
								</CardContent>
								<CardFooter className="relative z-10 px-10 pb-10">
									<p className="text-[9px] font-bold text-indigo-300 uppercase tracking-[0.2em] italic">System v4.0 Active Deployment</p>
								</CardFooter>
							</Card>

							<Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[3rem] bg-white p-10 flex flex-col items-center text-center group">
								<div className="h-20 w-20 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-inner mb-6">
									<Clock3 className="h-10 w-10" />
								</div>
								<h4 className="text-xl font-black italic uppercase tracking-tight text-slate-900 mb-2">Sync Status</h4>
								<p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Last sync: Just now</p>
								<div className="w-full bg-slate-50 rounded-2xl p-4 border flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="h-3 w-3 rounded-full bg-emerald-500" />
										<span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Database Healthy</span>
									</div>
									<Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
										<RotateCcw className="h-4 w-4" />
									</Button>
								</div>
							</Card>
						</div>
					</div>
				</main>
			</div>
		</AuthenticatedLayout>
	);
}
