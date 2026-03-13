<?php

namespace App\Http\Controllers\Inventory\InventoryLevels;

use App\Models\Inventory;
use App\Models\InventoryLeftover;
use App\Models\InventoryLeftoverSnapshot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventorySnapshotController extends InventoryController {
  public function index(Request $request) {
    return $this->renderInventoryTabs($request, 'Snapshots');
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
}
