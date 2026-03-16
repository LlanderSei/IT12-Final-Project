import React, { useMemo, useState } from "react";
import { router } from "@inertiajs/react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
	Coins,
	PackageCheck,
	Factory,
	ArrowDownToLine,
	ArrowUpFromLine,
	Trash2,
	TrendingDown,
	Wallet,
	Clock3,
	BadgeAlert,
} from "lucide-react";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;
const numberFmt = (value) => Number(value || 0).toLocaleString();

const SECTION_DEFINITIONS = [
	{ key: "revenue", label: "Revenue" },
	{ key: "productSales", label: "Product Sales" },
	{ key: "inventoryMovements", label: "Inventory Movements" },
	{ key: "shrinkagesLosses", label: "Shrinkages & Losses" },
	{ key: "payments", label: "Payments" },
	{ key: "production", label: "Production Batches" },
];

function StatCard({ label, value, icon: Icon }) {
	return (
		<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
						{label}
					</p>
					<p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
				</div>
				{Icon && (
					<div className="rounded-md bg-primary-soft p-2 text-primary shrink-0">
						<Icon size={18} strokeWidth={1.9} />
					</div>
				)}
			</div>
		</div>
	);
}

function DataTable({ title, headers, rows, emptyText = "No data." }) {
	return (
		<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-800">
				{title}
			</h4>
			<div className="max-h-[420px] overflow-auto">
				<table className="min-w-full text-sm">
					<thead className="bg-gray-50 sticky top-0 z-10">
						<tr>
							{headers.map((header) => (
								<th
									key={`${title}-${header.key}`}
									className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
								>
									{header.label}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100 bg-white">
						{rows.map((row, index) => (
							<tr key={`${title}-${index}`}>
								{headers.map((header) => (
									<td
										key={`${title}-${index}-${header.key}`}
										className="px-3 py-2 text-gray-700"
									>
										{header.render
											? header.render(row[header.key], row)
											: row[header.key]}
									</td>
								))}
							</tr>
						))}
						{rows.length === 0 && (
							<tr>
								<td
									colSpan={headers.length}
									className="px-3 py-3 text-center text-gray-500"
								>
									{emptyText}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}

export default function FullBreakdown({ fullBreakdownData = {}, canExport = false }) {
	const filterOptions = fullBreakdownData.filterOptions || [];
	const byPreset = fullBreakdownData.byPreset || {};
	const selectedPayloadMeta = fullBreakdownData.selected || {};
	const [selectedPreset, setSelectedPreset] = useState(
		selectedPayloadMeta.preset || fullBreakdownData.filterDefault || filterOptions[0]?.value || "today",
	);
	const [selectedDate, setSelectedDate] = useState(selectedPayloadMeta.date || "");
	const [customFrom, setCustomFrom] = useState(selectedPayloadMeta.from || "");
	const [customTo, setCustomTo] = useState(selectedPayloadMeta.to || "");
	const [enabledSections, setEnabledSections] = useState(() => {
		const initial = {};
		SECTION_DEFINITIONS.forEach((section) => {
			initial[section.key] = true;
		});
		return initial;
	});

	const payload = byPreset[selectedPreset] || {
		cards: {},
		tables: {},
		payments: {},
		rangeLabel: "-",
	};
	const selectedPayload = selectedPayloadMeta.payload || {
		cards: {},
		tables: {},
		payments: {},
		rangeLabel: "-",
	};
	const isDynamicPreset = selectedPreset === "select_date" || selectedPreset === "custom";
	const effectivePayload =
		isDynamicPreset && selectedPayloadMeta.preset === selectedPreset
			? selectedPayload
			: payload;
	const cards = effectivePayload.cards || {};
	const tables = effectivePayload.tables || {};
	const payments = effectivePayload.payments || {};

	const activeSections = useMemo(
		() =>
			SECTION_DEFINITIONS.filter(
				(section) => enabledSections[section.key] !== false,
			),
		[enabledSections],
	);

	const toggleSection = (key) => {
		setEnabledSections((prev) => ({
			...prev,
			[key]: prev[key] === false,
		}));
	};

	const applyRange = () => {
		router.get(
			route("admin.reports.full-breakdown"),
			{
				fb_preset: selectedPreset,
				fb_date: selectedPreset === "select_date" ? selectedDate : undefined,
				fb_from: selectedPreset === "custom" ? customFrom : undefined,
				fb_to: selectedPreset === "custom" ? customTo : undefined,
			},
			{
				preserveState: true,
				preserveScroll: true,
				replace: true,
				only: ["fullBreakdownData"],
			},
		);
	};

	const exportToPdf = () => {
		if (!canExport) return;
		const doc = new jsPDF({ unit: "pt", format: "a4" });
		const marginX = 36;
		const pageWidth = doc.internal.pageSize.getWidth();
		const pageHeight = doc.internal.pageSize.getHeight();
		const safeWidth = pageWidth - marginX * 2;
		let y = 36;

		doc.setFillColor(245, 158, 11);
		doc.roundedRect(marginX, y, safeWidth, 72, 10, 10, "F");
		doc.setTextColor(255, 255, 255);
		doc.setFontSize(11);
		doc.text("Momma's Bakeshop", marginX + 14, y + 22);
		doc.setFontSize(16);
		doc.text("Reports Full Breakdown", marginX + 14, y + 44);
		doc.setFontSize(10);
		doc.text(`Generated: ${new Date().toLocaleString()}`, marginX + 14, y + 61);
		y += 88;

		doc.setTextColor(55, 65, 81);
		doc.setFontSize(10);
		const selectedLabel =
			filterOptions.find((item) => item.value === selectedPreset)?.label ||
			selectedPreset;
		const rangeExtra =
			selectedPreset === "select_date"
				? ` (${selectedDate || "-"})`
				: selectedPreset === "custom"
					? ` (${customFrom || "-"} to ${customTo || "-"})`
					: "";
		const selectedSections = activeSections
			.map((section) => section.label)
			.join(", ");
		doc.text(
			`Date Range: ${selectedLabel}${rangeExtra} (${effectivePayload.rangeLabel || "-"})`,
			marginX,
			y,
		);
		y += 14;
		doc.text(`Included Sections: ${selectedSections || "None"}`, marginX, y);
		y += 12;

		autoTable(doc, {
			startY: y + 6,
			head: [["Metric", "Value"]],
			body: [
				["Revenue", currency(cards.revenue)],
				["Units Sold", numberFmt(cards.unitsSold)],
				["Production Batches", numberFmt(cards.productionBatches)],
				["Stock-Ins", numberFmt(cards.stockIns)],
				["Stock-Outs", numberFmt(cards.stockOuts)],
				["Shrinked Units", numberFmt(cards.shrinkedUnits)],
				["Losses", currency(cards.losses)],
			],
			theme: "grid",
			styles: { fontSize: 9, cellPadding: 5, textColor: [55, 65, 81] },
			headStyles: { fillColor: [243, 244, 246], textColor: [75, 85, 99] },
			margin: { left: marginX, right: marginX },
		});
		y = doc.lastAutoTable.finalY + 14;

		const appendTable = (title, headers, rows) => {
			if (y > pageHeight - 120) {
				doc.addPage();
				y = 36;
			}
			doc.setFontSize(11);
			doc.setTextColor(31, 41, 55);
			doc.text(title, marginX, y);
			y += 6;
			autoTable(doc, {
				startY: y,
				head: [headers.map((h) => h.label)],
				body: rows.length
					? rows.map((row) => headers.map((h) => row[h.key]))
					: [["No data"]],
				theme: "grid",
				styles: { fontSize: 8.5, cellPadding: 4.5, textColor: [55, 65, 81] },
				headStyles: { fillColor: [243, 244, 246], textColor: [75, 85, 99] },
				margin: { left: marginX, right: marginX },
			});
			y = doc.lastAutoTable.finalY + 14;
		};

		if (enabledSections.productSales !== false) {
			appendTable(
				"Product Sales",
				[
					{ key: "productName", label: "Product" },
					{ key: "units", label: "Units" },
					{ key: "revenue", label: "Revenue" },
				],
				(tables.soldProducts || []).map((row) => ({
					...row,
					units: numberFmt(row.units),
					revenue: currency(row.revenue),
				})),
			);
		}

		if (enabledSections.inventoryMovements !== false) {
			appendTable(
				"Inventory Usage",
				[
					{ key: "itemName", label: "Item" },
					{ key: "unitsUsed", label: "Units Used" },
				],
				(tables.inventoryUsage || []).map((row) => ({
					...row,
					unitsUsed: numberFmt(row.unitsUsed),
				})),
			);

			appendTable(
				"Inventory Leftovers",
				[
					{ key: "itemName", label: "Item Name" },
					{ key: "unitsLeft", label: "Units Left" },
				],
				(tables.inventoryLeftovers || []).map((row) => ({
					...row,
					unitsLeft: numberFmt(row.unitsLeft),
				})),
			);
		}

		if (enabledSections.shrinkagesLosses !== false) {
			appendTable(
				"Shrinkages & Losses",
				[
					{ key: "productName", label: "Product" },
					{ key: "units", label: "Units" },
					{ key: "losses", label: "Losses" },
				],
				(tables.mostShrinkedProducts || []).map((row) => ({
					...row,
					units: numberFmt(row.units),
					losses: currency(row.losses),
				})),
			);
		}

		if (enabledSections.payments !== false) {
			appendTable(
				"Payment Status Breakdown",
				[
					{ key: "status", label: "Status" },
					{ key: "count", label: "Count" },
				],
				[
					{ status: "Paid", count: numberFmt(payments.paidCount || 0) },
					{
						status: "Partially Paid",
						count: numberFmt(payments.partiallyPaidCount || 0),
					},
					{ status: "Unpaid", count: numberFmt(payments.unpaidCount || 0) },
				],
			);
		}

		if (enabledSections.revenue !== false) {
			appendTable(
				"Category Revenue Ranking",
				[
					{ key: "categoryName", label: "Category" },
					{ key: "revenue", label: "Revenue" },
				],
				(tables.categoryRevenueRanking || []).map((row) => ({
					...row,
					revenue: currency(row.revenue),
				})),
			);

			appendTable(
				"Product Leftovers",
				[
					{ key: "productName", label: "Product Name" },
					{ key: "unitsLeft", label: "Units Left" },
					{ key: "totalAmount", label: "Total Amount" },
				],
				(tables.productLeftovers || []).map((row) => ({
					...row,
					unitsLeft: numberFmt(row.unitsLeft),
					totalAmount: currency(row.totalAmount),
				})),
			);
		}

		const stamp = new Date().toISOString().replace(/[:.]/g, "-");
		doc.save(`reports-full-breakdown-${stamp}.pdf`);
	};

	return (
		<div className="space-y-4">
			<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
				<div className="flex flex-col gap-3 md:flex-row md:items-center">
					<div className="flex w-full flex-col gap-3 md:w-auto">
						<button
							type="button"
							onClick={exportToPdf}
							disabled={!canExport}
							className="inline-flex items-center justify-center rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-60"
						>
							Export to PDF
						</button>
					</div>
					<div className="w-full md:w-72">
						<label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
							Date Range
						</label>
							<select
								value={selectedPreset}
								onChange={(e) => setSelectedPreset(e.target.value)}
								className="w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
							>
							{filterOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
							</select>
							<p className="mt-2 text-xs text-gray-500">
								{effectivePayload.rangeLabel || "-"}
							</p>
						</div>
						{selectedPreset === "select_date" && (
							<div className="w-full md:w-52">
								<label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
									Select Date
								</label>
								<input
									type="date"
									value={selectedDate}
									onChange={(e) => setSelectedDate(e.target.value)}
									className="w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
								/>
							</div>
						)}
						{selectedPreset === "custom" && (
							<>
								<div className="w-full md:w-52">
									<label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
										Min Date
									</label>
									<input
										type="date"
										value={customFrom}
										onChange={(e) => setCustomFrom(e.target.value)}
										className="w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
									/>
								</div>
								<div className="w-full md:w-52">
									<label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
										Max Date
									</label>
									<input
										type="date"
										value={customTo}
										onChange={(e) => setCustomTo(e.target.value)}
										className="w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
									/>
								</div>
							</>
						)}
						{isDynamicPreset && (
							<div className="w-full md:w-auto">
								<button
									type="button"
									onClick={applyRange}
									className="inline-flex items-center justify-center rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary-soft"
								>
									Apply Range
								</button>
							</div>
						)}

						<div className="flex flex-wrap items-center gap-3">
						{SECTION_DEFINITIONS.map((section) => (
							<label
								key={section.key}
								className="inline-flex items-center gap-2 text-sm text-gray-700"
							>
								<input
									type="checkbox"
									checked={enabledSections[section.key] !== false}
									onChange={() => toggleSection(section.key)}
									className="rounded border-gray-300 text-primary focus:ring-primary"
								/>
								{section.label}
							</label>
						))}
					</div>
				</div>
			</div>

			{(enabledSections.revenue !== false ||
				enabledSections.production !== false ||
				enabledSections.productSales !== false) && (
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)] items-start">
					<div className="space-y-3">
						{enabledSections.revenue !== false && (
							<>
								<StatCard
									label="Revenue"
									value={currency(cards.revenue)}
									icon={Coins}
								/>
								<StatCard
									label="Units Sold"
									value={numberFmt(cards.unitsSold)}
									icon={PackageCheck}
								/>
							</>
						)}
						{enabledSections.production !== false && (
							<StatCard
								label="Production Batches"
								value={numberFmt(cards.productionBatches)}
								icon={Factory}
							/>
						)}
					</div>
					<div className="space-y-4 min-w-0">
						{enabledSections.productSales !== false && (
							<DataTable
								title="Product Sales"
								headers={[
									{ key: "productName", label: "Product" },
									{ key: "units", label: "Units", render: numberFmt },
									{ key: "revenue", label: "Revenue", render: currency },
								]}
								rows={tables.soldProducts || []}
							/>
						)}
						{enabledSections.revenue !== false && (
							<>
								<DataTable
									title="Category Revenue Ranking"
									headers={[
										{ key: "categoryName", label: "Category" },
										{ key: "revenue", label: "Revenue", render: currency },
									]}
									rows={tables.categoryRevenueRanking || []}
								/>
								<DataTable
									title="Product Leftovers"
									headers={[
										{ key: "productName", label: "Product Name" },
										{ key: "unitsLeft", label: "Units Left", render: numberFmt },
										{ key: "totalAmount", label: "Total Amount", render: currency },
									]}
									rows={tables.productLeftovers || []}
								/>
							</>
						)}
					</div>
				</div>
			)}

			{enabledSections.inventoryMovements !== false && (
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)] items-start">
					<div className="space-y-3">
						<StatCard
							label="Stock-Ins"
							value={numberFmt(cards.stockIns)}
							icon={ArrowDownToLine}
						/>
						<StatCard
							label="Stock-Outs"
							value={numberFmt(cards.stockOuts)}
							icon={ArrowUpFromLine}
						/>
					</div>
					<div className="min-w-0 space-y-4">
						<DataTable
							title="Inventory Usage"
							headers={[
								{ key: "itemName", label: "Item" },
								{ key: "unitsUsed", label: "Units Used", render: numberFmt },
							]}
							rows={tables.inventoryUsage || []}
						/>
						<DataTable
							title="Inventory Leftovers"
							headers={[
								{ key: "itemName", label: "Item Name" },
								{ key: "unitsLeft", label: "Units Left", render: numberFmt },
							]}
							rows={tables.inventoryLeftovers || []}
						/>
					</div>
				</div>
			)}

			{enabledSections.shrinkagesLosses !== false && (
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)] items-start">
					<div className="space-y-3">
						<StatCard
							label="Shrinked Units"
							value={numberFmt(cards.shrinkedUnits)}
							icon={Trash2}
						/>
						<StatCard
							label="Losses"
							value={currency(cards.losses)}
							icon={TrendingDown}
						/>
					</div>
					<div className="min-w-0">
						<DataTable
							title="Shrinked Products"
							headers={[
								{ key: "productName", label: "Product" },
								{ key: "units", label: "Units", render: numberFmt },
								{ key: "losses", label: "Losses", render: currency },
							]}
							rows={tables.mostShrinkedProducts || []}
						/>
					</div>
				</div>
			)}

			{enabledSections.payments !== false && (
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)] items-start">
					<div className="space-y-3">
						<StatCard
							label="Total Collected"
							value={currency(payments.totalCollected)}
							icon={Wallet}
						/>
						<StatCard
							label="Outstanding Amount"
							value={currency(payments.outstandingAmount)}
							icon={TrendingDown}
						/>
						<StatCard
							label="Upcoming Due"
							value={numberFmt(payments.upcomingDueCount)}
							icon={Clock3}
						/>
						<StatCard
							label="Overdue"
							value={numberFmt(payments.overdueCount)}
							icon={BadgeAlert}
						/>
					</div>
					<div className="min-w-0">
						<DataTable
							title="Payment Status Breakdown"
							headers={[
								{ key: "status", label: "Status" },
								{ key: "count", label: "Count", render: numberFmt },
							]}
							rows={[
								{ status: "Paid", count: payments.paidCount || 0 },
								{
									status: "Partially Paid",
									count: payments.partiallyPaidCount || 0,
								},
								{ status: "Unpaid", count: payments.unpaidCount || 0 },
							]}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
