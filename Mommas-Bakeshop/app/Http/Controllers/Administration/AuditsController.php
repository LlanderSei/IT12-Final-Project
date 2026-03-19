<?php

namespace App\Http\Controllers\Administration;

use App\Http\Controllers\Controller;
use App\Models\Audit;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AuditsController extends Controller {
  public function index(Request $request) {
    $isOwnerView = strtolower((string) optional($request->user())->role) === 'owner';
    $search = trim((string) $request->string('search', ''));
    $action = (string) $request->string('action', 'all');
    $table = (string) $request->string('table', 'all');
    $source = (string) $request->string('source', 'all');
    $dateRange = (string) $request->string('dateRange', 'all');
    $sortKey = (string) $request->string('sortKey', 'DateAdded');
    $sortDirection = strtolower((string) $request->string('sortDirection', 'desc')) === 'asc' ? 'asc' : 'desc';
    $perPage = (int) $request->integer('perPage', 25);
    $perPage = in_array($perPage, [25, 50, 100, 500], true) ? $perPage : 25;

    $sortableColumns = [
      'User' => 'UserID',
      'TableEdited' => 'TableEdited',
      'Action' => 'Action',
      'Source' => 'Source',
      'DateAdded' => 'DateAdded',
    ];

    $sortColumn = $sortableColumns[$sortKey] ?? 'DateAdded';

    $baseQuery = Audit::query()
      ->with('user:id,FullName')
      ->when($search !== '', function ($query) use ($search, $isOwnerView) {
        $query->where(function ($nested) use ($search, $isOwnerView) {
          $nested
            ->where('TableEdited', 'like', "%{$search}%")
            ->orWhere('Action', 'like', "%{$search}%")
            ->orWhere('PreviousChanges', 'like', "%{$search}%")
            ->orWhere('SavedChanges', 'like', "%{$search}%")
            ->orWhere('ReadableChanges', 'like', "%{$search}%")
            ->orWhereHas('user', function ($userQuery) use ($search) {
              $userQuery->where('FullName', 'like', "%{$search}%");
            });

          if (!$isOwnerView) {
            $nested->orWhere('Source', 'like', "%{$search}%");
          }
        });
      })
      ->when($action !== 'all', fn($query) => $query->where('Action', $action))
      ->when($table !== 'all', fn($query) => $query->where('TableEdited', $table))
      ->when(!$isOwnerView && $source !== 'all', fn($query) => $query->where('Source', $source));

    $this->applyDateRange($baseQuery, $dateRange);

    $audits = (clone $baseQuery)
      ->orderBy($sortColumn, $sortDirection)
      ->orderByDesc('ID')
      ->paginate($perPage)
      ->withQueryString();

    $audits->getCollection()->transform(function ($audit) {
      return [
        'ID' => $audit->ID,
        'TableEdited' => $audit->TableEdited,
        'Action' => $audit->Action,
        'Source' => $audit->Source,
        'PreviousChanges' => $audit->PreviousChanges,
        'SavedChanges' => $audit->SavedChanges,
        'ReadableChanges' => $audit->ReadableChanges,
        'DateAdded' => optional($audit->DateAdded)->toIso8601String(),
        'user' => $audit->user
          ? [
              'ID' => $audit->user->id,
              'FullName' => $audit->user->FullName,
            ]
          : null,
      ];
    });

    $filterOptions = [
      'actions' => Audit::query()
        ->select('Action')
        ->whereNotNull('Action')
        ->distinct()
        ->orderBy('Action')
        ->pluck('Action')
        ->values(),
      'tables' => Audit::query()
        ->select('TableEdited')
        ->whereNotNull('TableEdited')
        ->distinct()
        ->orderBy('TableEdited')
        ->pluck('TableEdited')
        ->values(),
      'sources' => Audit::query()
        ->select('Source')
        ->whereNotNull('Source')
        ->distinct()
        ->orderBy('Source')
        ->pluck('Source')
        ->values(),
    ];

    return Inertia::render('Administration/Audits', [
      'audits' => $audits,
      'filters' => [
        'search' => $search,
        'action' => $action,
        'table' => $table,
        'source' => $source,
        'dateRange' => $dateRange,
        'sortKey' => $sortKey,
        'sortDirection' => $sortDirection,
        'perPage' => $perPage,
        'page' => $audits->currentPage(),
      ],
      'filterOptions' => $filterOptions,
    ]);
  }

  protected function applyDateRange($query, string $dateRange): void {
    $today = now()->startOfDay();

    match ($dateRange) {
      'today' => $query->where('DateAdded', '>=', $today),
      'last7' => $query->where('DateAdded', '>=', $today->copy()->subDays(6)),
      'last30' => $query->where('DateAdded', '>=', $today->copy()->subDays(29)),
      'thisMonth' => $query
        ->whereYear('DateAdded', now()->year)
        ->whereMonth('DateAdded', now()->month),
      'thisYear' => $query->whereYear('DateAdded', now()->year),
      default => null,
    };
  }
}
