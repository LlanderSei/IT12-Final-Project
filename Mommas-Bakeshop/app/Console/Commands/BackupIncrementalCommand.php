<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\DatabaseBackupService;
use Illuminate\Console\Command;
use Throwable;

class BackupIncrementalCommand extends Command {
	protected $signature = 'backup:incremental {--notes=} {--user-id=}';
	protected $description = 'Create a local incremental backup from the database change log.';

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
			$backup = $service->createIncremental($user, $this->option('notes'));
			$this->info(sprintf('Incremental backup #%d created: %s', $backup->ID, $backup->FilePath));
			return self::SUCCESS;
		} catch (Throwable $exception) {
			$this->error($exception->getMessage());
			return self::FAILURE;
		}
	}
}
