<?php

namespace App\Http\Controllers\PointOfSale\Concerns;

use App\Models\Sale;
use Illuminate\Http\Request;
use Inertia\Inertia;

trait HandlesSaleHistory {
  protected function renderSaleHistory(Request $request, string $initialTab) {
    $user = $request->user();
    $canViewBase = $user?->hasPermission('CanViewSalesHistory') ?? false;
    $canViewSales = $canViewBase && ($user?->hasPermission('CanViewSalesHistorySales') ?? false);
    if (!$canViewSales) {
      abort(403);
    }

    $sales = Sale::with([
      'customer',
      'user:id,FullName',
      'payment',
      'soldProducts.product:ID,ProductName',
      'partialPayments',
      'jobOrder.customItems',
    ])
      ->orderByDesc('DateAdded')
      ->get();

    return Inertia::render('PointOfSale/SalesHistory', [
      'sales' => $sales,
    ]);
  }
}
