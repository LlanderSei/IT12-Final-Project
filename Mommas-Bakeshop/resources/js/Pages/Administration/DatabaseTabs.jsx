import React, { useEffect, useMemo, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import Modal from "@/Components/Modal";
import { formatCountLabel } from "@/utils/countLabel";
import usePermissions from "@/hooks/usePermissions";
import Backups from "./DatabaseSubviews/Backups";
import ConnectionManagement from "./DatabaseSubviews/ConnectionManagement";
import MaintenanceJobs from "./DatabaseSubviews/MaintenanceJobs";
import SchemaReport from "./DatabaseSubviews/SchemaReport";
import DataTransfer from "./DatabaseSubviews/DataTransfer";
import RetentionCleanup from "./DatabaseSubviews/RetentionCleanup";

const formatDateTime = (value) => {
	if (!value) return "-";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "-";
	return parsed.toLocaleString();
};

const TAB_ROUTE_MAP = {
	Backups: "admin.database",
	"Connection Management": "admin.database.connections",
	"Maintenance Jobs": "admin.database.maintenance-jobs",
	"Schema Report": "admin.database.schema",
	"Data Transfer": "admin.database.data-transfer",
	"Retention & Cleanup": "admin.database.retention",
};

export default function DatabaseTabs({
	initialTab = "Backups",
	backups = [],
	stats = {},
	settings = {},
	connectionStatus = {},
	ongoingOperation = null,
	maintenanceOperation = null,
	maintenanceOperations = [],
}) {
	const { can, requirePermission } = usePermissions();
	const canViewBackupsTab = can("CanViewDatabaseBackups");
	const canViewConnectionsTab = can("CanViewDatabaseConnections");
	const canViewMaintenanceJobsTab = can("CanViewDatabaseMaintenanceJobs");
	const canViewSchemaReportTab = can("CanViewDatabaseSchemaReport");
	const canViewDataTransferTab = can("CanViewDatabaseDataTransfer");
	const canViewRetentionTab = can("CanViewDatabaseRetentionCleanup");
	const canCreateSnapshot = can("CanCreateDatabaseSnapshot");
	const canCreateIncremental = can("CanCreateDatabaseIncremental");
	const canVerify = can("CanVerifyDatabaseBackup");
	const canRestore = can("CanRestoreDatabaseBackup");
	const canManageConnections = can("CanManageDatabaseConnections");
	const canTestConnections = can("CanTestDatabaseConnections");
	const canInitializeRemote = can("CanInitializeRemoteDatabase");
	const canRunSchemaReport = can("CanRunDatabaseSchemaReport");
	const canTransferToRemote = can("CanTransferDatabaseToRemote");
	const canManageSettings = can("CanManageDatabaseBackupSettings");
	const canCleanup = can("CanCleanupDatabaseBackups");
	const canDownload = can("CanDownloadDatabaseBackup");

	const [searchQuery, setSearchQuery] = useState("");
	const [typeFilter, setTypeFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [modalType, setModalType] = useState(null);
	const [selectedBackup, setSelectedBackup] = useState(null);
	const [notes, setNotes] = useState("");
	const [confirmationPhrase, setConfirmationPhrase] = useState("");
	const [errors, setErrors] = useState({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [settingsForm, setSettingsForm] = useState({
		SnapshotRetentionCount: String(settings.SnapshotRetentionCount ?? 10),
		IncrementalRetentionCount: String(settings.IncrementalRetentionCount ?? 30),
		DeleteFailedBackups: Boolean(settings.DeleteFailedBackups ?? false),
	});
	const [settingsErrors, setSettingsErrors] = useState({});
	const [isSavingSettings, setIsSavingSettings] = useState(false);
	const [connectionForm, setConnectionForm] = useState({
		host: connectionStatus.remoteFormDefaults?.host || "",
		port: connectionStatus.remoteFormDefaults?.port || "3306",
		database: connectionStatus.remoteFormDefaults?.database || "",
		username: connectionStatus.remoteFormDefaults?.username || "",
		password: "",
	});
	const [connectionErrors, setConnectionErrors] = useState({});
	const [isSavingConnection, setIsSavingConnection] = useState(false);
	const [isTestingConnection, setIsTestingConnection] = useState(false);
	const [isInitializingRemote, setIsInitializingRemote] = useState(false);
	const [isRunningSchemaReport, setIsRunningSchemaReport] = useState(false);
	const [isSwitchingConnection, setIsSwitchingConnection] = useState(false);
	const [isTransferringToRemote, setIsTransferringToRemote] = useState(false);

	const tabs = [
		{
			label: "Backups",
			href: route("admin.database"),
			hidden: !canViewBackupsTab,
		},
		{
			label: "Connection Management",
			href: route("admin.database.connections"),
			hidden: !canViewConnectionsTab,
		},
		{
			label: "Maintenance Jobs",
			href: route("admin.database.maintenance-jobs"),
			hidden: !canViewMaintenanceJobsTab,
		},
		{
			label: "Schema Report",
			href: route("admin.database.schema"),
			hidden: !canViewSchemaReportTab,
		},
		{
			label: "Data Transfer",
			href: route("admin.database.data-transfer"),
			hidden: !canViewDataTransferTab,
		},
		{
			label: "Retention & Cleanup",
			href: route("admin.database.retention"),
			hidden: !canViewRetentionTab,
		},
	];
	const visibleTabs = tabs.filter((tab) => !tab.hidden);
	const activeTab = visibleTabs.some((tab) => tab.label === initialTab)
		? initialTab
		: visibleTabs[0]?.label || "Backups";
	const canCreateIncrementalRun =
		canCreateIncremental && Number(stats.completedBackups || 0) > 0;
	const hasOngoingOperation = Boolean(ongoingOperation || maintenanceOperation);
	const schemaReport = connectionStatus.remote?.schemaReport || null;
	const lastTransfer = connectionStatus.remote?.lastTransfer || null;
	const remoteReadiness = connectionStatus.remote?.readiness || null;
	const canSwitchToRemote =
		canManageConnections &&
		!hasOngoingOperation &&
		!isSwitchingConnection &&
		Boolean(schemaReport?.compatible);

	const filteredBackups = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		return [...(backups || [])]
			.filter((backup) => {
				if (typeFilter !== "all" && backup.BackupType !== typeFilter)
					return false;
				if (statusFilter !== "all" && backup.BackupStatus !== statusFilter)
					return false;
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
			.sort(
				(a, b) =>
					new Date(b.DateAdded || 0).getTime() -
					new Date(a.DateAdded || 0).getTime(),
			);
	}, [backups, searchQuery, statusFilter, typeFilter]);

	const countLabel = useMemo(() => {
		if (activeTab === "Backups")
			return formatCountLabel(filteredBackups.length, "backup");
		if (activeTab === "Maintenance Jobs")
			return formatCountLabel(maintenanceOperations.length, "job");
		return "";
	}, [activeTab, filteredBackups.length, maintenanceOperations.length]);

	useEffect(() => {
		setErrors({});
	}, [modalType]);

	useEffect(() => {
		setSettingsForm({
			SnapshotRetentionCount: String(settings.SnapshotRetentionCount ?? 10),
			IncrementalRetentionCount: String(
				settings.IncrementalRetentionCount ?? 30,
			),
			DeleteFailedBackups: Boolean(settings.DeleteFailedBackups ?? false),
		});
	}, [
		settings.SnapshotRetentionCount,
		settings.IncrementalRetentionCount,
		settings.DeleteFailedBackups,
	]);

	useEffect(() => {
		setConnectionForm({
			host: connectionStatus.remoteFormDefaults?.host || "",
			port: connectionStatus.remoteFormDefaults?.port || "3306",
			database: connectionStatus.remoteFormDefaults?.database || "",
			username: connectionStatus.remoteFormDefaults?.username || "",
			password: "",
		});
	}, [
		connectionStatus.remoteFormDefaults?.host,
		connectionStatus.remoteFormDefaults?.port,
		connectionStatus.remoteFormDefaults?.database,
		connectionStatus.remoteFormDefaults?.username,
	]);

	useEffect(() => {
		if (!hasOngoingOperation) return undefined;
		const interval = window.setInterval(() => {
			router.reload({
				only: [
					"initialTab",
					"backups",
					"stats",
					"settings",
					"ongoingOperation",
					"maintenanceOperation",
					"maintenanceOperations",
					"connectionStatus",
				],
				preserveScroll: true,
				preserveState: true,
			});
		}, 5000);
		return () => window.clearInterval(interval);
	}, [hasOngoingOperation]);

	const closeModal = () => {
		setModalType(null);
		setSelectedBackup(null);
		setNotes("");
		setConfirmationPhrase("");
		setErrors({});
		setIsSubmitting(false);
	};

	const openCreateModal = (type) => {
		if (hasOngoingOperation) return;
		if (type === "Snapshot" && !canCreateSnapshot)
			return requirePermission("CanCreateDatabaseSnapshot");
		if (type === "Incremental" && !canCreateIncrementalRun)
			return requirePermission("CanCreateDatabaseIncremental");
		setSelectedBackup(null);
		setNotes("");
		setModalType(type);
	};

	const openRestoreModal = (backup) => {
		if (hasOngoingOperation) return;
		if (!canRestore) return requirePermission("CanRestoreDatabaseBackup");
		if (backup.RestorePreviewError) return;
		setSelectedBackup(backup);
		setNotes("");
		setModalType("Restore");
	};

	const openCleanupModal = () => {
		if (hasOngoingOperation) return;
		if (!canCleanup) return requirePermission("CanCleanupDatabaseBackups");
		setSelectedBackup(null);
		setNotes("");
		setModalType("Cleanup");
	};

	const openTransferModal = () => {
		if (hasOngoingOperation) return;
		if (!canTransferToRemote)
			return requirePermission("CanTransferDatabaseToRemote");
		setSelectedBackup(null);
		setNotes("");
		setConfirmationPhrase("");
		setModalType("Transfer");
	};

	const submitAction = (e) => {
		e.preventDefault();
		if (hasOngoingOperation) return;
		setIsSubmitting(true);
		if (modalType === "Transfer") setIsTransferringToRemote(true);
		setErrors({});

		let destination = null;
		if (modalType === "Snapshot")
			destination = route("admin.database.snapshots.store");
		if (modalType === "Incremental")
			destination = route("admin.database.incrementals.store");
		if (modalType === "Restore" && selectedBackup)
			destination = route("admin.database.restore", selectedBackup.id);
		if (modalType === "Cleanup") destination = route("admin.database.cleanup");
		if (modalType === "Transfer")
			destination = route("admin.database.transfers.local-to-remote");
		if (!destination) {
			setIsSubmitting(false);
			return;
		}

		router.post(
			destination,
			{
				Notes: notes,
				ConfirmationPhrase:
					modalType === "Transfer" ? confirmationPhrase : undefined,
			},
			{
				preserveScroll: true,
				onError: (formErrors) => setErrors(formErrors || {}),
				onSuccess: () => closeModal(),
				onFinish: () => {
					setIsSubmitting(false);
					setIsTransferringToRemote(false);
				},
			},
		);
	};

	const saveSettings = () => {
		if (hasOngoingOperation) return;
		if (!canManageSettings)
			return requirePermission("CanManageDatabaseBackupSettings");
		setIsSavingSettings(true);
		setSettingsErrors({});
		router.put(
			route("admin.database.settings.update"),
			{
				SnapshotRetentionCount: Number(
					settingsForm.SnapshotRetentionCount || 0,
				),
				IncrementalRetentionCount: Number(
					settingsForm.IncrementalRetentionCount || 0,
				),
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
		if (hasOngoingOperation) return;
		if (!canDownload) return requirePermission("CanDownloadDatabaseBackup");
		window.location.href = route("admin.database.download", backup.id);
	};

	const verifyBackup = (backup) => {
		if (hasOngoingOperation) return;
		if (!canVerify) return requirePermission("CanVerifyDatabaseBackup");
		router.post(
			route("admin.database.verify", backup.id),
			{},
			{ preserveScroll: true },
		);
	};

	const saveRemoteConnection = () => {
		if (hasOngoingOperation) return;
		if (!canManageConnections)
			return requirePermission("CanManageDatabaseConnections");
		setIsSavingConnection(true);
		setConnectionErrors({});
		router.put(
			route("admin.database.connections.remote.update"),
			connectionForm,
			{
				preserveScroll: true,
				onError: (formErrors) => setConnectionErrors(formErrors || {}),
				onFinish: () => setIsSavingConnection(false),
			},
		);
	};

	const testRemoteConnection = () => {
		if (hasOngoingOperation) return;
		if (!canTestConnections)
			return requirePermission("CanTestDatabaseConnections");
		setIsTestingConnection(true);
		router.post(
			route("admin.database.connections.test"),
			{},
			{ preserveScroll: true, onFinish: () => setIsTestingConnection(false) },
		);
	};

	const runSchemaReport = () => {
		if (hasOngoingOperation) return;
		if (!canRunSchemaReport)
			return requirePermission("CanRunDatabaseSchemaReport");
		setIsRunningSchemaReport(true);
		router.post(
			route("admin.database.connections.schema-report"),
			{},
			{ preserveScroll: true, onFinish: () => setIsRunningSchemaReport(false) },
		);
	};

	const switchConnectionTarget = (target) => {
		if (hasOngoingOperation) return;
		if (!canManageConnections)
			return requirePermission("CanManageDatabaseConnections");
		setIsSwitchingConnection(true);
		router.post(
			route("admin.database.connections.switch"),
			{ target },
			{ preserveScroll: true, onFinish: () => setIsSwitchingConnection(false) },
		);
	};

	const initializeRemoteDatabase = () => {
		if (hasOngoingOperation) return;
		if (!canInitializeRemote)
			return requirePermission("CanInitializeRemoteDatabase");
		setIsInitializingRemote(true);
		router.post(
			route("admin.database.connections.initialize"),
			{},
			{ preserveScroll: true, onFinish: () => setIsInitializingRemote(false) },
		);
	};

	const renderContent = () => {
		switch (activeTab) {
			case "Connection Management":
				return (
					<ConnectionManagement
						connectionForm={connectionForm}
						setConnectionForm={setConnectionForm}
						connectionErrors={connectionErrors}
						connectionStatus={connectionStatus}
						remoteReadiness={remoteReadiness}
						hasOngoingOperation={hasOngoingOperation}
					/>
				);
			case "Maintenance Jobs":
				return (
					<MaintenanceJobs maintenanceOperations={maintenanceOperations} />
				);
			case "Schema Report":
				return <SchemaReport schemaReport={schemaReport} />;
			case "Data Transfer":
				return (
					<DataTransfer
						connectionStatus={connectionStatus}
						schemaReport={schemaReport}
						lastTransfer={lastTransfer}
					/>
				);
			case "Retention & Cleanup":
				return (
					<RetentionCleanup
						settingsForm={settingsForm}
						setSettingsForm={setSettingsForm}
						settingsErrors={settingsErrors}
						hasOngoingOperation={hasOngoingOperation}
					/>
				);
			case "Backups":
			default:
				return (
					<Backups
						backups={filteredBackups}
						stats={stats}
						searchQuery={searchQuery}
						setSearchQuery={setSearchQuery}
						typeFilter={typeFilter}
						setTypeFilter={setTypeFilter}
						statusFilter={statusFilter}
						setStatusFilter={setStatusFilter}
						hasOngoingOperation={hasOngoingOperation}
						canDownload={canDownload}
						canVerify={canVerify}
						canRestore={canRestore}
						onDownload={downloadBackup}
						onVerify={verifyBackup}
						onRestore={openRestoreModal}
					/>
				);
		}
	};

	const renderFooter = () => {
		switch (activeTab) {
			case "Connection Management":
				return (
					<>
						<button
							type="button"
							onClick={saveRemoteConnection}
							disabled={
								hasOngoingOperation ||
								!canManageConnections ||
								isSavingConnection
							}
							className="inline-flex w-full justify-center rounded-md border border-primary bg-white px-4 py-3 text-sm font-medium text-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-60"
						>
							Save Remote Settings
						</button>
						<button
							type="button"
							onClick={testRemoteConnection}
							disabled={
								hasOngoingOperation ||
								!canTestConnections ||
								isTestingConnection
							}
							className="inline-flex w-full justify-center rounded-md border border-primary bg-white px-4 py-3 text-sm font-medium text-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-60"
						>
							Test Remote
						</button>
						<button
							type="button"
							onClick={initializeRemoteDatabase}
							disabled={
								hasOngoingOperation ||
								!canInitializeRemote ||
								isInitializingRemote
							}
							className="inline-flex w-full justify-center rounded-md border border-primary bg-white px-4 py-3 text-sm font-medium text-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-60"
						>
							Initialize / Rebuild Remote DB
						</button>
						<button
							type="button"
							onClick={() =>
								switchConnectionTarget(
									connectionStatus.appliedTarget === "remote"
										? "local"
										: "remote",
								)
							}
							disabled={
								connectionStatus.appliedTarget === "remote"
									? hasOngoingOperation ||
										!canManageConnections ||
										isSwitchingConnection
									: !canSwitchToRemote
							}
							className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary px-4 py-3 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
						>
							{connectionStatus.appliedTarget === "remote"
								? "Switch To Local"
								: "Switch To Remote"}
						</button>
					</>
				);
			case "Schema Report":
				return (
					<button
						type="button"
						onClick={runSchemaReport}
						disabled={
							hasOngoingOperation ||
							!canRunSchemaReport ||
							isRunningSchemaReport
						}
						className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
					>
						Run Schema Report
					</button>
				);
			case "Data Transfer":
				return (
					<button
						type="button"
						onClick={openTransferModal}
						disabled={
							hasOngoingOperation ||
							!canTransferToRemote ||
							isTransferringToRemote ||
							!schemaReport?.compatible
						}
						className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
					>
						Transfer Local To Remote
					</button>
				);
			case "Retention & Cleanup":
				return (
					<>
						<button
							type="button"
							onClick={openCleanupModal}
							disabled={hasOngoingOperation || !canCleanup}
							className="inline-flex w-full justify-center rounded-md border border-red-300 bg-white px-6 py-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
						>
							Run Cleanup
						</button>
						<button
							type="button"
							onClick={saveSettings}
							disabled={
								hasOngoingOperation || !canManageSettings || isSavingSettings
							}
							className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
						>
							Save Settings
						</button>
					</>
				);
			case "Backups":
				return (
					<>
						<button
							type="button"
							onClick={() => openCreateModal("Snapshot")}
							disabled={hasOngoingOperation || !canCreateSnapshot}
							className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
						>
							Create Snapshot
						</button>
						<button
							type="button"
							onClick={() => openCreateModal("Incremental")}
							disabled={hasOngoingOperation || !canCreateIncrementalRun}
							className="inline-flex w-full justify-center rounded-md border border-primary bg-white px-6 py-3 text-sm font-medium text-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-60"
						>
							Create Incremental
						</button>
					</>
				);
			default:
				return null;
		}
	};

	const footerContent = renderFooter();

	return (
		<AuthenticatedLayout
			header={
				<div className="flex items-center justify-between gap-4">
					<h2 className="font-semibold text-xl text-gray-800 leading-tight">
						Database
						{activeTab ? (
							<span className="ml-2 text-base font-medium text-gray-500">
								&gt; {activeTab}
							</span>
						) : null}
					</h2>
					{countLabel ? (
						<div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
							{countLabel}
						</div>
					) : null}
				</div>
			}
			disableScroll={true}
		>
			<Head title="Database" />
			<div className="bg-white border-b border-gray-200 mt-0">
				<div className="mx-auto px-4">
					<nav className="-mb-px flex gap-2 overflow-x-auto" aria-label="Tabs">
						{visibleTabs.map((tab) => (
							<Link
								key={tab.label}
								href={tab.href}
								className={`${activeTab === tab.label ? "bg-primary-soft border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300"} whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors duration-200 rounded-t-lg`}
							>
								{tab.label}
							</Link>
						))}
					</nav>
				</div>
			</div>

			<div className="flex flex-1 flex-col overflow-hidden min-h-0 p-6">
				<div className="mx-auto flex w-full flex-1 flex-col overflow-hidden min-h-0 gap-6">
					{ongoingOperation && (
						<div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
							<div className="font-medium">
								Backup job in progress: {ongoingOperation.BackupType} #
								{ongoingOperation.id}
							</div>
							<div className="mt-1 text-xs text-amber-800">
								Started {formatDateTime(ongoingOperation.StartedAt)}
								{ongoingOperation.CreatedBy
									? ` by ${ongoingOperation.CreatedBy}`
									: ""}
								. Backup actions are disabled until this job completes.
							</div>
							{ongoingOperation.Notes && (
								<div className="mt-1 break-words text-xs text-amber-800">
									Notes: {ongoingOperation.Notes}
								</div>
							)}
						</div>
					)}
					{maintenanceOperation && (
						<div
							className={`rounded-lg border px-4 py-3 text-sm ${maintenanceOperation.LockWrites ? "border-red-200 bg-red-50 text-red-900" : "border-sky-200 bg-sky-50 text-sky-900"}`}
						>
							<div className="font-medium">
								Maintenance job in progress: {maintenanceOperation.Title} #
								{maintenanceOperation.id}
							</div>
							<div
								className={`mt-1 text-xs ${maintenanceOperation.LockWrites ? "text-red-800" : "text-sky-800"}`}
							>
								Status: {maintenanceOperation.Status}.
								{maintenanceOperation.CreatedBy
									? ` Started by ${maintenanceOperation.CreatedBy}.`
									: ""}
								{maintenanceOperation.LockWrites
									? " Write actions across the system are locked until this job completes."
									: " This job does not lock transactional writes."}
							</div>
							{maintenanceOperation.Notes && (
								<div
									className={`mt-1 break-words text-xs ${maintenanceOperation.LockWrites ? "text-red-800" : "text-sky-800"}`}
								>
									Notes: {maintenanceOperation.Notes}
								</div>
							)}
						</div>
					)}
					<div className="bg-white shadow-sm sm:rounded-lg flex-1 flex flex-col overflow-hidden min-h-0">
						<div className="flex-1 flex flex-col overflow-hidden min-h-0">
							{renderContent()}
						</div>
					</div>
				</div>
			</div>

			{footerContent ? (
				<div className="sticky bottom-0 z-10 w-full border-t border-gray-200 bg-white p-4">
					<div
						className={`mx-auto grid max-w-7xl gap-3 px-4 sm:px-6 lg:px-8 ${activeTab === "Connection Management" ? "grid-cols-1 xl:grid-cols-4" : activeTab === "Retention & Cleanup" || activeTab === "Backups" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}
					>
						{footerContent}
					</div>
				</div>
			) : null}

			<Modal
				show={Boolean(modalType)}
				onClose={closeModal}
				maxWidth={modalType === "Restore" ? "2xl" : "lg"}
			>
				{modalType && (
					<form onSubmit={submitAction} className="p-6">
						<h3 className="text-lg font-semibold text-gray-900">
							{modalType === "Restore"
								? `Restore Backup #${selectedBackup?.id || ""}`
								: modalType === "Cleanup"
									? "Run Cleanup"
									: modalType === "Transfer"
										? "Transfer Local To Remote"
										: `Create ${modalType} Backup`}
						</h3>
						<p className="mt-2 text-sm text-gray-600">
							{modalType === "Snapshot" &&
								"A snapshot stores the full contents of all tracked application tables."}
							{modalType === "Incremental" &&
								"An incremental stores row-level changes recorded after the latest completed backup."}
							{modalType === "Cleanup" &&
								"This deletes old local backup records and files according to the configured retention rules."}
							{modalType === "Restore" &&
								"This replaces the current tracked tables with the selected backup chain, then generates a fresh baseline snapshot."}
							{modalType === "Transfer" &&
								"This overwrites the configured remote MySQL application tables with the current local data after dropping and restoring the remote triggers."}
						</p>
						{modalType === "Restore" && selectedBackup?.RestorePreview && (
							<div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
								<p className="font-medium">Restore chain</p>
								<ul className="mt-3 space-y-2">
									{selectedBackup.RestorePreview.chain.map((item) => (
										<li
											key={item.id}
											className="flex items-center justify-between gap-3 rounded border border-amber-200 bg-white px-3 py-2"
										>
											<span>
												{item.type} #{item.id}
											</span>
											<span className="text-xs text-gray-500">
												{formatDateTime(item.completedAt)}
											</span>
										</li>
									))}
								</ul>
							</div>
						)}
						{modalType === "Restore" && selectedBackup?.RestorePreviewError && (
							<div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
								This backup failed integrity validation and cannot be restored.
								<div className="mt-2 break-words text-xs text-red-600">
									{selectedBackup.RestorePreviewError}
								</div>
							</div>
						)}
						<div className="mt-5">
							<label
								className="block text-sm font-medium text-gray-700"
								htmlFor="database-action-notes"
							>
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
							{errors.Notes && (
								<p className="mt-2 text-sm text-red-600">{errors.Notes}</p>
							)}
						</div>
						{modalType === "Transfer" && (
							<div className="mt-5">
								<label
									className="block text-sm font-medium text-gray-700"
									htmlFor="database-transfer-confirmation"
								>
									Type <span className="font-semibold">TRANSFER TO REMOTE</span>{" "}
									to confirm
								</label>
								<input
									id="database-transfer-confirmation"
									type="text"
									value={confirmationPhrase}
									onChange={(e) => setConfirmationPhrase(e.target.value)}
									className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
									placeholder="TRANSFER TO REMOTE"
								/>
								{errors.ConfirmationPhrase && (
									<p className="mt-2 text-sm text-red-600">
										{errors.ConfirmationPhrase}
									</p>
								)}
							</div>
						)}
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
								disabled={
									hasOngoingOperation ||
									isSubmitting ||
									(modalType === "Restore" &&
										Boolean(selectedBackup?.RestorePreviewError))
								}
								className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${modalType === "Cleanup" ? "bg-red-600 hover:bg-red-700" : modalType === "Restore" ? "bg-amber-600 hover:bg-amber-700" : "bg-primary hover:bg-primary-hover"}`}
							>
								{modalType === "Restore"
									? "Confirm Restore"
									: modalType === "Cleanup"
										? "Run Cleanup"
										: modalType === "Transfer"
											? "Transfer To Remote"
											: "Create Backup"}
							</button>
						</div>
					</form>
				)}
			</Modal>
		</AuthenticatedLayout>
	);
}
