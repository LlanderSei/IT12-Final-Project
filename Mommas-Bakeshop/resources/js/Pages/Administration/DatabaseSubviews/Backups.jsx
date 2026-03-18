import React from "react";
import { CheckCircle2, Download, RotateCcw } from "lucide-react";

const formatDateTime = (value) => {
	if (!value) return "-";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "-";
	return parsed.toLocaleString();
};

const formatFileSize = (value) => {
	const bytes = Number(value || 0);
	if (!bytes) return "-";
	const units = ["B", "KB", "MB", "GB"];
	let size = bytes;
	let unit = 0;
	while (size >= 1024 && unit < units.length - 1) {
		size /= 1024;
		unit += 1;
	}
	return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
};

const changeRangeLabel = (backup) =>
	backup.BackupType === "Snapshot"
		? `0 -> ${backup.ToChangeLogID || 0}`
		: `${backup.FromChangeLogID || 0} -> ${backup.ToChangeLogID || 0}`;

export default function Backups({
	backups = [],
	stats = {},
	searchQuery,
	setSearchQuery,
	typeFilter,
	setTypeFilter,
	statusFilter,
	setStatusFilter,
	hasOngoingOperation,
	canDownload,
	canVerify,
	canRestore,
	onDownload,
	onVerify,
	onRestore,
}) {
	const cards = [
		{
			label: "Tracked Tables",
			value: Number(stats.trackedTables || 0),
			help: "Tables included in snapshot and incremental coverage.",
		},
		{
			label: "Change Log Position",
			value: Number(stats.latestChangeLogId || 0),
			help: "Latest captured row-level backup change ID.",
		},
		{
			label: "Completed Backups",
			value: Number(stats.completedBackups || 0),
			help: "Completed local backup records currently retained.",
		},
		{
			label: "Last Completed Backup",
			value: stats.lastCompletedBackup
				? `${stats.lastCompletedBackup.BackupType} #${stats.lastCompletedBackup.id}`
				: "None yet",
			help: stats.lastCompletedBackup
				? formatDateTime(stats.lastCompletedBackup.CompletedAt)
				: "Create a snapshot first to enable incrementals.",
		},
	];

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-6 2xl:flex-row">
			<div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border border-gray-200 bg-white">
				<div className="border-b border-gray-200 px-6 py-4">
					<div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
						<div className="relative w-full xl:max-w-xl">
							<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
								<svg
									className="h-5 w-5 text-gray-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
									/>
								</svg>
							</div>
							<input
								type="text"
								className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
								placeholder="Search by type, status, file name, creator, or checksum..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<select
								value={typeFilter}
								onChange={(e) => setTypeFilter(e.target.value)}
								className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
							>
								<option value="all">All Types</option>
								<option value="Snapshot">Snapshot</option>
								<option value="Incremental">Incremental</option>
							</select>
							<select
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value)}
								className="w-40 rounded-md border-gray-300 text-sm focus:border-primary focus:ring-primary"
							>
								<option value="all">All Status</option>
								<option value="Completed">Completed</option>
								<option value="Pending">Pending</option>
								<option value="Failed">Failed</option>
							</select>
							<button
								type="button"
								onClick={() => {
									setSearchQuery("");
									setTypeFilter("all");
									setStatusFilter("all");
								}}
								className="rounded-md border border-primary bg-white px-3 py-2 text-xs font-medium text-primary shadow-sm hover:bg-primary-soft"
							>
								Reset Filters
							</button>
						</div>
					</div>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto rounded-b-lg">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
							<tr>
								{[
									"Type",
									"Status",
									"File",
									"Range",
									"Size",
									"Created By",
									"Completed",
									"Actions",
								].map((label) => (
									<th
										key={label}
										className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
									>
										{label}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200 bg-white">
							{backups.length === 0 ? (
								<tr>
									<td
										colSpan={8}
										className="px-6 py-12 text-center text-sm text-gray-500"
									>
										No backup records found.
									</td>
								</tr>
							) : (
								backups.map((backup) => (
									<tr key={backup.id} className="align-top">
										<td className="px-6 py-4 text-sm font-medium text-gray-900">
											{backup.BackupType}
										</td>
										<td className="px-6 py-4 text-sm">
											<span
												className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${backup.BackupStatus === "Completed" ? "bg-emerald-100 text-emerald-700" : backup.BackupStatus === "Pending" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}
											>
												{backup.BackupStatus}
											</span>
										</td>
										<td className="px-6 py-4 text-sm text-gray-700">
											<div className="font-medium text-gray-900">
												{backup.FileName || "Pending file generation"}
											</div>
											{backup.ChecksumSha256 && (
												<div className="mt-1 break-all text-xs text-gray-500">
													SHA256: {backup.ChecksumSha256}
												</div>
											)}
											{backup.FailureMessage && (
												<div className="mt-1 break-words text-xs text-red-600">
													{backup.FailureMessage}
												</div>
											)}
										</td>
										<td className="px-6 py-4 text-sm text-gray-700">
											{changeRangeLabel(backup)}
										</td>
										<td className="px-6 py-4 text-sm text-gray-700">
											{formatFileSize(backup.FileSizeBytes)}
										</td>
										<td className="px-6 py-4 text-sm text-gray-700">
											{backup.CreatedBy || "System"}
										</td>
										<td className="px-6 py-4 text-sm text-gray-700">
											{formatDateTime(backup.CompletedAt || backup.DateAdded)}
										</td>
										<td className="px-6 py-4 text-sm">
											<div className="flex flex-wrap gap-2">
												<button
													type="button"
													onClick={() => onDownload(backup)}
													disabled={
														hasOngoingOperation ||
														!canDownload ||
														backup.BackupStatus !== "Completed"
													}
													className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
												>
													<Download className="h-3.5 w-3.5" />
													Download
												</button>
												<button
													type="button"
													onClick={() => onVerify(backup)}
													disabled={
														hasOngoingOperation ||
														!canVerify ||
														backup.BackupStatus !== "Completed"
													}
													className="inline-flex items-center gap-1.5 rounded-md border border-primary bg-white px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50"
												>
													<CheckCircle2 className="h-3.5 w-3.5" />
													Verify
												</button>
												<button
													type="button"
													onClick={() => onRestore(backup)}
													disabled={
														hasOngoingOperation ||
														!canRestore ||
														backup.BackupStatus !== "Completed" ||
														Boolean(backup.RestorePreviewError)
													}
													className="inline-flex items-center gap-1.5 rounded-md border border-primary bg-white px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50"
												>
													<RotateCcw className="h-3.5 w-3.5" />
													Restore
												</button>
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:flex 2xl:min-h-0 2xl:w-[320px] 2xl:min-w-[320px] 2xl:flex-col">
				{cards.map((card) => (
					<div
						key={card.label}
						className="rounded-lg border border-gray-200 bg-white p-4"
					>
						<div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
							{card.label}
						</div>
						<div className="mt-2 text-2xl font-semibold text-gray-900">
							{card.value}
						</div>
						<div className="mt-2 text-xs text-gray-500">{card.help}</div>
					</div>
				))}
			</div>
		</div>
	);
}
