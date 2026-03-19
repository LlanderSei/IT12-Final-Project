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
use Illuminate\Database\Eloquent\Builder;
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

    $stockInPayload = $initialTab === 'Stock-In'
      ? $this->buildStockInPayload($request)
      : ['records' => [], 'filters' => [], 'filterOptions' => []];

    $stockOutPayload = $initialTab === 'Stock-Out'
      ? $this->buildStockOutPayload($request)
      : ['records' => [], 'filters' => [], 'filterOptions' => []];

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
      'stockIns' => $stockInPayload['records'],
      'stockInFilters' => $stockInPayload['filters'],
      'stockInFilterOptions' => $stockInPayload['filterOptions'],
      'stockOuts' => $stockOutPayload['records'],
      'stockOutFilters' => $stockOutPayload['filters'],
      'stockOutFilterOptions' => $stockOutPayload['filterOptions'],
      'snapshots' => $snapshots,
      'users' => User::all(),
      'initialTab' => $initialTab,
    ]);
  }

  protected function buildStockInPayload(Request $request): array {
    $search = trim((string) $request->string('stockInSearch', ''));
    $addedBy = (string) $request->string('stockInAddedBy', 'all');
    $supplier = (string) $request->string('stockInSupplier', 'all');
    $itemType = (string) $request->string('stockInItemType', 'all');
    $hasPurchaseDate = (string) $request->string('stockInHasPurchaseDate', 'all');
    $dateFrom = (string) $request->string('stockInDateFrom', '');
    $dateTo = (string) $request->string('stockInDateTo', '');
    $minTotalAmount = (string) $request->string('stockInMinTotalAmount', '');
    $maxTotalAmount = (string) $request->string('stockInMaxTotalAmount', '');
    $sortKey = (string) $request->string('stockInSortKey', 'DateAdded');
    $sortDirection = strtolower((string) $request->string('stockInSortDirection', 'desc')) === 'asc' ? 'asc' : 'desc';
    $perPage = (int) $request->integer('stockInPerPage', 25);
    $perPage = in_array($perPage, [25, 50, 100, 500], true) ? $perPage : 25;

    $query = StockInDetail::query()
      ->with(['user:id,FullName', 'stockIns.inventory:ID,ItemName', 'stockIns.product:ID,ProductName'])
      ->when($search !== '', function (Builder $builder) use ($search) {
        $builder->where(function (Builder $nested) use ($search) {
          $nested
            ->whereHas('user', fn(Builder $userQuery) => $userQuery->where('FullName', 'like', "%{$search}%"))
            ->orWhere('Supplier', 'like', "%{$search}%")
            ->orWhere('AdditionalDetails', 'like', "%{$search}%")
            ->orWhereHas('stockIns.inventory', fn(Builder $inventoryQuery) => $inventoryQuery->where('ItemName', 'like', "%{$search}%"))
            ->orWhereHas('stockIns.product', fn(Builder $productQuery) => $productQuery->where('ProductName', 'like', "%{$search}%"));
        });
      })
      ->when($addedBy !== 'all', fn(Builder $builder) => $builder->whereHas('user', fn(Builder $userQuery) => $userQuery->where('FullName', $addedBy)))
      ->when($supplier !== 'all', fn(Builder $builder) => $builder->where('Supplier', $supplier))
      ->when($itemType !== 'all', fn(Builder $builder) => $builder->whereHas('stockIns', fn(Builder $lineQuery) => $lineQuery->where('ItemType', $itemType)))
      ->when($hasPurchaseDate === 'with', fn(Builder $builder) => $builder->whereNotNull('PurchaseDate'))
      ->when($hasPurchaseDate === 'without', fn(Builder $builder) => $builder->whereNull('PurchaseDate'))
      ->when($dateFrom !== '', fn(Builder $builder) => $builder->whereDate('DateAdded', '>=', $dateFrom))
      ->when($dateTo !== '', fn(Builder $builder) => $builder->whereDate('DateAdded', '<=', $dateTo))
      ->when(trim($minTotalAmount) !== '' && is_numeric($minTotalAmount), fn(Builder $builder) => $builder->where('TotalAmount', '>=', (float) $minTotalAmount))
      ->when(trim($maxTotalAmount) !== '' && is_numeric($maxTotalAmount), fn(Builder $builder) => $builder->where('TotalAmount', '<=', (float) $maxTotalAmount));

    $query = match ($sortKey) {
      'AddedBy' => $query->orderBy(
        User::query()->select('FullName')->whereColumn('users.id', 'stock_in_details.UserID')->limit(1),
        $sortDirection
      )->orderByDesc('stock_in_details.ID'),
      'Supplier', 'PurchaseDate', 'TotalQuantity', 'TotalAmount', 'AdditionalDetails', 'DateAdded' => $query
        ->orderBy($sortKey, $sortDirection)
        ->orderByDesc('ID'),
      default => $query->orderByDesc('DateAdded')->orderByDesc('ID'),
    };

    $records = $query->paginate($perPage)->withQueryString();
    $records->getCollection()->transform(fn(StockInDetail $detail) => $this->transformStockInDetail($detail));

    return [
      'records' => $records,
      'filters' => [
        'search' => $search,
        'addedBy' => $addedBy,
        'supplier' => $supplier,
        'itemType' => $itemType,
        'hasPurchaseDate' => $hasPurchaseDate,
        'dateFrom' => $dateFrom,
        'dateTo' => $dateTo,
        'minTotalAmount' => $minTotalAmount,
        'maxTotalAmount' => $maxTotalAmount,
        'sortKey' => $sortKey,
        'sortDirection' => $sortDirection,
        'perPage' => $perPage,
        'page' => $records->currentPage(),
      ],
      'filterOptions' => [
        'addedBy' => StockInDetail::query()->with('user:id,FullName')->get()->pluck('user.FullName')->filter()->unique()->values(),
        'supplier' => StockInDetail::query()->whereNotNull('Supplier')->distinct()->orderBy('Supplier')->pluck('Supplier')->values(),
      ],
    ];
  }

  protected function buildStockOutPayload(Request $request): array {
    $search = trim((string) $request->string('stockOutSearch', ''));
    $usedBy = (string) $request->string('stockOutUsedBy', 'all');
    $reason = (string) $request->string('stockOutReason', 'all');
    $itemType = (string) $request->string('stockOutItemType', 'all');
    $dateFrom = (string) $request->string('stockOutDateFrom', '');
    $dateTo = (string) $request->string('stockOutDateTo', '');
    $minTotalQty = (string) $request->string('stockOutMinTotalQty', '');
    $maxTotalQty = (string) $request->string('stockOutMaxTotalQty', '');
    $sortKey = (string) $request->string('stockOutSortKey', 'DateAdded');
    $sortDirection = strtolower((string) $request->string('stockOutSortDirection', 'desc')) === 'asc' ? 'asc' : 'desc';
    $perPage = (int) $request->integer('stockOutPerPage', 25);
    $perPage = in_array($perPage, [25, 50, 100, 500], true) ? $perPage : 25;

    $query = StockOutDetail::query()
      ->with(['user:id,FullName', 'stockOuts.inventory:ID,ItemName', 'stockOuts.product:ID,ProductName'])
      ->when($search !== '', function (Builder $builder) use ($search) {
        $builder->where(function (Builder $nested) use ($search) {
          $nested
            ->whereHas('user', fn(Builder $userQuery) => $userQuery->where('FullName', 'like', "%{$search}%"))
            ->orWhere('Reason', 'like', "%{$search}%")
            ->orWhereHas('stockOuts.inventory', fn(Builder $inventoryQuery) => $inventoryQuery->where('ItemName', 'like', "%{$search}%"))
            ->orWhereHas('stockOuts.product', fn(Builder $productQuery) => $productQuery->where('ProductName', 'like', "%{$search}%"));
        });
      })
      ->when($usedBy !== 'all', fn(Builder $builder) => $builder->whereHas('user', fn(Builder $userQuery) => $userQuery->where('FullName', $usedBy)))
      ->when($reason !== 'all', fn(Builder $builder) => $builder->where('Reason', 'like', $reason . '%'))
      ->when($itemType !== 'all', fn(Builder $builder) => $builder->whereHas('stockOuts', fn(Builder $lineQuery) => $lineQuery->where('ItemType', $itemType)))
      ->when($dateFrom !== '', fn(Builder $builder) => $builder->whereDate('DateAdded', '>=', $dateFrom))
      ->when($dateTo !== '', fn(Builder $builder) => $builder->whereDate('DateAdded', '<=', $dateTo))
      ->when(trim($minTotalQty) !== '' && is_numeric($minTotalQty), fn(Builder $builder) => $builder->where('TotalQuantity', '>=', (int) $minTotalQty))
      ->when(trim($maxTotalQty) !== '' && is_numeric($maxTotalQty), fn(Builder $builder) => $builder->where('TotalQuantity', '<=', (int) $maxTotalQty));

    $query = match ($sortKey) {
      'UsedBy' => $query->orderBy(
        User::query()->select('FullName')->whereColumn('users.id', 'stock_out_details.UserID')->limit(1),
        $sortDirection
      )->orderByDesc('stock_out_details.ID'),
      'Reason', 'TotalQuantity', 'DateAdded' => $query->orderBy($sortKey, $sortDirection)->orderByDesc('ID'),
      default => $query->orderByDesc('DateAdded')->orderByDesc('ID'),
    };

    $records = $query->paginate($perPage)->withQueryString();
    $records->getCollection()->transform(fn(StockOutDetail $detail) => $this->transformStockOutDetail($detail));

    $reasonOptions = StockOutDetail::query()
      ->whereNotNull('Reason')
      ->pluck('Reason')
      ->map(fn($value) => trim(strtok((string) $value, '|')))
      ->filter()
      ->unique()
      ->values();

    return [
      'records' => $records,
      'filters' => [
        'search' => $search,
        'usedBy' => $usedBy,
        'reason' => $reason,
        'itemType' => $itemType,
        'dateFrom' => $dateFrom,
        'dateTo' => $dateTo,
        'minTotalQty' => $minTotalQty,
        'maxTotalQty' => $maxTotalQty,
        'sortKey' => $sortKey,
        'sortDirection' => $sortDirection,
        'perPage' => $perPage,
        'page' => $records->currentPage(),
      ],
      'filterOptions' => [
        'usedBy' => StockOutDetail::query()->with('user:id,FullName')->get()->pluck('user.FullName')->filter()->unique()->values(),
        'reason' => $reasonOptions,
      ],
    ];
  }

  protected function transformStockInDetail(StockInDetail $detail): array {
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
      'PurchaseDate' => optional($detail->PurchaseDate)->toIso8601String(),
      'ReceiptNumber' => $detail->ReceiptNumber,
      'InvoiceNumber' => $detail->InvoiceNumber,
      'TotalQuantity' => $detail->TotalQuantity,
      'TotalAmount' => (float) $detail->TotalAmount,
      'AdditionalDetails' => $detail->AdditionalDetails,
      'DateAdded' => optional($detail->DateAdded)->toIso8601String(),
      'ItemsPurchased' => $items,
    ];
  }

  protected function transformStockOutDetail(StockOutDetail $detail): array {
    $items = $detail->stockOuts->map(function ($line) {
      $itemName = $line->inventory?->ItemName ?? $line->product?->ProductName ?? 'Deleted Item';

      return [
        'ItemType' => $line->ItemType,
        'InventoryID' => $line->InventoryID,
        'ProductID' => $line->ProductID,
        'ItemName' => $itemName,
        'QuantityRemoved' => (int) ($line->QuantityRemoved ?? 0),
      ];
    })->values();

    return [
      'ID' => $detail->ID,
      'user' => $detail->user,
      'Reason' => $detail->Reason,
      'TotalQuantity' => (int) $detail->TotalQuantity,
      'DateAdded' => optional($detail->DateAdded)->toIso8601String(),
      'ItemsUsed' => $items,
    ];
  }
}
