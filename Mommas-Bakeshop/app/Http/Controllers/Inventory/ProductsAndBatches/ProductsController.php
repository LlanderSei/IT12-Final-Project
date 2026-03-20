<?php

namespace App\Http\Controllers\Inventory\ProductsAndBatches;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductLeftoverSnapshot;
use App\Models\ProductionBatch;
use App\Models\ProductionBatchDetail;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Throwable;

class ProductsController extends Controller {
  public function index(Request $request) {
    return $this->renderProductsAndBatches($request);
  }

  public function store(Request $request): RedirectResponse {
    // No longer checking isValid() here because we're using Base64 strings to bypass tmp issues
    // Validation will happen below with the 'ProductImage' field being a string (data URL)


    $data = $request->validate([
      'ProductName' => 'required|string|max:255',
      'ProductDescription' => 'nullable|string',
      'CategoryID' => 'required|exists:categories,ID',
      'Price' => 'required|numeric|min:0|max:9999999.99',
      'ProductImage' => 'nullable|string', // Accept Base64 data URL
      'LowStockThreshold' => 'nullable|integer|min:0',
    ]);

    try {
      $productImagePath = null;
      if (!empty($data['ProductImage']) && str_starts_with($data['ProductImage'], 'data:image')) {
        $productImagePath = $this->uploadToImgBB($data['ProductImage']);
      }

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
    } catch (Throwable $exception) {
      return redirect()
        ->back()
        ->withInput($request->except('ProductImage'))
        ->with('error', $exception->getMessage());
    }
  }

  public function update(Request $request, $id): RedirectResponse {
    $product = Product::query()->notArchived()->findOrFail($id);

    // No longer checking isValid() for the same reason as store()


    $data = $request->validate([
      'ProductName' => 'required|string|max:255',
      'ProductDescription' => 'nullable|string',
      'CategoryID' => 'required|exists:categories,ID',
      'Price' => 'required|numeric|min:0|max:9999999.99',
      'ProductImage' => 'nullable|string', // Accept Base64 data URL
      'RemoveProductImage' => 'nullable|boolean',
      'LowStockThreshold' => 'nullable|integer|min:0',
    ]);

    try {
      $removeProductImage = filter_var($request->input('RemoveProductImage', false), FILTER_VALIDATE_BOOL);
      $productImagePath = $product->ProductImage;

      if (!empty($data['ProductImage']) && str_starts_with($data['ProductImage'], 'data:image')) {
        $productImagePath = $this->uploadToImgBB($data['ProductImage']);
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
    } catch (Throwable $exception) {
      return redirect()
        ->back()
        ->withInput($request->except('ProductImage'))
        ->with('error', $exception->getMessage());
    }
  }

  public function destroy($id) {
    $product = Product::query()->notArchived()->findOrFail($id);
    $product->update([
      'IsArchived' => true,
      'ArchivedAt' => now(),
      'ArchivedByUserID' => auth()->id(),
      'ArchiveReason' => request('ArchiveReason') ?: null,
      'DateModified' => now(),
    ]);

    return redirect()->back()->with('success', 'Product archived successfully.');
  }

  public function restore($id) {
    $product = Product::query()->onlyArchived()->findOrFail($id);
    $product->update([
      'IsArchived' => false,
      'ArchivedAt' => null,
      'ArchivedByUserID' => null,
      'ArchiveReason' => null,
      'DateModified' => now(),
    ]);

    return redirect()->back()->with('success', 'Product restored successfully.');
  }

  protected function renderProductsAndBatches(Request $request, ?string $forcedTab = null) {
    $requestedTab = $forcedTab ?? $request->route('tab');
    $initialTab = in_array($requestedTab, ['Products', 'Production Batches', 'Snapshots'], true)
      ? $requestedTab
      : 'Products';

    $products = Product::with('category')
      ->notArchived()
      ->get()
      ->map(fn ($product) => $this->transformProductForView($product))
      ->values();
    $categories = Category::all();
    $batchPayload = $initialTab === 'Production Batches'
      ? $this->buildProductionBatchPayload($request)
      : ['records' => [], 'filters' => [], 'filterOptions' => []];

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
      'batches' => $batchPayload['records'],
      'batchFilters' => $batchPayload['filters'],
      'batchFilterOptions' => $batchPayload['filterOptions'],
      'snapshots' => $snapshots,
      'initialTab' => $initialTab,
    ]);
  }

  protected function buildProductionBatchPayload(Request $request): array {
    $search = trim((string) $request->string('batchSearch', ''));
    $addedBy = (string) $request->string('batchAddedBy', 'all');
    $item = (string) $request->string('batchItem', 'all');
    $dateFrom = (string) $request->string('batchDateFrom', '');
    $dateTo = (string) $request->string('batchDateTo', '');
    $minTotalQty = (string) $request->string('batchMinTotalQty', '');
    $maxTotalQty = (string) $request->string('batchMaxTotalQty', '');
    $sortKey = (string) $request->string('batchSortKey', 'DateAdded');
    $sortDirection = strtolower((string) $request->string('batchSortDirection', 'desc')) === 'asc' ? 'asc' : 'desc';
    $perPage = (int) $request->integer('batchPerPage', 25);
    $perPage = in_array($perPage, [25, 50, 100, 500], true) ? $perPage : 25;

    $totalQuantitySubquery = ProductionBatch::query()
      ->selectRaw('coalesce(sum(QuantityProduced), 0)')
      ->whereColumn('production_batches.BatchDetailsID', 'production_batch_details.ID');

    $query = ProductionBatchDetail::query()
      ->with(['user:id,FullName', 'batches.product:ID,ProductName'])
      ->addSelect(['calculated_total_quantity' => $totalQuantitySubquery])
      ->when($search !== '', function (Builder $builder) use ($search) {
        $builder->where(function (Builder $nested) use ($search) {
          $nested
            ->whereHas('user', fn(Builder $userQuery) => $userQuery->where('FullName', 'like', "%{$search}%"))
            ->orWhere('BatchDescription', 'like', "%{$search}%")
            ->orWhereHas('batches.product', fn(Builder $productQuery) => $productQuery->where('ProductName', 'like', "%{$search}%"));
        });
      })
      ->when($addedBy !== 'all', fn(Builder $builder) => $builder->whereHas('user', fn(Builder $userQuery) => $userQuery->where('FullName', $addedBy)))
      ->when($item !== 'all', fn(Builder $builder) => $builder->whereHas('batches.product', fn(Builder $productQuery) => $productQuery->where('ProductName', $item)))
      ->when($dateFrom !== '', fn(Builder $builder) => $builder->whereDate('DateAdded', '>=', $dateFrom))
      ->when($dateTo !== '', fn(Builder $builder) => $builder->whereDate('DateAdded', '<=', $dateTo))
      ->when(
        trim($minTotalQty) !== '' && is_numeric($minTotalQty),
        fn(Builder $builder) => $builder->whereRaw(
          '(select coalesce(sum(QuantityProduced), 0) from production_batches where production_batches.BatchDetailsID = production_batch_details.ID) >= ?',
          [(int) $minTotalQty]
        )
      )
      ->when(
        trim($maxTotalQty) !== '' && is_numeric($maxTotalQty),
        fn(Builder $builder) => $builder->whereRaw(
          '(select coalesce(sum(QuantityProduced), 0) from production_batches where production_batches.BatchDetailsID = production_batch_details.ID) <= ?',
          [(int) $maxTotalQty]
        )
      );

    $query = match ($sortKey) {
      'AddedBy' => $query->orderBy(
        User::query()->select('FullName')->whereColumn('users.id', 'production_batch_details.UserID')->limit(1),
        $sortDirection
      )->orderByDesc('production_batch_details.ID'),
      'TotalQuantity' => $query->orderBy('calculated_total_quantity', $sortDirection)->orderByDesc('ID'),
      'BatchDescription', 'DateAdded' => $query->orderBy($sortKey, $sortDirection)->orderByDesc('ID'),
      default => $query->orderByDesc('DateAdded')->orderByDesc('ID'),
    };

    $records = $query->paginate($perPage)->withQueryString();
    $records->getCollection()->transform(function (ProductionBatchDetail $detail) {
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
        'TotalQuantity' => (int) $items->sum('QuantityProduced'),
        'DateAdded' => optional($detail->DateAdded)->toIso8601String(),
        'ItemsProduced' => $items,
      ];
    });

    $itemOptions = ProductionBatchDetail::query()
      ->with('batches.product:ID,ProductName')
      ->get()
      ->flatMap(fn($detail) => $detail->batches->pluck('product.ProductName'))
      ->filter()
      ->unique()
      ->values();

    return [
      'records' => $records,
      'filters' => [
        'search' => $search,
        'addedBy' => $addedBy,
        'item' => $item,
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
        'addedBy' => ProductionBatchDetail::query()->with('user:id,FullName')->get()->pluck('user.FullName')->filter()->unique()->values(),
        'item' => $itemOptions,
      ],
    ];
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

  /**
   * Upload Base64 image to ImgBB and return the direct URL.
   */
  private function uploadToImgBB(string $base64Data): string {
    $apiKey = \App\Models\SystemSetting::get('imgbb_api_key', env('IMGBB_API_KEY'));
    if (!$apiKey) {
      throw new \Exception('ImgBB API key is not configured. Please set it in Application Settings.');
    }

    // Strip the data URL prefix if present
    $base64Image = $base64Data;
    if (str_contains($base64Data, ',')) {
      $base64Image = explode(',', $base64Data)[1];
    }

    $response = \Illuminate\Support\Facades\Http::withoutVerifying()->asForm()->post('https://api.imgbb.com/1/upload', [
      'key' => $apiKey,
      'image' => $base64Image,
    ]);

    if (!$response->successful()) {
      throw new \Exception('ImgBB upload failed: ' . $response->body());
    }

    return $response->json('data.url');
  }
}
