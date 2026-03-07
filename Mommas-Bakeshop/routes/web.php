<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ReportsController;
use App\Http\Controllers\UserManagementController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Root → redirect to login
Route::get('/', function () {
  return redirect()->route('login');
});

// Dashboard — protected by auth
Route::get('/dashboard', [DashboardController::class, 'index'])->middleware('auth')->name('dashboard');

Route::middleware('auth')->group(function () {
  // Profile
  Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
  Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
  Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

  // Point of Sale
  Route::get('/pos/cashier', function () {
    return redirect()->route('pos.cash-sale');
  })->middleware('permission:CanViewCashier')->name('pos.cashier');
  Route::get('/pos/cash-sale', [PosController::class, 'cashSale'])->middleware('permission:CanViewCashier')->name('pos.cash-sale');
  Route::get('/pos/consignments', [PosController::class, 'consignments'])->middleware('permission:CanViewCashier')->name('pos.consignments');
  Route::get('/pos/sale-history', [PosController::class, 'saleHistory'])
    ->defaults('tab', 'Sales')
    ->middleware(['permission:CanViewSalesHistory', 'permission:CanViewSalesHistorySales'])
    ->name('pos.sale-history');
  Route::get('/pos/sale-history/pending-payments', [PosController::class, 'saleHistory'])
    ->defaults('tab', 'Pending Payments')
    ->middleware(['permission:CanViewSalesHistory', 'permission:CanViewSalesHistoryPendingPayments'])
    ->name('pos.sale-history.pending');
  Route::get('/pos/shrinkage-history', [PosController::class, 'shrinkageHistory'])->middleware('permission:CanViewShrinkageHistory')->name('pos.shrinkage-history');
  Route::post('/pos/shrinkage-history', [PosController::class, 'storeShrinkageHistory'])->middleware('permission:CanCreateShrinkageRecord')->name('pos.shrinkage-history.store');
  Route::put('/pos/shrinkage-history/{id}', [PosController::class, 'updateShrinkageHistory'])->middleware('permission:CanUpdateShrinkageRecord')->name('pos.shrinkage-history.update');
  Route::delete('/pos/shrinkage-history/{id}', [PosController::class, 'destroyShrinkageHistory'])->middleware('permission:CanDeleteShrinkageRecord')->name('pos.shrinkage-history.destroy');
  Route::get('/pos/customers', [PosController::class, 'customers'])->middleware('permission:CanViewCustomers')->name('pos.customers');
  Route::post('/pos/customers', [PosController::class, 'storeCustomer'])->middleware('permission:CanCreateCustomer')->name('pos.customers.store');
  Route::put('/pos/customers/{id}', [PosController::class, 'updateCustomer'])->middleware('permission:CanUpdateCustomer')->name('pos.customers.update');
  Route::delete('/pos/customers/{id}', [PosController::class, 'destroyCustomer'])->middleware('permission:CanDeleteCustomer')->name('pos.customers.destroy');
  Route::post('/pos/sale-history/payments', [PosController::class, 'recordSalePayment'])->middleware('permission:CanRecordSalePayment')->name('pos.sale-history.payments.store');
  Route::post('/pos/checkout/walk-in', [PosController::class, 'checkoutWalkIn'])->middleware('permission:CanProcessSalesWalkIn')->name('pos.checkout.walk-in');
  Route::post('/pos/checkout/job-order', [PosController::class, 'checkoutJobOrder'])->middleware('permission:CanProcessSalesJobOrders')->name('pos.checkout.job-order');
  Route::post('/pos/checkout/consignment', [PosController::class, 'checkoutConsignment'])->middleware('permission:CanProcessSalesJobOrders')->name('pos.checkout.consignment');
  Route::post('/pos/checkout/shrinkage', [PosController::class, 'recordShrinkage'])->middleware('permission:CanProcessSalesShrinkage')->name('pos.checkout.shrinkage');

  // Inventory
  Route::get('/inventory/levels', [\App\Http\Controllers\InventoryController::class, 'index'])->middleware('permission:CanViewInventoryLevels')->name('inventory.levels');
  Route::get('/inventory', [\App\Http\Controllers\InventoryController::class, 'index'])
    ->defaults('tab', 'Inventory')
    ->middleware('permission:CanViewInventoryLevels')
    ->name('inventory.index');
  Route::get('/inventory/stockin', [\App\Http\Controllers\InventoryController::class, 'index'])
    ->defaults('tab', 'Stock-In')
    ->middleware('permission:CanViewInventoryLevels')
    ->name('inventory.stock-in');
  Route::get('/inventory/stockout', [\App\Http\Controllers\InventoryController::class, 'index'])
    ->defaults('tab', 'Stock-Out')
    ->middleware('permission:CanViewInventoryLevels')
    ->name('inventory.stock-out');
  Route::get('/inventory/snapshots', [\App\Http\Controllers\InventoryController::class, 'index'])
    ->defaults('tab', 'Snapshots')
    ->middleware('permission:CanViewInventorySnapshots')
    ->name('inventory.snapshots');
  Route::post('/inventory/levels', [\App\Http\Controllers\InventoryController::class, 'store'])->middleware('permission:CanCreateInventoryItem')->name('inventory.levels.store');
  Route::put('/inventory/levels/{id}', [\App\Http\Controllers\InventoryController::class, 'update'])->middleware('permission:CanUpdateInventoryItem')->name('inventory.levels.update');
  Route::delete('/inventory/levels/{id}', [\App\Http\Controllers\InventoryController::class, 'destroy'])->middleware('permission:CanDeleteInventoryItem')->name('inventory.levels.destroy');

  Route::post('/inventory/stock-in', [\App\Http\Controllers\InventoryController::class, 'storeStockIn'])->middleware('permission:CanCreateStockIn')->name('inventory.stock-in.store');
  Route::put('/inventory/stock-in/{id}', [\App\Http\Controllers\InventoryController::class, 'updateStockIn'])->middleware('permission:CanUpdateStockIn')->name('inventory.stock-in.update');
  Route::post('/inventory/stock-out', [\App\Http\Controllers\InventoryController::class, 'storeStockOut'])->middleware('permission:CanCreateStockOut')->name('inventory.stock-out.store');
  Route::put('/inventory/stock-out/{id}', [\App\Http\Controllers\InventoryController::class, 'updateStockOut'])->middleware('permission:CanUpdateStockOut')->name('inventory.stock-out.update');
  Route::post('/inventory/snapshots', [\App\Http\Controllers\InventoryController::class, 'storeSnapshot'])->middleware('permission:CanRecordInventorySnapshot')->name('inventory.snapshots.store');

  Route::get('/inventory/products', [\App\Http\Controllers\ProductController::class, 'index'])->middleware('permission:CanViewProductsAndBatches')->name('inventory.products');
  Route::get('/products', [\App\Http\Controllers\ProductController::class, 'index'])
    ->defaults('tab', 'Products')
    ->middleware('permission:CanViewProductsAndBatches')
    ->name('products.index');
  Route::get('/products/batches', [\App\Http\Controllers\ProductController::class, 'index'])
    ->defaults('tab', 'Production Batches')
    ->middleware('permission:CanViewProductsAndBatches')
    ->name('products.batches');
  Route::get('/products/snapshots', [\App\Http\Controllers\ProductController::class, 'index'])
    ->defaults('tab', 'Snapshots')
    ->middleware('permission:CanViewProductSnapshots')
    ->name('products.snapshots');
  Route::post('/inventory/products', [\App\Http\Controllers\ProductController::class, 'store'])->middleware('permission:CanCreateProduct')->name('inventory.products.store');
  Route::put('/inventory/products/{id}', [\App\Http\Controllers\ProductController::class, 'update'])->middleware('permission:CanUpdateProduct')->name('inventory.products.update');
  Route::delete('/inventory/products/{id}', [\App\Http\Controllers\ProductController::class, 'destroy'])->middleware('permission:CanDeleteProduct')->name('inventory.products.destroy');
  Route::post('/inventory/products/snapshots', [\App\Http\Controllers\ProductController::class, 'storeSnapshot'])->middleware('permission:CanRecordProductSnapshot')->name('inventory.products.snapshots.store');

  Route::post('/inventory/batches', [\App\Http\Controllers\ProductController::class, 'storeBatch'])->middleware('permission:CanCreateProductionBatch')->name('inventory.batches.store');

  Route::post('/inventory/categories', [\App\Http\Controllers\CategoryController::class, 'store'])->middleware('permission:CanCreateProductCategory')->name('inventory.categories.store');
  Route::put('/inventory/categories/{id}', [\App\Http\Controllers\CategoryController::class, 'update'])->middleware('permission:CanUpdateProductCategory')->name('inventory.categories.update');
  Route::delete('/inventory/categories/{id}', [\App\Http\Controllers\CategoryController::class, 'destroy'])->middleware('permission:CanDeleteProductCategory')->name('inventory.categories.destroy');

  // Administration
  Route::get('/admin/reports', [ReportsController::class, 'index'])
    ->defaults('tab', 'Overview')
    ->middleware('permission:CanViewReportsOverview')
    ->name('admin.reports');
  Route::get('/admin/reports/full-breakdown', [ReportsController::class, 'index'])
    ->defaults('tab', 'Full Breakdown')
    ->middleware('permission:CanViewReportsFullBreakdown')
    ->name('admin.reports.full-breakdown');
  Route::get('/admin/users', [UserManagementController::class, 'index'])
    ->defaults('tab', 'Users')
    ->middleware('permission:CanViewUserManagementUsers')
    ->name('admin.users');
  Route::get('/admin/permissions', [UserManagementController::class, 'index'])
    ->defaults('tab', 'Permissions')
    ->middleware('permission:CanViewUserManagementPermissions')
    ->name('admin.permissions');
  Route::get('/admin/roles', [UserManagementController::class, 'index'])
    ->defaults('tab', 'Roles')
    ->middleware('permission:CanViewUserManagementRoles')
    ->name('admin.roles');
  Route::get('/admin/permission-groups', [UserManagementController::class, 'index'])
    ->defaults('tab', 'Permission Groups')
    ->middleware('permission:CanViewUserManagementPermissionGroups')
    ->name('admin.permission-groups');
  Route::put('/admin/permissions/{id}', [UserManagementController::class, 'updatePermissions'])->middleware('permission:CanUpdateUserPermissions')->name('admin.permissions.update');
  Route::put('/admin/roles/order', [UserManagementController::class, 'reorderRoles'])->middleware('permission:CanUpdateRoleOrder')->name('admin.roles.reorder');
  Route::post('/admin/roles', [UserManagementController::class, 'storeRole'])->middleware('permission:CanCreateRole')->name('admin.roles.store');
  Route::put('/admin/roles/{id}', [UserManagementController::class, 'updateRole'])->middleware('permission:CanUpdateRole')->name('admin.roles.update');
  Route::delete('/admin/roles/{id}', [UserManagementController::class, 'destroyRole'])->middleware('permission:CanDeleteRole')->name('admin.roles.destroy');
  Route::post('/admin/permission-groups', [UserManagementController::class, 'storePermissionGroup'])->middleware('permission:CanCreatePermissionGroup')->name('admin.permission-groups.store');
  Route::put('/admin/permission-groups/{id}', [UserManagementController::class, 'updatePermissionGroup'])->middleware('permission:CanUpdatePermissionGroup')->name('admin.permission-groups.update');
  Route::delete('/admin/permission-groups/{id}', [UserManagementController::class, 'destroyPermissionGroup'])->middleware('permission:CanDeletePermissionGroup')->name('admin.permission-groups.destroy');
  Route::post('/admin/users', [UserManagementController::class, 'store'])->middleware('permission:CanCreateUser')->name('admin.users.store');
  Route::put('/admin/users/{id}', [UserManagementController::class, 'update'])->middleware('permission:CanUpdateUser')->name('admin.users.update');
  Route::delete('/admin/users/{id}', [UserManagementController::class, 'destroy'])->middleware('permission:CanDeleteUser')->name('admin.users.destroy');
  Route::get('/admin/audits', [\App\Http\Controllers\AuditController::class, 'index'])->middleware('permission:CanViewAudits')->name('admin.audits');
});


require __DIR__ . '/auth.php';
