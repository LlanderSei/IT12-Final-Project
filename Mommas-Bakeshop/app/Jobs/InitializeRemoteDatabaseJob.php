<?php

namespace App\Jobs;

use App\Services\DatabaseConnectionManager;
use App\Services\SystemOperationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class InitializeRemoteDatabaseJob implements ShouldQueue {
	use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

	public int $timeout = 3600;
	public int $tries = 1;

	public function __construct(private readonly int $operationId) {
		$this->onQueue('database-maintenance');
	}

	public function handle(
		SystemOperationService $operations,
		DatabaseConnectionManager $connectionManager,
	): void {
		$operations->markRunning($this->operationId);

		try {
			$result = $connectionManager->initializeRemoteDatabase();
			$operations->markCompleted($this->operationId, $result);
		} catch (Throwable $exception) {
			$operations->markFailed($this->operationId, $exception);
			throw $exception;
		}
	}

	public function failed(Throwable $exception): void {
		app(SystemOperationService::class)->markFailed($this->operationId, $exception);
	}
}
