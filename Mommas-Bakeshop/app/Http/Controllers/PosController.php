<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SoldProduct;
use App\Models\Spoilage;
use App\Models\SpoiledProduct;
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

  public function checkoutWalkIn(Request $request) {
    try {
      $payload = $request->validate([
        'items' => 'required|array|min:1',
        'items.*.ProductID' => 'required|integer|exists:Products,ID',
        'items.*.Quantity' => 'required|integer|min:1',
        'paidAmount' => 'nullable|numeric|min:0',
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

          $newQuantity = (int)$line['product']->Quantity - $line['quantity'];
          $line['product']->update([
            'Quantity' => $newQuantity,
            'Status' => $this->resolveProductStatus($newQuantity, (int)($line['product']->LowStockThreshold ?? 10)),
            'DateModified' => now(),
          ]);
        }

        $finalPaid = $paidAmount === null ? $totalAmount : (float)$paidAmount;

        Payment::create([
          'SalesID' => $sale->ID,
          'PaidAmount' => $finalPaid,
          'TotalAmount' => $totalAmount,
          'Change' => max(0, $finalPaid - $totalAmount),
          'PaymentMethod' => 'Walk-In',
          'PaymentStatus' => 'Paid',
          'PaymentDueDate' => null,
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
        'items.*.ProductID' => 'required|integer|exists:Products,ID',
        'items.*.Quantity' => 'required|integer|min:1',
        'customerMode' => 'required|in:existing,new',
        'CustomerID' => 'nullable|integer|exists:Customers,ID',
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

          $newQuantity = (int)$line['product']->Quantity - $line['quantity'];
          $line['product']->update([
            'Quantity' => $newQuantity,
            'Status' => $this->resolveProductStatus($newQuantity, (int)($line['product']->LowStockThreshold ?? 10)),
            'DateModified' => now(),
          ]);
        }

        Payment::create([
          'SalesID' => $sale->ID,
          'PaidAmount' => 0,
          'TotalAmount' => $totalAmount,
          'Change' => 0,
          'PaymentMethod' => 'Consignment',
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

  public function recordSpoilage(Request $request) {
    try {
      $payload = $request->validate([
        'items' => 'required|array|min:1',
        'items.*.ProductID' => 'required|integer|exists:Products,ID',
        'items.*.Quantity' => 'required|integer|min:1',
      ]);

      DB::transaction(function () use ($payload, $request) {
        [$lines, $totalQuantity, $totalAmount] = $this->calculateCartTotals($payload['items']);

        $spoilage = Spoilage::create([
          'UserID' => $request->user()->id,
          'Quantity' => $totalQuantity,
          'SubAmount' => $totalAmount,
          'DateAdded' => now(),
        ]);

        foreach ($lines as $line) {
          SpoiledProduct::create([
            'SpoilageID' => $spoilage->ID,
            'ProductID' => $line['product']->ID,
            'Quantity' => $line['quantity'],
            'SubAmount' => $line['subAmount'],
          ]);

          $newQuantity = (int)$line['product']->Quantity - $line['quantity'];
          $line['product']->update([
            'Quantity' => $newQuantity,
            'Status' => $this->resolveProductStatus($newQuantity, (int)($line['product']->LowStockThreshold ?? 10)),
            'DateModified' => now(),
          ]);
        }
      });

      return redirect()->back()->with('success', 'Spoilage recorded successfully.');
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

  private function resolveProductStatus(int $newQty, int $lowStockThreshold): string {
    if ($newQty <= 0) {
      return 'No Stock';
    }

    if ($newQty <= $lowStockThreshold) {
      return 'Low Stock';
    }

    return 'On Stock';
  }
}
