<?php

namespace App\Http\Controllers\Inventory\ProductsAndBatches;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductionBatch;
use App\Models\ProductionBatchDetail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductionBatchesController extends ProductsController {
  public function index(Request $request) {
    return $this->renderProductsAndBatches($request, 'Production Batches');
  }

  public function storeBatch(Request $request) {
    $data = $request->validate([
      'items' => 'required|array|min:1',
      'items.*.ProductID' => 'nullable|integer',
      'items.*.QuantityProduced' => 'required|integer|min:1',
      'items.*.CreateProduct' => 'nullable|array',
      'BatchDescription' => 'nullable|string',
    ]);

    DB::transaction(function () use ($data, $request) {
      [$rows, $totalQuantity] = $this->parseBatchItems($data['items']);

      $batchDetails = ProductionBatchDetail::create([
        'UserID' => $request->user()->id,
        'BatchDescription' => $data['BatchDescription'] ?? null,
        // DB trigger updates this as each production_batch row is inserted.
        'TotalProductsProduced' => 0,
        'DateAdded' => now(),
      ]);

      foreach ($rows as $row) {
        ProductionBatch::create([
          'BatchDetailsID' => $batchDetails->ID,
          'ProductID' => $row['ProductID'],
          'QuantityProduced' => $row['QuantityProduced'],
          'DateAdded' => now(),
        ]);

        // Trigger updates quantity. Keep DateModified in sync.
        $product = Product::findOrFail($row['ProductID']);
        $product->update([
          'DateModified' => now(),
        ]);
      }
    });

    return redirect()->back()->with('success', 'Batch recorded successfully and inventory updated.');
  }

  private function parseBatchItems(array $items): array {
    $rows = [];
    $totalQuantity = 0;

    foreach ($items as $item) {
      $quantityProduced = (int) ($item['QuantityProduced'] ?? 0);
      $productID = null;

      if (!empty($item['CreateProduct'])) {
        $create = $item['CreateProduct'];
        $required = ['ProductName', 'CategoryID', 'Price'];
        foreach ($required as $field) {
          if (empty($create[$field])) {
            throw ValidationException::withMessages([
              "items.$field" => "Product $field is required.",
            ]);
          }
        }

        Category::findOrFail((int) $create['CategoryID']);

        $product = Product::create([
          'ProductName' => $create['ProductName'],
          'ProductDescription' => $create['ProductDescription'] ?? '',
          'CategoryID' => (int) $create['CategoryID'],
          'ProductImage' => $create['ProductImage'] ?? null,
          'ProductFrom' => 'Produced',
          'Price' => (string) $create['Price'],
          'Quantity' => 0,
          'LowStockThreshold' => (int) ($create['LowStockThreshold'] ?? 10),
          'DateAdded' => now(),
          'DateModified' => now(),
        ]);

        $productID = $product->ID;
      } else {
        $productID = (int) ($item['ProductID'] ?? 0);
        $product = Product::findOrFail($productID);
        if (strtolower((string) $product->ProductFrom) !== 'produced') {
          throw ValidationException::withMessages([
            'items' => 'Only products tagged as Produced can be added in Production Batches existing items.',
          ]);
        }
      }

      $rows[] = [
        'ProductID' => $productID,
        'QuantityProduced' => $quantityProduced,
      ];

      $totalQuantity += $quantityProduced;
    }

    return [$rows, $totalQuantity];
  }
}
