<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DesktopController;
use App\Http\Controllers\Administration\Reports\OverviewController as ReportsOverviewController;
use App\Http\Controllers\Administration\Reports\FullBreakdownController as ReportsFullBreakdownController;
use App\Http\Controllers\Administration\UserManagement\UsersController;
use App\Http\Controllers\Administration\UserManagement\PermissionsController;
use App\Http\Controllers\Administration\UserManagement\RolesController;
use App\Http\Controllers\Administration\UserManagement\PermissionGroupsController;
use App\Http\Controllers\Administration\Database\BackupsController;
use App\Http\Controllers\Administration\Database\ConnectionManagementController;
use App\Http\Controllers\Administration\Database\MaintenanceJobsController;
use App\Http\Controllers\Administration\Database\SchemaReportController;
use App\Http\Controllers\Administration\Database\DataTransferController;
use App\Http\Controllers\Administration\Database\RetentionAndCleanupController;
use App\Http\Controllers\Administration\AuditsController;
use App\Http\Controllers\PointOfSale\CashierController;
use App\Http\Controllers\PointOfSale\CustomerController;
use App\Http\Controllers\PointOfSale\JobOrders\JobOrdersController;
use App\Http\Controllers\PointOfSale\JobOrders\PendingJobOrdersController;
use App\Http\Controllers\PointOfSale\JobOrders\JobOrdersHistoryController;
use App\Http\Controllers\PointOfSale\SaleHistory\SalesController;
use App\Http\Controllers\PointOfSale\SaleHistory\PendingPaymentsController;
use App\Http\Controllers\Inventory\InventoryLevels\InventoryController as InventoryLevelsController;
use App\Http\Controllers\Inventory\InventoryLevels\StockInController;
use App\Http\Controllers\Inventory\InventoryLevels\StockOutController;
use App\Http\Controllers\Inventory\InventoryLevels\InventorySnapshotController;
use App\Http\Controllers\Inventory\ProductsAndBatches\ProductsController;
use App\Http\Controllers\Inventory\ProductsAndBatches\ProductionBatchesController;
use App\Http\Controllers\Inventory\ProductsAndBatches\ProductSnapshotsController;
use App\Http\Controllers\Inventory\ProductsAndBatches\CategoryController as InventoryCategoryController;
use App\Http\Controllers\Inventory\ShrinkageHistoryController;
use App\Http\Controllers\Application\SettingsController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Root → redirect to login
Route::get('/', function () {
  return redirect()->route('login');
});

Route::get('/desktop/health', [DesktopController::class, 'health'])
  ->middleware('desktop.local')
  ->name('desktop.health');

// Dashboard — protected by auth
Route::get('/dashboard', [DashboardController::class, 'index'])->middleware('auth')->name('dashboard');

Route::middleware('auth')->group(function () {
  // Profile
  Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
  Route::patch('/profile', [ProfileController::class, 'update'])->middleware('maintenance.lock')->name('profile.update');
  Route::delete('/profile', [ProfileController::class, 'destroy'])->middleware('maintenance.lock')->name('profile.destroy');

  // Point of Sale
  Route::get('/pos/cashier', function () {
    return redirect()->route('pos.cash-sale');
  })->middleware('permission:CanViewCashier')->name('pos.cashier');
  Route::get('/pos/cash-sale', [CashierController::class, 'cashSale'])->middleware('permission:CanViewCashier')->name('pos.cash-sale');
  Route::get('/pos/job-orders', [JobOrdersController::class, 'index'])
    ->middleware('permission:CanViewJobOrders')
    ->name('pos.job-orders');
  Route::get('/pos/job-orders/pending', [PendingJobOrdersController::class, 'index'])
    ->middleware('permission:CanViewPendingJobOrders')
    ->name('pos.job-orders.pending');
  Route::get('/pos/job-orders/history', [JobOrdersHistoryController::class, 'index'])
    ->middleware('permission:CanViewJobOrdersHistory')
    ->name('pos.job-orders.history');
  Route::get('/pos/sale-history', [SalesController::class, 'index'])
    ->middleware(['permission:CanViewSalesHistory', 'permission:CanViewSalesHistorySales'])
    ->name('pos.sale-history');
  Route::get('/pos/sale-history/pending-payments', [PendingPaymentsController::class, 'index'])
    ->middleware(['permission:CanViewSalesHistory', 'permission:CanViewSalesHistoryPendingPayments'])
    ->name('pos.sale-history.pending');
  Route::get('/pos/customers', [CustomerController::class, 'customers'])->middleware('permission:CanViewCustomers')->name('pos.customers');
  Route::post('/pos/customers', [CustomerController::class, 'storeCustomer'])->middleware(['permission:CanCreateCustomer', 'maintenance.lock'])->name('pos.customers.store');
  Route::put('/pos/customers/{id}', [CustomerController::class, 'updateCustomer'])->middleware(['permission:CanUpdateCustomer', 'maintenance.lock'])->name('pos.customers.update');
  Route::delete('/pos/customers/{id}', [CustomerController::class, 'destroyCustomer'])->middleware(['permission:CanDeleteCustomer', 'maintenance.lock'])->name('pos.customers.destroy');
  Route::post('/pos/sale-history/payments', [PendingPaymentsController::class, 'recordSalePayment'])->middleware(['permission:CanRecordSalePayment', 'maintenance.lock'])->name('pos.sale-history.payments.store');
  Route::post('/pos/checkout/walk-in', [CashierController::class, 'checkoutWalkIn'])->middleware(['permission:CanProcessSalesWalkIn', 'maintenance.lock'])->name('pos.checkout.walk-in');
  Route::post('/pos/job-orders', [JobOrdersController::class, 'storeJobOrder'])->middleware(['permission:CanCreateJobOrders', 'maintenance.lock'])->name('pos.job-orders.store');
  Route::post('/pos/job-orders/{id}/deliver', [JobOrdersController::class, 'deliverJobOrder'])->middleware(['permission:CanProcessSalesJobOrders', 'maintenance.lock'])->name('pos.job-orders.deliver');
  Route::post('/pos/job-orders/{id}/cancel', [JobOrdersController::class, 'cancelJobOrder'])->middleware(['permission:CanCancelJobOrders', 'maintenance.lock'])->name('pos.job-orders.cancel');
  Route::post('/pos/checkout/shrinkage', [CashierController::class, 'recordShrinkage'])->middleware(['permission:CanProcessSalesShrinkage', 'maintenance.lock'])->name('pos.checkout.shrinkage');

  // Inventory
  Route::get('/inventory/levels', [InventoryLevelsController::class, 'index'])->middleware('permission:CanViewInventoryLevels')->name('inventory.levels');
  Route::get('/inventory', [InventoryLevelsController::class, 'index'])
    ->defaults('tab', 'Inventory')
    ->middleware('permission:CanViewInventoryLevels')
    ->name('inventory.index');
  Route::get('/inventory/stockin', [StockInController::class, 'index'])
    ->middleware('permission:CanViewInventoryLevels')
    ->name('inventory.stock-in');
  Route::get('/inventory/stockout', [StockOutController::class, 'index'])
    ->middleware('permission:CanViewInventoryLevels')
    ->name('inventory.stock-out');
  Route::get('/inventory/snapshots', [InventorySnapshotController::class, 'index'])
    ->middleware('permission:CanViewInventorySnapshots')
    ->name('inventory.snapshots');
  Route::post('/inventory/levels', [InventoryLevelsController::class, 'store'])->middleware(['permission:CanCreateInventoryItem', 'maintenance.lock'])->name('inventory.levels.store');
  Route::put('/inventory/levels/{id}', [InventoryLevelsController::class, 'update'])->middleware(['permission:CanUpdateInventoryItem', 'maintenance.lock'])->name('inventory.levels.update');
  Route::delete('/inventory/levels/{id}', [InventoryLevelsController::class, 'destroy'])->middleware(['permission:CanDeleteInventoryItem', 'maintenance.lock'])->name('inventory.levels.destroy');
  Route::get('/inventory/shrinkage-history', [ShrinkageHistoryController::class, 'shrinkageHistory'])
    ->middleware('permission:CanViewShrinkageHistory')
    ->name('inventory.shrinkage-history');
  Route::post('/inventory/shrinkage-history', [ShrinkageHistoryController::class, 'storeShrinkageHistory'])
    ->middleware(['permission:CanCreateShrinkageRecord', 'maintenance.lock'])
    ->name('inventory.shrinkage-history.store');
  Route::put('/inventory/shrinkage-history/{id}', [ShrinkageHistoryController::class, 'updateShrinkageHistory'])
    ->middleware(['permission:CanUpdateShrinkageRecord', 'maintenance.lock'])
    ->name('inventory.shrinkage-history.update');
  Route::delete('/inventory/shrinkage-history/{id}', [ShrinkageHistoryController::class, 'destroyShrinkageHistory'])
    ->middleware(['permission:CanDeleteShrinkageRecord', 'maintenance.lock'])
    ->name('inventory.shrinkage-history.destroy');
  Route::post('/inventory/shrinkage-history/{id}/verify', [ShrinkageHistoryController::class, 'verifyShrinkage'])
    ->middleware(['permission:CanVerifyShrinkageRecord', 'maintenance.lock'])
    ->name('inventory.shrinkage-history.verify');

  Route::post('/inventory/stock-in', [StockInController::class, 'storeStockIn'])->middleware(['permission:CanCreateStockIn', 'maintenance.lock'])->name('inventory.stock-in.store');
  Route::put('/inventory/stock-in/{id}', [StockInController::class, 'updateStockIn'])->middleware(['permission:CanUpdateStockIn', 'maintenance.lock'])->name('inventory.stock-in.update');
  Route::post('/inventory/stock-out', [StockOutController::class, 'storeStockOut'])->middleware(['permission:CanCreateStockOut', 'maintenance.lock'])->name('inventory.stock-out.store');
  Route::put('/inventory/stock-out/{id}', [StockOutController::class, 'updateStockOut'])->middleware(['permission:CanUpdateStockOut', 'maintenance.lock'])->name('inventory.stock-out.update');
  Route::post('/inventory/snapshots', [InventorySnapshotController::class, 'storeSnapshot'])->middleware(['permission:CanRecordInventorySnapshot', 'maintenance.lock'])->name('inventory.snapshots.store');

  Route::get('/inventory/products', [ProductsController::class, 'index'])->middleware('permission:CanViewProductsAndBatches')->name('inventory.products');
  Route::get('/products', [ProductsController::class, 'index'])
    ->defaults('tab', 'Products')
    ->middleware('permission:CanViewProductsAndBatches')
    ->name('products.index');
  Route::get('/products/batches', [ProductionBatchesController::class, 'index'])
    ->middleware('permission:CanViewProductsAndBatches')
    ->name('products.batches');
  Route::get('/products/snapshots', [ProductSnapshotsController::class, 'index'])
    ->middleware('permission:CanViewProductSnapshots')
    ->name('products.snapshots');
  Route::post('/inventory/products', [ProductsController::class, 'store'])->middleware(['permission:CanCreateProduct', 'maintenance.lock'])->name('inventory.products.store');
  Route::put('/inventory/products/{id}', [ProductsController::class, 'update'])->middleware(['permission:CanUpdateProduct', 'maintenance.lock'])->name('inventory.products.update');
  Route::delete('/inventory/products/{id}', [ProductsController::class, 'destroy'])->middleware(['permission:CanDeleteProduct', 'maintenance.lock'])->name('inventory.products.destroy');
  Route::post('/inventory/products/snapshots', [ProductSnapshotsController::class, 'storeSnapshot'])->middleware(['permission:CanRecordProductSnapshot', 'maintenance.lock'])->name('inventory.products.snapshots.store');

  Route::post('/inventory/batches', [ProductionBatchesController::class, 'storeBatch'])->middleware(['permission:CanCreateProductionBatch', 'maintenance.lock'])->name('inventory.batches.store');

  Route::post('/inventory/categories', [InventoryCategoryController::class, 'store'])->middleware(['permission:CanCreateProductCategory', 'maintenance.lock'])->name('inventory.categories.store');
  Route::put('/inventory/categories/{id}', [InventoryCategoryController::class, 'update'])->middleware(['permission:CanUpdateProductCategory', 'maintenance.lock'])->name('inventory.categories.update');
  Route::delete('/inventory/categories/{id}', [InventoryCategoryController::class, 'destroy'])->middleware(['permission:CanDeleteProductCategory', 'maintenance.lock'])->name('inventory.categories.destroy');

  // Administration
  Route::get('/admin/reports', [ReportsOverviewController::class, 'index'])
    ->middleware('permission:CanViewReportsOverview')
    ->name('admin.reports');
  Route::get('/admin/reports/full-breakdown', [ReportsFullBreakdownController::class, 'index'])
    ->middleware('permission:CanViewReportsFullBreakdown')
    ->name('admin.reports.full-breakdown');
  Route::get('/admin/users', [UsersController::class, 'index'])
    ->middleware('permission:CanViewUserManagementUsers')
    ->name('admin.users');
  Route::get('/admin/permissions', [PermissionsController::class, 'index'])
    ->middleware('permission:CanViewUserManagementPermissions')
    ->name('admin.permissions');
  Route::get('/admin/roles', [RolesController::class, 'index'])
    ->middleware('permission:CanViewUserManagementRoles')
    ->name('admin.roles');
  Route::get('/admin/permission-groups', [PermissionGroupsController::class, 'index'])
    ->middleware('permission:CanViewUserManagementPermissionGroups')
    ->name('admin.permission-groups');
  Route::put('/admin/permissions/{id}', [PermissionsController::class, 'updatePermissions'])->middleware(['permission:CanUpdateUserPermissions', 'maintenance.lock'])->name('admin.permissions.update');
  Route::put('/admin/roles/order', [RolesController::class, 'reorderRoles'])->middleware(['permission:CanUpdateRoleOrder', 'maintenance.lock'])->name('admin.roles.reorder');
  Route::post('/admin/roles', [RolesController::class, 'storeRole'])->middleware(['permission:CanCreateRole', 'maintenance.lock'])->name('admin.roles.store');
  Route::put('/admin/roles/{id}', [RolesController::class, 'updateRole'])->middleware(['permission:CanUpdateRole', 'maintenance.lock'])->name('admin.roles.update');
  Route::delete('/admin/roles/{id}', [RolesController::class, 'destroyRole'])->middleware(['permission:CanDeleteRole', 'maintenance.lock'])->name('admin.roles.destroy');
  Route::post('/admin/permission-groups', [PermissionGroupsController::class, 'storePermissionGroup'])->middleware(['permission:CanCreatePermissionGroup', 'maintenance.lock'])->name('admin.permission-groups.store');
  Route::put('/admin/permission-groups/{id}', [PermissionGroupsController::class, 'updatePermissionGroup'])->middleware(['permission:CanUpdatePermissionGroup', 'maintenance.lock'])->name('admin.permission-groups.update');
  Route::delete('/admin/permission-groups/{id}', [PermissionGroupsController::class, 'destroyPermissionGroup'])->middleware(['permission:CanDeletePermissionGroup', 'maintenance.lock'])->name('admin.permission-groups.destroy');
  Route::post('/admin/users', [UsersController::class, 'store'])->middleware(['permission:CanCreateUser', 'maintenance.lock'])->name('admin.users.store');
  Route::put('/admin/users/{id}', [UsersController::class, 'update'])->middleware(['permission:CanUpdateUser', 'maintenance.lock'])->name('admin.users.update');
  Route::delete('/admin/users/{id}', [UsersController::class, 'destroy'])->middleware(['permission:CanDeleteUser', 'maintenance.lock'])->name('admin.users.destroy');
  Route::get('/admin/audits', [AuditsController::class, 'index'])->middleware('permission:CanViewAudits')->name('admin.audits');
  Route::get('/admin/database', [BackupsController::class, 'index'])
    ->middleware('permission:CanViewDatabaseBackups')
    ->name('admin.database');
  Route::get('/admin/database/connections', [ConnectionManagementController::class, 'index'])
    ->middleware('permission:CanViewDatabaseConnections')
    ->name('admin.database.connections');
  Route::get('/admin/database/maintenance-jobs', [MaintenanceJobsController::class, 'index'])
    ->middleware('permission:CanViewDatabaseMaintenanceJobs')
    ->name('admin.database.maintenance-jobs');
  Route::get('/admin/database/schema-report', [SchemaReportController::class, 'index'])
    ->middleware('permission:CanViewDatabaseSchemaReport')
    ->name('admin.database.schema');
  Route::get('/admin/database/data-transfer', [DataTransferController::class, 'index'])
    ->middleware('permission:CanViewDatabaseDataTransfer')
    ->name('admin.database.data-transfer');
  Route::get('/admin/database/retention-cleanup', [RetentionAndCleanupController::class, 'index'])
    ->middleware('permission:CanViewDatabaseRetentionCleanup')
    ->name('admin.database.retention');
  Route::put('/admin/database/connections/remote', [ConnectionManagementController::class, 'saveConnectionSettings'])->middleware('permission:CanManageDatabaseConnections')->name('admin.database.connections.remote.update');
  Route::post('/admin/database/connections/test', [ConnectionManagementController::class, 'testConnection'])->middleware('permission:CanTestDatabaseConnections')->name('admin.database.connections.test');
  Route::post('/admin/database/connections/initialize', [ConnectionManagementController::class, 'initializeRemoteConnection'])->middleware('permission:CanInitializeRemoteDatabase')->name('admin.database.connections.initialize');
  Route::post('/admin/database/connections/schema-report', [SchemaReportController::class, 'schemaReport'])->middleware('permission:CanRunDatabaseSchemaReport')->name('admin.database.connections.schema-report');
  Route::post('/admin/database/connections/switch', [ConnectionManagementController::class, 'switchConnection'])->middleware('permission:CanManageDatabaseConnections')->name('admin.database.connections.switch');
  Route::post('/admin/database/transfers/local-to-remote', [DataTransferController::class, 'transferLocalToRemote'])->middleware('permission:CanTransferDatabaseToRemote')->name('admin.database.transfers.local-to-remote');
  Route::post('/admin/database/snapshots', [BackupsController::class, 'storeSnapshot'])->middleware('permission:CanCreateDatabaseSnapshot')->name('admin.database.snapshots.store');
  Route::post('/admin/database/incrementals', [BackupsController::class, 'storeIncremental'])->middleware('permission:CanCreateDatabaseIncremental')->name('admin.database.incrementals.store');
  Route::post('/admin/database/backups/{id}/verify', [BackupsController::class, 'verify'])->middleware('permission:CanVerifyDatabaseBackup')->name('admin.database.verify');
  Route::post('/admin/database/backups/{id}/restore', [BackupsController::class, 'restore'])->middleware('permission:CanRestoreDatabaseBackup')->name('admin.database.restore');
  Route::put('/admin/database/settings', [RetentionAndCleanupController::class, 'updateSettings'])->middleware('permission:CanManageDatabaseBackupSettings')->name('admin.database.settings.update');
  Route::post('/admin/database/cleanup', [RetentionAndCleanupController::class, 'cleanup'])->middleware('permission:CanCleanupDatabaseBackups')->name('admin.database.cleanup');
  Route::get('/admin/database/backups/{id}/download', [BackupsController::class, 'download'])->middleware('permission:CanDownloadDatabaseBackup')->name('admin.database.download');

  // Application Settings
  Route::get('/application/settings', [SettingsController::class, 'index'])->name('application.settings');
  Route::put('/application/settings', [SettingsController::class, 'update'])->middleware(['maintenance.lock'])->name('application.settings.update');
});


require __DIR__ . '/auth.php';


