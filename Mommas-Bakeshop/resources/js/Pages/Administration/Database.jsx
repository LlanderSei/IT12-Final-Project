import React, { useEffect, useMemo, useState } from "react";
import { Head, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import Modal from "@/Components/Modal";
import { formatCountLabel } from "@/utils/countLabel";
import usePermissions from "@/hooks/usePermissions";

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

export default function Database({ backups = [], stats = {}, settings = {} }) {
	const { can, requirePermission } = usePermissions();
	const canCreateSnapshot = can("CanCreateDatabaseSnapshot");
	const canCreateIncremental = can("CanCreateDatabaseIncremental");
	const canRestore = can("CanRestoreDatabaseBackup");
	const canManageSettings = can("CanManageDatabaseBackupSettings");
	const canCleanup = can("CanCleanupDatabaseBackups");
	const canDownload = can("CanDownloadDatabaseBackup");

	const [searchQuery, setSearchQuery] = useState("");
	const [typeFilter, setTypeFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [modalType, setModalType] = useState(null);
	const [selectedBackup, setSelectedBackup] = useState(null);
	const [notes, setNotes] = useState("");
	const [errors, setErrors] = useState({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [settingsForm, setSettingsForm] = useState({
		SnapshotRetentionCount: String(settings.SnapshotRetentionCount ?? 10),
		IncrementalRetentionCount: String(settings.IncrementalRetentionCount ?? 30),
		DeleteFailedBackups: Boolean(settings.DeleteFailedBackups ?? false),
	});
	const [settingsErrors, setSettingsErrors] = useState({});
	const [isSavingSettings, setIsSavingSettings] = useState(false);
	const canCreateIncrementalRun =
		canCreateIncremental && Number(stats.completedBackups || 0) > 0;

	const filteredBackups = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		return [...(backups || [])]
			.filter((backup) => {
				if (typeFilter !== "all" && backup.BackupType !== typeFilter) return false;
				if (statusFilter !== "all" && backup.BackupStatus !== statusFilter) return false;
				if (!query) return true;
				return [
					backup.id,
					backup.BackupType,
					backup.BackupStatus,
					backup.FileName,
					backup.CreatedBy,
					backup.Notes,
					backup.ChecksumSha256,
				]
					.join(" ")
					.toLowerCase()
					.includes(query);
			})
			.sort((a, b) => new Date(b.DateAdded || 0).getTime() - new Date(a.DateAdded || 0).getTime());
	}, [backups, searchQuery, statusFilter, typeFilter]);

	const countLabel = formatCountLabel(filteredBackups.length, "backup");

	useEffect(() => {
		setErrors({});
	}, [modalType]);

	const closeModal = () => {
		setModalType(null);
		setSelectedBackup(null);
		setNotes("");
		setErrors({});
		setIsSubmitting(false);
	};

	const openCreateModal = (type) => {
		if (type === "Snapshot" && !canCreateSnapshot) {
			return requirePermission("CanCreateDatabaseSnapshot");
		}
		if (type === "Incremental" && !canCreateIncrementalRun) {
			return requirePermission("CanCreateDatabaseIncremental");
		}
		setSelectedBackup(null);
		setNotes("");
		setModalType(type);
	};

	const openRestoreModal = (backup) => {
		if (!canRestore) return requirePermission("CanRestoreDatabaseBackup");
		setSelectedBackup(backup);
		setNotes("");
		setModalType("Restore");
	};

	const openCleanupModal = () => {
		if (!canCleanup) return requirePermission("CanCleanupDatabaseBackups");
		setSelectedBackup(null);
		setNotes("");
		setModalType("Cleanup");
	};

	const submitAction = (e) => {
		e.preventDefault();
		setIsSubmitting(true);
		setErrors({});

		let destination = null;
		if (modalType === "Snapshot") destination = route("admin.database.snapshots.store");
		if (modalType === "Incremental") destination = route("admin.database.incrementals.store");
		if (modalType === "Restore" && selectedBackup) destination = route("admin.database.restore", selectedBackup.id);
		if (modalType === "Cleanup") destination = route("admin.database.cleanup");
		if (!destination) {
			setIsSubmitting(false);
			return;
		}

		router.post(
			destination,
			{ Notes: notes },
			{
				preserveScroll: true,
				onError: (formErrors) => setErrors(formErrors || {}),
				onSuccess: () => closeModal(),
				onFinish: () => setIsSubmitting(false),
			},
		);
	};

	const saveSettings = (e) => {
		e.preventDefault();
		if (!canManageSettings) return requirePermission("CanManageDatabaseBackupSettings");
		setIsSavingSettings(true);
		setSettingsErrors({});
		router.put(
			route("admin.database.settings.update"),
			{
				SnapshotRetentionCount: Number(settingsForm.SnapshotRetentionCount || 0),
				IncrementalRetentionCount: Number(settingsForm.IncrementalRetentionCount || 0),
				DeleteFailedBackups: settingsForm.DeleteFailedBackups,
			},
			{
				preserveScroll: true,
				onError: (formErrors) => setSettingsErrors(formErrors || {}),
				onFinish: () => setIsSavingSettings(false),
			},
		);
	};

	const downloadBackup = (backup) => {
		if (!canDownload) return requirePermission("CanDownloadDatabaseBackup");
		window.location.href = route("admin.database.download", backup.id);
	};

	return (
		<AuthenticatedLayout
			header={
				<div className="flex items-center justify-between gap-4">
					<h2 className="font-semibold text-xl text-gray-800 leading-tight">Database</h2>
					<div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
						{countLabel}
					</div>
				</div>
			}
			disableScroll={true}
		>
			<Head title="Database" />

			<div className="flex flex-1 flex-col overflow-hidden min-h-0">
				<div className="mx-auto flex w-full flex-1 flex-col overflow-hidden min-h-0 p-6 gap-6">
					<div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
						<div className="rounded-lg border border-gray-200 bg-white p-4">
							<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tracked Tables</p>
							<p className="mt-2 text-2xl font-semibold text-gray-900">{Number(stats.trackedTables || 0)}</p>
						</div>
						<div className="rounded-lg border border-gray-200 bg-white p-4">
							<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Change Log Position</p>
							<p className="mt-2 text-2xl font-semibold text-gray-900">{Number(stats.latestChangeLogId || 0)}</p>
						</div>
						<div className="rounded-lg border border-gray-200 bg-white p-4">
							<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Completed Backups</p>
							<p className="mt-2 text-2xl font-semibold text-gray-900">{Number(stats.completedBackups || 0)}</p>
						</div>
						<div className="rounded-lg border border-gray-200 bg-white p-4">
							<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Last Completed Backup</p>
							<p className="mt-2 text-sm font-medium text-gray-900">
								{stats.lastCompletedBackup
									? `${stats.lastCompletedBackup.BackupType} #${stats.lastCompletedBackup.id}`
									: "None yet"}
							</p>
							<p className="mt-1 text-xs text-gray-500">
								{stats.lastCompletedBackup
									? formatDateTime(stats.lastCompletedBackup.CompletedAt)
									: "Create a snapshot first to enable incrementals."}
							</p>
						</div>
					</div>

					<div className="grid min-h-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-[1.6fr_0.9fr]">
						<div className="flex min-h-0 flex-col overflow-hidden rounded-lg bg-white shadow-sm">
							<div className="p-6 flex flex-1 flex-col overflow-hidden min-h-0">
								<div className="mb-6 flex items-start gap-3">
									<div className="relative w-full max-w-xl shrink-0">
										<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
											<svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
											</svg>
										</div>
										<input
											type="text"
											className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm leading-5 placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
											placeholder="Search by type, status, file name, creator, or checksum..."
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
										/>
									</div>
									<div className="flex flex-1 min-w-0 items-center gap-2">
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
											className="shrink-0 rounded-md border border-primary bg-white px-3 py-2 text-xs font-medium text-primary shadow-sm hover:bg-primary-soft"
										>
											Reset Filters
										</button>
									</div>
								</div>

								<div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-gray-200">
									<table className="min-w-full divide-y divide-gray-200">
										<thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
											<tr>
												<th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Type</th>
												<th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
												<th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">File</th>
												<th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Size</th>
												<th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Change Range</th>
												<th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Created By</th>
												<th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Completed</th>
												<th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-gray-200 bg-white">
											{filteredBackups.map((backup) => (
												<tr key={backup.id} className="align-top hover:bg-gray-50">
													<td className="px-6 py-4 text-sm font-medium text-gray-900">{backup.BackupType}</td>
													<td className="px-6 py-4 text-sm">
														<span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${backup.BackupStatus === "Completed" ? "bg-emerald-100 text-emerald-700" : backup.BackupStatus === "Failed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
															{backup.BackupStatus}
														</span>
													</td>
													<td className="px-6 py-4 text-sm text-gray-700">
														<div className="max-w-sm break-words">
															<p className="font-medium text-gray-900">{backup.FileName || "-"}</p>
															{backup.Notes && <p className="mt-1 text-xs text-gray-500">{backup.Notes}</p>}
															{backup.FailureMessage && <p className="mt-1 text-xs text-red-600">{backup.FailureMessage}</p>}
														</div>
													</td>
													<td className="px-6 py-4 text-sm text-gray-700">{formatFileSize(backup.FileSizeBytes)}</td>
													<td className="px-6 py-4 text-sm text-gray-700">{changeRangeLabel(backup)}</td>
													<td className="px-6 py-4 text-sm text-gray-700">{backup.CreatedBy || "System"}</td>
													<td className="px-6 py-4 text-sm text-gray-700">{formatDateTime(backup.CompletedAt)}</td>
													<td className="px-6 py-4 text-right text-sm font-medium">
														<div className="inline-flex items-center gap-2">
															<button
																type="button"
																onClick={() => downloadBackup(backup)}
																disabled={!canDownload || backup.BackupStatus !== "Completed"}
																className="rounded border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50"
															>
																Download
															</button>
															<button
																type="button"
																onClick={() => openRestoreModal(backup)}
																disabled={!canRestore || backup.BackupStatus !== "Completed"}
																className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
															>
																Restore
															</button>
														</div>
													</td>
												</tr>
											))}
											{filteredBackups.length === 0 && (
												<tr>
													<td colSpan="8" className="px-6 py-10 text-center text-sm text-gray-500">
														No backups found.
													</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>
							</div>
						</div>

						<div className="flex flex-col gap-6 overflow-hidden">
							<form onSubmit={saveSettings} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
								<div className="flex items-center justify-between gap-3">
									<div>
										<h3 className="text-sm font-semibold text-gray-900">Retention & Cleanup</h3>
										<p className="mt-1 text-xs text-gray-500">Configure local backup retention and cleanup behavior.</p>
									</div>
									<button
										type="button"
										onClick={openCleanupModal}
										disabled={!canCleanup}
										className="rounded border border-red-300 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
									>
										Run Cleanup
									</button>
								</div>
								<div className="mt-5 space-y-4">
									<div>
										<label className="block text-sm font-medium text-gray-700">Snapshot Retention Count</label>
										<input
											type="number"
											min="1"
											value={settingsForm.SnapshotRetentionCount}
											onChange={(e) => setSettingsForm((prev) => ({ ...prev, SnapshotRetentionCount: e.target.value }))}
											className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
										/>
										{settingsErrors.SnapshotRetentionCount && <p className="mt-1 text-sm text-red-600">{settingsErrors.SnapshotRetentionCount}</p>}
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700">Incremental Retention Count</label>
										<input
											type="number"
											min="1"
											value={settingsForm.IncrementalRetentionCount}
											onChange={(e) => setSettingsForm((prev) => ({ ...prev, IncrementalRetentionCount: e.target.value }))}
											className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
										/>
										{settingsErrors.IncrementalRetentionCount && <p className="mt-1 text-sm text-red-600">{settingsErrors.IncrementalRetentionCount}</p>}
									</div>
									<label className="inline-flex items-center gap-2 text-sm text-gray-700">
										<input
											type="checkbox"
											checked={settingsForm.DeleteFailedBackups}
											onChange={(e) => setSettingsForm((prev) => ({ ...prev, DeleteFailedBackups: e.target.checked }))}
											className="rounded border-gray-300 text-primary focus:ring-primary"
										/>
										Delete failed backups during cleanup
									</label>
								</div>
								<div className="mt-5 flex justify-end">
									<button
										type="submit"
										disabled={!canManageSettings || isSavingSettings}
										className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
									>
										Save Settings
									</button>
								</div>
							</form>

							<div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
								<h3 className="text-sm font-semibold text-gray-900">Phase Status</h3>
								<p className="mt-2 text-sm text-gray-600">
									Phase 1 local backups are active. Restore and retention management are now available here.
								</p>
								<p className="mt-3 text-xs text-gray-500">
									Remote MySQL switching and Electron packaging stay deferred for the next phases.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="sticky bottom-0 z-10 w-full border-t border-gray-200 bg-white p-4">
				<div className="mx-auto flex max-w-7xl gap-3 px-4 sm:px-6 lg:px-8">
					<button
						type="button"
						onClick={() => openCreateModal("Snapshot")}
						disabled={!canCreateSnapshot}
						className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
					>
						Create Snapshot
					</button>
					<button
						type="button"
						onClick={() => openCreateModal("Incremental")}
						disabled={!canCreateIncrementalRun}
						className="inline-flex w-full justify-center rounded-md border border-primary bg-white px-6 py-3 text-sm font-medium text-primary shadow-sm hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-60"
					>
						Create Incremental
					</button>
				</div>
			</div>

			<Modal show={Boolean(modalType)} onClose={closeModal} maxWidth={modalType === "Restore" ? "2xl" : "lg"}>
				{modalType && (
					<form onSubmit={submitAction} className="p-6">
						<h3 className="text-lg font-semibold text-gray-900">
							{modalType === "Restore" ? `Restore Backup #${selectedBackup?.id || ""}` : modalType === "Cleanup" ? "Run Cleanup" : `Create ${modalType} Backup`}
						</h3>
						<p className="mt-2 text-sm text-gray-600">
							{modalType === "Snapshot" && "A snapshot stores the full contents of all tracked application tables."}
							{modalType === "Incremental" && "An incremental stores row-level changes recorded after the latest completed backup."}
							{modalType === "Cleanup" && "This deletes old local backup records and files according to the configured retention rules."}
							{modalType === "Restore" && "This replaces the current tracked tables with the selected backup chain, then generates a fresh baseline snapshot."}
						</p>

						{modalType === "Restore" && selectedBackup?.RestorePreview && (
							<div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
								<p className="font-medium">Restore chain</p>
								<ul className="mt-3 space-y-2">
									{selectedBackup.RestorePreview.chain.map((item) => (
										<li key={item.id} className="flex items-center justify-between gap-3 rounded border border-amber-200 bg-white px-3 py-2">
											<span>{item.type} #{item.id}</span>
											<span className="text-xs text-gray-500">{formatDateTime(item.completedAt)}</span>
										</li>
									))}
								</ul>
							</div>
						)}

						<div className="mt-5">
							<label className="block text-sm font-medium text-gray-700" htmlFor="database-action-notes">
								Notes
							</label>
							<textarea
								id="database-action-notes"
								rows={4}
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
								placeholder="Optional notes"
							/>
							{errors.Notes && <p className="mt-2 text-sm text-red-600">{errors.Notes}</p>}
						</div>
						<div className="mt-6 flex justify-end gap-2">
							<button
								type="button"
								onClick={closeModal}
								className="rounded-md border border-primary bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-primary-soft"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isSubmitting}
								className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${modalType === "Cleanup" ? "bg-red-600 hover:bg-red-700" : modalType === "Restore" ? "bg-amber-600 hover:bg-amber-700" : "bg-primary hover:bg-primary-hover"}`}
							>
								{modalType === "Restore" ? "Confirm Restore" : modalType === "Cleanup" ? "Run Cleanup" : "Create Backup"}
							</button>
						</div>
					</form>
				)}
			</Modal>
		</AuthenticatedLayout>
	);
}
