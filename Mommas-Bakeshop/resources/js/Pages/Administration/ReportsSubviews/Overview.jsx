import React, { useMemo, useRef, useState } from "react";
import { router } from "@inertiajs/react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import {
	Coins,
	PackageCheck,
	Factory,
	ArrowDownToLine,
	ArrowUpFromLine,
	Trash2,
	TrendingDown,
} from "lucide-react";
import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;
const numberFmt = (value) => Number(value || 0).toLocaleString();

const chartColors = {
	revenue: "#f59e0b",
	unitsSold: "#2563eb",
	productionBatches: "#10b981",
	stockIns: "#8b5cf6",
	stockOuts: "#f97316",
	shrinkedUnits: "#ef4444",
	losses: "#dc2626",
};

const cardDefinitions = [
	{ key: "revenue", label: "Revenue", format: "currency", icon: Coins },
	{ key: "unitsSold", label: "Units Sold", format: "number", icon: PackageCheck },
	{ key: "productionBatches", label: "Production Batches", format: "number", icon: Factory },
	{ key: "stockIns", label: "Stock-Ins", format: "number", icon: ArrowDownToLine },
	{ key: "stockOuts", label: "Stock-Outs", format: "number", icon: ArrowUpFromLine },
	{ key: "shrinkedUnits", label: "Shrinked Units", format: "number", icon: Trash2 },
	{ key: "losses", label: "Losses", format: "currency", icon: TrendingDown },
];

function cardValue(value, format) {
	return format === "currency" ? currency(value) : numberFmt(value);
}

function toIsoDate(value) {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return date.toISOString().split("T")[0];
}

function formatPresetLabel(value, options = []) {
	return options.find((option) => option.value === value)?.label || value;
}

function RankingTable({ title, headers = [], rows = [], emptyText = "No data." }) {
	return (
		<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">
				{title}
			</h4>
			<div className="overflow-x-auto">
				<table className="min-w-full text-sm">
					<thead className="bg-gray-50">
						<tr>
							{headers.map((header) => (
								<th
									key={`${title}-${header.key}`}
									className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
								>
									{header.label}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100 bg-white">
						{rows.map((row, index) => (
							<tr key={`${title}-row-${index}`}>
								{headers.map((header) => (
									<td key={`${title}-${index}-${header.key}`} className="px-3 py-2 text-gray-700">
										{header.render ? header.render(row[header.key], row) : row[header.key]}
									</td>
								))}
							</tr>
						))}
						{rows.length === 0 && (
							<tr>
								<td colSpan={headers.length} className="px-3 py-3 text-center text-gray-500">
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

function TrendChart({ labels = [], series = [], chartRef }) {
	const chartData = labels.map((label, index) => {
		const point = { label };
		series.forEach((metric) => {
			point[metric.key] = Number(metric.values?.[index] || 0);
		});
		return point;
	});

	return (
		<div ref={chartRef} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<div className="h-[320px]">
				<ResponsiveContainer width="100%" height="100%">
					<LineChart
						data={chartData}
						margin={{ top: 8, right: 18, left: 8, bottom: 8 }}
					>
						<CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
						<XAxis
							dataKey="label"
							stroke="#6b7280"
							fontSize={11}
							tickLine={false}
							axisLine={{ stroke: "#d1d5db" }}
							interval="preserveStartEnd"
						/>
						<YAxis
							stroke="#6b7280"
							fontSize={11}
							tickLine={false}
							axisLine={{ stroke: "#d1d5db" }}
							tickFormatter={(value) => numberFmt(value)}
						/>
						<Tooltip
							formatter={(value, name) => {
								const metric = series.find((item) => item.key === name);
								if (!metric) return [numberFmt(value), name];
								return [
									metric.isCurrency ? currency(value) : numberFmt(value),
									metric.label,
								];
							}}
							labelStyle={{ color: "#111827", fontWeight: 600 }}
							contentStyle={{
								borderRadius: "8px",
								border: "1px solid #e5e7eb",
								boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
							}}
						/>
						<Legend />
						{series.map((metric) => (
							<Line
								key={`line-${metric.key}`}
								type="monotone"
								dataKey={metric.key}
								name={metric.label}
								stroke={chartColors[metric.key] || "#6b7280"}
								strokeWidth={2.5}
								dot={false}
								activeDot={{ r: 4 }}
							/>
						))}
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}

export default function Overview({ overviewData = {}, canExport = false }) {
	const cardDateFilterOptions = overviewData.cardDateFilterOptions || [];
	const chartFilterOptions = overviewData.chartFilterOptions || [];
	const cardsByPreset = overviewData.cardsByPreset || {};
	const selectedOverview = overviewData.selected || {};
	const chartByPreset = overviewData.chartByPreset || {};
	const chartBaseDaily = overviewData.chartBaseDaily || { labels: [], series: [], bucketKeys: [] };

	const [cardPreset, setCardPreset] = useState(
		selectedOverview.preset || overviewData.cardDateFilterDefault || cardDateFilterOptions[0]?.value || "today",
	);
	const [selectedDate, setSelectedDate] = useState(selectedOverview.date || toIsoDate(new Date()) || "");
	const [cardCustomFrom, setCardCustomFrom] = useState(selectedOverview.from || "");
	const [cardCustomTo, setCardCustomTo] = useState(selectedOverview.to || "");
	const [chartPreset, setChartPreset] = useState(
		overviewData.chartFilterDefault || chartFilterOptions[0]?.value || "past_7_days",
	);
	const [customFrom, setCustomFrom] = useState(
		toIsoDate(chartBaseDaily?.range?.from) || "",
	);
	const [customTo, setCustomTo] = useState(
		toIsoDate(chartBaseDaily?.range?.to) || "",
	);
	const [isExporting, setIsExporting] = useState(false);
	const chartContainerRef = useRef(null);

	const chartSeriesMeta = useMemo(() => {
		const fallback = chartBaseDaily?.series || [];
		const preferred = chartByPreset[chartPreset]?.series || fallback;
		return preferred.map((item) => ({ key: item.key, label: item.label }));
	}, [chartBaseDaily?.series, chartByPreset, chartPreset]);

	const [enabledSeries, setEnabledSeries] = useState(() => {
		const map = {};
		(chartBaseDaily?.series || []).forEach((s) => {
			map[s.key] = true;
		});
		return map;
	});

	const cardPayload = cardsByPreset[cardPreset] || {
		rangeLabel: "",
		cards: {},
		tables: {},
	};
	const selectedCardPayload = selectedOverview.payload || { rangeLabel: "", cards: {}, tables: {} };
	const isDynamicCardPreset = cardPreset === "select_date" || cardPreset === "custom";
	const effectiveCardPayload =
		isDynamicCardPreset && selectedOverview.preset === cardPreset
			? selectedCardPayload
			: cardPayload;

	const chartPayload = useMemo(() => {
		if (chartPreset !== "custom") {
			return chartByPreset[chartPreset] || { labels: [], series: [], bucketKeys: [] };
		}

		const labels = chartBaseDaily.labels || [];
		const bucketKeys = chartBaseDaily.bucketKeys || [];
		const from = customFrom || bucketKeys[0];
		const to = customTo || bucketKeys[bucketKeys.length - 1];

		if (!from || !to) {
			return { labels: [], series: [] };
		}

		const fromDate = new Date(from);
		const toDate = new Date(to);
		const indices = [];
		for (let i = 0; i < bucketKeys.length; i += 1) {
			const date = new Date(bucketKeys[i]);
			if (Number.isNaN(date.getTime())) continue;
			if (date >= fromDate && date <= toDate) indices.push(i);
		}

		const filteredLabels = indices.map((idx) => labels[idx]);
		const filteredSeries = (chartBaseDaily.series || []).map((series) => ({
			...series,
			values: indices.map((idx) => series.values[idx] ?? 0),
		}));

		return {
			labels: filteredLabels,
			series: filteredSeries,
		};
	}, [chartPreset, chartByPreset, chartBaseDaily, customFrom, customTo]);

	const visibleChartSeries = (chartPayload.series || []).filter(
		(series) => enabledSeries[series.key] !== false,
	);

	const toggleSeries = (key) => {
		setEnabledSeries((prev) => ({
			...prev,
			[key]: prev[key] === false,
		}));
	};

	const applyOverviewRange = () => {
		router.get(
			route("admin.reports"),
			{
				overview_preset: cardPreset,
				overview_date: cardPreset === "select_date" ? selectedDate : undefined,
				overview_from: cardPreset === "custom" ? cardCustomFrom : undefined,
				overview_to: cardPreset === "custom" ? cardCustomTo : undefined,
			},
			{
				preserveState: true,
				preserveScroll: true,
				replace: true,
				only: ["overviewData"],
			},
		);
	};

	const exportToPdf = async () => {
		if (!canExport) return;
		setIsExporting(true);
		try {
			const doc = new jsPDF({ unit: "pt", format: "a4" });
			const pageWidth = doc.internal.pageSize.getWidth();
			const pageHeight = doc.internal.pageSize.getHeight();
			const marginX = 36;
			const safeWidth = pageWidth - marginX * 2;
			let y = 36;

			// Branded hero/header
			const heroHeight = 82;
			doc.setFillColor(245, 158, 11);
			doc.roundedRect(marginX, y, safeWidth, heroHeight, 10, 10, "F");
			doc.setTextColor(255, 255, 255);
			doc.setFontSize(11);
			doc.text("Momma's Bakeshop", marginX + 16, y + 24);
			doc.setFontSize(18);
			doc.text("Reports Overview Export", marginX + 16, y + 48);
			doc.setFontSize(10);
			doc.text(`Generated: ${new Date().toLocaleString()}`, marginX + 16, y + 66);
			doc.setDrawColor(255, 255, 255);
			doc.setLineWidth(1);
			doc.line(pageWidth - marginX - 120, y + 16, pageWidth - marginX - 120, y + heroHeight - 16);
			doc.setFontSize(10);
			doc.text("Official Copy", pageWidth - marginX - 102, y + 35);
			doc.text("Internal Use", pageWidth - marginX - 102, y + 53);
			y += heroHeight + 18;

			doc.setFontSize(16);
			doc.setTextColor(17, 24, 39);
			doc.text("Reports Overview", marginX, y);
			y += 18;

			doc.setFontSize(10);
			doc.setTextColor(75, 85, 99);
				const overviewPresetLabel = formatPresetLabel(cardPreset, cardDateFilterOptions);
				const overviewExtraLabel =
					cardPreset === "select_date"
						? ` (${selectedDate || "-"})`
					: cardPreset === "custom"
						? ` (${cardCustomFrom || "-"} to ${cardCustomTo || "-"})`
						: "";
				doc.text(
					`Overview Range: ${overviewPresetLabel}${overviewExtraLabel} (${effectiveCardPayload.rangeLabel || "-"})`,
					marginX,
					y,
				);
			y += 14;

			const chartPresetLabel = formatPresetLabel(chartPreset, chartFilterOptions);
			const customRangeLabel =
				chartPreset === "custom"
					? ` (${customFrom || "-"} to ${customTo || "-"})`
					: "";
			doc.text(`Trend Range: ${chartPresetLabel}${customRangeLabel}`, marginX, y);
			y += 14;
			const activeSeries = chartSeriesMeta
				.filter((metric) => enabledSeries[metric.key] !== false)
				.map((metric) => metric.label)
				.join(", ");
			doc.text(`Visible Trends: ${activeSeries || "None"}`, marginX, y);
			y += 16;

			autoTable(doc, {
				startY: y,
				head: [["Metric", "Value"]],
					body: cardDefinitions.map((card) => [
						card.label,
						cardValue(effectiveCardPayload.cards?.[card.key] ?? 0, card.format),
					]),
				theme: "grid",
				styles: { fontSize: 9, cellPadding: 5, textColor: [55, 65, 81] },
				headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255] },
				margin: { left: marginX, right: marginX },
			});
			y = doc.lastAutoTable.finalY + 14;

			if (chartContainerRef.current) {
				const chartCanvas = await html2canvas(chartContainerRef.current, {
					scale: 2,
					backgroundColor: "#ffffff",
					useCORS: true,
				});
				const chartImage = chartCanvas.toDataURL("image/png");
				const imageRatio = chartCanvas.height / chartCanvas.width;
				const imageWidth = safeWidth;
				const imageHeight = imageWidth * imageRatio;

				if (y + imageHeight + 26 > pageHeight) {
					doc.addPage();
					y = 36;
				}

				doc.setFontSize(11);
				doc.setTextColor(31, 41, 55);
				doc.text("Trend Chart", marginX, y);
				y += 8;
				doc.addImage(chartImage, "PNG", marginX, y, imageWidth, imageHeight);
				y += imageHeight + 14;
			}

			const appendTable = (title, headers, rows) => {
				const bodyRows = rows?.length
					? rows.map((row) => headers.map((header) => row[header.key] ?? "-"))
					: [["No data"]];

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
					head: [headers.map((header) => header.label)],
					body: bodyRows,
					theme: "grid",
					styles: { fontSize: 8.5, cellPadding: 4.5, textColor: [55, 65, 81] },
					headStyles: { fillColor: [243, 244, 246], textColor: [75, 85, 99] },
					margin: { left: marginX, right: marginX },
				});
				y = doc.lastAutoTable.finalY + 14;
			};

			appendTable(
				"Top 5 Most Sold Units",
				[
					{ key: "productName", label: "Product" },
					{ key: "units", label: "Units" },
					{ key: "revenue", label: "Revenue" },
				],
					(effectiveCardPayload.tables?.topMostSold || []).map((row) => ({
					...row,
					units: numberFmt(row.units),
					revenue: currency(row.revenue),
				})),
			);

			appendTable(
				"Top 5 Least Sold Units",
				[
					{ key: "productName", label: "Product" },
					{ key: "units", label: "Units" },
					{ key: "revenue", label: "Revenue" },
				],
					(effectiveCardPayload.tables?.topLeastSold || []).map((row) => ({
					...row,
					units: numberFmt(row.units),
					revenue: currency(row.revenue),
				})),
			);

			appendTable(
				"Top 5 Most Shrinked Units",
				[
					{ key: "productName", label: "Product" },
					{ key: "units", label: "Units" },
					{ key: "losses", label: "Losses" },
				],
					(effectiveCardPayload.tables?.topMostShrinked || []).map((row) => ({
					...row,
					units: numberFmt(row.units),
					losses: currency(row.losses),
				})),
			);

			appendTable(
				"Top 5 Most Used Inventory",
				[
					{ key: "itemName", label: "Item" },
					{ key: "unitsUsed", label: "Units Used" },
				],
					(effectiveCardPayload.tables?.topMostUsedInventory || []).map((row) => ({
					...row,
					unitsUsed: numberFmt(row.unitsUsed),
				})),
			);

			appendTable(
				"Top 5 Least Used Inventory",
				[
					{ key: "itemName", label: "Item" },
					{ key: "unitsUsed", label: "Units Used" },
				],
					(effectiveCardPayload.tables?.topLeastUsedInventory || []).map((row) => ({
					...row,
					unitsUsed: numberFmt(row.unitsUsed),
				})),
			);

			appendTable(
				"Top 5 Product Categories by Revenue",
				[
					{ key: "categoryName", label: "Category" },
					{ key: "revenue", label: "Revenue" },
				],
					(effectiveCardPayload.tables?.categoryRevenueRanking || []).map((row) => ({
					...row,
					revenue: currency(row.revenue),
				})),
			);

			const stamp = new Date().toISOString().replace(/[:.]/g, "-");
			doc.save(`reports-overview-${stamp}.pdf`);
		} finally {
			setIsExporting(false);
		}
	};

	return (
		<div className="space-y-4">
			<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
				<div className="flex flex-col md:flex-row md:items-center gap-3">
					<div className="w-full md:w-auto">
						<button
							type="button"
							onClick={exportToPdf}
							disabled={isExporting || !canExport}
							className="inline-flex items-center justify-center rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-60"
						>
							{isExporting ? "Exporting..." : "Export to PDF"}
						</button>
					</div>
					<div className="w-full md:w-64">
						<label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
							Overview Range
						</label>
						<select
							value={cardPreset}
							onChange={(e) => setCardPreset(e.target.value)}
							className="w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
						>
							{cardDateFilterOptions.map((option) => (
								<option key={`card-range-${option.value}`} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</div>
					{cardPreset === "select_date" && (
						<div className="w-full md:w-52">
							<label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
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
					{cardPreset === "custom" && (
						<>
							<div className="w-full md:w-52">
								<label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
									Min Date
								</label>
								<input
									type="date"
									value={cardCustomFrom}
									onChange={(e) => setCardCustomFrom(e.target.value)}
									className="w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
								/>
							</div>
							<div className="w-full md:w-52">
								<label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
									Max Date
								</label>
								<input
									type="date"
									value={cardCustomTo}
									onChange={(e) => setCardCustomTo(e.target.value)}
									className="w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
								/>
							</div>
						</>
					)}
					{isDynamicCardPreset && (
						<div className="w-full md:w-auto">
							<button
								type="button"
								onClick={applyOverviewRange}
								className="inline-flex items-center justify-center rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary-soft"
							>
								Apply Range
							</button>
						</div>
					)}
					<div>
						<p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
							Date Span
						</p>
						<p className="text-sm text-gray-700">{effectiveCardPayload.rangeLabel || "-"}</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-4 items-start">
				<div className="space-y-3">
					{cardDefinitions.map((card) => {
						const Icon = card.icon;
						return (
							<div
								key={card.key}
								className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
							>
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
											{card.label}
										</p>
											<p className="mt-2 text-2xl font-semibold text-gray-900">
												{cardValue(effectiveCardPayload.cards?.[card.key] ?? 0, card.format)}
											</p>
									</div>
									<div className="rounded-md bg-primary-soft p-2 text-primary shrink-0">
										<Icon size={18} strokeWidth={1.9} />
									</div>
								</div>
							</div>
						);
					})}
				</div>

				<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-4">
					<div className="flex flex-col gap-3">
						<div className="flex flex-wrap items-center gap-3">
							{chartSeriesMeta.map((metric) => (
								<label
									key={`metric-toggle-${metric.key}`}
									className="inline-flex items-center gap-2 text-sm text-gray-700"
								>
									<input
										type="checkbox"
										checked={enabledSeries[metric.key] !== false}
										onChange={() => toggleSeries(metric.key)}
										className="rounded border-gray-300 text-primary focus:ring-primary"
									/>
									{metric.label}
								</label>
							))}
						</div>

						<div className="flex flex-col md:flex-row md:items-end gap-3">
							<div className="w-full md:w-64">
								<label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
									Trend Range
								</label>
								<select
									value={chartPreset}
									onChange={(e) => setChartPreset(e.target.value)}
									className="w-full rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
								>
									{chartFilterOptions.map((option) => (
										<option key={`chart-range-${option.value}`} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</div>

							{chartPreset === "custom" && (
								<>
									<div>
										<label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
											From
										</label>
										<input
											type="date"
											value={customFrom}
											onChange={(e) => setCustomFrom(e.target.value)}
											className="rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
										/>
									</div>
									<div>
										<label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
											To
										</label>
										<input
											type="date"
											value={customTo}
											onChange={(e) => setCustomTo(e.target.value)}
											className="rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
										/>
									</div>
								</>
							)}
						</div>
					</div>

					<TrendChart
						labels={chartPayload.labels || []}
						series={visibleChartSeries}
						chartRef={chartContainerRef}
					/>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<RankingTable
					title="Top 5 Most Sold Units"
					headers={[
						{ key: "productName", label: "Product" },
						{ key: "units", label: "Units", render: (value) => numberFmt(value) },
						{ key: "revenue", label: "Revenue", render: (value) => currency(value) },
					]}
					rows={effectiveCardPayload.tables?.topMostSold || []}
				/>

				<RankingTable
					title="Top 5 Least Sold Units"
					headers={[
						{ key: "productName", label: "Product" },
						{ key: "units", label: "Units", render: (value) => numberFmt(value) },
						{ key: "revenue", label: "Revenue", render: (value) => currency(value) },
					]}
					rows={effectiveCardPayload.tables?.topLeastSold || []}
				/>

				<RankingTable
					title="Top 5 Most Shrinked Units"
					headers={[
						{ key: "productName", label: "Product" },
						{ key: "units", label: "Units", render: (value) => numberFmt(value) },
						{ key: "losses", label: "Losses", render: (value) => currency(value) },
					]}
					rows={effectiveCardPayload.tables?.topMostShrinked || []}
				/>

				<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-4">
					<h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
						Inventory Usage (Top 5 Most/Least)
					</h4>
					<RankingTable
						title="Most Used"
						headers={[
							{ key: "itemName", label: "Item" },
							{ key: "unitsUsed", label: "Units Used", render: (value) => numberFmt(value) },
						]}
						rows={effectiveCardPayload.tables?.topMostUsedInventory || []}
					/>
					<RankingTable
						title="Least Used"
						headers={[
							{ key: "itemName", label: "Item" },
							{ key: "unitsUsed", label: "Units Used", render: (value) => numberFmt(value) },
						]}
						rows={effectiveCardPayload.tables?.topLeastUsedInventory || []}
					/>
				</div>

				<RankingTable
					title="Top 5 Product Categories by Revenue"
					headers={[
						{ key: "categoryName", label: "Category" },
						{ key: "revenue", label: "Revenue", render: (value) => currency(value) },
					]}
					rows={effectiveCardPayload.tables?.categoryRevenueRanking || []}
				/>
			</div>
		</div>
	);
}
