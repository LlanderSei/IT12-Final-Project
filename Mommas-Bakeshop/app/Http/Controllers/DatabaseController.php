<?php

namespace App\Http\Controllers;

use App\Jobs\InitializeRemoteDatabaseJob;
use App\Jobs\RestoreBackupJob;
use App\Jobs\SwitchDatabaseTargetJob;
use App\Jobs\TransferLocalToRemoteJob;
use App\Jobs\VerifyBackupJob;
use App\Models\DatabaseBackup;
use App\Models\DatabaseBackupChange;
use App\Models\SystemOperation;
use App\Services\DatabaseConnectionManager;
use App\Services\DatabaseBackupService;
use App\Services\SystemOperationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Throwable;

class DatabaseController extends Controller {
	public function index(
		Request $request,
		DatabaseBackupService $service,
		DatabaseConnectionManager $connectionManager,
		SystemOperationService $operationService
	): Response|RedirectResponse {
		$requestedTab = $request->route('tab');
		$actor = $request->user();
		$availableTabs = [
			'Backups' => $actor?->hasPermission('CanViewDatabaseBackups') ?? false,
			'Connection Management' => $actor?->hasPermission('CanViewDatabaseConnections') ?? false,
			'Maintenance Jobs' => $actor?->hasPermission('CanViewDatabaseMaintenanceJobs') ?? false,
			'Schema Report' => $actor?->hasPermission('CanViewDatabaseSchemaReport') ?? false,
			'Data Transfer' => $actor?->hasPermission('CanViewDatabaseDataTransfer') ?? false,
			'Retention & Cleanup' => $actor?->hasPermission('CanViewDatabaseRetentionCleanup') ?? false,
		];
		$fallbackTab = collect($availableTabs)->filter()->keys()->first();
		$initialTab = array_key_exists($requestedTab, $availableTabs) ? $requestedTab : $fallbackTab;

		if (!$initialTab || !$availableTabs[$initialTab]) {
			if ($fallbackTab) {
				return redirect()->route($this->tabRouteName($fallbackTab));
			}

			abort(403);
		}

		$settings = $service->settings();
		$backupsCollection = DatabaseBackup::query()
			->with(['user:id,FullName', 'baseBackup:ID,BackupType,FileName,BaseBackupID,CompletedAt'])
			->orderByDesc('DateAdded')
			->orderByDesc('ID')
			->get();
		$ongoingBackup = $this->ongoingBackupOperation();

		$backups = $backupsCollection
			->map(function (DatabaseBackup $backup) use ($service) {
				$restorePreview = null;
				$restorePreviewError = null;

				if ($backup->BackupStatus === 'Completed') {
					try {
						$restorePreview = $service->previewRestore($backup);
					} catch (Throwable $exception) {
						$restorePreviewError = $exception->getMessage();
					}
				}

				return [
					'id' => (int) $backup->ID,
					'BackupType' => $backup->BackupType,
					'BackupStatus' => $backup->BackupStatus,
					'FileName' => $backup->FileName,
					'FilePath' => $backup->FilePath,
					'FileSizeBytes' => (int) ($backup->FileSizeBytes ?? 0),
					'ChecksumSha256' => $backup->ChecksumSha256,
					'FromChangeLogID' => $backup->FromChangeLogID,
					'ToChangeLogID' => $backup->ToChangeLogID,
					'Notes' => $backup->Notes,
					'FailureMessage' => $backup->FailureMessage,
					'Summary' => $backup->Summary ?? [],
					'CreatedBy' => $backup->user?->FullName,
					'BaseBackup' => $backup->baseBackup ? [
						'id' => (int) $backup->baseBackup->ID,
						'BackupType' => $backup->baseBackup->BackupType,
						'FileName' => $backup->baseBackup->FileName,
					] : null,
					'RestorePreview' => $restorePreview,
					'RestorePreviewError' => $restorePreviewError,
					'StartedAt' => optional($backup->StartedAt)->toIso8601String(),
					'CompletedAt' => optional($backup->CompletedAt)->toIso8601String(),
					'DateAdded' => optional($backup->DateAdded)->toIso8601String(),
				];
			})
			->values();

		$lastCompletedBackup = $backupsCollection
			->where('BackupStatus', 'Completed')
			->sortByDesc('CompletedAt')
			->sortByDesc('ID')
			->first();
		$maintenanceOperation = $operationService->activeOperation();
		$maintenanceOperations = SystemOperation::query()
			->where('Scope', 'Database')
			->orderByRaw("
				CASE Status
					WHEN 'Pending' THEN 0
					WHEN 'Running' THEN 1
					WHEN 'Completed' THEN 2
					WHEN 'Failed' THEN 3
					ELSE 4
				END
			")
			->orderByDesc('DateAdded')
			->orderByDesc('ID')
			->get()
			->map(fn(SystemOperation $operation) => $this->serializeOperation($operation))
			->values();

		return Inertia::render('Administration/DatabaseTabs', [
			'initialTab' => $initialTab,
			'backups' => $backups,
			'stats' => [
				'trackedTables' => count(config('database-backups.tracked_tables', [])),
				'latestChangeLogId' => (int) (DatabaseBackupChange::query()->max('ID') ?? 0),
				'completedBackups' => (int) $backupsCollection->where('BackupStatus', 'Completed')->count(),
				'lastCompletedBackup' => $lastCompletedBackup ? [
					'id' => (int) $lastCompletedBackup->ID,
					'BackupType' => $lastCompletedBackup->BackupType,
					'CompletedAt' => optional($lastCompletedBackup->CompletedAt)->toIso8601String(),
					'ToChangeLogID' => $lastCompletedBackup->ToChangeLogID,
				] : null,
			],
			'settings' => [
				'SnapshotRetentionCount' => (int) $settings->SnapshotRetentionCount,
				'IncrementalRetentionCount' => (int) $settings->IncrementalRetentionCount,
				'DeleteFailedBackups' => (bool) $settings->DeleteFailedBackups,
			],
			'connectionStatus' => [
				...$connectionManager->status(),
				'remoteFormDefaults' => $connectionManager->remoteFormDefaults(),
			],
			'maintenanceOperation' => $maintenanceOperation
				? $this->serializeOperation($maintenanceOperation)
				: null,
			'maintenanceOperations' => $maintenanceOperations,
			'ongoingOperation' => $ongoingBackup ? [
				'id' => (int) $ongoingBackup->ID,
				'BackupType' => $ongoingBackup->BackupType,
				'BackupStatus' => $ongoingBackup->BackupStatus,
				'CreatedBy' => $ongoingBackup->user?->FullName,
				'StartedAt' => optional($ongoingBackup->StartedAt)->toIso8601String(),
				'Notes' => $ongoingBackup->Notes,
			] : null,
		]);
	}

	public function storeSnapshot(Request $request, DatabaseBackupService $service): RedirectResponse {
		if ($response = $this->rejectIfBackgroundOperationInProgress(app(SystemOperationService::class))) {
			return $response;
		}

		$validated = $request->validate([
			'Notes' => ['nullable', 'string', 'max:2000'],
		]);

		try {
			$service->createSnapshot($request->user(), $validated['Notes'] ?? null);
			return redirect()->back()->with('success', 'Snapshot backup created successfully.');
		} catch (Throwable $exception) {
			return redirect()->back()->with('error', $exception->getMessage());
		}
	}

	public function storeIncremental(Request $request, DatabaseBackupService $service): RedirectResponse {
		if ($response = $this->rejectIfBackgroundOperationInProgress(app(SystemOperationService::class))) {
			return $response;
		}

		$validated = $request->validate([
			'Notes' => ['nullable', 'string', 'max:2000'],
		]);

		try {
			$service->createIncremental($request->user(), $validated['Notes'] ?? null);
			return redirect()->back()->with('success', 'Incremental backup created successfully.');
		} catch (Throwable $exception) {
			return redirect()->back()->with('error', $exception->getMessage());
		}
	}

	public function restore(Request $request, int $id, DatabaseBackupService $service, SystemOperationService $operationService): RedirectResponse {
		if ($response = $this->rejectIfBackgroundOperationInProgress($operationService)) {
			return $response;
		}

		$validated = $request->validate([
			'Notes' => ['nullable', 'string', 'max:2000'],
		]);

		try {
			$backup = DatabaseBackup::query()->findOrFail($id);
			$operation = $operationService->queue(
				$request->user(),
				'RestoreBackup',
				'Restore backup',
				[
					'backupId' => (int) $backup->ID,
				],
				true,
				$validated['Notes'] ?? null,
			);
			RestoreBackupJob::dispatch($operation->ID, (int) $backup->ID, $request->user()?->id, $validated['Notes'] ?? null);

			return redirect()->back()->with('success', sprintf(
				'Restore job queued as operation #%d.',
				$operation->ID,
			));
		} catch (Throwable $exception) {
			return redirect()->back()->with('error', $exception->getMessage());
		}
	}

	public function verify(int $id, DatabaseBackupService $service, SystemOperationService $operationService): RedirectResponse {
		if ($response = $this->rejectIfBackgroundOperationInProgress($operationService)) {
			return $response;
		}

		try {
			$backup = DatabaseBackup::query()->findOrFail($id);
			$operation = $operationService->queue(
				auth()->user(),
				'VerifyBackup',
				'Verify backup',
				['backupId' => (int) $backup->ID],
				false,
				null,
			);
			VerifyBackupJob::dispatch($operation->ID, (int) $backup->ID, false);

			return redirect()->back()->with('success', sprintf(
				'Verification job queued as operation #%d.',
				$operation->ID,
			));
		} catch (Throwable $exception) {
			return redirect()->back()->with('error', $exception->getMessage());
		}
	}

	public function saveConnectionSettings(Request $request, DatabaseConnectionManager $connectionManager, SystemOperationService $operationService): RedirectResponse {
		if ($response = $this->rejectIfBackgroundOperationInProgress($operationService)) {
			return $response;
		}

		$validated = $request->validate([
			'host' => ['required', 'string', 'max:255'],
			'port' => ['required', 'integer', 'min:1', 'max:65535'],
			'database' => ['required', 'string', 'max:255'],
			'username' => ['required', 'string', 'max:255'],
			'password' => ['nullable', 'string', 'max:255'],
		]);

		try {
			$connectionManager->saveRemoteConfig($validated);
			return redirect()->back()->with('success', 'Remote MySQL settings saved.');
		} catch (Throwable $exception) {
			return redirect()->back()->with('error', $exception->getMessage());
		}
	}

	public function testConnection(DatabaseConnectionManager $connectionManager, SystemOperationService $operationService): RedirectResponse {
		if ($response = $this->rejectIfBackgroundOperationInProgress($operationService)) {
			return $response;
		}

		try {
			$result = $connectionManager->testSavedRemoteConnection();

			$message = $result['message']
				. (!empty($result['serverVersion']) ? ' Server version: ' . $result['serverVersion'] : '');

			return redirect()->back()->with(
				($result['state'] ?? null) === 'ready' ? 'success' : 'error',
				$message,
			);
		} catch (Throwable $exception) {
			return redirect()->back()->with('error', $exception->getMessage());
		}
	}

	public function initializeRemoteConnection(DatabaseConnectionManager $connectionManager, SystemOperationService $operationService): RedirectResponse {
		if ($response = $this->rejectIfBackgroundOperationInProgress($operationService)) {
			return $response;
		}

		try {
			$operation = $operationService->queue(
				auth()->user(),
				'InitializeRemoteDatabase',
				'Initialize or rebuild remote database',
				[],
				true,
			);
			InitializeRemoteDatabaseJob::dispatch($operation->ID);

			return redirect()->back()->with('success', sprintf(
				'Remote initialization queued as operation #%d.',
				$operation->ID,
			));
		} catch (Throwable $exception) {
			return redirect()->back()->with('error', $exception->getMessage());
		}
	}

	public function schemaReport(DatabaseConnectionManager $connectionManager, SystemOperationService $operationService): RedirectResponse {
		if ($response = $this->rejectIfBackgroundOperationInProgress($operationService)) {
			return $response;
		}

		try {
			$report = $connectionManager->runSchemaCompatibilityReport();

			return redirect()->back()->with(
				$report['compatible'] ? 'success' : 'error',
				$report['compatible']
					? 'Remote MySQL schema is compatible with the local schema.'
					: $report['summary'],
			);
		} catch (Throwable $exception) {
			return redirect()->back()->with('error', $exception->getMessage());
		}
	}

	public function switchConnection(Request $request, DatabaseConnectionManager $connectionManager, SystemOperationService $operationService): RedirectResponse {
		if ($response = $this->rejectIfBackgroundOperationInProgress($operationService)) {
			return $response;
		}

		$validated = $request->validate([
			'target' => ['required', 'in:local,remote'],
		]);

		try {
			$operation = $operationService->queue(
				$request->user(),
				'SwitchDatabaseTarget',
				sprintf('Switch database target to %s', ucfirst($validated['target'])),
				['target' => $validated['target']],
				true,
			);
			SwitchDatabaseTargetJob::dispatch($operation->ID, $validated['target']);

			return redirect()->back()->with('success', sprintf(
				'Database switch queued as operation #%d.',
				$operation->ID,
			));
		} catch (Throwable $exception) {
			return redirect()->back()->with('error', $exception->getMessage());
		}
	}

	public function transferLocalToRemote(Request $request, DatabaseConnectionManager $connectionManager, SystemOperationService $operationService): RedirectResponse {
		if ($response = $this->rejectIfBackgroundOperationInProgress($operationService)) {
			return $response;
		}

		$validated = $request->validate([
			'ConfirmationPhrase' => ['required', 'string', 'in:TRANSFER TO REMOTE'],
			'Notes' => ['nullable', 'string', 'max:2000'],
		]);

		try {
			$operation = $operationService->queue(
				$request->user(),
				'TransferLocalToRemote',
				'Transfer local data to remote',
				['confirmation' => 'TRANSFER TO REMOTE'],
				true,
				$validated['Notes'] ?? null,
			);
			TransferLocalToRemoteJob::dispatch($operation->ID);

			return redirect()->back()->with(
				'success',
				sprintf('Local-to-remote transfer queued as operation #%d.', $operation->ID),
			);
		} catch (Throwable $exception) {
			return redirect()->back()->with('error', $exception->getMessage());
		}
	}

	public function updateSettings(Request $request, DatabaseBackupService $service, SystemOperationService $operationService): RedirectResponse {
		if ($response = $this->rejectIfBackgroundOperationInProgress($operationService)) {
			return $response;
		}

		$validated = $request->validate([
			'SnapshotRetentionCount' => ['required', 'integer', 'min:1', 'max:500'],
			'IncrementalRetentionCount' => ['required', 'integer', 'min:1', 'max:1000'],
			'DeleteFailedBackups' => ['nullable'],
		]);

		$service->updateSettings([
			'SnapshotRetentionCount' => (int) $validated['SnapshotRetentionCount'],
			'IncrementalRetentionCount' => (int) $validated['IncrementalRetentionCount'],
			'DeleteFailedBackups' => filter_var($request->input('DeleteFailedBackups', false), FILTER_VALIDATE_BOOL),
		]);

		return redirect()->back()->with('success', 'Backup settings updated.');
	}

	public function cleanup(DatabaseBackupService $service, SystemOperationService $operationService): RedirectResponse {
		if ($response = $this->rejectIfBackgroundOperationInProgress($operationService)) {
			return $response;
		}

		try {
			$result = $service->cleanupBackups();
			return redirect()->back()->with('success', sprintf(
				'Cleanup finished. Deleted %d backup records and %d local files.',
				$result['deletedBackups'],
				$result['deletedFiles'],
			));
		} catch (Throwable $exception) {
			return redirect()->back()->with('error', $exception->getMessage());
		}
	}

	public function download(int $id, DatabaseBackupService $service) {
		$backup = DatabaseBackup::query()->findOrFail($id);

		if ($backup->BackupStatus !== 'Completed') {
			throw new RuntimeException('Only completed backups can be downloaded.');
		}

		return $service->downloadResponse($backup);
	}

	private function ongoingBackupOperation(): ?DatabaseBackup {
		return DatabaseBackup::query()
			->with('user:id,FullName')
			->where('BackupStatus', 'Pending')
			->orderByDesc('StartedAt')
			->orderByDesc('ID')
			->first();
	}

	private function rejectIfBackgroundOperationInProgress(SystemOperationService $operationService): ?RedirectResponse {
		$ongoingBackup = $this->ongoingBackupOperation();

		if ($ongoingBackup) {
			return redirect()
				->route('admin.database')
				->with('error', sprintf(
					'Backup operation already in progress: %s #%d started at %s.',
					$ongoingBackup->BackupType,
					$ongoingBackup->ID,
					optional($ongoingBackup->StartedAt)->format('Y-m-d H:i:s') ?? 'unknown time',
				));
		}

		$activeOperation = $operationService->activeOperation();
		if (!$activeOperation) {
			return null;
		}

		return redirect()
			->route('admin.database')
			->with('error', sprintf(
				'Maintenance operation already in progress: %s #%d started at %s.',
				$activeOperation->OperationType,
				$activeOperation->ID,
				optional($activeOperation->StartedAt ?? $activeOperation->DateAdded)->format('Y-m-d H:i:s') ?? 'unknown time',
			));
	}

	private function serializeOperation(SystemOperation $operation): array {
		return [
			'id' => (int) $operation->ID,
			'Scope' => $operation->Scope,
			'OperationType' => $operation->OperationType,
			'Title' => $operation->Title,
			'Status' => $operation->Status,
			'LockWrites' => (bool) $operation->LockWrites,
			'Notes' => $operation->Notes,
			'FailureMessage' => $operation->FailureMessage,
			'Payload' => $operation->Payload ?? [],
			'Result' => $operation->Result ?? [],
			'CreatedBy' => $operation->CreatedByName,
			'StartedAt' => optional($operation->StartedAt)->toIso8601String(),
			'CompletedAt' => optional($operation->CompletedAt)->toIso8601String(),
			'DateAdded' => optional($operation->DateAdded)->toIso8601String(),
		];
	}

	private function tabRouteName(string $tab): string {
		return match ($tab) {
			'Backups' => 'admin.database',
			'Connection Management' => 'admin.database.connections',
			'Maintenance Jobs' => 'admin.database.maintenance-jobs',
			'Schema Report' => 'admin.database.schema',
			'Data Transfer' => 'admin.database.data-transfer',
			'Retention & Cleanup' => 'admin.database.retention',
			default => 'admin.database',
		};
	}
}
