<?php

namespace App\Http\Controllers\PointOfSale;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CustomerController extends Controller {
  public function customers() {
    $customers = Customer::query()
      ->notArchived()
      ->withCount('sales')
      ->with([
        'sales' => function ($query) {
          $query->with([
            'user:id,FullName',
            'payment',
            'soldProducts.product:ID,ProductName',
            'partialPayments',
            'jobOrder.customItems',
          ])->orderByDesc('DateAdded');
        },
      ])
      ->orderBy('CustomerName')
      ->get()
      ->map(function ($customer) {
        return [
          'ID' => $customer->ID,
          'CustomerName' => $customer->CustomerName,
          'CustomerType' => $customer->CustomerType,
          'ContactDetails' => $customer->ContactDetails,
          'Address' => $customer->Address,
          'DateAdded' => optional($customer->DateAdded)->toIso8601String(),
          'DateModified' => optional($customer->DateModified)->toIso8601String(),
          'SalesRecords' => (int) $customer->sales_count,
          'sales' => $customer->sales->map(function ($sale) {
            $paymentTotal = (float) ($sale->payment?->TotalAmount ?? $sale->TotalAmount ?? 0);
            $paymentPaid = (float) ($sale->payment?->PaidAmount ?? 0);
            $partialPaid = (float) $sale->partialPayments->sum('PaidAmount');
            $paidAmount = max($paymentPaid, $partialPaid);

            return [
              'ID' => $sale->ID,
              'DateAdded' => optional($sale->DateAdded)->toIso8601String(),
              'user' => $sale->user,
              'payment' => $sale->payment,
              'totalAmount' => $paymentTotal,
              'paidAmount' => $paidAmount,
              'amountLeft' => max(0, round($paymentTotal - $paidAmount, 2)),
              'sold_products' => $sale->soldProducts->map(function ($line) {
                return [
                  'ID' => $line->ID,
                  'Quantity' => (int) $line->Quantity,
                  'PricePerUnit' => (float) $line->PricePerUnit,
                  'SubAmount' => (float) $line->SubAmount,
                  'product' => $line->product,
                ];
              })->values(),
              'job_order' => $sale->jobOrder
                ? [
                    'ID' => $sale->jobOrder->ID,
                    'custom_items' => $sale->jobOrder->customItems->map(function ($line) {
                      return [
                        'ID' => $line->ID,
                        'CustomOrderDescription' => $line->CustomOrderDescription,
                        'Quantity' => (int) $line->Quantity,
                        'PricePerUnit' => (float) $line->PricePerUnit,
                      ];
                    })->values(),
                  ]
                : null,
            ];
          })->values(),
        ];
      })
      ->values();

    return Inertia::render('PointOfSale/Customers', [
      'customers' => $customers,
    ]);
  }

  public function storeCustomer(Request $request) {
    $data = $this->validateCustomerPayload($request);

    Customer::create([
      ...$data,
      'DateAdded' => now(),
      'DateModified' => now(),
    ]);

    return redirect()->route('pos.customers')->with('success', 'Customer created successfully.');
  }

  public function updateCustomer(Request $request, int $id) {
    $customer = Customer::query()->notArchived()->findOrFail($id);
    $data = $this->validateCustomerPayload($request);

    $customer->update([
      ...$data,
      'DateModified' => now(),
    ]);

    return redirect()->route('pos.customers')->with('success', 'Customer updated successfully.');
  }

  public function destroyCustomer(int $id) {
    $customer = Customer::query()->notArchived()->findOrFail($id);
    $customer->update([
      'IsArchived' => true,
      'ArchivedAt' => now(),
      'ArchivedByUserID' => auth()->id(),
      'ArchiveReason' => request('ArchiveReason') ?: null,
      'DateModified' => now(),
    ]);

    return redirect()->route('pos.customers')->with('success', 'Customer archived successfully.');
  }

  public function restoreCustomer(int $id) {
    $customer = Customer::query()->onlyArchived()->findOrFail($id);
    $customer->update([
      'IsArchived' => false,
      'ArchivedAt' => null,
      'ArchivedByUserID' => null,
      'ArchiveReason' => null,
      'DateModified' => now(),
    ]);

    return redirect()->back()->with('success', 'Customer restored successfully.');
  }

  private function validateCustomerPayload(Request $request): array {
    return $request->validate([
      'CustomerName' => 'required|string|max:255',
      'CustomerType' => 'required|in:Retail,Business',
      'ContactDetails' => 'required|string|max:255',
      'Address' => 'required|string|max:500',
    ]);
  }
}
