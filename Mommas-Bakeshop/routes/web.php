<?php

use App\Http\Controllers\ProfileController;
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
    return Inertia::render('PointOfSale/Cashier');
  })->name('pos.cashier');

  // Inventory
  Route::get('/inventory/levels', [\App\Http\Controllers\InventoryController::class, 'index'])->name('inventory.levels');
  Route::post('/inventory/levels', [\App\Http\Controllers\InventoryController::class, 'store'])->name('inventory.levels.store');
  Route::put('/inventory/levels/{id}', [\App\Http\Controllers\InventoryController::class, 'update'])->name('inventory.levels.update');
  Route::delete('/inventory/levels/{id}', [\App\Http\Controllers\InventoryController::class, 'destroy'])->name('inventory.levels.destroy');

  Route::post('/inventory/stock-in', [\App\Http\Controllers\InventoryController::class, 'storeStockIn'])->name('inventory.stock-in.store');
  Route::post('/inventory/stock-out', [\App\Http\Controllers\InventoryController::class, 'storeStockOut'])->name('inventory.stock-out.store');

  Route::get('/inventory/products', [\App\Http\Controllers\ProductController::class, 'index'])->name('inventory.products');
  Route::post('/inventory/products', [\App\Http\Controllers\ProductController::class, 'store'])->name('inventory.products.store');
  Route::put('/inventory/products/{id}', [\App\Http\Controllers\ProductController::class, 'update'])->name('inventory.products.update');
  Route::delete('/inventory/products/{id}', [\App\Http\Controllers\ProductController::class, 'destroy'])->name('inventory.products.destroy');

  Route::post('/inventory/batches', [\App\Http\Controllers\ProductController::class, 'storeBatch'])->name('inventory.batches.store');

  Route::post('/inventory/categories', [\App\Http\Controllers\CategoryController::class, 'store'])->name('inventory.categories.store');
  Route::put('/inventory/categories/{id}', [\App\Http\Controllers\CategoryController::class, 'update'])->name('inventory.categories.update');
  Route::delete('/inventory/categories/{id}', [\App\Http\Controllers\CategoryController::class, 'destroy'])->name('inventory.categories.destroy');

  // Administration
  Route::get('/admin/reports', function () {
    return Inertia::render('Administration/Reports');
  })->name('admin.reports');
  Route::get('/admin/users', function () {
    return Inertia::render('Administration/UserManagement');
  })->name('admin.users');
  Route::get('/admin/audits', [\App\Http\Controllers\AuditController::class, 'index'])->name('admin.audits');
});


require __DIR__ . '/auth.php';
