<?php

namespace App\Http\Controllers\PointOfSale\Concerns;

use App\Models\Sale;
use Illuminate\Http\Request;
use Inertia\Inertia;

trait HandlesSaleHistory {
  protected function renderSaleHistory(Request $request, string $initialTab) {
    $tab = in_array($initialTab, ['Sales', 'Pending Payments'], true)
      ? $initialTab
      : 'Sales';

    $user = $request->user();
    $canViewBase = $user?->hasPermission('CanViewSalesHistory') ?? false;
    $canViewSales = $canViewBase && ($user?->hasPermission('CanViewSalesHistorySales') ?? false);
    $canViewPending = $canViewBase && ($user?->hasPermission('CanViewSalesHistoryPendingPayments') ?? false);

    if ($tab === 'Sales' && !$canViewSales) {
      if ($canViewPending) {
        return redirect()->route('pos.sale-history.pending');
      }

      abort(403);
    }

    if ($tab === 'Pending Payments' && !$canViewPending) {
      if ($canViewSales) {
        return redirect()->route('pos.sale-history');
      }

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

    $pendingSales = $sales
      ->filter(function ($sale) {
        return optional($sale->payment)->PaymentStatus !== 'Paid';
      })
      ->values();

    return Inertia::render('PointOfSale/SaleHistoryTabs', [
      'initialTab' => $tab,
      'sales' => $sales,
      'pendingSales' => $pendingSales,
    ]);
  }
}
