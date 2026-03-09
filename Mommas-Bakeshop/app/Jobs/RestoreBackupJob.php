<?php

namespace App\Jobs;

use App\Models\DatabaseBackup;
use App\Models\User;
use App\Services\DatabaseBackupService;
use App\Services\SystemOperationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class RestoreBackupJob implements ShouldQueue {
	use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

	public int $timeout = 7200;
	public int $tries = 1;

	public function __construct(
		private readonly int $operationId,
		private readonly int $backupId,
		private readonly ?int $userId = null,
		private readonly ?string $notes = null,
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
			$user = $this->userId ? User::query()->find($this->userId) : null;
			$resultBackup = $backupService->restoreBackup($backup, $user, $this->notes);
			$operations->markCompleted($this->operationId, [
				'selectedBackupId' => (int) $backup->ID,
				'baselineSnapshotId' => (int) $resultBackup->ID,
				'message' => 'Backup restored and a fresh baseline snapshot was created.',
			]);
		} catch (Throwable $exception) {
			$operations->markFailed($this->operationId, $exception);
			throw $exception;
		}
	}

	public function failed(Throwable $exception): void {
		app(SystemOperationService::class)->markFailed($this->operationId, $exception);
	}
}
