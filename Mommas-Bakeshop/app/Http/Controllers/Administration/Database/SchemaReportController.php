<?php

namespace App\Http\Controllers\Administration\Database;

use App\Services\DatabaseBackupService;
use App\Services\AuditTrailService;
use App\Services\DatabaseConnectionManager;
use App\Services\SystemOperationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Throwable;

class SchemaReportController extends DatabaseBaseController {
  public function index(
    Request $request,
    DatabaseBackupService $service,
    DatabaseConnectionManager $connectionManager,
    SystemOperationService $operationService
  ) {
    return $this->renderDatabaseTabs($request, $service, $connectionManager, $operationService, 'Schema Report');
  }

  public function schemaReport(Request $request, DatabaseConnectionManager $connectionManager, SystemOperationService $operationService, AuditTrailService $auditTrail): RedirectResponse {
    if ($response = $this->rejectIfBackgroundOperationInProgress($operationService)) {
      return $response;
    }

    try {
      $report = $connectionManager->runSchemaCompatibilityReport();
      $auditTrail->record(
        $request->user(),
        'DatabaseSchemaReports',
        'Recorded',
        ($report['compatible'] ?? false)
          ? 'Database schema report recorded: remote schema is compatible'
          : 'Database schema report recorded: remote schema differences found',
        [
          'compatible' => (bool) ($report['compatible'] ?? false),
          'remoteDatabase' => $report['remoteDatabase'] ?? null,
          'localDatabase' => $report['localDatabase'] ?? null,
          'missingTablesOnRemote' => $report['missingTablesOnRemote'] ?? [],
          'extraTablesOnRemote' => $report['extraTablesOnRemote'] ?? [],
          'differingTableCount' => $report['differingTableCount'] ?? 0,
        ],
      );

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
}
