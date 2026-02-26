<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Category;
use App\Models\ProductionBatch;
use App\Models\ProductionBatchDetail;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductController extends Controller {
  public function index() {
    $products = Product::with('category')->get();
    $categories = Category::all();
    $batches = ProductionBatchDetail::with(['user', 'batches.product'])
      ->orderBy('DateAdded', 'desc')
      ->get()
      ->map(function ($detail) {
        $items = $detail->batches->map(function ($line) {
          return [
            'ProductID' => $line->ProductID,
            'ItemName' => $line->product?->ProductName ?? 'Deleted Product',
            'QuantityProduced' => (int) ($line->QuantityProduced ?? 0),
          ];
        })->values();

        return [
          'ID' => $detail->ID,
          'user' => $detail->user,
          'BatchDescription' => $detail->BatchDescription,
          // Always derive from actual batch lines to avoid stale/legacy counter mismatches.
          'TotalQuantity' => (int) $items->sum('QuantityProduced'),
          'DateAdded' => $detail->DateAdded,
          'ItemsProduced' => $items,
        ];
      });

    return Inertia::render('Inventory/ProductsAndBatchesTabs', [
      'products' => $products,
      'categories' => $categories,
      'batches' => $batches,
    ]);
  }

  public function store(Request $request) {
    $data = $request->validate([
      'ProductName' => 'required|string|max:255',
      'ProductDescription' => 'nullable|string',
      'CategoryID' => 'required|exists:categories,ID',
      'Price' => 'required|numeric|min:0',
      'ProductImage' => 'nullable|string',
      'LowStockThreshold' => 'nullable|integer|min:0',
    ]);

    Product::create([
      'ProductName' => $data['ProductName'],
      'ProductDescription' => $data['ProductDescription'] ?? '',
      'CategoryID' => $data['CategoryID'],
      'ProductImage' => $data['ProductImage'] ?? 'default.png',
      'Price' => $data['Price'],
      'Quantity' => '0',
      'LowStockThreshold' => $data['LowStockThreshold'] ?? 10,
      'DateAdded' => now(),
      'DateModified' => now(),
    ]);

    return redirect()->route('inventory.products')->with('success', 'Product created successfully.');
  }

  public function update(Request $request, $id) {
    $product = Product::findOrFail($id);

    $data = $request->validate([
      'ProductName' => 'required|string|max:255',
      'ProductDescription' => 'nullable|string',
      'CategoryID' => 'required|exists:categories,ID',
      'Price' => 'required|numeric|min:0',
      'ProductImage' => 'nullable|string',
      'LowStockThreshold' => 'nullable|integer|min:0',
    ]);

    $product->update([
      'ProductName' => $data['ProductName'],
      'ProductDescription' => $data['ProductDescription'] ?? $product->ProductDescription,
      'CategoryID' => $data['CategoryID'],
      'ProductImage' => $data['ProductImage'] ?? $product->ProductImage,
      'Price' => $data['Price'],
      'LowStockThreshold' => $data['LowStockThreshold'] ?? $product->LowStockThreshold,
      'DateModified' => now(),
    ]);

    return redirect()->back()->with('success', 'Product updated successfully.');
  }

  public function destroy($id) {
    $product = Product::findOrFail($id);
    $product->delete();

    return redirect()->back()->with('success', 'Product deleted successfully.');
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
