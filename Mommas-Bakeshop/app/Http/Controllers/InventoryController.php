<?php

namespace App\Http\Controllers;

use App\Models\Inventory;
use App\Models\StockIn;
use App\Models\StockOut;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller {
  public function index() {
    return Inertia::render('Inventory/InventoryLevelsTabs', [
      'inventory' => Inventory::orderBy('ItemName', 'asc')->get(),
      'stockIns' => StockIn::with(['inventory', 'user'])->orderBy('DateAdded', 'desc')->get(),
      'stockOuts' => StockOut::with(['inventory', 'user'])->orderBy('DateAdded', 'desc')->get(),
      'users' => User::all(),
    ]);
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
      'InventoryID' => 'required|exists:Inventory,ID',
      'Supplier' => 'required|string|max:255',
      'PricePerUnit' => 'required|numeric|min:0',
      'QuantityAdded' => 'required|integer|min:1',
      'AdditionalDetails' => 'nullable|string',
    ]);

    DB::transaction(function () use ($data) {
      $inventory = Inventory::findOrFail($data['InventoryID']);

      StockIn::create([
        'UserID' => Auth::id(),
        'InventoryID' => $data['InventoryID'],
        'Supplier' => $data['Supplier'],
        'PricePerUnit' => $data['PricePerUnit'],
        'QuantityAdded' => $data['QuantityAdded'],
        'TotalAmount' => $data['PricePerUnit'] * $data['QuantityAdded'],
        'AdditionalDetails' => $data['AdditionalDetails'] ?? '',
        'DateAdded' => now(),
      ]);

      $inventory->increment('Quantity', $data['QuantityAdded']);
      $inventory->update(['DateModified' => now()]);
    });

    return redirect()->back()->with('success', 'Stock-In recorded and inventory updated.');
  }

  public function storeStockOut(Request $request) {
    $data = $request->validate([
      'InventoryID' => 'required|exists:Inventory,ID',
      'QuantityRemoved' => 'required|integer|min:1',
      'Reason' => 'required|string',
    ]);

    DB::transaction(function () use ($data) {
      $inventory = Inventory::findOrFail($data['InventoryID']);

      if ($inventory->Quantity < $data['QuantityRemoved']) {
        throw new \Exception('Insufficient inventory quantity.');
      }

      StockOut::create([
        'UserID' => Auth::id(),
        'InventoryID' => $data['InventoryID'],
        'QuantityRemoved' => $data['QuantityRemoved'],
        'Reason' => $data['Reason'],
        'DateAdded' => now(),
      ]);

      $inventory->decrement('Quantity', $data['QuantityRemoved']);
      $inventory->update(['DateModified' => now()]);
    });

    return redirect()->back()->with('success', 'Stock-Out recorded and inventory updated.');
  }
}
