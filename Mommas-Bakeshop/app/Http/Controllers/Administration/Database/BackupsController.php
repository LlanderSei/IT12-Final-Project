<?php

namespace App\Http\Controllers\Administration\Database;

use App\Jobs\RestoreBackupJob;
use App\Jobs\VerifyBackupJob;
use App\Models\DatabaseBackup;
use App\Services\AuditTrailService;
use App\Services\DatabaseBackupService;
use App\Services\DatabaseConnectionManager;
use App\Services\SystemOperationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Throwable;

class BackupsController extends DatabaseBaseController {
  public function index(
    Request $request,
    DatabaseBackupService $service,
    DatabaseConnectionManager $connectionManager,
    SystemOperationService $operationService
  ) {
    return $this->renderDatabaseTabs($request, $service, $connectionManager, $operationService, 'Backups');
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

  public function download(int $id, DatabaseBackupService $service, AuditTrailService $auditTrail) {
    $backup = DatabaseBackup::query()->findOrFail($id);

    if ($backup->BackupStatus !== 'Completed') {
      throw new RuntimeException('Only completed backups can be downloaded.');
    }

    $auditTrail->record(
      auth()->user(),
      'DatabaseBackups',
      'Recorded',
      sprintf(
        'Backup file downloaded: %s',
        $backup->FileName ?: "Backup #{$backup->ID}"
      ),
      [
        'backupId' => (int) $backup->ID,
        'backupType' => $backup->BackupType,
        'fileName' => $backup->FileName,
        'status' => $backup->BackupStatus,
      ],
    );

    return $service->downloadResponse($backup);
  }
}
