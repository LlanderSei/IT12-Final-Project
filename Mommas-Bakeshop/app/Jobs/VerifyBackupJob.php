<?php

namespace App\Jobs;

use App\Models\DatabaseBackup;
use App\Services\DatabaseBackupService;
use App\Services\SystemOperationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class VerifyBackupJob implements ShouldQueue {
	use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

	public int $timeout = 3600;
	public int $tries = 1;

	public function __construct(
		private readonly int $operationId,
		private readonly int $backupId,
		private readonly bool $keepTemporaryDatabase = false,
	) {
		$this->onQueue('database-maintenance');
	}

	public function handle(
		SystemOperationService $operations,
		DatabaseBackupService $backupService,
	): void {
		$operations->markRunning($this->operationId);

		try {
			$backup = DatabaseBackup::query()->findOrFail($this->backupId);
			$result = $backupService->verifyBackup($backup, $this->keepTemporaryDatabase);
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
