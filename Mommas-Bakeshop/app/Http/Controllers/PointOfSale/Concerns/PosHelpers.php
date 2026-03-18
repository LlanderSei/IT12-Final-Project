<?php

namespace App\Http\Controllers\PointOfSale\Concerns;

use App\Models\Payment;
use App\Models\PartialPayment;
use App\Models\Product;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

trait PosHelpers {
  protected function supportedPaymentMethods(): array {
    return ['Cash', 'GCash', 'Bank Transfer', 'Card'];
  }

  protected function paymentMethodValidationRule(bool $nullable = false): array {
    $allowed = implode(',', $this->supportedPaymentMethods());
    return [$nullable ? 'nullable' : 'required', "in:$allowed"];
  }

  protected function normalizeSalePaymentInput(array $payload, float $amountDue, bool $allowPayLater = false): array {
    $amountDue = round((float) $amountDue, 2);

    if ($allowPayLater && ($payload['paymentSelection'] ?? null) === 'pay_later') {
      return [
        'paymentSelection' => 'pay_later',
        'paymentMethod' => null,
        'enteredAmount' => 0.0,
        'appliedAmount' => 0.0,
        'tenderedAmount' => null,
        'change' => 0.0,
        'remainingAmount' => $amountDue,
        'effectivePaymentType' => 'partial',
        'paymentStatus' => 'Unpaid',
      ];
    }

    $paymentMethod = trim((string) ($payload['paymentMethod'] ?? ''));
    if ($paymentMethod === '') {
      throw ValidationException::withMessages([
        'paymentMethod' => 'Payment method is required.',
      ]);
    }

    if (!in_array($paymentMethod, $this->supportedPaymentMethods(), true)) {
      throw ValidationException::withMessages([
        'paymentMethod' => 'Selected payment method is invalid.',
      ]);
    }

    $enteredAmount = round((float) ($payload['paidAmount'] ?? 0), 2);
    if ($enteredAmount <= 0) {
      throw ValidationException::withMessages([
        'paidAmount' => 'Amount paid must be greater than 0.',
      ]);
    }

    $isCash = $paymentMethod === 'Cash';
    if (!$isCash && $enteredAmount > $amountDue) {
      throw ValidationException::withMessages([
        'paidAmount' => 'Amount paid cannot exceed the remaining balance for non-cash payments.',
      ]);
    }

    $appliedAmount = $isCash ? min($enteredAmount, $amountDue) : $enteredAmount;
    $change = $isCash ? max(0, round($enteredAmount - $amountDue, 2)) : 0.0;
    $remainingAmount = max(0, round($amountDue - $appliedAmount, 2));
    $effectivePaymentType = $remainingAmount <= 0 ? 'full' : 'partial';

    return [
      'paymentSelection' => 'pay_now',
      'paymentMethod' => $paymentMethod,
      'enteredAmount' => $enteredAmount,
      'appliedAmount' => $appliedAmount,
      'tenderedAmount' => $isCash ? $enteredAmount : null,
      'change' => $change,
      'remainingAmount' => $remainingAmount,
      'effectivePaymentType' => $effectivePaymentType,
      'paymentStatus' => $effectivePaymentType === 'full' ? 'Paid' : 'Partially Paid',
    ];
  }

  protected function calculateCartTotals(array $items): array {
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

  protected function assertAndLockProducts(array $groupedItems) {
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

  protected function generateInvoiceNumber(): string {
    $prefix = 'INV-' . now()->format('Ymd') . '-';
    $latest = Payment::query()
      ->whereNotNull('InvoiceNumber')
      ->where('InvoiceNumber', 'like', $prefix . '%')
      ->orderByDesc('InvoiceNumber')
      ->value('InvoiceNumber');

    $next = $this->nextDocumentSequence($latest, $prefix);

    return sprintf('%s%04d', $prefix, $next);
  }

  protected function generateReceiptNumber(): string {
    $prefix = 'RCP-' . now()->format('Ymd') . '-';
    $latestPaymentReceipt = Payment::query()
      ->whereNotNull('ReceiptNumber')
      ->where('ReceiptNumber', 'like', $prefix . '%')
      ->orderByDesc('ReceiptNumber')
      ->value('ReceiptNumber');
    $latestPartialReceipt = PartialPayment::query()
      ->whereNotNull('ReceiptNumber')
      ->where('ReceiptNumber', 'like', $prefix . '%')
      ->orderByDesc('ReceiptNumber')
      ->value('ReceiptNumber');

    $next = max(
      $this->nextDocumentSequence($latestPaymentReceipt, $prefix),
      $this->nextDocumentSequence($latestPartialReceipt, $prefix)
    );

    return sprintf('%s%04d', $prefix, $next);
  }

  protected function nextDocumentSequence(?string $latestValue, string $prefix): int {
    if (!$latestValue || !str_starts_with($latestValue, $prefix)) {
      return 1;
    }

    $suffix = substr($latestValue, strlen($prefix));
    $number = (int) ltrim($suffix, '0');

    return $number + 1;
  }

  protected function resolveProductImageUrl(?string $path): ?string {
    $normalized = trim((string) $path);
    if ($normalized === '') {
      return null;
    }

    if (preg_match('/^(https?:)?\/\//i', $normalized) === 1) {
      return $normalized;
    }

    if (str_starts_with($normalized, '/storage/')) {
      return $normalized;
    }

    if (Storage::disk('public')->exists($normalized)) {
      return Storage::disk('public')->url($normalized);
    }

    return $normalized;
  }
}
