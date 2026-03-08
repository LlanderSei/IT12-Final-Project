<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\DatabaseBackupService;
use Illuminate\Console\Command;
use Throwable;

class BackupSnapshotCommand extends Command {
	protected $signature = 'backup:snapshot {--notes=} {--user-id=}';
	protected $description = 'Create a local full snapshot backup of the application database.';

	public function handle(DatabaseBackupService $service): int {
		$user = null;
		$userId = $this->option('user-id');

		if ($userId !== null) {
			$user = User::query()->find((int) $userId);
			if (!$user) {
				$this->error('The provided user ID does not exist.');
				return self::FAILURE;
			}
		}

		try {
			$backup = $service->createSnapshot($user, $this->option('notes'));
			$this->info(sprintf('Snapshot backup #%d created: %s', $backup->ID, $backup->FilePath));
			return self::SUCCESS;
		} catch (Throwable $exception) {
			$this->error($exception->getMessage());
			return self::FAILURE;
		}
	}
}
