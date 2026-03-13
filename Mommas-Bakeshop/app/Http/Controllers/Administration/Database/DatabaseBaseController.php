<?php

namespace App\Http\Controllers\Administration\Database;

use App\Http\Controllers\Controller;
use App\Models\DatabaseBackup;
use App\Models\DatabaseBackupChange;
use App\Models\SystemOperation;
use App\Services\DatabaseBackupService;
use App\Services\DatabaseConnectionManager;
use App\Services\SystemOperationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DatabaseBaseController extends Controller {
  protected function renderDatabaseTabs(
    Request $request,
    DatabaseBackupService $service,
    DatabaseConnectionManager $connectionManager,
    SystemOperationService $operationService,
    ?string $forcedTab = null
  ): Response|RedirectResponse {
    $requestedTab = $forcedTab ?? $request->route('tab');
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
          } catch (\Throwable $exception) {
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

  protected function ongoingBackupOperation(): ?DatabaseBackup {
    return DatabaseBackup::query()
      ->with('user:id,FullName')
      ->where('BackupStatus', 'Pending')
      ->orderByDesc('StartedAt')
      ->orderByDesc('ID')
      ->first();
  }

  protected function rejectIfBackgroundOperationInProgress(SystemOperationService $operationService): ?RedirectResponse {
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

  protected function serializeOperation(SystemOperation $operation): array {
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

  protected function tabRouteName(string $tab): string {
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
