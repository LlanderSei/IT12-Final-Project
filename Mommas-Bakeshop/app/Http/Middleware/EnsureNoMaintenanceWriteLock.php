<?php

namespace App\Http\Middleware;

use App\Services\SystemOperationService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureNoMaintenanceWriteLock {
	public function handle(Request $request, Closure $next): Response {
		$operation = app(SystemOperationService::class)->activeWriteLock();

		if (!$operation) {
			return $next($request);
		}

		$message = sprintf(
			'%s is in progress. Write actions are temporarily disabled. Try again after %s #%d finishes.',
			$operation->Title ?: 'Database maintenance',
			$operation->OperationType,
			$operation->ID,
		);

		if ($request->header('X-Inertia')) {
			return redirect()
				->back()
				->with('error', $message);
		}

		if ($request->expectsJson() || $request->isJson()) {
			return response()->json(['message' => $message], 423);
		}

		return redirect()
			.back()
			.with('error', $message);
	}
}
