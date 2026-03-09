import React from "react";

const formatDateTime = (value) => {
	if (!value) return "-";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "-";
	return parsed.toLocaleString();
};

export default function DataTransfer({ connectionStatus = {}, schemaReport = null, lastTransfer = null }) {
	return (
		<div className="grid min-h-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
			<div className="min-h-0 overflow-y-auto rounded-lg border border-gray-200 bg-white p-6">
				<h3 className="text-sm font-semibold text-gray-900">Local To Remote Data Transfer</h3>
				<p className="mt-1 text-xs text-gray-500">This overwrites remote runtime tables with the current local runtime data. Use it only after a successful schema report and only during a maintenance window.</p>
				<div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
					<div className="font-medium">This operation is destructive for remote runtime data.</div>
					<div className="mt-2 text-xs text-amber-800">Remote triggers are dropped, remote application data is truncated, local rows are inserted, then the original remote triggers are restored.</div>
				</div>
				<div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
					<div className="font-medium text-gray-900">Transfer readiness</div>
					<div className="mt-2 text-xs">Remote connection test: <span className="font-medium">{connectionStatus.remote?.lastTestSucceeded ? "Passed" : "Not verified"}</span></div>
					<div className="mt-1 text-xs">Schema report: <span className="font-medium">{schemaReport?.compatible ? "Compatible" : schemaReport ? "Blocked" : "Not run"}</span></div>
					<div className="mt-1 text-xs">Remote target: <span className="font-medium">{connectionStatus.remote?.host || "-"}:{connectionStatus.remote?.port || "-"} / {connectionStatus.remote?.database || "-"}</span></div>
				</div>
			</div>
			<div className="min-h-0 overflow-y-auto rounded-lg border border-gray-200 bg-white p-6">
				<h3 className="text-sm font-semibold text-gray-900">Last Transfer</h3>
				{lastTransfer ? (
					<>
						<p className="mt-3 text-sm text-gray-700">{lastTransfer.message}</p>
						<p className="mt-1 text-xs text-gray-500">Completed {formatDateTime(lastTransfer.transferredAt)} into {lastTransfer.remoteDatabase}.</p>
						<div className="mt-4 grid grid-cols-1 gap-2">{Object.entries(lastTransfer.tables || {}).map(([table, rowCount]) => <div key={table} className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700"><span className="font-medium text-gray-900">{table}</span><div className="mt-1">{rowCount} rows</div></div>)}</div>
					</>
				) : (
					<div className="mt-3 text-sm text-gray-500">No local-to-remote transfer has been recorded yet.</div>
				)}
			</div>
		</div>
	);
}
