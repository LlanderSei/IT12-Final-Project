<?php

namespace App\Http\Controllers\PointOfSale\JobOrders;

use App\Http\Controllers\Controller;
use App\Http\Controllers\PointOfSale\Concerns\PosHelpers;
use App\Models\Category;
use App\Models\Customer;
use App\Models\JobOrder;
use App\Models\JobOrderCustomItem;
use App\Models\JobOrderItem;
use App\Models\Payment;
use App\Models\PartialPayment;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SoldProduct;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class JobOrdersController extends Controller {
  use PosHelpers;

  public function index(Request $request) {
    return $this->renderJobOrders($request);
  }

  public function storeJobOrder(Request $request) {
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
        'deliveryDate' => 'required|date|after_or_equal:today',
        'deliveryTime' => 'required|date_format:H:i',
        'notes' => 'nullable|string|max:1000',
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

      if (
        $payload['customerMode'] === 'existing' &&
        !Customer::query()->notArchived()->whereKey((int) ($payload['CustomerID'] ?? 0))->exists()
      ) {
        throw ValidationException::withMessages([
          'CustomerID' => 'Selected customer is no longer available.',
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

      $deliveryAt = Carbon::createFromFormat(
        'Y-m-d H:i',
        $payload['deliveryDate'] . ' ' . $payload['deliveryTime'],
        config('app.timezone')
      );

      $groupedItems = collect($productItems)
        ->groupBy('ProductID')
        ->map(fn ($rows) => (int) $rows->sum('Quantity'))
        ->all();

      $products = [];
      if (!empty($groupedItems)) {
        $productIDs = array_map('intval', array_keys($groupedItems));
        $products = Product::query()->notArchived()->whereIn('ID', $productIDs)->get()->keyBy('ID');
        if ($products->count() !== count($productIDs)) {
          throw ValidationException::withMessages([
            'items' => 'One or more selected products are invalid.',
          ]);
        }
      }

      $lines = [];
      $productTotal = 0.0;
      foreach ($groupedItems as $productID => $quantity) {
        $product = $products[(int) $productID];
        $pricePerUnit = (float) $product->Price;
        $subAmount = round($pricePerUnit * $quantity, 2);
        $lines[] = [
          'product' => $product,
          'quantity' => $quantity,
          'pricePerUnit' => $pricePerUnit,
          'subAmount' => $subAmount,
        ];
        $productTotal += $subAmount;
      }

      $customOrdersTotal = round(collect($customOrderItems)->sum(function ($item) {
        return ((float) $item['quantity']) * ((float) $item['pricePerUnit']);
      }), 2);
      $totalAmount = round($productTotal + $customOrdersTotal, 2);

      DB::transaction(function () use ($payload, $request, $lines, $customOrderItems, $totalAmount, $deliveryAt) {
        $customerID = isset($payload['CustomerID']) ? (int) $payload['CustomerID'] : 0;
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

        $jobOrder = JobOrder::create([
          'UserID' => $request->user()->id,
          'CustomerID' => $customerID,
          'SalesID' => null,
          'Status' => 'Pending',
          'DeliveryAt' => $deliveryAt,
          'Notes' => $payload['notes'] ?? null,
          'TotalAmount' => $totalAmount,
          'DateAdded' => now(),
          'DateModified' => now(),
        ]);

        foreach ($lines as $line) {
          JobOrderItem::create([
            'JobOrderID' => $jobOrder->ID,
            'ProductID' => $line['product']->ID,
            'PricePerUnit' => $line['pricePerUnit'],
            'Quantity' => $line['quantity'],
            'SubAmount' => $line['subAmount'],
          ]);
        }

        foreach ($customOrderItems as $customOrderItem) {
          JobOrderCustomItem::create([
            'JobOrderID' => $jobOrder->ID,
            'CustomOrderDescription' => trim((string) $customOrderItem['description']),
            'Quantity' => (int) $customOrderItem['quantity'],
            'PricePerUnit' => round((float) $customOrderItem['pricePerUnit'], 2),
          ]);
        }
      });

      return redirect()->back()->with('success', 'Job order created successfully.');
    } catch (ValidationException $e) {
      throw $e;
    } catch (\Throwable $e) {
      report($e);
      return redirect()->back()->with('error', 'Failed to create job order.');
    }
  }

  public function deliverJobOrder(Request $request, int $id) {
    try {
      $payload = $request->validate([
        'paymentSelection' => 'required|in:pay_now,pay_later',
        'paymentType' => 'nullable|in:full,partial',
        'paidAmount' => 'nullable|numeric|min:0',
        'paymentMethod' => $this->paymentMethodValidationRule(true),
        'additionalDetails' => 'nullable|string|max:1000',
        'dueDate' => 'nullable|date|after_or_equal:today',
      ]);

      DB::transaction(function () use ($payload, $id, $request) {
        $jobOrder = JobOrder::with([
          'items',
          'customItems',
        ])->lockForUpdate()->findOrFail($id);

        if ($jobOrder->Status !== 'Pending') {
          throw ValidationException::withMessages([
            'status' => 'Only pending job orders can be delivered.',
          ]);
        }

        $groupedItems = $jobOrder->items
          ->groupBy('ProductID')
          ->map(fn ($rows) => (int) $rows->sum('Quantity'))
          ->all();

        $products = $this->assertAndLockProducts($groupedItems, false);

        $totalAmount = (float) $jobOrder->TotalAmount;
        $paymentDetails = $this->normalizeSalePaymentInput($payload, $totalAmount, true);
        if ($paymentDetails['remainingAmount'] > 0 && empty($payload['dueDate'] ?? null)) {
          throw ValidationException::withMessages([
            'dueDate' => 'Due date is required whenever a balance remains.',
          ]);
        }

        $paidAmount = $paymentDetails['appliedAmount'];
        $paymentStatus = $paymentDetails['paymentStatus'];
        $paymentReceiptNumber = null;
        $partialReceiptNumber = null;

        if ($paymentDetails['paymentSelection'] === 'pay_now') {
          if ($paymentDetails['effectivePaymentType'] === 'full') {
            $paymentReceiptNumber = $this->generateReceiptNumber();
          } else {
            $partialReceiptNumber = $this->generateReceiptNumber();
          }
        }

        $sale = Sale::create([
          'UserID' => $request->user()->id,
          'CustomerID' => $jobOrder->CustomerID,
          'SaleType' => 'JobOrder',
          'TotalAmount' => $totalAmount,
          'DateAdded' => now(),
        ]);

        foreach ($jobOrder->items as $line) {
          SoldProduct::create([
            'SalesID' => $sale->ID,
            'ProductID' => $line->ProductID,
            'PricePerUnit' => (float) $line->PricePerUnit,
            'Quantity' => (int) $line->Quantity,
            'SubAmount' => (float) $line->SubAmount,
          ]);

          if (isset($products[$line->ProductID])) {
            $products[$line->ProductID]->update([
              'DateModified' => now(),
            ]);
          }
        }

        $invoiceNumber = $this->generateInvoiceNumber();
        $dueDate = $payload['dueDate'] ?? null;
        $finalDueDate = $paymentDetails['remainingAmount'] > 0 ? $dueDate : null;

        Payment::create([
          'SalesID' => $sale->ID,
          'PaymentMethod' => $paymentDetails['paymentMethod'],
          'PaidAmount' => $paidAmount,
          'TotalAmount' => $totalAmount,
          'Change' => $paymentDetails['change'],
          'PaymentStatus' => $paymentStatus,
          'InvoiceNumber' => $invoiceNumber,
          'InvoiceIssuedAt' => now(),
          'ReceiptNumber' => $paymentReceiptNumber,
          'ReceiptIssuedAt' => $paymentReceiptNumber ? now() : null,
          'PaymentDueDate' => $finalDueDate,
          'AdditionalDetails' => $payload['additionalDetails'] ?? null,
          'DateAdded' => now(),
        ]);

        if ($paymentDetails['paymentSelection'] === 'pay_now' && $paymentDetails['effectivePaymentType'] === 'partial') {
          PartialPayment::create([
            'SalesID' => $sale->ID,
            'PaidAmount' => $paidAmount,
            'TenderedAmount' => $paymentDetails['tenderedAmount'],
            'Change' => $paymentDetails['change'],
            'ReceiptNumber' => $partialReceiptNumber,
            'ReceiptIssuedAt' => $partialReceiptNumber ? now() : null,
            'PaymentMethod' => $paymentDetails['paymentMethod'],
            'AdditionalDetails' => $payload['additionalDetails'] ?? null,
            'DateAdded' => now(),
          ]);
        }

        $jobOrder->update([
          'SalesID' => $sale->ID,
          'Status' => 'Delivered',
          'DateModified' => now(),
        ]);
      });

      return redirect()->back()->with('success', 'Job order delivered and sale recorded.');
    } catch (ValidationException $e) {
      throw $e;
    } catch (\Throwable $e) {
      report($e);
      return redirect()->back()->with('error', 'Failed to deliver job order.');
    }
  }

  public function cancelJobOrder(int $id) {
    try {
      DB::transaction(function () use ($id) {
        $jobOrder = JobOrder::lockForUpdate()->findOrFail($id);
        if ($jobOrder->Status !== 'Pending') {
          throw ValidationException::withMessages([
            'status' => 'Only pending job orders can be cancelled.',
          ]);
        }
        $jobOrder->update([
          'Status' => 'Cancelled',
          'DateModified' => now(),
        ]);
      });

      return redirect()->back()->with('success', 'Job order cancelled.');
    } catch (ValidationException $e) {
      throw $e;
    } catch (\Throwable $e) {
      report($e);
      return redirect()->back()->with('error', 'Failed to cancel job order.');
    }
  }

  protected function renderJobOrders(Request $request, ?string $forcedTab = null) {
    $requestedTab = $forcedTab ?? $request->route('tab');
    $initialTab = in_array($requestedTab, ['Job Orders', 'Pending Job Orders', 'Pending Payments', 'Job Orders History'], true)
      ? $requestedTab
      : 'Job Orders';

    $jobOrders = JobOrder::with([
      'customer',
      'user:id,FullName',
      'items.product:ID,ProductName',
      'customItems',
      'sale.payment',
    ])
      ->orderByDesc('DateAdded')
      ->get()
      ->map(function ($jobOrder) {
        return $this->transformJobOrderForView($jobOrder);
      })
      ->values();

    $pendingJobOrders = $jobOrders
      ->filter(fn ($jobOrder) => ($jobOrder['Status'] ?? '') === 'Pending')
      ->values();

    $historyJobOrders = $jobOrders
      ->filter(fn ($jobOrder) => in_array(($jobOrder['Status'] ?? ''), ['Delivered', 'Cancelled'], true))
      ->values();

    $pendingSales = Sale::with([
      'customer',
      'user:id,FullName',
      'payment',
      'soldProducts.product:ID,ProductName',
      'partialPayments',
      'jobOrder.customItems',
    ])
      ->where('SaleType', 'JobOrder')
      ->orderByDesc('DateAdded')
      ->get()
      ->filter(function ($sale) {
        return optional($sale->payment)->PaymentStatus !== 'Paid';
      })
      ->values();

    return Inertia::render('PointOfSale/JobOrdersTabs', [
      'initialTab' => $initialTab,
      'jobOrders' => $jobOrders,
      'pendingJobOrders' => $pendingJobOrders,
      'pendingSales' => $pendingSales,
      'historyJobOrders' => $historyJobOrders,
      'products' => Product::query()->notArchived()->with('category')
        ->orderBy('ProductName')
        ->get()
        ->map(function ($product) {
          $product->ProductImageUrl = $this->resolveProductImageUrl($product->ProductImage);
          return $product;
        })
        ->values(),
      'categories' => Category::orderBy('CategoryName')->get(),
      'customers' => Customer::query()->notArchived()->orderBy('CustomerName')->get(),
    ]);
  }

  private function transformJobOrderForView(JobOrder $jobOrder): array {
    return [
      'ID' => $jobOrder->ID,
      'UserID' => $jobOrder->UserID,
      'CustomerID' => $jobOrder->CustomerID,
      'SalesID' => $jobOrder->SalesID,
      'Status' => $jobOrder->Status,
      'DeliveryAt' => optional($jobOrder->DeliveryAt)->toIso8601String(),
      'Notes' => $jobOrder->Notes,
      'TotalAmount' => (float) $jobOrder->TotalAmount,
      'DateAdded' => optional($jobOrder->DateAdded)->toIso8601String(),
      'DateModified' => optional($jobOrder->DateModified)->toIso8601String(),
      'user' => $jobOrder->user,
      'customer' => $jobOrder->customer,
      'sale' => $jobOrder->sale
        ? [
            'ID' => $jobOrder->sale->ID,
            'payment' => $jobOrder->sale->payment,
          ]
        : null,
      'items' => $jobOrder->items->map(function ($line) {
        return [
          'ID' => $line->ID,
          'ProductID' => $line->ProductID,
          'ProductName' => $line->product?->ProductName ?? 'Unknown Product',
          'Quantity' => (int) $line->Quantity,
          'PricePerUnit' => (float) $line->PricePerUnit,
          'SubAmount' => (float) $line->SubAmount,
        ];
      })->values(),
      'custom_items' => $jobOrder->customItems->map(function ($line) {
        return [
          'ID' => $line->ID,
          'CustomOrderDescription' => $line->CustomOrderDescription,
          'Quantity' => (int) $line->Quantity,
          'PricePerUnit' => (float) $line->PricePerUnit,
        ];
      })->values(),
    ];
  }
}
