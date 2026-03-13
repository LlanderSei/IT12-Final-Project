<?php

namespace App\Http\Controllers\Administration\Database;

use App\Jobs\TransferLocalToRemoteJob;
use App\Services\DatabaseBackupService;
use App\Services\DatabaseConnectionManager;
use App\Services\SystemOperationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Throwable;

class DataTransferController extends DatabaseBaseController {
  public function index(
    Request $request,
    DatabaseBackupService $service,
    DatabaseConnectionManager $connectionManager,
    SystemOperationService $operationService
  ) {
    return $this->renderDatabaseTabs($request, $service, $connectionManager, $operationService, 'Data Transfer');
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
}
