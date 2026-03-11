<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureLocalDesktopRequest {
	public function handle(Request $request, Closure $next): Response {
		$host = strtolower((string) $request->getHost());
		$ip = (string) $request->ip();

		$allowedHosts = ['127.0.0.1', 'localhost', '::1'];
		$allowedIps = ['127.0.0.1', '::1'];

		if (!in_array($host, $allowedHosts, true) && !in_array($ip, $allowedIps, true)) {
			abort(403, 'Desktop endpoints are only available from localhost.');
		}

		return $next($request);
	}
}
