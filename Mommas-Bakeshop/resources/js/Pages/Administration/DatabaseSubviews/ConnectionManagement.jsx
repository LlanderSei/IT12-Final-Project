import React from "react";

const formatDateTime = (value) => {
	if (!value) return "-";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "-";
	return parsed.toLocaleString();
};

const statusTone = (state) => {
	if (state === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-900";
	if (state === "schema_missing" || state === "database_missing") return "border-amber-200 bg-amber-50 text-amber-900";
	return "border-gray-200 bg-gray-50 text-gray-700";
};

export default function ConnectionManagement({
	connectionForm,
	setConnectionForm,
	connectionErrors = {},
	connectionStatus = {},
	remoteReadiness = null,
	hasOngoingOperation,
}) {
	return (
		<div className="grid min-h-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
			<div className="min-h-0 overflow-y-auto rounded-lg border border-gray-200 bg-white p-6">
				<form id="database-connections-form" className="space-y-5">
					<div>
						<h3 className="text-sm font-semibold text-gray-900">Remote MySQL Settings</h3>
						<p className="mt-1 text-xs text-gray-500">These credentials are stored locally and used only for remote tests, initialization, transfer, and target switching.</p>
					</div>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<label className="block text-sm font-medium text-gray-700">Host</label>
							<input type="text" value={connectionForm.host} onChange={(e) => setConnectionForm((prev) => ({ ...prev, host: e.target.value }))} disabled={hasOngoingOperation} className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" />
							{connectionErrors.host && <p className="mt-1 text-sm text-red-600">{connectionErrors.host}</p>}
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700">Port</label>
							<input type="number" value={connectionForm.port} onChange={(e) => setConnectionForm((prev) => ({ ...prev, port: e.target.value }))} disabled={hasOngoingOperation} className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" />
							{connectionErrors.port && <p className="mt-1 text-sm text-red-600">{connectionErrors.port}</p>}
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700">Database</label>
							<input type="text" value={connectionForm.database} onChange={(e) => setConnectionForm((prev) => ({ ...prev, database: e.target.value }))} disabled={hasOngoingOperation} className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" />
							{connectionErrors.database && <p className="mt-1 text-sm text-red-600">{connectionErrors.database}</p>}
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700">Username</label>
							<input type="text" value={connectionForm.username} onChange={(e) => setConnectionForm((prev) => ({ ...prev, username: e.target.value }))} disabled={hasOngoingOperation} className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" />
							{connectionErrors.username && <p className="mt-1 text-sm text-red-600">{connectionErrors.username}</p>}
						</div>
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700">Password</label>
							<input type="password" value={connectionForm.password} onChange={(e) => setConnectionForm((prev) => ({ ...prev, password: e.target.value }))} disabled={hasOngoingOperation} className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" placeholder={connectionStatus.remoteFormDefaults?.hasSavedPassword ? "Leave blank to keep saved password" : "Enter remote MySQL password"} />
							{connectionErrors.password && <p className="mt-1 text-sm text-red-600">{connectionErrors.password}</p>}
						</div>
					</div>
				</form>
			</div>
			<div className="min-h-0 space-y-4 overflow-y-auto">
				<div className="rounded-lg border border-gray-200 bg-white p-4">
					<div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current Target</div>
					<div className="mt-2 text-lg font-semibold text-gray-900">{connectionStatus.appliedTarget === "remote" ? "Remote MySQL" : "Local MySQL"}</div>
					<div className="mt-2 text-xs text-gray-500">Requested: {connectionStatus.requestedTarget || "local"}</div>
					{connectionStatus.runtimeIssue && <div className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">{connectionStatus.runtimeIssue}</div>}
				</div>
				<div className="rounded-lg border border-gray-200 bg-white p-4">
					<div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Local Runtime</div>
					<div className="mt-2 space-y-1 text-sm text-gray-700">
						<div>{connectionStatus.local?.host || "-"}:{connectionStatus.local?.port || "-"}</div>
						<div>{connectionStatus.local?.database || "-"}</div>
						<div>{connectionStatus.local?.username || "-"}</div>
					</div>
				</div>
				<div className="rounded-lg border border-gray-200 bg-white p-4">
					<div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Remote Readiness</div>
					<div className={`mt-3 rounded border p-3 text-sm ${statusTone(remoteReadiness?.state)}`}>
						<div className="font-medium">{remoteReadiness?.state || "Not checked"}</div>
						<div className="mt-1 break-words text-xs">{remoteReadiness?.message || "Save remote settings and run a connection test."}</div>
						{remoteReadiness?.serverVersion && <div className="mt-2 text-xs">Server version: {remoteReadiness.serverVersion}</div>}
						<div className="mt-2 text-xs text-gray-500">Last initialized: {formatDateTime(connectionStatus.remote?.lastInitializedAt)}</div>
					</div>
				</div>
			</div>
		</div>
	);
}
