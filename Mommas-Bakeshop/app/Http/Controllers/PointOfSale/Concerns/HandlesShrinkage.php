<?php

namespace App\Http\Controllers\PointOfSale\Concerns;

use App\Models\Shrinkage;
use App\Models\ShrinkedProduct;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

trait HandlesShrinkage {
  protected function allowedShrinkageReasons($user, ?string $preservedReason = null): array {
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

  protected function validateShrinkagePayload(Request $request, array $allowedReasons): array {
    return $request->validate([
      'items' => 'required|array|min:1',
      'items.*.ProductID' => 'required|integer|exists:products,ID',
      'items.*.Quantity' => 'required|integer|min:1',
      'reason' => ['required', Rule::in($allowedReasons)],
      'bypassVerification' => 'nullable|boolean',
    ]);
  }

  protected function persistShrinkageRecord(
    array $payload,
    int $userId,
    string $verificationStatus = 'Pending',
    bool $deductStock = false
  ): Shrinkage {
    return DB::transaction(function () use ($payload, $userId, $verificationStatus, $deductStock) {
      [$lines, $totalQuantity, $totalAmount] = $this->calculateCartTotals($payload['items']);

      $shrinkage = Shrinkage::create([
        'UserID' => $userId,
        'Quantity' => $totalQuantity,
        'TotalAmount' => $totalAmount,
        'Reason' => $payload['reason'],
        'VerificationStatus' => $verificationStatus,
        'DateAdded' => now(),
      ]);

      foreach ($lines as $line) {
        ShrinkedProduct::create([
          'ShrinkageID' => $shrinkage->ID,
          'ProductID' => $line['product']->ID,
          'Quantity' => $line['quantity'],
          'SubAmount' => $line['subAmount'],
        ]);

        $updates = ['DateModified' => now()];
        if ($deductStock) {
          $updates['Quantity'] = (int) $line['product']->Quantity - (int) $line['quantity'];
        }
        $line['product']->update($updates);
      }

      return $shrinkage;
    });
  }

  protected function transformShrinkageForView(Shrinkage $shrinkage): array {
    return [
      'ID' => $shrinkage->ID,
      'UserID' => $shrinkage->UserID,
      'CreatedBy' => $shrinkage->user?->FullName ?? 'Unknown',
      'Quantity' => (int) $shrinkage->Quantity,
      'TotalAmount' => (float) $shrinkage->TotalAmount,
      'Reason' => $shrinkage->Reason,
      'VerificationStatus' => $shrinkage->VerificationStatus ?? 'Pending',
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

  protected function restoreProductsForShrinkageLines($lines): void {
    $grouped = collect($lines)
      ->groupBy('ProductID')
      ->map(fn ($rows) => (int) $rows->sum('Quantity'))
      ->all();

    if (empty($grouped)) {
      return;
    }

    $productIDs = array_map('intval', array_keys($grouped));
    $products = Product::query()->notArchived()->whereIn('ID', $productIDs)->lockForUpdate()->get()->keyBy('ID');

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
}
