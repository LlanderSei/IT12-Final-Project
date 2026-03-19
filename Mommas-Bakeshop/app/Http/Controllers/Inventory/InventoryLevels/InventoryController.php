<?php

namespace App\Http\Controllers\Inventory\InventoryLevels;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\InventoryLeftoverSnapshot;
use App\Models\Product;
use App\Models\StockInDetail;
use App\Models\StockOutDetail;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InventoryController extends Controller {
  public function index(Request $request) {
    return $this->renderInventoryTabs($request);
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
    $item = Inventory::query()->notArchived()->findOrFail($id);

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
    $item = Inventory::query()->notArchived()->findOrFail($id);
    $item->update([
      'IsArchived' => true,
      'ArchivedAt' => now(),
      'ArchivedByUserID' => auth()->id(),
      'ArchiveReason' => request('ArchiveReason') ?: null,
      'DateModified' => now(),
    ]);

    return redirect()->back()->with('success', 'Inventory item archived successfully.');
  }

  public function restore($id) {
    $item = Inventory::query()->onlyArchived()->findOrFail($id);
    $item->update([
      'IsArchived' => false,
      'ArchivedAt' => null,
      'ArchivedByUserID' => null,
      'ArchiveReason' => null,
      'DateModified' => now(),
    ]);

    return redirect()->back()->with('success', 'Inventory item restored successfully.');
  }

  protected function renderInventoryTabs(Request $request, ?string $forcedTab = null) {
    $requestedTab = $forcedTab ?? $request->route('tab');
    $initialTab = in_array($requestedTab, ['Inventory', 'Stock-In', 'Stock-Out', 'Snapshots'], true)
      ? $requestedTab
      : 'Inventory';

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
      'inventory' => Inventory::query()->notArchived()->orderBy('ItemName', 'asc')->get(),
      'products' => Product::query()->notArchived()->with('category')->orderBy('ProductName', 'asc')->get(),
      'categories' => Category::orderBy('CategoryName', 'asc')->get(),
      'stockIns' => $stockIns,
      'stockOuts' => $stockOuts,
      'snapshots' => $snapshots,
      'users' => User::all(),
      'initialTab' => $initialTab,
    ]);
  }
}
