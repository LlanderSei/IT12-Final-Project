import React from "react";

export default function RetentionCleanup({ settingsForm, setSettingsForm, settingsErrors = {}, hasOngoingOperation }) {
	return (
		<div className="grid min-h-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
			<div className="min-h-0 overflow-y-auto rounded-lg border border-gray-200 bg-white p-6">
				<form id="database-retention-form" className="space-y-5">
					<div>
						<h3 className="text-sm font-semibold text-gray-900">Retention Settings</h3>
						<p className="mt-1 text-xs text-gray-500">Configure how many snapshot and incremental backups should be retained before cleanup removes old records and local files.</p>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700">Snapshot Retention Count</label>
						<input type="number" min="1" value={settingsForm.SnapshotRetentionCount} onChange={(e) => setSettingsForm((prev) => ({ ...prev, SnapshotRetentionCount: e.target.value }))} disabled={hasOngoingOperation} className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" />
						{settingsErrors.SnapshotRetentionCount && <p className="mt-1 text-sm text-red-600">{settingsErrors.SnapshotRetentionCount}</p>}
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700">Incremental Retention Count</label>
						<input type="number" min="1" value={settingsForm.IncrementalRetentionCount} onChange={(e) => setSettingsForm((prev) => ({ ...prev, IncrementalRetentionCount: e.target.value }))} disabled={hasOngoingOperation} className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary" />
						{settingsErrors.IncrementalRetentionCount && <p className="mt-1 text-sm text-red-600">{settingsErrors.IncrementalRetentionCount}</p>}
					</div>
					<label className="inline-flex items-center gap-2 text-sm text-gray-700">
						<input type="checkbox" checked={settingsForm.DeleteFailedBackups} onChange={(e) => setSettingsForm((prev) => ({ ...prev, DeleteFailedBackups: e.target.checked }))} disabled={hasOngoingOperation} className="rounded border-gray-300 text-primary focus:ring-primary" />
						Delete failed backups during cleanup
					</label>
				</form>
			</div>
			<div className="min-h-0 overflow-y-auto rounded-lg border border-gray-200 bg-white p-6">
				<h3 className="text-sm font-semibold text-gray-900">Cleanup Notes</h3>
				<div className="mt-4 space-y-3 text-sm text-gray-700">
					<div className="rounded border border-gray-200 bg-gray-50 p-3">Cleanup removes old backup records and local files according to the configured retention counts.</div>
					<div className="rounded border border-amber-200 bg-amber-50 p-3 text-amber-900">Run cleanup only after verifying that recent backups are healthy and downloadable.</div>
				</div>
			</div>
		</div>
	);
}
