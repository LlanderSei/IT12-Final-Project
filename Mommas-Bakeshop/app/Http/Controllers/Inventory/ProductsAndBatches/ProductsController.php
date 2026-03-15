<?php

namespace App\Http\Controllers\Inventory\ProductsAndBatches;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductLeftoverSnapshot;
use App\Models\ProductionBatchDetail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ProductsController extends Controller {
  public function index(Request $request) {
    return $this->renderProductsAndBatches($request);
  }

  public function store(Request $request) {
    $uploadedImage = $request->file('ProductImage');
    if ($uploadedImage && !$uploadedImage->isValid()) {
      return back()
        ->withErrors(['ProductImage' => 'Image upload failed. Check temporary directory permissions.'])
        ->withInput();
    }

    $data = $request->validate([
      'ProductName' => 'required|string|max:255',
      'ProductDescription' => 'nullable|string',
      'CategoryID' => 'required|exists:categories,ID',
      'Price' => 'required|numeric|min:0',
      'ProductImage' => 'nullable|file|image|max:2048',
      'LowStockThreshold' => 'nullable|integer|min:0',
    ]);

    $productImagePath = $request->hasFile('ProductImage')
      ? $request->file('ProductImage')->store('products', 'public')
      : null;

    Product::create([
      'ProductName' => $data['ProductName'],
      'ProductDescription' => $data['ProductDescription'] ?? '',
      'CategoryID' => $data['CategoryID'],
      'ProductImage' => $productImagePath,
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

    $uploadedImage = $request->file('ProductImage');
    if ($uploadedImage && !$uploadedImage->isValid()) {
      return back()
        ->withErrors(['ProductImage' => 'Image upload failed. Check temporary directory permissions.'])
        ->withInput();
    }

    $data = $request->validate([
      'ProductName' => 'required|string|max:255',
      'ProductDescription' => 'nullable|string',
      'CategoryID' => 'required|exists:categories,ID',
      'Price' => 'required|numeric|min:0',
      'ProductImage' => 'nullable|file|image|max:2048',
      'RemoveProductImage' => 'nullable|boolean',
      'LowStockThreshold' => 'nullable|integer|min:0',
    ]);

    $removeProductImage = filter_var($request->input('RemoveProductImage', false), FILTER_VALIDATE_BOOL);
    $productImagePath = $product->ProductImage;

    if ($request->hasFile('ProductImage')) {
      $productImagePath = $request->file('ProductImage')->store('products', 'public');
      $this->deleteProductImage($product->ProductImage);
    } elseif ($removeProductImage) {
      $this->deleteProductImage($product->ProductImage);
      $productImagePath = null;
    }

    $product->update([
      'ProductName' => $data['ProductName'],
      'ProductDescription' => $data['ProductDescription'] ?? $product->ProductDescription,
      'CategoryID' => $data['CategoryID'],
      'ProductImage' => $productImagePath,
      'Price' => $data['Price'],
      'LowStockThreshold' => $data['LowStockThreshold'] ?? $product->LowStockThreshold,
      'DateModified' => now(),
    ]);

    return redirect()->back()->with('success', 'Product updated successfully.');
  }

  public function destroy($id) {
    $product = Product::findOrFail($id);
    $this->deleteProductImage($product->ProductImage);
    $product->delete();

    return redirect()->back()->with('success', 'Product deleted successfully.');
  }

  protected function renderProductsAndBatches(Request $request, ?string $forcedTab = null) {
    $requestedTab = $forcedTab ?? $request->route('tab');
    $initialTab = in_array($requestedTab, ['Products', 'Production Batches', 'Snapshots'], true)
      ? $requestedTab
      : 'Products';

    $products = Product::with('category')
      ->get()
      ->map(fn ($product) => $this->transformProductForView($product))
      ->values();
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

    $snapshots = ProductLeftoverSnapshot::with([
      'user:id,FullName',
      'leftovers.product:ID,ProductName,Price,CategoryID',
      'leftovers.product.category:ID,CategoryName',
    ])
      ->orderBy('SnapshotTime', 'desc')
      ->get()
      ->map(function ($snapshot) {
        return [
          'ID' => $snapshot->ID,
          'user' => $snapshot->user,
          'TotalItems' => (int) $snapshot->TotalProducts,
          'TotalLeftovers' => (int) $snapshot->TotalLeftovers,
          'TotalAmount' => (float) $snapshot->TotalAmount,
          'SnapshotTime' => $snapshot->SnapshotTime,
          'Leftovers' => $snapshot->leftovers->map(function ($line) {
            $lineAmount = round(((float) $line->PerUnitAmount) * ((int) $line->LeftoverQuantity), 2);
            return [
              'ID' => $line->ID,
              'ProductID' => $line->ProductID,
              'ItemName' => $line->product?->ProductName ?? 'Deleted Product',
              'CategoryName' => $line->product?->category?->CategoryName,
              'PerUnitAmount' => (float) $line->PerUnitAmount,
              'LeftoverQuantity' => (int) $line->LeftoverQuantity,
              'LineAmount' => $lineAmount,
              'DateAdded' => $line->DateAdded,
            ];
          })->values(),
        ];
      });

    return Inertia::render('Inventory/ProductsAndBatchesTabs', [
      'products' => $products,
      'categories' => $categories,
      'batches' => $batches,
      'snapshots' => $snapshots,
      'initialTab' => $initialTab,
    ]);
  }

  private function transformProductForView(Product $product): Product {
    $product->ProductImageUrl = $this->resolveProductImageUrl($product->ProductImage);

    return $product;
  }

  private function resolveProductImageUrl(?string $path): ?string {
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

  private function deleteProductImage(?string $path): void {
    $normalized = trim((string) $path);
    if ($normalized === '' || preg_match('/^(https?:)?\/\//i', $normalized) === 1) {
      return;
    }

    if (Storage::disk('public')->exists($normalized)) {
      Storage::disk('public')->delete($normalized);
    }
  }
}
