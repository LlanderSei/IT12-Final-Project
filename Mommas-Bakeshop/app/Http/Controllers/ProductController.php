<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Category;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProductController extends Controller {
  public function index() {
    $products = Product::with('category')->get();
    $categories = Category::all();
    $batches = \App\Models\ProductionBatch::with(['product', 'user'])->orderBy('DateAdded', 'desc')->get();

    return Inertia::render('Inventory/ProductsBatches', [
      'products' => $products,
      'categories' => $categories,
      'batches' => $batches,
    ]);
  }

  public function store(Request $request) {
    $data = $request->validate([
      'ProductName' => 'required|string|max:255',
      'ProductDescription' => 'nullable|string',
      'CategoryID' => 'required|exists:Categories,ID',
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
      'Status' => 'No Stock',
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
      'CategoryID' => 'required|exists:Categories,ID',
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
      'ProductID' => 'required|exists:Products,ID',
      'QuantityAdded' => 'required|integer|min:1',
      'BatchDescription' => 'nullable|string',
    ]);

    \Illuminate\Support\Facades\DB::transaction(function () use ($data, $request) {
      // Create the batch record
      \App\Models\ProductionBatch::create([
        'UserID' => $request->user()->id,
        'ProductID' => $data['ProductID'],
        'BatchDescription' => $data['BatchDescription'] ?? null,
        'QuantityAdded' => $data['QuantityAdded'],
        'DateAdded' => now(),
      ]);

      // Update the product quantity and status
      $product = Product::findOrFail($data['ProductID']);
      $newQuantity = (int)$product->Quantity + (int)$data['QuantityAdded'];

      $status = 'On Stock';
      if ($newQuantity == 0) {
        $status = 'No Stock';
      } elseif ($newQuantity <= ($product->LowStockThreshold ?? 10)) {
        $status = 'Low Stock';
      }

      $product->update([
        'Quantity' => $newQuantity,
        'Status' => $status,
        'DateModified' => now(),
      ]);
    });

    return redirect()->back()->with('success', 'Batch recorded successfully and inventory updated.');
  }
}
