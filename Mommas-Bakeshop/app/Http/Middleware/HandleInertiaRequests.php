<?php

namespace App\Http\Middleware;

use App\Models\Audit;
use App\Models\Inventory;
use App\Models\JobOrder;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Shrinkage;
use App\Services\SystemOperationService;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware {
  /**
   * The root template that is loaded on the first page visit.
   *
   * @var string
   */
  protected $rootView = 'app';

  /**
   * Determine the current asset version.
   */
  public function version(Request $request): ?string {
    return parent::version($request);
  }

  /**
   * Define the props that are shared by default.
   *
   * @return array<string, mixed>
   */
  public function share(Request $request): array {
    $user = $request->user();
    $user?->loadMissing('role');
    $operationService = app(SystemOperationService::class);
    $maintenanceOperation = $operationService->activeWriteLock();
    $recentMaintenanceOperations = $operationService
      ->recent('Database', 10)
      ->map(fn($operation) => [
        'id' => (int) $operation->ID,
        'title' => $operation->Title,
        'type' => $operation->OperationType,
        'status' => $operation->Status,
        'notes' => $operation->Notes,
        'failureMessage' => $operation->FailureMessage,
        'completedAt' => optional($operation->CompletedAt)->toIso8601String(),
        'startedAt' => optional($operation->StartedAt ?? $operation->DateAdded)->toIso8601String(),
      ])
      ->values()
      ->all();
    $recentAudits = collect();
    $overdueJobOrdersCount = 0;
    $pendingJobOrdersCount = 0;
    $noStockInventoryCount = 0;
    $noStockProductsCount = 0;
    $unconfirmedShrinkageCount = 0;
    $pendingPaymentsCount = 0;
    if ($user) {
      $recentAudits = Audit::query()
        ->where('UserID', $user->id)
        ->where('Source', 'Application')
        ->orderByDesc('DateAdded')
        ->limit(20)
        ->get(['ID', 'TableEdited', 'ReadableChanges', 'Action', 'Source', 'DateAdded']);

      $pendingJobOrdersCount = JobOrder::query()
        ->where('Status', 'Pending')
        ->count();

      $overdueJobOrdersCount = JobOrder::query()
        ->where('Status', 'Pending')
        ->whereNotNull('DeliveryAt')
        ->where('DeliveryAt', '<', now())
        ->count();

      $noStockInventoryCount = Inventory::query()
        ->notArchived()
        ->where('Quantity', '<=', 0)
        ->count();

      $noStockProductsCount = Product::query()
        ->notArchived()
        ->where('Quantity', '<=', 0)
        ->count();

      $unconfirmedShrinkageCount = Shrinkage::query()
        ->where(function ($query) {
          $query
            ->whereNull('VerificationStatus')
            ->orWhere('VerificationStatus', 'Pending');
        })
        ->count();

      $pendingPaymentsCount = Payment::query()
        ->where(function ($query) {
          $query->whereNull('PaymentStatus')->orWhere('PaymentStatus', '!=', 'Paid');
        })
        ->count();
    }

    return [
      ...parent::share($request),
      'auth' => [
        'user' => $user ? [
          'id'    => $user->id,
          'name'  => $user->FullName,
          'email' => $user->email,
          'role'  => strtolower($user->role?->RoleName ?? 'admin'),
          'roleLabel' => $user->role?->RoleName ?? 'Admin',
          'roleColor' => $user->role?->RoleColor ?? '#6B7280',
          'roleRank' => $user->role?->RoleRank,
          'permissions' => $user->permissionNames()->all(),
          'recentAudits' => $recentAudits->map(fn($audit) => [
            'ID' => $audit->ID,
            'TableEdited' => $audit->TableEdited,
            'ReadableChanges' => $audit->ReadableChanges,
            'Action' => $audit->Action,
            'Source' => $audit->Source,
            'DateAdded' => optional($audit->DateAdded)->toIso8601String(),
          ])->values()->all(),
        ] : null,
      ],
      'flash' => [
        'success' => $request->session()->get('success'),
        'error'   => $request->session()->get('error'),
        'documentPayload' => $request->session()->get('documentPayload'),
      ],
      'system' => [
        'maintenance' => $maintenanceOperation ? [
          'id' => (int) $maintenanceOperation->ID,
          'title' => $maintenanceOperation->Title,
          'type' => $maintenanceOperation->OperationType,
          'status' => $maintenanceOperation->Status,
          'notes' => $maintenanceOperation->Notes,
          'createdBy' => $maintenanceOperation->CreatedByName,
          'startedAt' => optional($maintenanceOperation->StartedAt ?? $maintenanceOperation->DateAdded)->toIso8601String(),
        ] : null,
        'recentMaintenanceOperations' => $recentMaintenanceOperations,
      ],
      'overdueJobOrdersCount' => $overdueJobOrdersCount,
      'pendingJobOrdersCount' => $pendingJobOrdersCount,
      'noStockInventoryCount' => $noStockInventoryCount,
      'noStockProductsCount' => $noStockProductsCount,
      'unconfirmedShrinkageCount' => $unconfirmedShrinkageCount,
      'pendingPaymentsCount' => $pendingPaymentsCount,
    ];
  }
}
