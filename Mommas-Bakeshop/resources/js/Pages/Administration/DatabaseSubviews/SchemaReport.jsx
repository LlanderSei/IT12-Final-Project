import React from "react";

const formatDateTime = (value) => {
	if (!value) return "-";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "-";
	return parsed.toLocaleString();
};

export default function SchemaReport({ schemaReport = null }) {
	return (
		<div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-6">
			<div>
				<h3 className="text-sm font-semibold text-gray-900">Schema Compatibility Report</h3>
				<p className="mt-1 text-xs text-gray-500">Compares local runtime tables against the configured remote runtime database while ignoring local-only control-plane tables.</p>
			</div>
			{!schemaReport ? (
				<div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">No schema report generated yet.</div>
			) : (
				<div className="mt-6 space-y-5">
					<div className={`rounded-lg border p-4 ${schemaReport.compatible ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
						<div className="font-medium">{schemaReport.compatible ? "Remote schema is compatible." : "Remote schema has differences."}</div>
						<div className="mt-1 text-xs">{schemaReport.summary}</div>
						<div className="mt-2 text-xs">Checked {formatDateTime(schemaReport.checkedAt)}</div>
					</div>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div className="rounded-lg border border-gray-200 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Local Database</div><div className="mt-2 text-sm text-gray-900">{schemaReport.localDatabase}</div><div className="mt-1 text-xs text-gray-500">{schemaReport.localTableCount} tables compared</div></div>
						<div className="rounded-lg border border-gray-200 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Remote Database</div><div className="mt-2 text-sm text-gray-900">{schemaReport.remoteDatabase}</div><div className="mt-1 text-xs text-gray-500">{schemaReport.remoteTableCount} tables compared</div></div>
					</div>
					<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
						<div className="rounded-lg border border-gray-200 p-4">
							<div className="text-xs font-semibold uppercase tracking-wide text-red-600">Missing Tables On Remote</div>
							<div className="mt-3 space-y-2 text-sm text-gray-700">{schemaReport.missingTablesOnRemote?.length ? schemaReport.missingTablesOnRemote.map((table) => <div key={table} className="rounded border border-red-200 bg-red-50 px-3 py-2">{table}</div>) : <div className="text-gray-500">None</div>}</div>
						</div>
						<div className="rounded-lg border border-gray-200 p-4">
							<div className="text-xs font-semibold uppercase tracking-wide text-amber-600">Extra Tables On Remote</div>
							<div className="mt-3 space-y-2 text-sm text-gray-700">{schemaReport.extraTablesOnRemote?.length ? schemaReport.extraTablesOnRemote.map((table) => <div key={table} className="rounded border border-amber-200 bg-amber-50 px-3 py-2">{table}</div>) : <div className="text-gray-500">None</div>}</div>
						</div>
					</div>
					<div className="rounded-lg border border-gray-200 p-4">
						<div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Column Differences</div>
						{schemaReport.tableDiffs?.length ? (
							<div className="mt-3 space-y-4">{schemaReport.tableDiffs.map((tableDiff) => (
								<div key={tableDiff.table} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
									<div className="font-medium text-gray-900">{tableDiff.table}</div>
									{tableDiff.missingColumns?.length > 0 && <div className="mt-3"><div className="text-xs font-semibold uppercase tracking-wide text-red-600">Missing Columns On Remote</div><div className="mt-1 break-words text-sm text-red-700">{tableDiff.missingColumns.join(", ")}</div></div>}
									{tableDiff.extraColumns?.length > 0 && <div className="mt-3"><div className="text-xs font-semibold uppercase tracking-wide text-amber-600">Extra Columns On Remote</div><div className="mt-1 break-words text-sm text-amber-700">{tableDiff.extraColumns.join(", ")}</div></div>}
									{tableDiff.changedColumns?.length > 0 && <div className="mt-3 space-y-2">{tableDiff.changedColumns.map((column) => <div key={`${tableDiff.table}-${column.column}`} className="rounded border border-gray-200 bg-white p-2 text-xs text-gray-700"><div className="font-medium text-gray-900">{column.column}</div><div className="mt-1 break-words">Local: {JSON.stringify(column.local)}</div><div className="mt-1 break-words">Remote: {JSON.stringify(column.remote)}</div></div>)}</div>}
								</div>
							))}</div>
						) : <div className="mt-3 text-sm text-gray-500">No column-level differences detected.</div>}
					</div>
				</div>
			)}
		</div>
	);
}
