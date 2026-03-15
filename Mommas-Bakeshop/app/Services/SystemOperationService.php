<?php

namespace App\Services;

use App\Models\SystemOperation;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class SystemOperationService {
	private const MAINTENANCE_JOB_CLASSES = [
		'App\\Jobs\\InitializeRemoteDatabaseJob',
		'App\\Jobs\\TransferLocalToRemoteJob',
		'App\\Jobs\\SwitchDatabaseTargetJob',
		'App\\Jobs\\VerifyBackupJob',
		'App\\Jobs\\RestoreBackupJob',
	];

	public function queue(
		?User $user,
		string $operationType,
		string $title,
		array $payload = [],
		bool $lockWrites = false,
		?string $notes = null,
		string $scope = 'Database',
	): SystemOperation {
		if ($this->hasActiveOperation()) {
			throw new RuntimeException('Another maintenance operation is already queued or running.');
		}

		return SystemOperation::query()->create([
			'UserID' => $user?->id,
			'CreatedByName' => $user?->FullName,
			'Scope' => $scope,
			'OperationType' => $operationType,
			'Title' => $title,
			'Status' => 'Pending',
			'LockWrites' => $lockWrites,
			'Payload' => $payload,
			'Notes' => $this->normalizeNotes($notes),
			'DateAdded' => now(),
			'DateModified' => now(),
		]);
	}

	public function markRunning(SystemOperation|int $operation): SystemOperation {
		$model = $this->resolve($operation);
		$model->forceFill([
			'Status' => 'Running',
			'StartedAt' => $model->StartedAt ?? now(),
			'DateModified' => now(),
		])->save();

		return $model->fresh();
	}

	public function markCompleted(SystemOperation|int $operation, array $result = []): SystemOperation {
		$model = $this->resolve($operation);
		$model->forceFill([
			'Status' => 'Completed',
			'Result' => $result ?: null,
			'FailureMessage' => null,
			'StartedAt' => $model->StartedAt ?? now(),
			'CompletedAt' => now(),
			'DateModified' => now(),
		])->save();

		return $model->fresh();
	}

	public function markFailed(SystemOperation|int $operation, Throwable|string $failure): SystemOperation {
		$model = $this->resolve($operation);
		$message = $failure instanceof Throwable ? $failure->getMessage() : (string) $failure;

		$model->forceFill([
			'Status' => 'Failed',
			'FailureMessage' => Str::limit($message, 4000, ''),
			'StartedAt' => $model->StartedAt ?? now(),
			'CompletedAt' => now(),
			'DateModified' => now(),
		])->save();

		return $model->fresh();
	}

	public function activeOperation(): ?SystemOperation {
		$this->reconcileQueueBackedOperations();

		return SystemOperation::query()
			->whereIn('Status', ['Pending', 'Running'])
			->orderByRaw("CASE Status WHEN 'Running' THEN 1 WHEN 'Pending' THEN 2 ELSE 3 END")
			->orderByDesc('DateAdded')
			->orderByDesc('ID')
			->first();
	}

	public function activeWriteLock(): ?SystemOperation {
		$this->reconcileQueueBackedOperations();

		return SystemOperation::query()
			->where('LockWrites', true)
			->whereIn('Status', ['Pending', 'Running'])
			->orderByRaw("CASE Status WHEN 'Running' THEN 1 WHEN 'Pending' THEN 2 ELSE 3 END")
			->orderByDesc('DateAdded')
			->orderByDesc('ID')
			->first();
	}

	public function hasActiveOperation(): bool {
		$this->reconcileQueueBackedOperations();

		return SystemOperation::query()
			->whereIn('Status', ['Pending', 'Running'])
			->exists();
	}

	public function recent(string $scope = 'Database', int $limit = 10): Collection {
		$this->reconcileQueueBackedOperations();

		return SystemOperation::query()
			->where('Scope', $scope)
			->orderByRaw("CASE Status WHEN 'Running' THEN 1 WHEN 'Pending' THEN 2 WHEN 'Failed' THEN 3 WHEN 'Completed' THEN 4 ELSE 5 END")
			->orderByDesc('DateAdded')
			->orderByDesc('ID')
			->limit($limit)
			->get();
	}

	public function reconcileQueueBackedOperations(): void {
		$operations = SystemOperation::query()
			->whereIn('Status', ['Pending', 'Running'])
			->orderBy('ID')
			->get();

		if ($operations->isEmpty()) {
			return;
		}

		$queueIndex = $this->buildQueueIndex();

		foreach ($operations as $operation) {
			$operationId = (int) $operation->ID;
			$failedJob = $queueIndex['failed'][$operationId] ?? null;
			if ($failedJob) {
				$this->markFailed($operation, $failedJob['message']);
				continue;
			}

			$job = $queueIndex['jobs'][$operationId] ?? null;
			if ($job) {
				if ($operation->Status === 'Pending' && !empty($job['reserved_at'])) {
					$this->markRunning($operation);
				}
				continue;
			}

			if ($operation->Status === 'Running') {
				$this->markFailed($operation, 'Maintenance job is no longer present in the queue. It likely stopped or crashed before reporting completion.');
			}
		}
	}

	private function resolve(SystemOperation|int $operation): SystemOperation {
		return $operation instanceof SystemOperation
			? $operation
			: SystemOperation::query()->findOrFail($operation);
	}

	private function normalizeNotes(?string $notes): ?string {
		$normalized = trim((string) $notes);
		return $normalized === '' ? null : $normalized;
	}

	private function buildQueueIndex(): array {
		$connection = DB::connection('mysql_control');
		$jobs = [];
		$failed = [];

		foreach ($connection->table('jobs')->select(['id', 'payload', 'reserved_at'])->get() as $job) {
			$payload = $this->decodeQueuePayload((string) $job->payload);
			$operationId = $this->extractOperationId($payload['command'] ?? null);
			$displayName = (string) ($payload['displayName'] ?? '');
			if (!$operationId || !in_array($displayName, self::MAINTENANCE_JOB_CLASSES, true)) {
				continue;
			}

			$jobs[$operationId] = [
				'id' => (int) $job->id,
				'reserved_at' => $job->reserved_at ? (int) $job->reserved_at : null,
			];
		}

		foreach ($connection->table('failed_jobs')->select(['id', 'payload', 'exception'])->get() as $job) {
			$payload = $this->decodeQueuePayload((string) $job->payload);
			$operationId = $this->extractOperationId($payload['command'] ?? null);
			$displayName = (string) ($payload['displayName'] ?? '');
			if (!$operationId || !in_array($displayName, self::MAINTENANCE_JOB_CLASSES, true)) {
				continue;
			}

			$failed[$operationId] = [
				'id' => (int) $job->id,
				'message' => Str::limit((string) $job->exception, 4000, ''),
			];
		}

		return [
			'jobs' => $jobs,
			'failed' => $failed,
		];
	}

	private function decodeQueuePayload(string $payload): array {
		$decoded = json_decode($payload, true);
		if (!is_array($decoded)) {
			return [];
		}

		return [
			'displayName' => $decoded['displayName'] ?? null,
			'command' => $decoded['data']['command'] ?? null,
		];
	}

	private function extractOperationId(mixed $command): ?int {
		if (!is_string($command) || $command === '') {
			return null;
		}

		if (preg_match('/operationId";i:(\d+)/', $command, $matches) === 1) {
			return (int) $matches[1];
		}

		if (preg_match('/operationId";s:\d+:"(\d+)"/', $command, $matches) === 1) {
			return (int) $matches[1];
		}

		return null;
	}
}
