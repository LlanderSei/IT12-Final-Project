<?php

namespace App\Http\Controllers\Inventory\InventoryLevels;

use App\Models\Inventory;
use App\Models\Product;
use App\Models\StockOut;
use App\Models\StockOutDetail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StockOutController extends InventoryController {
  public function index(Request $request) {
    return $this->renderInventoryTabs($request, 'Stock-Out');
  }

  public function storeStockOut(Request $request) {
    $data = $request->validate([
      'ReasonType' => 'nullable|string|max:255',
      'ReasonNote' => 'nullable|string|max:500',
      'items' => 'required|array|min:1',
      'items.*.ItemType' => 'required|in:Inventory,Product',
      'items.*.InventoryID' => 'nullable|integer',
      'items.*.ProductID' => 'nullable|integer',
      'items.*.QuantityRemoved' => 'required|integer|min:1',
    ]);

    DB::transaction(function () use ($data) {
      [$rows, $totalQuantity] = $this->parseStockOutItems($data['items']);
      $reason = $this->composeStockOutReason($data['ReasonType'] ?? null, $data['ReasonNote'] ?? null);

      $stockOutDetails = StockOutDetail::create([
        'UserID' => Auth::id(),
        'TotalQuantity' => $totalQuantity,
        'Reason' => $reason,
        'DateAdded' => now(),
      ]);

      foreach ($rows as $row) {
        StockOut::create([
          'StockOutDetailsID' => $stockOutDetails->ID,
          'InventoryID' => $row['InventoryID'],
          'ProductID' => $row['ProductID'],
          'ItemType' => $row['ItemType'],
          'QuantityRemoved' => $row['QuantityRemoved'],
          'SubAmount' => 0,
          'DateAdded' => now(),
        ]);
      }
    });

    return redirect()->back()->with('success', 'Stock-Out recorded and inventory updated.');
  }

  public function updateStockOut(Request $request, int $id) {
    $data = $request->validate([
      'ReasonType' => 'nullable|string|max:255',
      'ReasonNote' => 'nullable|string|max:500',
      'items' => 'required|array|min:1',
      'items.*.ItemType' => 'required|in:Inventory,Product',
      'items.*.InventoryID' => 'nullable|integer',
      'items.*.ProductID' => 'nullable|integer',
      'items.*.QuantityRemoved' => 'required|integer|min:1',
    ]);

    DB::transaction(function () use ($id, $data) {
      $detail = StockOutDetail::with('stockOuts')->findOrFail($id);

      foreach ($detail->stockOuts as $oldLine) {
        if ($oldLine->ItemType === 'Inventory' && $oldLine->InventoryID) {
          $inv = Inventory::find($oldLine->InventoryID);
          if ($inv) {
            $inv->increment('Quantity', (int) $oldLine->QuantityRemoved);
            $inv->update(['DateModified' => now()]);
          }
        } elseif ($oldLine->ItemType === 'Product' && $oldLine->ProductID) {
          $prod = Product::find($oldLine->ProductID);
          if ($prod) {
            $prod->increment('Quantity', (int) $oldLine->QuantityRemoved);
            $prod->update(['DateModified' => now()]);
          }
        }
      }

      $detail->stockOuts()->delete();

      [$rows, $totalQuantity] = $this->parseStockOutItems($data['items']);
      $reason = $this->composeStockOutReason($data['ReasonType'] ?? null, $data['ReasonNote'] ?? null);

      $detail->update([
        'TotalQuantity' => $totalQuantity,
        'Reason' => $reason,
      ]);

      foreach ($rows as $row) {
        StockOut::create([
          'StockOutDetailsID' => $detail->ID,
          'InventoryID' => $row['InventoryID'],
          'ProductID' => $row['ProductID'],
          'ItemType' => $row['ItemType'],
          'QuantityRemoved' => $row['QuantityRemoved'],
          'SubAmount' => 0,
          'DateAdded' => now(),
        ]);
      }
    });

    return redirect()->back()->with('success', 'Stock-Out batch updated successfully.');
  }

  private function parseStockOutItems(array $items): array {
    $rows = [];
    $totalQuantity = 0;

    foreach ($items as $item) {
      $itemType = $item['ItemType'];
      $quantityRemoved = (int) $item['QuantityRemoved'];
      $inventoryID = null;
      $productID = null;

      if ($itemType === 'Inventory') {
        $inventoryID = (int) ($item['InventoryID'] ?? 0);
        $inventory = Inventory::query()->notArchived()->findOrFail($inventoryID);
        if ((int) $inventory->Quantity < $quantityRemoved) {
          throw ValidationException::withMessages([
            'items' => "Insufficient stock for inventory item {$inventory->ItemName}.",
          ]);
        }
      } else {
        $productID = (int) ($item['ProductID'] ?? 0);
        $product = Product::query()->notArchived()->findOrFail($productID);
        if ((int) $product->Quantity < $quantityRemoved) {
          throw ValidationException::withMessages([
            'items' => "Insufficient stock for product {$product->ProductName}.",
          ]);
        }
      }

      $rows[] = [
        'InventoryID' => $inventoryID,
        'ProductID' => $productID,
        'ItemType' => $itemType,
        'QuantityRemoved' => $quantityRemoved,
      ];

      $totalQuantity += $quantityRemoved;
    }

    return [$rows, $totalQuantity];
  }

  private function composeStockOutReason(?string $reasonType, ?string $reasonNote): ?string {
    $type = trim((string) $reasonType);
    $note = trim((string) $reasonNote);

    if ($type !== '' && $note !== '') {
      return $type . ' | ' . $note;
    }
    if ($type !== '') {
      return $type;
    }
    if ($note !== '') {
      return $note;
    }

    return null;
  }
}
