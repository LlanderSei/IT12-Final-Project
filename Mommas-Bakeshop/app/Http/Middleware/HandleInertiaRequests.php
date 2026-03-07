<?php

namespace App\Http\Middleware;

use App\Models\Audit;
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
    $recentAudits = collect();
    if ($user) {
      $recentAudits = Audit::query()
        ->where('UserID', $user->id)
        ->where('Source', 'Application')
        ->orderByDesc('DateAdded')
        ->limit(20)
        ->get(['ID', 'TableEdited', 'ReadableChanges', 'Action', 'Source', 'DateAdded']);
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
    ];
  }
}
