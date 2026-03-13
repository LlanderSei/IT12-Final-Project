<?php

namespace App\Http\Controllers\Administration\Reports;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\ProductionBatchDetail;
use App\Models\Shrinkage;
use App\Models\SoldProduct;
use App\Models\StockInDetail;
use App\Models\StockOutDetail;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReportsBaseController extends Controller {
  protected function renderReports(Request $request, ?string $forcedTab = null) {
    $requestedTab = $forcedTab ?? $request->route('tab');
    $initialTab = in_array($requestedTab, ['Overview', 'Full Breakdown'], true)
      ? $requestedTab
      : 'Overview';
    $user = $request->user();
    $canViewOverview = $user?->hasPermission('CanViewReportsOverview') ?? false;
    $canViewFullBreakdown = $user?->hasPermission('CanViewReportsFullBreakdown') ?? false;

    if ($initialTab === 'Overview' && !$canViewOverview) {
      if ($canViewFullBreakdown) {
        return redirect()->route('admin.reports.full-breakdown');
      }

      abort(403);
    }

    if ($initialTab === 'Full Breakdown' && !$canViewFullBreakdown) {
      if ($canViewOverview) {
        return redirect()->route('admin.reports');
      }

      abort(403);
    }

    $cardDateFilterOptions = [
      ['value' => 'today', 'label' => 'Today'],
      ['value' => 'past_7_days', 'label' => 'Past 7 days'],
      ['value' => 'past_30_days', 'label' => 'Past 30 days'],
      ['value' => 'this_week', 'label' => 'This week'],
      ['value' => 'this_month', 'label' => 'This month'],
      ['value' => 'this_year', 'label' => 'This Year'],
      ['value' => 'select_date', 'label' => 'Select Date'],
      ['value' => 'custom', 'label' => 'Custom'],
    ];

    $chartFilterOptions = [
      ['value' => 'past_7_days', 'label' => 'Past 7 days'],
      ['value' => 'past_30_days', 'label' => 'Past 30 days'],
      ['value' => 'this_week', 'label' => 'This week'],
      ['value' => 'this_month', 'label' => 'This month'],
      ['value' => 'this_year', 'label' => 'This Year'],
      ['value' => 'custom', 'label' => 'Custom'],
    ];

    $cardsByPreset = [];
    $fullBreakdownByPreset = [];
    foreach ($cardDateFilterOptions as $option) {
      if (in_array($option['value'], ['select_date', 'custom'], true)) {
        continue;
      }
      [$start, $end, $rangeLabel] = $this->resolveRange($option['value']);
      $overviewTables = $this->computeTables($start, $end);
      $payload = [
        'rangeLabel' => $rangeLabel,
        'cards' => $this->computeCards($start, $end),
        'tables' => $overviewTables,
        'payments' => $this->computePaymentsSummary($start, $end),
      ];
      $cardsByPreset[$option['value']] = $payload;
      $fullBreakdownByPreset[$option['value']] = [
        'rangeLabel' => $rangeLabel,
        'cards' => $payload['cards'],
        'payments' => $payload['payments'],
        'tables' => $this->computeFullBreakdownTables($start, $end),
      ];
    }

    $overviewSelectedPreset = (string) $request->query('overview_preset', 'today');
    $overviewSelectedDate = $request->query('overview_date');
    $overviewSelectedFrom = $request->query('overview_from');
    $overviewSelectedTo = $request->query('overview_to');
    [$overviewStart, $overviewEnd, $overviewRangeLabel] = $this->resolveSelectionRange(
      $overviewSelectedPreset,
      $overviewSelectedDate,
      $overviewSelectedFrom,
      $overviewSelectedTo,
    );

    $fullBreakdownSelectedPreset = (string) $request->query('fb_preset', 'today');
    $fullBreakdownSelectedDate = $request->query('fb_date');
    $fullBreakdownSelectedFrom = $request->query('fb_from');
    $fullBreakdownSelectedTo = $request->query('fb_to');
    [$fullBreakdownStart, $fullBreakdownEnd, $fullBreakdownRangeLabel] = $this->resolveSelectionRange(
      $fullBreakdownSelectedPreset,
      $fullBreakdownSelectedDate,
      $fullBreakdownSelectedFrom,
      $fullBreakdownSelectedTo,
    );

    $chartByPreset = [];
    foreach ($chartFilterOptions as $option) {
      if ($option['value'] === 'custom') {
        continue;
      }
      [$start, $end] = $this->resolveRange($option['value']);
      $chartByPreset[$option['value']] = $this->buildChartSeriesPayload(
        $start,
        $end,
        $this->granularityForPreset($option['value']),
      );
    }

    $baseDailyRange = $this->resolveBaseDailyRange();
    $chartBaseDaily = $this->buildChartSeriesPayload(
      $baseDailyRange[0],
      $baseDailyRange[1],
      'daily',
    );

    return Inertia::render('Administration/ReportsTabs', [
      'initialTab' => $initialTab,
      'overviewData' => [
        'cardDateFilterDefault' => 'today',
        'cardDateFilterOptions' => $cardDateFilterOptions,
        'chartFilterDefault' => 'past_7_days',
        'chartFilterOptions' => $chartFilterOptions,
        'cardsByPreset' => $cardsByPreset,
        'chartByPreset' => $chartByPreset,
        'chartBaseDaily' => $chartBaseDaily,
        'selected' => [
          'preset' => $overviewSelectedPreset,
          'date' => $overviewSelectedDate,
          'from' => $overviewSelectedFrom,
          'to' => $overviewSelectedTo,
          'payload' => [
            'rangeLabel' => $overviewRangeLabel,
            'cards' => $this->computeCards($overviewStart, $overviewEnd),
            'tables' => $this->computeTables($overviewStart, $overviewEnd),
          ],
        ],
      ],
      'fullBreakdownData' => [
        'filterDefault' => 'today',
        'filterOptions' => $cardDateFilterOptions,
        'byPreset' => $fullBreakdownByPreset,
        'selected' => [
          'preset' => $fullBreakdownSelectedPreset,
          'date' => $fullBreakdownSelectedDate,
          'from' => $fullBreakdownSelectedFrom,
          'to' => $fullBreakdownSelectedTo,
          'payload' => [
            'rangeLabel' => $fullBreakdownRangeLabel,
            'cards' => $this->computeCards($fullBreakdownStart, $fullBreakdownEnd),
            'payments' => $this->computePaymentsSummary($fullBreakdownStart, $fullBreakdownEnd),
            'tables' => $this->computeFullBreakdownTables($fullBreakdownStart, $fullBreakdownEnd),
          ],
        ],
      ],
    ]);
  }

  protected function resolveSelectionRange(
    string $preset,
    ?string $singleDate = null,
    ?string $from = null,
    ?string $to = null
  ): array {
    if ($preset === 'select_date') {
      $selected = $singleDate ? Carbon::parse($singleDate) : Carbon::now();
      $start = $selected->copy()->startOfDay();
      $end = $selected->copy()->endOfDay();
      return [$start, $end, $this->formatRangeLabel($start, $end)];
    }

    if ($preset === 'custom') {
      return $this->resolveRange('custom', $from, $to);
    }

    return $this->resolveRange($preset);
  }

  protected function resolveRange(string $preset, ?string $from = null, ?string $to = null): array {
    $now = Carbon::now();

    switch ($preset) {
      case 'past_7_days':
        $start = $now->copy()->subDays(6)->startOfDay();
        $end = $now->copy()->endOfDay();
        break;
      case 'past_30_days':
        $start = $now->copy()->subDays(29)->startOfDay();
        $end = $now->copy()->endOfDay();
        break;
      case 'this_week':
        $start = $now->copy()->startOfWeek(Carbon::MONDAY)->startOfDay();
        $end = $now->copy()->endOfDay();
        break;
      case 'this_month':
        $start = $now->copy()->startOfMonth()->startOfDay();
        $end = $now->copy()->endOfDay();
        break;
      case 'this_year':
        $start = $now->copy()->startOfYear()->startOfDay();
        $end = $now->copy()->endOfDay();
        break;
      case 'custom':
        $parsedFrom = $from ? Carbon::parse($from)->startOfDay() : $now->copy()->startOfDay();
        $parsedTo = $to ? Carbon::parse($to)->endOfDay() : $now->copy()->endOfDay();
        if ($parsedFrom->gt($parsedTo)) {
          [$parsedFrom, $parsedTo] = [$parsedTo->copy()->startOfDay(), $parsedFrom->copy()->endOfDay()];
        }
        $start = $parsedFrom;
        $end = $parsedTo;
        break;
      case 'today':
      default:
        $start = $now->copy()->startOfDay();
        $end = $now->copy()->endOfDay();
        break;
    }

    return [$start, $end, $this->formatRangeLabel($start, $end)];
  }

  protected function formatRangeLabel(Carbon $start, Carbon $end): string {
    if ($start->isSameDay($end)) {
      return $start->format('M j, Y');
    }
    return $start->format('M j, Y') . ' - ' . $end->format('M j, Y');
  }

  protected function granularityForPreset(string $preset): string {
    return $preset === 'this_year' ? 'monthly' : 'daily';
  }

  protected function resolveBaseDailyRange(): array {
    $minDates = [
      DB::table('sales')->min('DateAdded'),
      DB::table('stock_in_details')->min('DateAdded'),
      DB::table('stock_out_details')->min('DateAdded'),
      DB::table('shrinkages')->min('DateAdded'),
      DB::table('production_batch_details')->min('DateAdded'),
    ];

    $minDate = collect($minDates)->filter()->map(fn($value) => Carbon::parse($value))->sort()->first();
    $start = $minDate ? $minDate->copy()->startOfDay() : Carbon::now()->subDays(30)->startOfDay();
    $end = Carbon::now()->endOfDay();

    return [$start, $end];
  }

  protected function computeCards(Carbon $start, Carbon $end): array {
    $revenue = (float) Payment::query()
      ->where('PaymentStatus', 'Paid')
      ->whereHas('sale', function ($query) use ($start, $end) {
        $query->whereBetween('DateAdded', [$start, $end]);
      })
      ->sum('TotalAmount');

    $unitsSold = (int) SoldProduct::query()
      ->whereHas('sale', function ($query) use ($start, $end) {
        $query->whereBetween('DateAdded', [$start, $end]);
      })
      ->sum('Quantity');

    $productionBatches = (int) ProductionBatchDetail::query()
      ->whereBetween('DateAdded', [$start, $end])
      ->sum('TotalProductsProduced');

    $stockIns = (int) StockInDetail::query()
      ->whereBetween('DateAdded', [$start, $end])
      ->sum('TotalQuantity');

    $stockOuts = (int) StockOutDetail::query()
      ->whereBetween('DateAdded', [$start, $end])
      ->sum('TotalQuantity');

    $shrinkedUnits = (int) Shrinkage::query()
      ->where('VerificationStatus', 'Verified')
      ->whereBetween('DateAdded', [$start, $end])
      ->sum('Quantity');

    $losses = (float) Shrinkage::query()
      ->where('VerificationStatus', 'Verified')
      ->whereBetween('DateAdded', [$start, $end])
      ->sum('TotalAmount');

    return [
      'revenue' => round($revenue, 2),
      'unitsSold' => $unitsSold,
      'productionBatches' => $productionBatches,
      'stockIns' => $stockIns,
      'stockOuts' => $stockOuts,
      'shrinkedUnits' => $shrinkedUnits,
      'losses' => round($losses, 2),
    ];
  }

  protected function computeTables(Carbon $start, Carbon $end): array {
    $soldRows = DB::table('sold_products as sp')
      ->join('sales as s', 's.ID', '=', 'sp.SalesID')
      ->leftJoin('products as p', 'p.ID', '=', 'sp.ProductID')
      ->whereBetween('s.DateAdded', [$start, $end])
      ->groupBy('sp.ProductID', 'p.ProductName')
      ->selectRaw('sp.ProductID as product_id, COALESCE(p.ProductName, "Deleted Product") as product_name, SUM(sp.Quantity) as units, SUM(sp.SubAmount) as revenue')
      ->get();

    $topMostSold = $soldRows
      ->sortByDesc('units')
      ->take(5)
      ->map(fn($row) => [
        'productName' => $row->product_name,
        'units' => (int) $row->units,
        'revenue' => round((float) $row->revenue, 2),
      ])
      ->values();

    $topLeastSold = $soldRows
      ->filter(fn($row) => (int) $row->units > 0)
      ->sortBy('units')
      ->take(5)
      ->map(fn($row) => [
        'productName' => $row->product_name,
        'units' => (int) $row->units,
        'revenue' => round((float) $row->revenue, 2),
      ])
      ->values();

    $topMostShrinked = DB::table('shrinked_products as sp')
      ->join('shrinkages as sh', 'sh.ID', '=', 'sp.ShrinkageID')
      ->leftJoin('products as p', 'p.ID', '=', 'sp.ProductID')
      ->where('sh.VerificationStatus', 'Verified')
      ->whereBetween('sh.DateAdded', [$start, $end])
      ->groupBy('sp.ProductID', 'p.ProductName')
      ->selectRaw('sp.ProductID as product_id, COALESCE(p.ProductName, "Deleted Product") as product_name, SUM(sp.Quantity) as units, SUM(sp.SubAmount) as losses')
      ->orderByDesc('units')
      ->limit(5)
      ->get()
      ->map(fn($row) => [
        'productName' => $row->product_name,
        'units' => (int) $row->units,
        'losses' => round((float) $row->losses, 2),
      ])
      ->values();

    $inventoryUsageRows = DB::table('stock_outs as so')
      ->join('stock_out_details as sod', 'sod.ID', '=', 'so.StockOutDetailsID')
      ->leftJoin('inventory as i', 'i.ID', '=', 'so.InventoryID')
      ->where('so.ItemType', 'Inventory')
      ->whereBetween('sod.DateAdded', [$start, $end])
      ->groupBy('so.InventoryID', 'i.ItemName')
      ->selectRaw('so.InventoryID as inventory_id, COALESCE(i.ItemName, "Deleted Item") as item_name, SUM(so.QuantityRemoved) as units_used')
      ->get();

    $topMostUsedInventory = $inventoryUsageRows
      ->sortByDesc('units_used')
      ->take(5)
      ->map(fn($row) => [
        'itemName' => $row->item_name,
        'unitsUsed' => (int) $row->units_used,
      ])
      ->values();

    $topLeastUsedInventory = $inventoryUsageRows
      ->filter(fn($row) => (int) $row->units_used > 0)
      ->sortBy('units_used')
      ->take(5)
      ->map(fn($row) => [
        'itemName' => $row->item_name,
        'unitsUsed' => (int) $row->units_used,
      ])
      ->values();

    $categoryRevenueRanking = DB::table('sold_products as sp')
      ->join('sales as s', 's.ID', '=', 'sp.SalesID')
      ->leftJoin('products as p', 'p.ID', '=', 'sp.ProductID')
      ->leftJoin('categories as c', 'c.ID', '=', 'p.CategoryID')
      ->whereBetween('s.DateAdded', [$start, $end])
      ->groupBy('c.ID', 'c.CategoryName')
      ->selectRaw('COALESCE(c.CategoryName, "Uncategorized") as category_name, SUM(sp.SubAmount) as revenue')
      ->orderByDesc('revenue')
      ->limit(5)
      ->get()
      ->map(fn($row) => [
        'categoryName' => $row->category_name,
        'revenue' => round((float) $row->revenue, 2),
      ])
      ->values();

    return [
      'topMostSold' => $topMostSold,
      'topLeastSold' => $topLeastSold,
      'topMostShrinked' => $topMostShrinked,
      'topMostUsedInventory' => $topMostUsedInventory,
      'topLeastUsedInventory' => $topLeastUsedInventory,
      'categoryRevenueRanking' => $categoryRevenueRanking,
    ];
  }

  protected function computePaymentsSummary(Carbon $start, Carbon $end): array {
    $base = DB::table('payments as p')
      ->join('sales as s', 's.ID', '=', 'p.SalesID')
      ->whereBetween('s.DateAdded', [$start, $end]);

    $statusRows = (clone $base)
      ->selectRaw('p.PaymentStatus as payment_status, COUNT(*) as total_count')
      ->groupBy('p.PaymentStatus')
      ->pluck('total_count', 'payment_status');

    $today = Carbon::now()->startOfDay();

    $outstandingAmount = (float) (clone $base)
      ->whereIn('p.PaymentStatus', ['Partially Paid', 'Unpaid'])
      ->selectRaw('SUM(GREATEST(p.TotalAmount - IFNULL(p.PaidAmount, 0), 0)) as outstanding')
      ->value('outstanding');

    return [
      'totalCollected' => round((float) ((clone $base)->sum('p.PaidAmount')), 2),
      'outstandingAmount' => round($outstandingAmount, 2),
      'paidCount' => (int) ($statusRows['Paid'] ?? 0),
      'partiallyPaidCount' => (int) ($statusRows['Partially Paid'] ?? 0),
      'unpaidCount' => (int) ($statusRows['Unpaid'] ?? 0),
      'upcomingDueCount' => (int) (clone $base)
        ->whereIn('p.PaymentStatus', ['Partially Paid', 'Unpaid'])
        ->whereNotNull('p.PaymentDueDate')
        ->whereDate('p.PaymentDueDate', '>=', $today)
        ->count(),
      'overdueCount' => (int) (clone $base)
        ->whereIn('p.PaymentStatus', ['Partially Paid', 'Unpaid'])
        ->whereNotNull('p.PaymentDueDate')
        ->whereDate('p.PaymentDueDate', '<', $today)
        ->count(),
    ];
  }

  protected function computeFullBreakdownTables(Carbon $start, Carbon $end): array {
    $soldProducts = DB::table('sold_products as sp')
      ->join('sales as s', 's.ID', '=', 'sp.SalesID')
      ->leftJoin('products as p', 'p.ID', '=', 'sp.ProductID')
      ->whereBetween('s.DateAdded', [$start, $end])
      ->groupBy('sp.ProductID', 'p.ProductName')
      ->selectRaw('sp.ProductID as product_id, COALESCE(p.ProductName, "Deleted Product") as product_name, SUM(sp.Quantity) as units, SUM(sp.SubAmount) as revenue')
      ->orderByDesc('units')
      ->orderByDesc('revenue')
      ->get()
      ->map(fn($row) => [
        'productName' => $row->product_name,
        'units' => (int) $row->units,
        'revenue' => round((float) $row->revenue, 2),
      ])
      ->values();

    $mostShrinkedProducts = DB::table('shrinked_products as sp')
      ->join('shrinkages as sh', 'sh.ID', '=', 'sp.ShrinkageID')
      ->leftJoin('products as p', 'p.ID', '=', 'sp.ProductID')
      ->where('sh.VerificationStatus', 'Verified')
      ->whereBetween('sh.DateAdded', [$start, $end])
      ->groupBy('sp.ProductID', 'p.ProductName')
      ->selectRaw('sp.ProductID as product_id, COALESCE(p.ProductName, "Deleted Product") as product_name, SUM(sp.Quantity) as units, SUM(sp.SubAmount) as losses')
      ->orderByDesc('units')
      ->orderByDesc('losses')
      ->get()
      ->map(fn($row) => [
        'productName' => $row->product_name,
        'units' => (int) $row->units,
        'losses' => round((float) $row->losses, 2),
      ])
      ->values();

    $inventoryUsage = DB::table('stock_outs as so')
      ->join('stock_out_details as sod', 'sod.ID', '=', 'so.StockOutDetailsID')
      ->leftJoin('inventory as i', 'i.ID', '=', 'so.InventoryID')
      ->where('so.ItemType', 'Inventory')
      ->whereBetween('sod.DateAdded', [$start, $end])
      ->groupBy('so.InventoryID', 'i.ItemName')
      ->selectRaw('so.InventoryID as inventory_id, COALESCE(i.ItemName, "Deleted Item") as item_name, SUM(so.QuantityRemoved) as units_used')
      ->orderByDesc('units_used')
      ->get()
      ->map(fn($row) => [
        'itemName' => $row->item_name,
        'unitsUsed' => (int) $row->units_used,
      ])
      ->values();

    $categoryRevenueRanking = DB::table('sold_products as sp')
      ->join('sales as s', 's.ID', '=', 'sp.SalesID')
      ->leftJoin('products as p', 'p.ID', '=', 'sp.ProductID')
      ->leftJoin('categories as c', 'c.ID', '=', 'p.CategoryID')
      ->whereBetween('s.DateAdded', [$start, $end])
      ->groupBy('c.ID', 'c.CategoryName')
      ->selectRaw('COALESCE(c.CategoryName, "Uncategorized") as category_name, SUM(sp.SubAmount) as revenue')
      ->orderByDesc('revenue')
      ->get()
      ->map(fn($row) => [
        'categoryName' => $row->category_name,
        'revenue' => round((float) $row->revenue, 2),
      ])
      ->values();

    return [
      'soldProducts' => $soldProducts,
      'mostShrinkedProducts' => $mostShrinkedProducts,
      'inventoryUsage' => $inventoryUsage,
      'categoryRevenueRanking' => $categoryRevenueRanking,
    ];
  }

  protected function buildChartSeriesPayload(Carbon $start, Carbon $end, string $granularity): array {
    [$bucketKeys, $labels] = $this->buildBuckets($start, $end, $granularity);

    $revenue = $this->fetchMetricByBucket(
      'payments as p',
      'sales as s',
      'p.SalesID',
      's.ID',
      's.DateAdded',
      "SUM(CASE WHEN p.PaymentStatus = 'Paid' THEN p.TotalAmount ELSE 0 END) as metric_value",
      $start,
      $end,
      $granularity,
    );

    $unitsSold = $this->fetchMetricByBucket(
      'sold_products as sp',
      'sales as s',
      'sp.SalesID',
      's.ID',
      's.DateAdded',
      'SUM(sp.Quantity) as metric_value',
      $start,
      $end,
      $granularity,
    );

    $productionBatches = $this->fetchSimpleMetricByBucket(
      'production_batch_details',
      'DateAdded',
      'SUM(TotalProductsProduced) as metric_value',
      $start,
      $end,
      $granularity,
    );

    $stockIns = $this->fetchSimpleMetricByBucket(
      'stock_in_details',
      'DateAdded',
      'SUM(TotalQuantity) as metric_value',
      $start,
      $end,
      $granularity,
    );

    $stockOuts = $this->fetchSimpleMetricByBucket(
      'stock_out_details',
      'DateAdded',
      'SUM(TotalQuantity) as metric_value',
      $start,
      $end,
      $granularity,
    );

    $shrinkedUnits = $this->fetchSimpleMetricByBucket(
      'shrinkages',
      'DateAdded',
      'SUM(Quantity) as metric_value',
      $start,
      $end,
      $granularity,
      fn($query) => $query->where('VerificationStatus', 'Verified'),
    );

    $losses = $this->fetchSimpleMetricByBucket(
      'shrinkages',
      'DateAdded',
      'SUM(TotalAmount) as metric_value',
      $start,
      $end,
      $granularity,
      fn($query) => $query->where('VerificationStatus', 'Verified'),
    );

    $series = [
      ['key' => 'revenue', 'label' => 'Revenue', 'isCurrency' => true, 'values' => $this->mapSeries($bucketKeys, $revenue)],
      ['key' => 'unitsSold', 'label' => 'Units Sold', 'isCurrency' => false, 'values' => $this->mapSeries($bucketKeys, $unitsSold)],
      ['key' => 'productionBatches', 'label' => 'Production Batches', 'isCurrency' => false, 'values' => $this->mapSeries($bucketKeys, $productionBatches)],
      ['key' => 'stockIns', 'label' => 'Stock-Ins', 'isCurrency' => false, 'values' => $this->mapSeries($bucketKeys, $stockIns)],
      ['key' => 'stockOuts', 'label' => 'Stock-Outs', 'isCurrency' => false, 'values' => $this->mapSeries($bucketKeys, $stockOuts)],
      ['key' => 'shrinkedUnits', 'label' => 'Shrinked Units', 'isCurrency' => false, 'values' => $this->mapSeries($bucketKeys, $shrinkedUnits)],
      ['key' => 'losses', 'label' => 'Losses', 'isCurrency' => true, 'values' => $this->mapSeries($bucketKeys, $losses)],
    ];

    return [
      'labels' => $labels,
      'bucketKeys' => $bucketKeys,
      'series' => $series,
      'range' => [
        'from' => $start->toDateString(),
        'to' => $end->toDateString(),
      ],
    ];
  }

  protected function buildBuckets(Carbon $start, Carbon $end, string $granularity): array {
    $keys = [];
    $labels = [];
    $cursor = $start->copy();

    if ($granularity === 'monthly') {
      $cursor = $cursor->startOfMonth();
      $last = $end->copy()->endOfMonth();
      while ($cursor->lte($last)) {
        $keys[] = $cursor->format('Y-m');
        $labels[] = $cursor->format('M Y');
        $cursor->addMonth();
      }
      return [$keys, $labels];
    }

    while ($cursor->lte($end)) {
      $keys[] = $cursor->format('Y-m-d');
      $labels[] = $cursor->format('M j');
      $cursor->addDay();
    }

    return [$keys, $labels];
  }

  protected function fetchMetricByBucket(
    string $table,
    string $joinTable,
    string $foreignKey,
    string $joinKey,
    string $dateColumn,
    string $metricSelect,
    Carbon $start,
    Carbon $end,
    string $granularity
  ): array {
    $bucketExpr = $granularity === 'monthly'
      ? 'DATE_FORMAT(' . $dateColumn . ', "%Y-%m")'
      : 'DATE(' . $dateColumn . ')';

    return DB::table($table)
      ->join($joinTable, $foreignKey, '=', $joinKey)
      ->whereBetween($dateColumn, [$start, $end])
      ->groupBy(DB::raw($bucketExpr))
      ->selectRaw($bucketExpr . ' as bucket_key, ' . $metricSelect)
      ->pluck('metric_value', 'bucket_key')
      ->map(fn($value) => (float) $value)
      ->all();
  }

  protected function fetchSimpleMetricByBucket(
    string $table,
    string $dateColumn,
    string $metricSelect,
    Carbon $start,
    Carbon $end,
    string $granularity,
    ?callable $constraints = null
  ): array {
    $bucketExpr = $granularity === 'monthly'
      ? 'DATE_FORMAT(' . $dateColumn . ', "%Y-%m")'
      : 'DATE(' . $dateColumn . ')';

    $query = DB::table($table)
      ->whereBetween($dateColumn, [$start, $end]);

    if ($constraints) {
      $constraints($query);
    }

    return $query
      ->groupBy(DB::raw($bucketExpr))
      ->selectRaw($bucketExpr . ' as bucket_key, ' . $metricSelect)
      ->pluck('metric_value', 'bucket_key')
      ->map(fn($value) => (float) $value)
      ->all();
  }

  protected function mapSeries(array $bucketKeys, array $rows): array {
    return collect($bucketKeys)
      ->map(function ($key) use ($rows) {
        return round((float) ($rows[$key] ?? 0), 2);
      })
      ->values()
      ->all();
  }
}
