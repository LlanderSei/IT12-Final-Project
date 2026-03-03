<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\UserManagementController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Root → redirect to login
Route::get('/', function () {
  return redirect()->route('login');
});

// Dashboard — protected by auth
Route::get('/dashboard', function () {
  return Inertia::render('Dashboard');
})->middleware('auth')->name('dashboard');

Route::middleware('auth')->group(function () {
  // Profile
  Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
  Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
  Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

  // Point of Sale
  Route::get('/pos/cashier', function () {
    return redirect()->route('pos.cash-sale');
  })->name('pos.cashier');
  Route::get('/pos/cash-sale', [PosController::class, 'cashSale'])->name('pos.cash-sale');
  Route::get('/pos/consignments', [PosController::class, 'consignments'])->name('pos.consignments');
  Route::post('/pos/checkout/walk-in', [PosController::class, 'checkoutWalkIn'])->name('pos.checkout.walk-in');
  Route::post('/pos/checkout/consignment', [PosController::class, 'checkoutConsignment'])->name('pos.checkout.consignment');
  Route::post('/pos/checkout/shrinkage', [PosController::class, 'recordShrinkage'])->name('pos.checkout.shrinkage');

  // Inventory
  Route::get('/inventory/levels', [\App\Http\Controllers\InventoryController::class, 'index'])->name('inventory.levels');
  Route::get('/inventory', [\App\Http\Controllers\InventoryController::class, 'index'])
    ->defaults('tab', 'Inventory')
    ->name('inventory.index');
  Route::get('/inventory/stockin', [\App\Http\Controllers\InventoryController::class, 'index'])
    ->defaults('tab', 'Stock-In')
    ->name('inventory.stock-in');
  Route::get('/inventory/stockout', [\App\Http\Controllers\InventoryController::class, 'index'])
    ->defaults('tab', 'Stock-Out')
    ->name('inventory.stock-out');
  Route::post('/inventory/levels', [\App\Http\Controllers\InventoryController::class, 'store'])->name('inventory.levels.store');
  Route::put('/inventory/levels/{id}', [\App\Http\Controllers\InventoryController::class, 'update'])->name('inventory.levels.update');
  Route::delete('/inventory/levels/{id}', [\App\Http\Controllers\InventoryController::class, 'destroy'])->name('inventory.levels.destroy');

  Route::post('/inventory/stock-in', [\App\Http\Controllers\InventoryController::class, 'storeStockIn'])->name('inventory.stock-in.store');
  Route::put('/inventory/stock-in/{id}', [\App\Http\Controllers\InventoryController::class, 'updateStockIn'])->name('inventory.stock-in.update');
  Route::post('/inventory/stock-out', [\App\Http\Controllers\InventoryController::class, 'storeStockOut'])->name('inventory.stock-out.store');
  Route::put('/inventory/stock-out/{id}', [\App\Http\Controllers\InventoryController::class, 'updateStockOut'])->name('inventory.stock-out.update');

  Route::get('/inventory/products', [\App\Http\Controllers\ProductController::class, 'index'])->name('inventory.products');
  Route::get('/products', [\App\Http\Controllers\ProductController::class, 'index'])
    ->defaults('tab', 'Products')
    ->name('products.index');
  Route::get('/products/batches', [\App\Http\Controllers\ProductController::class, 'index'])
    ->defaults('tab', 'Production Batches')
    ->name('products.batches');
  Route::post('/inventory/products', [\App\Http\Controllers\ProductController::class, 'store'])->name('inventory.products.store');
  Route::put('/inventory/products/{id}', [\App\Http\Controllers\ProductController::class, 'update'])->name('inventory.products.update');
  Route::delete('/inventory/products/{id}', [\App\Http\Controllers\ProductController::class, 'destroy'])->name('inventory.products.destroy');

  Route::post('/inventory/batches', [\App\Http\Controllers\ProductController::class, 'storeBatch'])->name('inventory.batches.store');

  Route::post('/inventory/categories', [\App\Http\Controllers\CategoryController::class, 'store'])->name('inventory.categories.store');
  Route::put('/inventory/categories/{id}', [\App\Http\Controllers\CategoryController::class, 'update'])->name('inventory.categories.update');
  Route::delete('/inventory/categories/{id}', [\App\Http\Controllers\CategoryController::class, 'destroy'])->name('inventory.categories.destroy');

  // Administration
  Route::get('/admin/reports', function () {
    return Inertia::render('Administration/Reports', ['initialTab' => 'Overview']);
  })->name('admin.reports');
  Route::get('/admin/reports/sales', function () {
    return Inertia::render('Administration/Reports', ['initialTab' => 'Sales']);
  })->name('admin.reports.sales');
  Route::get('/admin/reports/shrinkage', function () {
    return Inertia::render('Administration/Reports', ['initialTab' => 'Shrinkage']);
  })->name('admin.reports.shrinkage');
  Route::get('/admin/users', [UserManagementController::class, 'index'])
    ->defaults('tab', 'Users')
    ->name('admin.users');
  Route::get('/admin/permissions', [UserManagementController::class, 'index'])
    ->defaults('tab', 'Permissions')
    ->name('admin.permissions');
  Route::post('/admin/users', [UserManagementController::class, 'store'])->name('admin.users.store');
  Route::put('/admin/users/{id}', [UserManagementController::class, 'update'])->name('admin.users.update');
  Route::delete('/admin/users/{id}', [UserManagementController::class, 'destroy'])->name('admin.users.destroy');
  Route::get('/admin/audits', [\App\Http\Controllers\AuditController::class, 'index'])->name('admin.audits');
});


require __DIR__ . '/auth.php';
