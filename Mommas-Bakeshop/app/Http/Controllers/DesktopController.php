<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

class DesktopController extends Controller {
	public function health(): JsonResponse {
		$databaseConnected = false;
		$databaseError = null;

		try {
			DB::connection()->getPdo();
			$databaseConnected = true;
		} catch (Throwable $exception) {
			$databaseError = $exception->getMessage();
		}

		$migrationsTableExists = false;
		$ownerExists = false;

		if ($databaseConnected) {
			try {
				$migrationsTableExists = Schema::hasTable('migrations');
				$ownerExists = User::query()
					->whereHas('role', fn($query) => $query->where('RoleName', 'Owner'))
					->exists();
			} catch (Throwable $exception) {
				$databaseError = $databaseError ?: $exception->getMessage();
			}
		}

		$storageWritable = is_dir(storage_path()) && is_writable(storage_path());
		$publicStorageLinked = is_link(public_path('storage')) || file_exists(public_path('storage'));
		$firstRunRequired = !$ownerExists;
		$ready = $databaseConnected && $migrationsTableExists && $storageWritable;

		return response()->json([
			'app' => config('app.name'),
			'environment' => app()->environment(),
			'desktop' => [
				'host' => config('desktop.host'),
				'port' => config('desktop.port'),
			],
			'ready' => $ready,
			'firstRunRequired' => $firstRunRequired,
			'checks' => [
				'databaseConnected' => $databaseConnected,
				'migrationsTableExists' => $migrationsTableExists,
				'storageWritable' => $storageWritable,
				'publicStorageLinked' => $publicStorageLinked,
				'ownerExists' => $ownerExists,
			],
			'errors' => array_values(array_filter([
				$databaseError,
				!$storageWritable ? 'Storage directory is not writable.' : null,
			])),
			'timestamp' => now()->toIso8601String(),
		]);
	}
}
