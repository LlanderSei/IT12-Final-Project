<?php

namespace App\Http\Controllers\Administration\Database;

use App\Services\AuditTrailService;
use App\Services\DatabaseBackupService;
use App\Services\DatabaseConnectionManager;
use App\Services\SystemOperationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;
use Throwable;
use App\Jobs\InitializeRemoteDatabaseJob;

class ConnectionManagementController extends DatabaseBaseController {
  public function index(
    Request $request,
    DatabaseBackupService $service,
    DatabaseConnectionManager $connectionManager,
    SystemOperationService $operationService
  ) {
    return $this->renderDatabaseTabs($request, $service, $connectionManager, $operationService, 'Connection Management');
  }

  public function saveConnectionSettings(Request $request, DatabaseConnectionManager $connectionManager, SystemOperationService $operationService, AuditTrailService $auditTrail): RedirectResponse {
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
      $previous = $connectionManager->remoteFormDefaults();
      $connectionManager->saveRemoteConfig($validated);
      $auditTrail->record(
        $request->user(),
        'DatabaseConnections',
        'Updated',
        sprintf(
          'Remote database settings updated for %s:%s / %s',
          $validated['host'],
          $validated['port'],
          $validated['database'],
        ),
        [
          'host' => $validated['host'],
          'port' => (string) $validated['port'],
          'database' => $validated['database'],
          'username' => $validated['username'],
          'password' => trim((string) ($validated['password'] ?? '')) !== '' ? '[updated]' : '[unchanged]',
        ],
        [
          'host' => $previous['host'] ?? null,
          'port' => $previous['port'] ?? null,
          'database' => $previous['database'] ?? null,
          'username' => $previous['username'] ?? null,
          'password' => !empty($previous['hasSavedPassword']) ? '[saved]' : '[none]',
        ],
      );
      return redirect()->back()->with('success', 'Remote MySQL settings saved.');
    } catch (Throwable $exception) {
      return redirect()->back()->with('error', $exception->getMessage());
    }
  }

  public function testConnection(Request $request, DatabaseConnectionManager $connectionManager, SystemOperationService $operationService, AuditTrailService $auditTrail): RedirectResponse {
    if ($response = $this->rejectIfBackgroundOperationInProgress($operationService)) {
      return $response;
    }

    try {
      $result = $connectionManager->testSavedRemoteConnection();
      $auditTrail->record(
        $request->user(),
        'DatabaseConnections',
        'Recorded',
        sprintf(
          'Remote database connection tested for %s:%s / %s: %s',
          $result['host'] ?? data_get($connectionManager->remoteFormDefaults(), 'host', 'remote host'),
          $result['port'] ?? data_get($connectionManager->remoteFormDefaults(), 'port', '3306'),
          $result['database'] ?? data_get($connectionManager->remoteFormDefaults(), 'database', 'remote database'),
          ($result['reachable'] ?? false) ? 'reachable' : 'failed',
        ),
        [
          'state' => $result['state'] ?? null,
          'reachable' => (bool) ($result['reachable'] ?? false),
          'message' => $result['message'] ?? null,
          'serverVersion' => $result['serverVersion'] ?? null,
        ],
      );

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

  public function switchConnection(Request $request, DatabaseConnectionManager $connectionManager, SystemOperationService $operationService): Response|RedirectResponse {
    if ($response = $this->rejectIfBackgroundOperationInProgress($operationService)) {
      return $response;
    }

    $validated = $request->validate([
      'target' => ['required', 'in:local,remote'],
    ]);

    try {
      $connectionManager->activateTarget($validated['target']);

      Auth::guard('web')->logout();
      $request->session()->invalidate();
      $request->session()->regenerateToken();
      $request->session()->flash('success', sprintf(
        'Database target switched to %s. Please sign in again.',
        ucfirst($validated['target']),
      ));

      return Inertia::location(route('login'));
    } catch (Throwable $exception) {
      return redirect()->back()->with('error', $exception->getMessage());
    }
  }
}
