<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Payment;
use App\Models\PartialPayment;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SoldProduct;
use App\Models\Shrinkage;
use App\Models\ShrinkedProduct;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
        'items' => 'required|array|min:1',
        'items.*.ProductID' => 'required|integer|exists:products,ID',
        'items.*.Quantity' => 'required|integer|min:1',
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
      $payload = $request->validate([
        'items' => 'required|array|min:1',
        'items.*.ProductID' => 'required|integer|exists:products,ID',
        'items.*.Quantity' => 'required|integer|min:1',
        'reason' => 'required|in:Spoiled',
      ]);

      DB::transaction(function () use ($payload, $request) {
        [$lines, $totalQuantity, $totalAmount] = $this->calculateCartTotals($payload['items']);

        $shrinkage = Shrinkage::create([
          'UserID' => $request->user()->id,
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
      });

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

}
