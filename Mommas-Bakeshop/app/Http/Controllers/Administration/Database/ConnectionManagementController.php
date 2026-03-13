<?php

namespace App\Http\Controllers\Administration\Database;

use App\Jobs\InitializeRemoteDatabaseJob;
use App\Jobs\SwitchDatabaseTargetJob;
use App\Services\DatabaseBackupService;
use App\Services\DatabaseConnectionManager;
use App\Services\SystemOperationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Throwable;

class ConnectionManagementController extends DatabaseBaseController {
  public function index(
    Request $request,
    DatabaseBackupService $service,
    DatabaseConnectionManager $connectionManager,
    SystemOperationService $operationService
  ) {
    return $this->renderDatabaseTabs($request, $service, $connectionManager, $operationService, 'Connection Management');
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
}
