<?php

namespace App\Http\Controllers\Administration\Database;

use App\Services\DatabaseBackupService;
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
}
