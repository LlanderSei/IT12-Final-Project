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
  Route::get('/inventory/levels', function () {
    return Inertia::render('Inventory/InventoryLevels');
  })->name('inventory.levels');
  Route::get('/inventory/products', function () {
    return Inertia::render('Inventory/ProductsBatches');
  })->name('inventory.products');

  // Administration
  Route::get('/admin/reports', function () {
    return Inertia::render('Administration/Reports');
  })->name('admin.reports');
  Route::get('/admin/users', function () {
    return Inertia::render('Administration/UserManagement');
  })->name('admin.users');
});

require __DIR__ . '/auth.php';
