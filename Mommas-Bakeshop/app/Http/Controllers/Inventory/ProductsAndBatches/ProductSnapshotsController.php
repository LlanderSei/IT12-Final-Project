<?php

namespace App\Http\Controllers\Inventory\ProductsAndBatches;

use App\Models\Product;
use App\Models\ProductLeftover;
use App\Models\ProductLeftoverSnapshot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductSnapshotsController extends ProductsController {
  public function index(Request $request) {
    return $this->renderProductsAndBatches($request, 'Snapshots');
  }

  public function storeSnapshot(Request $request) {
    $data = $request->validate([
      'ProceedOnSameDay' => 'nullable|boolean',
    ]);

    $todayStart = now()->startOfDay();
    $todayEnd = now()->endOfDay();
    $hasSnapshotToday = ProductLeftoverSnapshot::query()
      ->whereBetween('SnapshotTime', [$todayStart, $todayEnd])
      ->exists();

    if ($hasSnapshotToday && !($data['ProceedOnSameDay'] ?? false)) {
      throw ValidationException::withMessages([
        'snapshot' => 'A snapshot for today already exists. Confirm and proceed to record another snapshot.',
      ]);
    }

    DB::transaction(function () use ($request) {
      $snapshot = ProductLeftoverSnapshot::create([
        'UserID' => $request->user()->id,
        'SnapshotTime' => now(),
      ]);

      $products = Product::query()
        ->notArchived()
        ->where('Quantity', '>', 0)
        ->orderBy('ProductName', 'asc')
        ->get(['ID', 'Price', 'Quantity']);

      foreach ($products as $product) {
        ProductLeftover::create([
          'ProductLeftoverID' => $snapshot->ID,
          'ProductID' => $product->ID,
          'LeftoverQuantity' => (int) $product->Quantity,
          'PerUnitAmount' => round((float) $product->Price, 2),
          'DateAdded' => now(),
        ]);
      }
    });

    return redirect()->back()->with('success', 'Product snapshot recorded successfully.');
  }
}
