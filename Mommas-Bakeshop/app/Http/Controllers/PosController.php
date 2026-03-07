<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\CustomOrder;
use App\Models\CustomOrderDetail;
use App\Models\Payment;
use App\Models\PartialPayment;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SoldProduct;
use App\Models\Shrinkage;
use App\Models\ShrinkedProduct;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class PosController extends Controller {
  public function cashSale() {
    return Inertia::render('PointOfSale/CashSale', [
      'products' => Product::with('category')->orderBy('ProductName')->get(),
      'categories' => \App\Models\Category::orderBy('CategoryName')->get(),
      'customers' => Customer::orderBy('CustomerName')->get(),
    ]);
  }

  public function consignments() {
    return Inertia::render('PointOfSale/Consignments');
  }

  public function saleHistory(Request $request) {
    $requestedTab = $request->route('tab');
    $initialTab = in_array($requestedTab, ['Sales', 'Pending Payments'], true)
      ? $requestedTab
      : 'Sales';
    $user = $request->user();
    $canViewBase = $user?->hasPermission('CanViewSalesHistory') ?? false;
    $canViewSales = $canViewBase && ($user?->hasPermission('CanViewSalesHistorySales') ?? false);
    $canViewPending = $canViewBase && ($user?->hasPermission('CanViewSalesHistoryPendingPayments') ?? false);

    if ($initialTab === 'Sales' && !$canViewSales) {
      if ($canViewPending) {
        return redirect()->route('pos.sale-history.pending');
      }

      abort(403);
    }

    if ($initialTab === 'Pending Payments' && !$canViewPending) {
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
      'customOrderDetails.customOrders',
    ])
      ->orderByDesc('DateAdded')
      ->get();

    $pendingSales = $sales
      ->filter(function ($sale) {
        return optional($sale->payment)->PaymentStatus !== 'Paid';
      })
      ->values();

    return Inertia::render('PointOfSale/SaleHistoryTabs', [
      'initialTab' => $initialTab,
      'sales' => $sales,
      'pendingSales' => $pendingSales,
    ]);
  }

  public function shrinkageHistory(Request $request) {
    $shrinkages = Shrinkage::with([
      'user:id,FullName',
      'shrinkedProducts.product:ID,ProductName,Price,Quantity',
    ])
      ->orderByDesc('DateAdded')
      ->get()
      ->map(fn ($shrinkage) => $this->transformShrinkageForView($shrinkage))
      ->values();

    $products = Product::query()
      ->orderBy('ProductName')
      ->get(['ID', 'ProductName', 'Price', 'Quantity'])
      ->map(fn ($product) => [
        'ID' => $product->ID,
        'ProductName' => $product->ProductName,
        'Price' => (float) $product->Price,
        'Quantity' => (int) $product->Quantity,
      ])
      ->values();

    return Inertia::render('PointOfSale/ShrinkageHistory', [
      'shrinkages' => $shrinkages,
      'products' => $products,
      'allowedReasons' => $this->allowedShrinkageReasons($request->user()),
    ]);
  }

  public function customers() {
    $customers = Customer::withCount('sales')
      ->with([
        'sales' => function ($query) {
          $query->with([
            'user:id,FullName',
            'payment',
            'soldProducts.product:ID,ProductName',
            'partialPayments',
            'customOrderDetails.customOrders',
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
              'custom_order_details' => $sale->customOrderDetails->map(function ($detail) {
                return [
                  'ID' => $detail->ID,
                  'OrderDescription' => $detail->OrderDescription,
                  'TotalAmount' => (float) $detail->TotalAmount,
                  'custom_orders' => $detail->customOrders->map(function ($line) {
                    return [
                      'ID' => $line->ID,
                      'CustomOrderDescription' => $line->CustomOrderDescription,
                      'Quantity' => (int) $line->Quantity,
                      'PricePerUnit' => (float) $line->PricePerUnit,
                    ];
                  })->values(),
                ];
              })->values(),
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
    $customer = Customer::findOrFail($id);
    $data = $this->validateCustomerPayload($request);

    $customer->update([
      ...$data,
      'DateModified' => now(),
    ]);

    return redirect()->route('pos.customers')->with('success', 'Customer updated successfully.');
  }

  public function destroyCustomer(int $id) {
    $customer = Customer::withCount('sales')->findOrFail($id);
    if ((int) $customer->sales_count > 0) {
      return redirect()
        ->route('pos.customers')
        ->with('error', 'Cannot delete a customer with sales history.');
    }

    $customer->delete();

    return redirect()->route('pos.customers')->with('success', 'Customer deleted successfully.');
  }

  public function storeShrinkageHistory(Request $request) {
    try {
      $payload = $this->validateShrinkagePayload(
        $request,
        $this->allowedShrinkageReasons($request->user())
      );

      $this->persistShrinkageRecord($payload, (int) $request->user()->id);

      return redirect()->route('pos.shrinkage-history')->with('success', 'Shrinkage recorded successfully.');
    } catch (ValidationException $e) {
      throw $e;
    } catch (\Throwable $e) {
      report($e);
      return redirect()->route('pos.shrinkage-history')->with('error', 'Failed to record shrinkage.');
    }
  }

  public function updateShrinkageHistory(Request $request, int $id) {
    $shrinkage = Shrinkage::with(['shrinkedProducts'])->findOrFail($id);

    try {
      $payload = $this->validateShrinkagePayload(
        $request,
        $this->allowedShrinkageReasons($request->user(), $shrinkage->Reason)
      );

      DB::transaction(function () use ($payload, $shrinkage) {
        $shrinkage->load('shrinkedProducts');
        $this->restoreProductsForShrinkageLines($shrinkage->shrinkedProducts);
        [$lines, $totalQuantity, $totalAmount] = $this->calculateCartTotals($payload['items']);

        foreach ($shrinkage->shrinkedProducts as $line) {
          $line->delete();
        }

        $shrinkage->update([
          'Quantity' => $totalQuantity,
          'TotalAmount' => $totalAmount,
          'Reason' => $payload['reason'],
        ]);

        foreach ($lines as $line) {
          ShrinkedProduct::create([
            'ShrinkageID' => $shrinkage->ID,
            'ProductID' => $line['product']->ID,
            'Quantity' => $line['quantity'],
            'SubAmount' => $line['subAmount'],
          ]);

          $line['product']->update([
            'DateModified' => now(),
          ]);
        }
      });

      return redirect()->route('pos.shrinkage-history')->with('success', 'Shrinkage record updated successfully.');
    } catch (ValidationException $e) {
      throw $e;
    } catch (\Throwable $e) {
      report($e);
      return redirect()->route('pos.shrinkage-history')->with('error', 'Failed to update shrinkage record.');
    }
  }

  public function destroyShrinkageHistory(int $id) {
    try {
      DB::transaction(function () use ($id) {
        $shrinkage = Shrinkage::with('shrinkedProducts')->lockForUpdate()->findOrFail($id);
        $this->restoreProductsForShrinkageLines($shrinkage->shrinkedProducts);

        foreach ($shrinkage->shrinkedProducts as $line) {
          $line->delete();
        }

        $shrinkage->delete();
      });

      return redirect()->route('pos.shrinkage-history')->with('success', 'Shrinkage record deleted successfully.');
    } catch (\Throwable $e) {
      report($e);
      return redirect()->route('pos.shrinkage-history')->with('error', 'Failed to delete shrinkage record.');
    }
  }

  public function recordSalePayment(Request $request) {
    $payload = $request->validate([
      'SalesID' => 'required|integer|exists:sales,ID',
      'paymentType' => 'required|in:partial,full',
      'PaidAmount' => 'required|numeric|min:0.01',
      'PaymentMethod' => 'required|string|max:255',
      'AdditionalDetails' => 'nullable|string|max:1000',
    ]);

    DB::transaction(function () use ($payload) {
      $sale = Sale::with(['payment', 'partialPayments'])
        ->lockForUpdate()
        ->findOrFail($payload['SalesID']);

      $payment = $sale->payment;
      if (!$payment) {
        throw ValidationException::withMessages([
          'SalesID' => 'Selected sale has no payment record.',
        ]);
      }

      if ($payment->PaymentStatus === 'Paid') {
        throw ValidationException::withMessages([
          'SalesID' => 'Selected sale is already fully paid.',
        ]);
      }

      $currentPaid = (float)$sale->partialPayments->sum('PaidAmount');
      $totalAmount = (float)$payment->TotalAmount;
      $amountLeft = max(0, round($totalAmount - $currentPaid, 2));
      if ($amountLeft <= 0) {
        throw ValidationException::withMessages([
          'SalesID' => 'Selected sale has no remaining balance.',
        ]);
      }

      $requestedAmount = round((float)$payload['PaidAmount'], 2);
      $paidAmount = $payload['paymentType'] === 'full' ? $amountLeft : $requestedAmount;

      if ($payload['paymentType'] === 'partial' && $requestedAmount >= $amountLeft) {
        throw ValidationException::withMessages([
          'PaidAmount' => 'Partial payment must be less than the remaining balance.',
        ]);
      }

      PartialPayment::create([
        'SalesID' => $sale->ID,
        'PaidAmount' => $paidAmount,
        'PaymentMethod' => $payload['PaymentMethod'],
        'AdditionalDetails' => $payload['AdditionalDetails'] ?? null,
        'DateAdded' => now(),
      ]);

      $latestTotalPaid = (float)PartialPayment::where('SalesID', $sale->ID)->sum('PaidAmount');
      $payment->update([
        'PaidAmount' => $latestTotalPaid,
        'Change' => max(0, round($latestTotalPaid - $totalAmount, 2)),
        'PaymentStatus' => $latestTotalPaid >= $totalAmount ? 'Paid' : 'Partially Paid',
        'PaymentDueDate' => $latestTotalPaid >= $totalAmount ? null : $payment->PaymentDueDate,
      ]);
    });

    return redirect()->back()->with('success', 'Payment recorded successfully.');
  }

  public function checkoutWalkIn(Request $request) {
    try {
      $payload = $request->validate([
        'items' => 'required|array|min:1',
        'items.*.ProductID' => 'required|integer|exists:products,ID',
        'items.*.Quantity' => 'required|integer|min:1',
        'paidAmount' => 'nullable|numeric|min:0',
        'paymentMethod' => 'nullable|string|max:255',
        'additionalDetails' => 'nullable|string|max:1000',
      ]);

      DB::transaction(function () use ($payload, $request) {
        [$lines, $totalQuantity, $totalAmount] = $this->calculateCartTotals($payload['items']);
        $paidAmount = array_key_exists('paidAmount', $payload) ? $payload['paidAmount'] : null;

        if ($paidAmount !== null && (float)$paidAmount < $totalAmount) {
          throw ValidationException::withMessages([
            'paidAmount' => 'Amount must be greater than or equal to total amount.',
          ]);
        }

        $sale = Sale::create([
          'UserID' => $request->user()->id,
          'CustomerID' => null,
          'TotalAmount' => $totalAmount,
          'DateAdded' => now(),
        ]);

        foreach ($lines as $line) {
          SoldProduct::create([
            'SalesID' => $sale->ID,
            'ProductID' => $line['product']->ID,
            'PricePerUnit' => $line['pricePerUnit'],
            'Quantity' => $line['quantity'],
            'SubAmount' => $line['subAmount'],
          ]);

          $line['product']->update([
            'DateModified' => now(),
          ]);
        }

        $finalPaid = $paidAmount === null ? $totalAmount : (float)$paidAmount;

        Payment::create([
          'SalesID' => $sale->ID,
          'PaymentMethod' => $payload['paymentMethod'] ?? 'Cash',
          'PaidAmount' => $finalPaid,
          'TotalAmount' => $totalAmount,
          'Change' => max(0, $finalPaid - $totalAmount),
          'PaymentStatus' => 'Paid',
          'PaymentDueDate' => null,
          'AdditionalDetails' => $payload['additionalDetails'] ?? null,
          'DateAdded' => now(),
        ]);
      });

      return redirect()->back()->with('success', 'Walk-in sale recorded successfully.');
    } catch (ValidationException $e) {
      throw $e;
    } catch (\Throwable $e) {
      report($e);
      return redirect()->back()->with('error', 'Failed to process checkout.');
    }
  }

  public function checkoutConsignment(Request $request) {
    try {
      $payload = $request->validate([
        'items' => 'required|array|min:1',
        'items.*.ProductID' => 'required|integer|exists:products,ID',
        'items.*.Quantity' => 'required|integer|min:1',
        'customerMode' => 'required|in:existing,new',
        'CustomerID' => 'nullable|integer|exists:customers,ID',
        'newCustomer.CustomerName' => 'nullable|string|max:255',
        'newCustomer.CustomerType' => 'nullable|in:Retail,Business',
        'newCustomer.ContactDetails' => 'nullable|string|max:255',
        'newCustomer.Address' => 'nullable|string|max:500',
        'dueDate' => 'required|date|after:today',
      ]);

      if ($payload['customerMode'] === 'existing' && empty($payload['CustomerID'] ?? null)) {
        throw ValidationException::withMessages([
          'CustomerID' => 'Please select an existing customer.',
        ]);
      }

      if ($payload['customerMode'] === 'new') {
        $requiredFields = ['CustomerName', 'CustomerType', 'ContactDetails', 'Address'];
        foreach ($requiredFields as $field) {
          if (empty($payload['newCustomer'][$field] ?? null)) {
            throw ValidationException::withMessages([
              "newCustomer.$field" => "The $field field is required for new customer.",
            ]);
          }
        }
      }

      DB::transaction(function () use ($payload, $request) {
        [$lines, $totalQuantity, $totalAmount] = $this->calculateCartTotals($payload['items']);

        $customerID = isset($payload['CustomerID']) ? (int)$payload['CustomerID'] : 0;
        if ($payload['customerMode'] === 'new') {
          $customer = Customer::create([
            'CustomerName' => $payload['newCustomer']['CustomerName'],
            'CustomerType' => $payload['newCustomer']['CustomerType'],
            'ContactDetails' => $payload['newCustomer']['ContactDetails'],
            'Address' => $payload['newCustomer']['Address'],
            'DateAdded' => now(),
            'DateModified' => now(),
          ]);
          $customerID = $customer->ID;
        }

        $sale = Sale::create([
          'UserID' => $request->user()->id,
          'CustomerID' => $customerID,
          'TotalAmount' => $totalAmount,
          'DateAdded' => now(),
        ]);

        foreach ($lines as $line) {
          SoldProduct::create([
            'SalesID' => $sale->ID,
            'ProductID' => $line['product']->ID,
            'PricePerUnit' => $line['pricePerUnit'],
            'Quantity' => $line['quantity'],
            'SubAmount' => $line['subAmount'],
          ]);

          $line['product']->update([
            'DateModified' => now(),
          ]);
        }

        Payment::create([
          'SalesID' => $sale->ID,
          'PaidAmount' => 0,
          'TotalAmount' => $totalAmount,
          'Change' => 0,
          'PaymentStatus' => 'Unpaid',
          'PaymentDueDate' => $payload['dueDate'],
          'DateAdded' => now(),
        ]);
      });

      return redirect()->back()->with('success', 'Consignment sale recorded successfully.');
    } catch (ValidationException $e) {
      throw $e;
    } catch (\Throwable $e) {
      report($e);
      return redirect()->back()->with('error', 'Failed to process checkout.');
    }
  }

  public function checkoutJobOrder(Request $request) {
    try {
      $payload = $request->validate([
        'items' => 'nullable|array',
        'items.*.ProductID' => 'required|integer|exists:products,ID',
        'items.*.Quantity' => 'required|integer|min:1',
        'customOrders' => 'nullable|array',
        'customOrders.*.description' => 'required|string|max:1000',
        'customOrders.*.quantity' => 'required|integer|min:1',
        'customOrders.*.pricePerUnit' => 'required|numeric|min:0.01',
        'customerMode' => 'required|in:existing,new',
        'CustomerID' => 'nullable|integer|exists:customers,ID',
        'newCustomer.CustomerName' => 'nullable|string|max:255',
        'newCustomer.CustomerType' => 'nullable|in:Retail,Business',
        'newCustomer.ContactDetails' => 'nullable|string|max:255',
        'newCustomer.Address' => 'nullable|string|max:500',
        'paymentSelection' => 'required|in:pay_now,pay_later',
        'paidAmount' => 'nullable|numeric|min:0',
        'paymentMethod' => 'nullable|string|max:255',
        'additionalDetails' => 'nullable|string|max:1000',
        'dueDate' => 'nullable|date|after:today',
      ]);

      $productItems = collect($payload['items'] ?? [])->values()->all();
      $customOrderItems = collect($payload['customOrders'] ?? [])->values()->all();
      if (empty($productItems) && empty($customOrderItems)) {
        throw ValidationException::withMessages([
          'items' => 'Add at least one product or custom order item.',
        ]);
      }

      if ($payload['customerMode'] === 'existing' && empty($payload['CustomerID'] ?? null)) {
        throw ValidationException::withMessages([
          'CustomerID' => 'Please select an existing customer.',
        ]);
      }

      if ($payload['customerMode'] === 'new') {
        $requiredFields = ['CustomerName', 'CustomerType', 'ContactDetails', 'Address'];
        foreach ($requiredFields as $field) {
          if (empty($payload['newCustomer'][$field] ?? null)) {
            throw ValidationException::withMessages([
              "newCustomer.$field" => "The $field field is required for new customer.",
            ]);
          }
        }
      }

      if ($payload['paymentSelection'] === 'pay_later' && empty($payload['dueDate'] ?? null)) {
        throw ValidationException::withMessages([
          'dueDate' => 'Due date is required when payment is set to Pay Later.',
        ]);
      }

      DB::transaction(function () use ($payload, $request) {
        $productItems = collect($payload['items'] ?? [])->values()->all();
        $customOrderItems = collect($payload['customOrders'] ?? [])->values()->all();
        [$lines, $totalQuantity, $productTotalAmount] = !empty($productItems)
          ? $this->calculateCartTotals($productItems)
          : [[], 0, 0.0];
        $customOrdersTotal = round(collect($customOrderItems)->sum(function ($item) {
          return ((float)$item['quantity']) * ((float)$item['pricePerUnit']);
        }), 2);
        $totalAmount = round($productTotalAmount + $customOrdersTotal, 2);

        $customerID = isset($payload['CustomerID']) ? (int)$payload['CustomerID'] : 0;
        if ($payload['customerMode'] === 'new') {
          $customer = Customer::create([
            'CustomerName' => $payload['newCustomer']['CustomerName'],
            'CustomerType' => $payload['newCustomer']['CustomerType'],
            'ContactDetails' => $payload['newCustomer']['ContactDetails'],
            'Address' => $payload['newCustomer']['Address'],
            'DateAdded' => now(),
            'DateModified' => now(),
          ]);
          $customerID = $customer->ID;
        }

        $sale = Sale::create([
          'UserID' => $request->user()->id,
          'CustomerID' => $customerID,
          'TotalAmount' => $totalAmount,
          'DateAdded' => now(),
        ]);

        foreach ($lines as $line) {
          SoldProduct::create([
            'SalesID' => $sale->ID,
            'ProductID' => $line['product']->ID,
            'PricePerUnit' => $line['pricePerUnit'],
            'Quantity' => $line['quantity'],
            'SubAmount' => $line['subAmount'],
          ]);

          $line['product']->update([
            'DateModified' => now(),
          ]);
        }

        if (!empty($customOrderItems)) {
          $customOrderDetail = CustomOrderDetail::create([
            'SalesID' => $sale->ID,
            'OrderDescription' => sprintf(
              'Custom order entries: %d',
              count($customOrderItems)
            ),
            'TotalAmount' => $customOrdersTotal,
            'DateAdded' => now(),
            'DateModified' => now(),
          ]);

          foreach ($customOrderItems as $customOrderItem) {
            CustomOrder::create([
              'CustomOrderDetailsID' => $customOrderDetail->ID,
              'CustomOrderDescription' => trim((string)$customOrderItem['description']),
              'Quantity' => (int)$customOrderItem['quantity'],
              'PricePerUnit' => round((float)$customOrderItem['pricePerUnit'], 2),
              'DateAdded' => now(),
            ]);
          }
        }

        if ($payload['paymentSelection'] === 'pay_now') {
          $paidAmount = (float)($payload['paidAmount'] ?? 0);
          if ($paidAmount < $totalAmount) {
            throw ValidationException::withMessages([
              'paidAmount' => 'Paid amount must be greater than or equal to total amount.',
            ]);
          }

          Payment::create([
            'SalesID' => $sale->ID,
            'PaymentMethod' => $payload['paymentMethod'] ?? 'Cash',
            'PaidAmount' => $paidAmount,
            'TotalAmount' => $totalAmount,
            'Change' => max(0, $paidAmount - $totalAmount),
            'PaymentStatus' => 'Paid',
            'PaymentDueDate' => null,
            'AdditionalDetails' => $payload['additionalDetails'] ?? null,
            'DateAdded' => now(),
          ]);
          return;
        }

        Payment::create([
          'SalesID' => $sale->ID,
          'PaymentMethod' => $payload['paymentMethod'] ?? 'Cash',
          'PaidAmount' => 0,
          'TotalAmount' => $totalAmount,
          'Change' => 0,
          'PaymentStatus' => 'Unpaid',
          'PaymentDueDate' => $payload['dueDate'],
          'AdditionalDetails' => $payload['additionalDetails'] ?? null,
          'DateAdded' => now(),
        ]);
      });

      return redirect()->back()->with('success', 'Job order recorded successfully.');
    } catch (ValidationException $e) {
      throw $e;
    } catch (\Throwable $e) {
      report($e);
      return redirect()->back()->with('error', 'Failed to process job order.');
    }
  }

  public function recordShrinkage(Request $request) {
    try {
      $payload = $this->validateShrinkagePayload(
        $request,
        $this->allowedShrinkageReasons($request->user())
      );

      $this->persistShrinkageRecord($payload, (int) $request->user()->id);

      return redirect()->back()->with('success', 'Shrinkage recorded successfully.');
    } catch (ValidationException $e) {
      throw $e;
    } catch (\Throwable $e) {
      report($e);
      return redirect()->back()->with('error', 'Failed to process checkout.');
    }
  }

  private function calculateCartTotals(array $items): array {
    $groupedItems = collect($items)
      ->groupBy('ProductID')
      ->map(fn($rows) => (int)$rows->sum('Quantity'))
      ->all();

    $products = $this->assertAndLockProducts($groupedItems);

    $lines = [];
    $totalQuantity = 0;
    $totalAmount = 0.0;

    foreach ($groupedItems as $productID => $quantity) {
      $product = $products[$productID];
      $pricePerUnit = (float)$product->Price;
      $subAmount = round($pricePerUnit * $quantity, 2);

      $lines[] = [
        'product' => $product,
        'quantity' => $quantity,
        'pricePerUnit' => $pricePerUnit,
        'subAmount' => $subAmount,
      ];

      $totalQuantity += $quantity;
      $totalAmount += $subAmount;
    }

    return [$lines, $totalQuantity, round($totalAmount, 2)];
  }

  private function allowedShrinkageReasons($user, ?string $preservedReason = null): array {
    $user?->loadMissing('role');
    $roleName = strtolower((string) $user?->role?->RoleName);
    $allowed = in_array($roleName, ['owner', 'admin'], true)
      ? ['Spoiled', 'Theft', 'Lost']
      : ['Spoiled'];

    if ($preservedReason && !in_array($preservedReason, $allowed, true)) {
      $allowed[] = $preservedReason;
    }

    return array_values(array_unique($allowed));
  }

  private function validateShrinkagePayload(Request $request, array $allowedReasons): array {
    return $request->validate([
      'items' => 'required|array|min:1',
      'items.*.ProductID' => 'required|integer|exists:products,ID',
      'items.*.Quantity' => 'required|integer|min:1',
      'reason' => ['required', Rule::in($allowedReasons)],
    ]);
  }

  private function persistShrinkageRecord(array $payload, int $userId): Shrinkage {
    return DB::transaction(function () use ($payload, $userId) {
      [$lines, $totalQuantity, $totalAmount] = $this->calculateCartTotals($payload['items']);

      $shrinkage = Shrinkage::create([
        'UserID' => $userId,
        'Quantity' => $totalQuantity,
        'TotalAmount' => $totalAmount,
        'Reason' => $payload['reason'],
        'DateAdded' => now(),
      ]);

      foreach ($lines as $line) {
        ShrinkedProduct::create([
          'ShrinkageID' => $shrinkage->ID,
          'ProductID' => $line['product']->ID,
          'Quantity' => $line['quantity'],
          'SubAmount' => $line['subAmount'],
        ]);

        $line['product']->update([
          'DateModified' => now(),
        ]);
      }

      return $shrinkage;
    });
  }

  private function transformShrinkageForView(Shrinkage $shrinkage): array {
    return [
      'ID' => $shrinkage->ID,
      'UserID' => $shrinkage->UserID,
      'CreatedBy' => $shrinkage->user?->FullName ?? 'Unknown',
      'Quantity' => (int) $shrinkage->Quantity,
      'TotalAmount' => (float) $shrinkage->TotalAmount,
      'Reason' => $shrinkage->Reason,
      'DateAdded' => optional($shrinkage->DateAdded)->toIso8601String(),
      'items' => $shrinkage->shrinkedProducts->map(function ($line) {
        $pricePerUnit = (int) $line->Quantity > 0
          ? round(((float) $line->SubAmount) / (int) $line->Quantity, 2)
          : 0;

        return [
          'ID' => $line->ID,
          'ProductID' => $line->ProductID,
          'ProductName' => $line->product?->ProductName ?? 'Unknown Product',
          'Quantity' => (int) $line->Quantity,
          'SubAmount' => (float) $line->SubAmount,
          'PricePerUnit' => $pricePerUnit,
        ];
      })->values(),
    ];
  }

  private function restoreProductsForShrinkageLines($lines): void {
    $grouped = collect($lines)
      ->groupBy('ProductID')
      ->map(fn ($rows) => (int) $rows->sum('Quantity'))
      ->all();

    if (empty($grouped)) {
      return;
    }

    $productIDs = array_map('intval', array_keys($grouped));
    $products = Product::whereIn('ID', $productIDs)->lockForUpdate()->get()->keyBy('ID');

    if ($products->count() !== count($productIDs)) {
      throw ValidationException::withMessages([
        'items' => 'One or more shrinkage products no longer exist.',
      ]);
    }

    foreach ($grouped as $productID => $quantity) {
      $product = $products[(int) $productID];
      $product->update([
        'Quantity' => (int) $product->Quantity + (int) $quantity,
        'DateModified' => now(),
      ]);
    }
  }

  private function assertAndLockProducts(array $groupedItems) {
    $productIDs = array_map('intval', array_keys($groupedItems));
    $products = Product::whereIn('ID', $productIDs)->lockForUpdate()->get()->keyBy('ID');

    if ($products->count() !== count($productIDs)) {
      throw ValidationException::withMessages([
        'items' => 'One or more selected products are invalid.',
      ]);
    }

    foreach ($groupedItems as $productID => $quantity) {
      $product = $products[(int)$productID];
      if ((int)$product->Quantity < (int)$quantity) {
        throw ValidationException::withMessages([
          'items' => "Insufficient stock for {$product->ProductName}.",
        ]);
      }
    }

    return $products;
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
