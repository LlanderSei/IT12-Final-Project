<?php

namespace App\Http\Controllers\PointOfSale;

use App\Http\Controllers\Controller;
use App\Http\Controllers\PointOfSale\Concerns\HandlesShrinkage;
use App\Http\Controllers\PointOfSale\Concerns\PosHelpers;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SoldProduct;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class CashierController extends Controller {
  use PosHelpers;
  use HandlesShrinkage;

  public function cashSale() {
    return Inertia::render('PointOfSale/Cashier', [
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
          'SaleType' => 'WalkIn',
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
        $appliedPaidAmount = min($finalPaid, $totalAmount);

        $receiptNumber = $this->generateReceiptNumber();

        Payment::create([
          'SalesID' => $sale->ID,
          'PaymentMethod' => $payload['paymentMethod'] ?? 'Cash',
          'PaidAmount' => $appliedPaidAmount,
          'TotalAmount' => $totalAmount,
          'Change' => max(0, $finalPaid - $totalAmount),
          'PaymentStatus' => 'Paid',
          'PaymentDueDate' => null,
          'AdditionalDetails' => $payload['additionalDetails'] ?? null,
          'ReceiptNumber' => $receiptNumber,
          'ReceiptIssuedAt' => now(),
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
}
