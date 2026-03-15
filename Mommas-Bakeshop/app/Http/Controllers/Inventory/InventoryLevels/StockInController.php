<?php

namespace App\Http\Controllers\Inventory\InventoryLevels;

use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\StockIn;
use App\Models\StockInDetail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StockInController extends InventoryController {
  public function index(Request $request) {
    return $this->renderInventoryTabs($request, 'Stock-In');
  }

  public function storeStockIn(Request $request) {
    $data = $request->validate([
      'Supplier' => 'required|string|max:255',
      'Source' => 'required|in:Purchased,Business,Donation',
      'PurchaseDate' => 'nullable|date',
      'ReceiptNumber' => 'nullable|string|max:255',
      'InvoiceNumber' => 'nullable|string|max:255',
      'AdditionalDetails' => 'nullable|string',
      'items' => 'required|array|min:1',
      'items.*.ItemType' => 'required|in:Inventory,Product',
      'items.*.InventoryID' => 'nullable|integer',
      'items.*.ProductID' => 'nullable|integer',
      'items.*.QuantityAdded' => 'required|integer|min:1',
      'items.*.SubAmount' => 'required|numeric|min:0',
      'items.*.CreateInventory' => 'nullable|array',
      'items.*.CreateProduct' => 'nullable|array',
    ]);

    DB::transaction(function () use ($data) {
      [$rows, $totalQuantity, $totalAmount] = $this->parseStockInItems($data['items']);

      $stockInDetails = StockInDetail::create([
        'UserID' => Auth::id(),
        'Supplier' => $data['Supplier'],
        'Source' => $data['Source'],
        'PurchaseDate' => $data['PurchaseDate'] ?? null,
        'ReceiptNumber' => $data['ReceiptNumber'] ?? null,
        'InvoiceNumber' => $data['InvoiceNumber'] ?? null,
        'TotalQuantity' => $totalQuantity,
        'TotalAmount' => $totalAmount,
        'AdditionalDetails' => $data['AdditionalDetails'] ?? null,
        'DateAdded' => now(),
      ]);

      foreach ($rows as $row) {
        StockIn::create([
          'StockInDetailsID' => $stockInDetails->ID,
          'InventoryID' => $row['InventoryID'],
          'ProductID' => $row['ProductID'],
          'ItemType' => $row['ItemType'],
          'QuantityAdded' => $row['QuantityAdded'],
          'SubAmount' => $row['SubAmount'],
          'DateAdded' => now(),
        ]);
      }
    });

    return redirect()->back()->with('success', 'Stock-In recorded and inventory updated.');
  }

  public function updateStockIn(Request $request, int $id) {
    $data = $request->validate([
      'Supplier' => 'required|string|max:255',
      'Source' => 'required|in:Purchased,Business,Donation',
      'PurchaseDate' => 'nullable|date',
      'ReceiptNumber' => 'nullable|string|max:255',
      'InvoiceNumber' => 'nullable|string|max:255',
      'AdditionalDetails' => 'nullable|string',
      'items' => 'required|array|min:1',
      'items.*.ItemType' => 'required|in:Inventory,Product',
      'items.*.InventoryID' => 'nullable|integer',
      'items.*.ProductID' => 'nullable|integer',
      'items.*.QuantityAdded' => 'required|integer|min:1',
      'items.*.SubAmount' => 'required|numeric|min:0',
      'items.*.CreateInventory' => 'nullable|array',
      'items.*.CreateProduct' => 'nullable|array',
    ]);

    DB::transaction(function () use ($id, $data) {
      $detail = StockInDetail::with('stockIns')->findOrFail($id);

      foreach ($detail->stockIns as $oldLine) {
        if ($oldLine->ItemType === 'Inventory' && $oldLine->InventoryID) {
          $inv = Inventory::find($oldLine->InventoryID);
          if ($inv) {
            if ((int) $inv->Quantity < (int) $oldLine->QuantityAdded) {
              throw ValidationException::withMessages([
                'items' => "Cannot edit this stock-in batch. {$inv->ItemName} already has downstream usage.",
              ]);
            }
            $inv->decrement('Quantity', (int) $oldLine->QuantityAdded);
            $inv->update(['DateModified' => now()]);
          }
        } elseif ($oldLine->ItemType === 'Product' && $oldLine->ProductID) {
          $prod = Product::find($oldLine->ProductID);
          if ($prod) {
            if ((int) $prod->Quantity < (int) $oldLine->QuantityAdded) {
              throw ValidationException::withMessages([
                'items' => "Cannot edit this stock-in batch. {$prod->ProductName} already has downstream usage.",
              ]);
            }
            $prod->decrement('Quantity', (int) $oldLine->QuantityAdded);
            $prod->update(['DateModified' => now()]);
          }
        }
      }

      $detail->stockIns()->delete();

      [$rows, $totalQuantity, $totalAmount] = $this->parseStockInItems($data['items']);

      $detail->update([
        'Supplier' => $data['Supplier'],
        'Source' => $data['Source'],
        'PurchaseDate' => $data['PurchaseDate'] ?? null,
        'ReceiptNumber' => $data['ReceiptNumber'] ?? null,
        'InvoiceNumber' => $data['InvoiceNumber'] ?? null,
        'TotalQuantity' => $totalQuantity,
        'TotalAmount' => $totalAmount,
        'AdditionalDetails' => $data['AdditionalDetails'] ?? null,
      ]);

      foreach ($rows as $row) {
        StockIn::create([
          'StockInDetailsID' => $detail->ID,
          'InventoryID' => $row['InventoryID'],
          'ProductID' => $row['ProductID'],
          'ItemType' => $row['ItemType'],
          'QuantityAdded' => $row['QuantityAdded'],
          'SubAmount' => $row['SubAmount'],
          'DateAdded' => now(),
        ]);
      }
    });

    return redirect()->back()->with('success', 'Stock-In batch updated successfully.');
  }

  private function parseStockInItems(array $items): array {
    $rows = [];
    $totalQuantity = 0;
    $totalAmount = 0;

    foreach ($items as $item) {
      $itemType = $item['ItemType'];
      $quantityAdded = (int) $item['QuantityAdded'];
      $subAmount = round((float) $item['SubAmount'], 2);
      $inventoryID = null;
      $productID = null;

      if ($itemType === 'Inventory') {
        if (!empty($item['CreateInventory'])) {
          $create = $item['CreateInventory'];
          $required = ['ItemName', 'ItemType', 'Measurement'];
          foreach ($required as $field) {
            if (empty($create[$field])) {
              throw ValidationException::withMessages([
                "items.$field" => "Inventory $field is required.",
              ]);
            }
          }

          $inventory = Inventory::create([
            'ItemName' => $create['ItemName'],
            'ItemDescription' => $create['ItemDescription'] ?? '',
            'ItemType' => $create['ItemType'],
            'Measurement' => $create['Measurement'],
            'Quantity' => 0,
            'LowCountThreshold' => (int) ($create['LowCountThreshold'] ?? 10),
            'DateAdded' => now(),
            'DateModified' => now(),
          ]);

          $inventoryID = $inventory->ID;
        } else {
          $inventoryID = (int) ($item['InventoryID'] ?? 0);
          Inventory::findOrFail($inventoryID);
        }
      } else {
        if (!empty($item['CreateProduct'])) {
          $create = $item['CreateProduct'];
          $required = ['ProductName', 'CategoryID'];
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
            'ProductFrom' => 'Purchased',
            'Price' => (string) ($create['Price'] ?? 0),
            'Quantity' => 0,
            'LowStockThreshold' => (int) ($create['LowStockThreshold'] ?? 10),
            'DateAdded' => now(),
            'DateModified' => now(),
          ]);

          $productID = $product->ID;
        } else {
          $productID = (int) ($item['ProductID'] ?? 0);
          $product = Product::findOrFail($productID);
          if (!str_contains(strtolower((string) $product->ProductFrom), 'purchased')) {
            throw ValidationException::withMessages([
              'items' => 'Only products tagged as Purchased can be added in Stock-In product items.',
            ]);
          }
        }
      }

      $rows[] = [
        'InventoryID' => $inventoryID,
        'ProductID' => $productID,
        'ItemType' => $itemType,
        'QuantityAdded' => $quantityAdded,
        'SubAmount' => $subAmount,
      ];

      $totalQuantity += $quantityAdded;
      $totalAmount += $subAmount;
    }

    return [$rows, $totalQuantity, round($totalAmount, 2)];
  }
}
