<?php

namespace App\Http\Controllers\Administration;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ArchivesController extends Controller {
  public function index(Request $request) {
    return $this->renderArchiveTabs($request);
  }

  public function customers(Request $request) {
    return $this->renderArchiveTabs($request, 'Customers');
  }

  public function products(Request $request) {
    return $this->renderArchiveTabs($request, 'Products');
  }

  public function inventory(Request $request) {
    return $this->renderArchiveTabs($request, 'Inventory');
  }

  protected function renderArchiveTabs(Request $request, ?string $forcedTab = null) {
    $requestedTab = $forcedTab ?? $request->route('tab');
    $initialTab = in_array($requestedTab, ['Users', 'Customers', 'Products', 'Inventory'], true)
      ? $requestedTab
      : 'Users';

    return Inertia::render('Administration/ArchiveTabs', [
      'initialTab' => $initialTab,
      'users' => User::query()
        ->onlyArchived()
        ->with(['role:ID,RoleName,RoleColor', 'archivedBy:id,FullName'])
        ->orderByDesc('ArchivedAt')
        ->get(),
      'customers' => Customer::query()
        ->onlyArchived()
        ->with(['archivedBy:id,FullName'])
        ->withCount('sales')
        ->orderByDesc('ArchivedAt')
        ->get(),
      'products' => Product::query()
        ->onlyArchived()
        ->with(['category:ID,CategoryName', 'archivedBy:id,FullName'])
        ->orderByDesc('ArchivedAt')
        ->get(),
      'inventory' => Inventory::query()
        ->onlyArchived()
        ->with(['archivedBy:id,FullName'])
        ->orderByDesc('ArchivedAt')
        ->get(),
    ]);
  }
}
