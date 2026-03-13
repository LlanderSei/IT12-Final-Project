<?php

namespace App\Http\Controllers\Administration\Database;

use App\Services\DatabaseBackupService;
use App\Services\DatabaseConnectionManager;
use App\Services\SystemOperationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Throwable;

class RetentionAndCleanupController extends DatabaseBaseController {
  public function index(
    Request $request,
    DatabaseBackupService $service,
    DatabaseConnectionManager $connectionManager,
    SystemOperationService $operationService
  ) {
    return $this->renderDatabaseTabs($request, $service, $connectionManager, $operationService, 'Retention & Cleanup');
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
}
