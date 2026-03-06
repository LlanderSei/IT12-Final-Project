<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Inventory;
use App\Models\InventoryLeftover;
use App\Models\InventoryLeftoverSnapshot;
use App\Models\Product;
use App\Models\StockIn;
use App\Models\StockInDetail;
use App\Models\StockOut;
use App\Models\StockOutDetail;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryController extends Controller {
  public function index(Request $request) {
    $stockIns = StockInDetail::with(['user', 'stockIns.inventory', 'stockIns.product'])
      ->orderBy('DateAdded', 'desc')
      ->get()
      ->map(function ($detail) {
        $items = $detail->stockIns->map(function ($line) {
          $itemName = $line->inventory?->ItemName ?? $line->product?->ProductName ?? 'Deleted Item';
          $qty = (int) ($line->QuantityAdded ?? 0);
          $subAmount = (float) ($line->SubAmount ?? 0);
          $unitCost = $qty > 0 ? round($subAmount / $qty, 2) : 0;

          return [
            'ItemType' => $line->ItemType,
            'InventoryID' => $line->InventoryID,
            'ProductID' => $line->ProductID,
            'ItemName' => $itemName,
            'QuantityAdded' => $qty,
            'UnitCost' => $unitCost,
            'SubAmount' => $subAmount,
          ];
        })->values();

        return [
          'ID' => $detail->ID,
          'user' => $detail->user,
          'Supplier' => $detail->Supplier,
          'Source' => $detail->Source,
          'PurchaseDate' => $detail->PurchaseDate,
          'ReceiptNumber' => $detail->ReceiptNumber,
          'InvoiceNumber' => $detail->InvoiceNumber,
          'TotalQuantity' => $detail->TotalQuantity,
          'TotalAmount' => $detail->TotalAmount,
          'AdditionalDetails' => $detail->AdditionalDetails,
          'DateAdded' => $detail->DateAdded,
          'ItemsPurchased' => $items,
        ];
      });

    $stockOuts = StockOutDetail::with(['user', 'stockOuts.inventory', 'stockOuts.product'])
      ->orderBy('DateAdded', 'desc')
      ->get()
      ->map(function ($detail) {
        $items = $detail->stockOuts->map(function ($line) {
          $itemName = $line->inventory?->ItemName ?? $line->product?->ProductName ?? 'Deleted Item';
          $qty = (int) ($line->QuantityRemoved ?? 0);

          return [
            'ItemType' => $line->ItemType,
            'InventoryID' => $line->InventoryID,
            'ProductID' => $line->ProductID,
            'ItemName' => $itemName,
            'QuantityRemoved' => $qty,
          ];
        })->values();

        return [
          'ID' => $detail->ID,
          'user' => $detail->user,
          'Reason' => $detail->Reason,
          'TotalQuantity' => $detail->TotalQuantity,
          'DateAdded' => $detail->DateAdded,
          'ItemsUsed' => $items,
        ];
      });

    $snapshots = InventoryLeftoverSnapshot::with([
      'user:id,FullName',
      'leftovers.inventory:ID,ItemName,ItemType,Measurement',
    ])
      ->orderBy('SnapshotTime', 'desc')
      ->get()
      ->map(function ($snapshot) {
        return [
          'ID' => $snapshot->ID,
          'user' => $snapshot->user,
          'TotalItems' => (int) $snapshot->TotalItems,
          'TotalLeftovers' => (int) $snapshot->TotalLeftovers,
          'SnapshotTime' => $snapshot->SnapshotTime,
          'Leftovers' => $snapshot->leftovers->map(function ($line) {
            return [
              'ID' => $line->ID,
              'InventoryID' => $line->InventoryID,
              'ItemName' => $line->inventory?->ItemName ?? 'Deleted Item',
              'ItemType' => $line->inventory?->ItemType ?? null,
              'Measurement' => $line->inventory?->Measurement ?? null,
              'LeftoverQuantity' => (int) $line->LeftoverQuantity,
              'DateAdded' => $line->DateAdded,
            ];
          })->values(),
        ];
      });

    return Inertia::render('Inventory/InventoryLevelsTabs', [
      'inventory' => Inventory::orderBy('ItemName', 'asc')->get(),
      'products' => Product::with('category')->orderBy('ProductName', 'asc')->get(),
      'categories' => Category::orderBy('CategoryName', 'asc')->get(),
      'stockIns' => $stockIns,
      'stockOuts' => $stockOuts,
      'snapshots' => $snapshots,
      'users' => User::all(),
      'initialTab' => $request->route('tab') ?? 'Inventory',
    ]);
  }

  public function storeSnapshot(Request $request) {
    $data = $request->validate([
      'ProceedOnSameDay' => 'nullable|boolean',
    ]);

    $todayStart = now()->startOfDay();
    $todayEnd = now()->endOfDay();
    $hasSnapshotToday = InventoryLeftoverSnapshot::query()
      ->whereBetween('SnapshotTime', [$todayStart, $todayEnd])
      ->exists();

    if ($hasSnapshotToday && !($data['ProceedOnSameDay'] ?? false)) {
      throw ValidationException::withMessages([
        'snapshot' => 'A snapshot for today already exists. Confirm and proceed to record another snapshot.',
      ]);
    }

    DB::transaction(function () {
      $snapshot = InventoryLeftoverSnapshot::create([
        'UserID' => Auth::id(),
        'SnapshotTime' => now(),
      ]);

      $items = Inventory::query()
        ->where('Quantity', '>', 0)
        ->orderBy('ItemName', 'asc')
        ->get(['ID', 'Quantity']);

      foreach ($items as $item) {
        InventoryLeftover::create([
          'InventoryLeftoverID' => $snapshot->ID,
          'InventoryID' => $item->ID,
          'LeftoverQuantity' => (int) $item->Quantity,
          'DateAdded' => now(),
        ]);
      }
    });

    return redirect()->back()->with('success', 'Inventory snapshot recorded successfully.');
  }

  public function store(Request $request) {
    $data = $request->validate([
      'ItemName' => 'required|string|max:255',
      'ItemDescription' => 'nullable|string',
      'ItemType' => 'required|string',
      'Measurement' => 'required|string',
      'LowCountThreshold' => 'required|integer|min:0',
      'Quantity' => 'required|integer|min:0',
    ]);

    Inventory::create([
      'ItemName' => $data['ItemName'],
      'ItemDescription' => $data['ItemDescription'] ?? '',
      'ItemType' => $data['ItemType'],
      'Measurement' => $data['Measurement'],
      'Quantity' => $data['Quantity'],
      'LowCountThreshold' => $data['LowCountThreshold'],
      'DateAdded' => now(),
      'DateModified' => now(),
    ]);

    return redirect()->back()->with('success', 'Inventory item created successfully.');
  }

  public function update(Request $request, $id) {
    $item = Inventory::findOrFail($id);

    $data = $request->validate([
      'ItemName' => 'required|string|max:255',
      'ItemDescription' => 'nullable|string',
      'ItemType' => 'required|string',
      'Measurement' => 'required|string',
      'LowCountThreshold' => 'required|integer|min:0',
      'Quantity' => 'required|integer|min:0',
    ]);

    $item->update([
      'ItemName' => $data['ItemName'],
      'ItemDescription' => $data['ItemDescription'] ?? $item->ItemDescription,
      'ItemType' => $data['ItemType'],
      'Measurement' => $data['Measurement'],
      'Quantity' => $data['Quantity'],
      'LowCountThreshold' => $data['LowCountThreshold'],
      'DateModified' => now(),
    ]);

    return redirect()->back()->with('success', 'Inventory item updated successfully.');
  }

  public function destroy($id) {
    $item = Inventory::findOrFail($id);
    $item->delete();

    return redirect()->back()->with('success', 'Inventory item deleted successfully.');
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
        $inventory = Inventory::findOrFail($inventoryID);
        if ((int) $inventory->Quantity < $quantityRemoved) {
          throw ValidationException::withMessages([
            'items' => "Insufficient stock for inventory item {$inventory->ItemName}.",
          ]);
        }
      } else {
        $productID = (int) ($item['ProductID'] ?? 0);
        $product = Product::findOrFail($productID);
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
