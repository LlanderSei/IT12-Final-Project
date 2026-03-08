<?php

namespace App\Http\Controllers;

use App\Models\DatabaseBackup;
use App\Models\DatabaseBackupChange;
use App\Services\DatabaseBackupService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Throwable;

class DatabaseController extends Controller {
    public function index(DatabaseBackupService $service): Response {
        $settings = $service->settings();
        $backupsCollection = DatabaseBackup::query()
            ->with(['user:id,FullName', 'baseBackup:ID,BackupType,FileName,BaseBackupID,CompletedAt'])
            ->orderByDesc('DateAdded')
            ->orderByDesc('ID')
            ->get();

        $backups = $backupsCollection
            ->map(function (DatabaseBackup $backup) use ($service) {
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
                    'RestorePreview' => $backup->BackupStatus === 'Completed'
                        ? $service->previewRestore($backup)
                        : null,
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
        ]);
    }

    public function storeSnapshot(Request $request, DatabaseBackupService $service): RedirectResponse {
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

    public function updateSettings(Request $request, DatabaseBackupService $service): RedirectResponse {
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
}
