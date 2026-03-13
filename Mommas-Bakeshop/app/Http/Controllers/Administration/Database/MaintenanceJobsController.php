<?php

namespace App\Http\Controllers\Administration\Database;

use App\Services\DatabaseBackupService;
use App\Services\DatabaseConnectionManager;
use App\Services\SystemOperationService;
use Illuminate\Http\Request;

class MaintenanceJobsController extends DatabaseBaseController {
  public function index(
    Request $request,
    DatabaseBackupService $service,
    DatabaseConnectionManager $connectionManager,
    SystemOperationService $operationService
  ) {
    return $this->renderDatabaseTabs($request, $service, $connectionManager, $operationService, 'Maintenance Jobs');
  }
}
