<?php

namespace App\Http\Controllers;

use App\Models\DatabaseBackup;
use App\Models\DatabaseBackupChange;
use App\Services\DatabaseConnectionManager;
use App\Services\DatabaseBackupService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Throwable;

class DatabaseController extends Controller {
    public function index(DatabaseBackupService $service, DatabaseConnectionManager $connectionManager): Response {
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

        return Inertia::render('Administration/Database', [
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
        if ($response = $this->rejectIfBackupOperationInProgress()) {
            return $response;
        }

        $validated = $request->validate([
            'Notes' => ['nullable', 'string', 'max:2000'],
        ]);

        try {
            $service->createSnapshot($request->user(), $validated['Notes'] ?? null);
            return redirect()->route('admin.database')->with('success', 'Snapshot backup created successfully.');
        } catch (Throwable $exception) {
            return redirect()->route('admin.database')->with('error', $exception->getMessage());
        }
    }

    public function storeIncremental(Request $request, DatabaseBackupService $service): RedirectResponse {
        if ($response = $this->rejectIfBackupOperationInProgress()) {
            return $response;
        }

        $validated = $request->validate([
            'Notes' => ['nullable', 'string', 'max:2000'],
        ]);

        try {
            $service->createIncremental($request->user(), $validated['Notes'] ?? null);
            return redirect()->route('admin.database')->with('success', 'Incremental backup created successfully.');
        } catch (Throwable $exception) {
            return redirect()->route('admin.database')->with('error', $exception->getMessage());
        }
    }

    public function restore(Request $request, int $id, DatabaseBackupService $service): RedirectResponse {
        if ($response = $this->rejectIfBackupOperationInProgress()) {
            return $response;
        }

        $validated = $request->validate([
            'Notes' => ['nullable', 'string', 'max:2000'],
        ]);

        try {
            $backup = DatabaseBackup::query()->findOrFail($id);
            $service->restoreBackup($backup, $request->user(), $validated['Notes'] ?? null);
            return redirect()->route('admin.database')->with('success', 'Backup restored and a fresh baseline snapshot was created.');
        } catch (Throwable $exception) {
            return redirect()->route('admin.database')->with('error', $exception->getMessage());
        }
    }

    public function verify(int $id, DatabaseBackupService $service): RedirectResponse {
        if ($response = $this->rejectIfBackupOperationInProgress()) {
            return $response;
        }

        try {
            $backup = DatabaseBackup::query()->findOrFail($id);
            $result = $service->verifyBackup($backup, false);

            return redirect()->route('admin.database')->with('success', sprintf(
                'Backup #%d verified successfully in temporary database %s.',
                $result['selectedBackupId'],
                $result['temporaryDatabase'],
            ));
        } catch (Throwable $exception) {
            return redirect()->route('admin.database')->with('error', $exception->getMessage());
        }
    }

    public function saveConnectionSettings(Request $request, DatabaseConnectionManager $connectionManager): RedirectResponse {
        if ($response = $this->rejectIfBackupOperationInProgress()) {
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
            return redirect()->route('admin.database')->with('success', 'Remote MySQL settings saved.');
        } catch (Throwable $exception) {
            return redirect()->route('admin.database')->with('error', $exception->getMessage());
        }
    }

    public function testConnection(DatabaseConnectionManager $connectionManager): RedirectResponse {
        if ($response = $this->rejectIfBackupOperationInProgress()) {
            return $response;
        }

        try {
            $result = $connectionManager->testSavedRemoteConnection();

            $message = $result['message']
                . (!empty($result['serverVersion']) ? ' Server version: ' . $result['serverVersion'] : '');

            return redirect()->route('admin.database')->with(
                ($result['state'] ?? null) === 'ready' ? 'success' : 'error',
                $message,
            );
        } catch (Throwable $exception) {
            return redirect()->route('admin.database')->with('error', $exception->getMessage());
        }
    }

    public function initializeRemoteConnection(DatabaseConnectionManager $connectionManager): RedirectResponse {
        if ($response = $this->rejectIfBackupOperationInProgress()) {
            return $response;
        }

        try {
            $result = $connectionManager->initializeRemoteDatabase();

            return redirect()->route('admin.database')->with('success', $result['message']);
        } catch (Throwable $exception) {
            return redirect()->route('admin.database')->with('error', $exception->getMessage());
        }
    }

    public function schemaReport(DatabaseConnectionManager $connectionManager): RedirectResponse {
        if ($response = $this->rejectIfBackupOperationInProgress()) {
            return $response;
        }

        try {
            $report = $connectionManager->runSchemaCompatibilityReport();

            return redirect()->route('admin.database')->with(
                $report['compatible'] ? 'success' : 'error',
                $report['compatible']
                    ? 'Remote MySQL schema is compatible with the local schema.'
                    : $report['summary'],
            );
        } catch (Throwable $exception) {
            return redirect()->route('admin.database')->with('error', $exception->getMessage());
        }
    }

    public function switchConnection(Request $request, DatabaseConnectionManager $connectionManager): RedirectResponse {
        if ($response = $this->rejectIfBackupOperationInProgress()) {
            return $response;
        }

        $validated = $request->validate([
            'target' => ['required', 'in:local,remote'],
        ]);

        try {
            $status = $connectionManager->activateTarget($validated['target']);

            return redirect()->route('admin.database')->with('success', sprintf(
                'Active database switched to %s MySQL.',
                ucfirst($status['requestedTarget']),
            ));
        } catch (Throwable $exception) {
            return redirect()->route('admin.database')->with('error', $exception->getMessage());
        }
    }

    public function transferLocalToRemote(Request $request, DatabaseConnectionManager $connectionManager): RedirectResponse {
        if ($response = $this->rejectIfBackupOperationInProgress()) {
            return $response;
        }

        $validated = $request->validate([
            'ConfirmationPhrase' => ['required', 'string', 'in:TRANSFER TO REMOTE'],
            'Notes' => ['nullable', 'string', 'max:2000'],
        ]);

        try {
            $result = $connectionManager->transferLocalDataToRemote();

            return redirect()->route('admin.database')->with(
                'success',
                $result['message'],
            );
        } catch (Throwable $exception) {
            return redirect()->route('admin.database')->with('error', $exception->getMessage());
        }
    }

    public function updateSettings(Request $request, DatabaseBackupService $service): RedirectResponse {
        if ($response = $this->rejectIfBackupOperationInProgress()) {
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

        return redirect()->route('admin.database')->with('success', 'Backup settings updated.');
    }

    public function cleanup(DatabaseBackupService $service): RedirectResponse {
        if ($response = $this->rejectIfBackupOperationInProgress()) {
            return $response;
        }

        try {
            $result = $service->cleanupBackups();
            return redirect()->route('admin.database')->with('success', sprintf(
                'Cleanup finished. Deleted %d backup records and %d local files.',
                $result['deletedBackups'],
                $result['deletedFiles'],
            ));
        } catch (Throwable $exception) {
            return redirect()->route('admin.database')->with('error', $exception->getMessage());
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

    private function rejectIfBackupOperationInProgress(): ?RedirectResponse {
        $ongoingBackup = $this->ongoingBackupOperation();

        if (!$ongoingBackup) {
            return null;
        }

        return redirect()
            ->route('admin.database')
            ->with('error', sprintf(
                'Backup operation already in progress: %s #%d started at %s.',
                $ongoingBackup->BackupType,
                $ongoingBackup->ID,
                optional($ongoingBackup->StartedAt)->format('Y-m-d H:i:s') ?? 'unknown time',
            ));
    }
}
