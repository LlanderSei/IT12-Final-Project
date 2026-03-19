<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Shrinkage;
use App\Models\SoldProduct;
use Carbon\Carbon;
use Inertia\Inertia;

class DashboardController extends Controller {
  public function index() {
    $todayStart = Carbon::today();
    $todayEnd = Carbon::today()->endOfDay();
    $yesterdayStart = Carbon::yesterday()->startOfDay();
    $yesterdayEnd = Carbon::yesterday()->endOfDay();

    $todayRevenue = (float) Payment::query()
      ->where('PaymentStatus', 'Paid')
      ->whereHas('sale', function ($query) use ($todayStart, $todayEnd) {
        $query->whereBetween('DateAdded', [$todayStart, $todayEnd]);
      })
      ->sum('TotalAmount');

    $yesterdayRevenue = (float) Payment::query()
      ->where('PaymentStatus', 'Paid')
      ->whereHas('sale', function ($query) use ($yesterdayStart, $yesterdayEnd) {
        $query->whereBetween('DateAdded', [$yesterdayStart, $yesterdayEnd]);
      })
      ->sum('TotalAmount');

    $todayUnitsSold = (int) SoldProduct::query()
      ->whereHas('sale', function ($query) use ($todayStart, $todayEnd) {
        $query->whereBetween('DateAdded', [$todayStart, $todayEnd]);
      })
      ->sum('Quantity');

    $yesterdayUnitsSold = (int) SoldProduct::query()
      ->whereHas('sale', function ($query) use ($yesterdayStart, $yesterdayEnd) {
        $query->whereBetween('DateAdded', [$yesterdayStart, $yesterdayEnd]);
      })
      ->sum('Quantity');

    $lowStockAlerts = (int) Product::query()
      ->notArchived()
      ->whereColumn('Quantity', '<=', 'LowStockThreshold')
      ->count();

    $todaySpoilages = (int) Shrinkage::query()
      ->where('VerificationStatus', 'Verified')
      ->where('Reason', 'Spoiled')
      ->whereBetween('DateAdded', [$todayStart, $todayEnd])
      ->sum('Quantity');

    $yesterdaySpoilages = (int) Shrinkage::query()
      ->where('VerificationStatus', 'Verified')
      ->where('Reason', 'Spoiled')
      ->whereBetween('DateAdded', [$yesterdayStart, $yesterdayEnd])
      ->sum('Quantity');

    $todayDate = Carbon::today()->toDateString();
    $yesterdayDate = Carbon::yesterday()->toDateString();

    $todayUpcomingPaymentDue = (int) Payment::query()
      ->whereIn('PaymentStatus', ['Unpaid', 'Partially Paid'])
      ->whereDate('PaymentDueDate', '>=', $todayDate)
      ->count();

    $yesterdayUpcomingPaymentDue = (int) Payment::query()
      ->whereIn('PaymentStatus', ['Unpaid', 'Partially Paid'])
      ->whereDate('PaymentDueDate', '>=', $yesterdayDate)
      ->count();

    $todayPaymentOverdue = (int) Payment::query()
      ->whereIn('PaymentStatus', ['Unpaid', 'Partially Paid'])
      ->whereDate('PaymentDueDate', '<', $todayDate)
      ->count();

    $yesterdayPaymentOverdue = (int) Payment::query()
      ->whereIn('PaymentStatus', ['Unpaid', 'Partially Paid'])
      ->whereDate('PaymentDueDate', '<', $yesterdayDate)
      ->count();

    $recentSalesToday = Sale::query()
      ->with([
        'customer',
        'payment',
        'soldProducts.product:ID,ProductName',
      ])
      ->whereBetween('DateAdded', [$todayStart, $todayEnd])
      ->orderByDesc('DateAdded')
      ->limit(10)
      ->get()
      ->map(function ($sale) {
        $sale->totalAmount = (float) ($sale->payment->TotalAmount ?? $sale->TotalAmount ?? 0);
        return $sale;
      });

    $metrics = [
      'todayRevenue' => array_merge(
        ['value' => round($todayRevenue, 2)],
        $this->buildTrendMeta($todayRevenue, $yesterdayRevenue),
      ),
      'unitsSoldToday' => array_merge(
        ['value' => $todayUnitsSold],
        $this->buildTrendMeta($todayUnitsSold, $yesterdayUnitsSold),
      ),
      'lowStockAlerts' => [
        'value' => $lowStockAlerts,
        'trendText' => 'No baseline data from yesterday',
        'trendTone' => 'neutral',
      ],
      'spoilages' => array_merge(
        ['value' => $todaySpoilages],
        $this->buildTrendMeta($todaySpoilages, $yesterdaySpoilages, true),
      ),
    ];

    if ($todayUpcomingPaymentDue > 0) {
      $metrics['upcomingPaymentDue'] = array_merge(
        ['value' => $todayUpcomingPaymentDue],
        $this->buildTrendMeta($todayUpcomingPaymentDue, $yesterdayUpcomingPaymentDue, true),
      );
    }

    if ($todayPaymentOverdue > 0) {
      $metrics['paymentOverdue'] = array_merge(
        ['value' => $todayPaymentOverdue],
        $this->buildTrendMeta($todayPaymentOverdue, $yesterdayPaymentOverdue, true),
      );
    }

    return Inertia::render('Dashboard', [
      'currentUserFullName' => (string) (auth()->user()?->FullName ?? 'User'),
      'metrics' => $metrics,
      'recentSalesToday' => $recentSalesToday,
    ]);
  }

  private function buildTrendMeta(float|int $today, float|int $yesterday, bool $inverseGood = false): array {
    if ($yesterday == 0.0) {
      if ($today == 0.0) {
        return [
          'trendText' => 'No change from yesterday',
          'trendTone' => 'neutral',
        ];
      }

      return [
        'trendText' => 'New vs yesterday',
        'trendTone' => $inverseGood ? 'bad' : 'good',
      ];
    }

    $changePercent = round((($today - $yesterday) / $yesterday) * 100);
    if ($changePercent === 0.0) {
      return [
        'trendText' => 'No change from yesterday',
        'trendTone' => 'neutral',
      ];
    }

    $isMore = $changePercent > 0;
    $absPercent = abs($changePercent);
    $trendText = $isMore
      ? "{$absPercent}% more than yesterday"
      : "{$absPercent}% less than yesterday";

    $tone = $isMore ? 'good' : 'bad';
    if ($inverseGood) {
      $tone = $isMore ? 'bad' : 'good';
    }

    return [
      'trendText' => $trendText,
      'trendTone' => $tone,
    ];
  }
}
