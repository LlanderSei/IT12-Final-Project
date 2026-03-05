<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePermission {
  /**
   * Handle an incoming request.
   *
   * Supports `permission:A` and `permission:A,B` (any-of).
   */
  public function handle(Request $request, Closure $next, string $permissions): Response {
    $user = $request->user();
    if (!$user) {
      abort(401);
    }

    $permissionNames = collect(explode(',', $permissions))
      ->map(fn ($name) => trim($name))
      ->filter()
      ->values()
      ->all();

    if (empty($permissionNames) || !$user->hasAnyPermission($permissionNames)) {
      if ($request->expectsJson()) {
        return response()->json([
          'message' => 'Insufficient permission.',
        ], 403);
      }

      if ($request->headers->has('X-Inertia')) {
        return back(303)->with('error', 'Insufficient permission.');
      }

      abort(403, 'Insufficient permission.');
    }

    return $next($request);
  }
}
