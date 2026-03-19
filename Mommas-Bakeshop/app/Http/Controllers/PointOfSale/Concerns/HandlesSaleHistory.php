<?php

namespace App\Http\Controllers\PointOfSale\Concerns;

use App\Models\Customer;
use App\Models\Payment;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
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

    $search = trim((string) $request->string('search', ''));
    $paymentStatus = (string) $request->string('paymentStatus', 'all');
    $customerFilter = (string) $request->string('customerFilter', 'all');
    $dateFrom = (string) $request->string('dateFrom', '');
    $dateTo = (string) $request->string('dateTo', '');
    $sortKey = (string) $request->string('sortKey', 'DateAdded');
    $sortDirection = strtolower((string) $request->string('sortDirection', 'desc')) === 'asc' ? 'asc' : 'desc';
    $perPage = (int) $request->integer('perPage', 25);
    $perPage = in_array($perPage, [25, 50, 100, 500], true) ? $perPage : 25;

    $salesQuery = Sale::query()
      ->with([
        'customer:ID,CustomerName',
        'user:id,FullName',
        'payment:ID,SalesID,PaymentMethod,PaidAmount,TotalAmount,Change,PaymentStatus,InvoiceNumber,InvoiceIssuedAt,ReceiptNumber,ReceiptIssuedAt,PaymentDueDate,DateAdded',
        'soldProducts:ID,SalesID,ProductID,PricePerUnit,Quantity,SubAmount',
        'soldProducts.product:ID,ProductName',
        'partialPayments:ID,SalesID,PaidAmount,TenderedAmount,Change,ReceiptNumber,ReceiptIssuedAt,PaymentMethod,DateAdded',
        'jobOrder:ID,SalesID',
        'jobOrder.customItems:ID,JobOrderID,CustomOrderDescription,Quantity,PricePerUnit',
      ])
      ->when($search !== '', function (Builder $query) use ($search) {
        $query->where(function (Builder $nested) use ($search) {
          $nested
            ->where('sales.ID', 'like', "%{$search}%")
            ->orWhereHas('customer', fn(Builder $customerQuery) => $customerQuery->where('CustomerName', 'like', "%{$search}%"))
            ->orWhereHas('user', fn(Builder $userQuery) => $userQuery->where('FullName', 'like', "%{$search}%"))
            ->orWhereHas('payment', fn(Builder $paymentQuery) => $paymentQuery->where('PaymentStatus', 'like', "%{$search}%"))
            ->orWhereHas('soldProducts.product', fn(Builder $productQuery) => $productQuery->where('ProductName', 'like', "%{$search}%"))
            ->orWhereHas('jobOrder.customItems', fn(Builder $customQuery) => $customQuery->where('CustomOrderDescription', 'like', "%{$search}%"));
        });
      })
      ->when($paymentStatus !== 'all', fn(Builder $query) => $query->whereHas('payment', fn(Builder $paymentQuery) => $paymentQuery->where('PaymentStatus', $paymentStatus)))
      ->when($customerFilter === 'walk-in', fn(Builder $query) => $query->whereNull('CustomerID'))
      ->when($customerFilter === 'with-customer', fn(Builder $query) => $query->whereNotNull('CustomerID'))
      ->when($dateFrom !== '', fn(Builder $query) => $query->whereDate('DateAdded', '>=', $dateFrom))
      ->when($dateTo !== '', fn(Builder $query) => $query->whereDate('DateAdded', '<=', $dateTo));

    $salesQuery = $this->applySaleHistorySorting($salesQuery, $sortKey, $sortDirection);

    $sales = $salesQuery
      ->paginate($perPage)
      ->withQueryString();

    $sales->getCollection()->transform(function (Sale $sale) {
      return [
        'ID' => $sale->ID,
        'UserID' => $sale->UserID,
        'CustomerID' => $sale->CustomerID,
        'SaleType' => $sale->SaleType,
        'TotalAmount' => $sale->TotalAmount,
        'DateAdded' => optional($sale->DateAdded)->toIso8601String(),
        'user' => $sale->user
          ? [
              'id' => $sale->user->id,
              'FullName' => $sale->user->FullName,
            ]
          : null,
        'customer' => $sale->customer
          ? [
              'ID' => $sale->customer->ID,
              'CustomerName' => $sale->customer->CustomerName,
            ]
          : null,
        'payment' => $sale->payment
          ? [
              'ID' => $sale->payment->ID,
              'PaymentMethod' => $sale->payment->PaymentMethod,
              'PaidAmount' => $sale->payment->PaidAmount,
              'TotalAmount' => $sale->payment->TotalAmount,
              'Change' => $sale->payment->Change,
              'PaymentStatus' => $sale->payment->PaymentStatus,
              'InvoiceNumber' => $sale->payment->InvoiceNumber,
              'InvoiceIssuedAt' => optional($sale->payment->InvoiceIssuedAt)->toIso8601String(),
              'ReceiptNumber' => $sale->payment->ReceiptNumber,
              'ReceiptIssuedAt' => optional($sale->payment->ReceiptIssuedAt)->toIso8601String(),
              'PaymentDueDate' => optional($sale->payment->PaymentDueDate)->toIso8601String(),
              'DateAdded' => optional($sale->payment->DateAdded)->toIso8601String(),
            ]
          : null,
        'sold_products' => $sale->soldProducts->map(fn($line) => [
          'ID' => $line->ID,
          'Quantity' => (int) $line->Quantity,
          'PricePerUnit' => (float) $line->PricePerUnit,
          'SubAmount' => (float) $line->SubAmount,
          'product' => $line->product
            ? [
                'ID' => $line->product->ID,
                'ProductName' => $line->product->ProductName,
              ]
            : null,
        ])->values(),
        'partial_payments' => $sale->partialPayments->map(fn($payment) => [
          'ID' => $payment->ID,
          'PaidAmount' => (float) $payment->PaidAmount,
          'TenderedAmount' => $payment->TenderedAmount !== null ? (float) $payment->TenderedAmount : null,
          'Change' => $payment->Change !== null ? (float) $payment->Change : null,
          'ReceiptNumber' => $payment->ReceiptNumber,
          'ReceiptIssuedAt' => optional($payment->ReceiptIssuedAt)->toIso8601String(),
          'PaymentMethod' => $payment->PaymentMethod,
          'DateAdded' => optional($payment->DateAdded)->toIso8601String(),
        ])->values(),
        'job_order' => $sale->jobOrder
          ? [
              'ID' => $sale->jobOrder->ID,
              'custom_items' => $sale->jobOrder->customItems->map(fn($line) => [
                'ID' => $line->ID,
                'CustomOrderDescription' => $line->CustomOrderDescription,
                'Quantity' => (int) $line->Quantity,
                'PricePerUnit' => (float) $line->PricePerUnit,
              ])->values(),
            ]
          : null,
      ];
    });

    return Inertia::render('PointOfSale/SalesHistory', [
      'sales' => $sales,
      'filters' => [
        'search' => $search,
        'paymentStatus' => $paymentStatus,
        'customerFilter' => $customerFilter,
        'dateFrom' => $dateFrom,
        'dateTo' => $dateTo,
        'sortKey' => $sortKey,
        'sortDirection' => $sortDirection,
        'perPage' => $perPage,
        'page' => $sales->currentPage(),
      ],
    ]);
  }

  protected function applySaleHistorySorting(Builder $query, string $sortKey, string $sortDirection): Builder {
    return match ($sortKey) {
      'Cashier' => $query->orderBy(
        User::query()
          ->select('FullName')
          ->whereColumn('users.id', 'sales.UserID')
          ->limit(1),
        $sortDirection
      )->orderByDesc('sales.ID'),
      'Customer' => $query->orderByRaw(
        '(case when sales.CustomerID is null then 1 else 0 end) asc'
      )->orderBy(
        Customer::query()
          ->select('CustomerName')
          ->whereColumn('customers.ID', 'sales.CustomerID')
          ->limit(1),
        $sortDirection
      )->orderByDesc('sales.ID'),
      'TotalAmount' => $query->orderByRaw(
        'coalesce((select TotalAmount from payments where payments.SalesID = sales.ID limit 1), sales.TotalAmount) ' . $sortDirection
      )->orderByDesc('sales.ID'),
      'PaymentStatus' => $query->orderBy(
        Payment::query()
          ->select('PaymentStatus')
          ->whereColumn('payments.SalesID', 'sales.ID')
          ->limit(1),
        $sortDirection
      )->orderByDesc('sales.ID'),
      default => $query->orderBy('sales.DateAdded', $sortDirection)->orderByDesc('sales.ID'),
    };
  }
}
