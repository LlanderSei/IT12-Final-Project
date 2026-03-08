<?php

namespace App\Console\Commands;

use App\Models\DatabaseBackup;
use App\Services\DatabaseBackupService;
use Illuminate\Console\Command;
use Throwable;

class BackupVerifyCommand extends Command {
	protected $signature = 'backup:verify {backup-id?} {--keep-temp-db}';
	protected $description = 'Verify a backup chain by restoring it into a disposable temporary MySQL database.';

	public function handle(DatabaseBackupService $service): int {
		$backupId = $this->argument('backup-id');

		$backup = $backupId !== null
			? DatabaseBackup::query()->find((int) $backupId)
			: DatabaseBackup::query()
			->where('BackupStatus', 'Completed')
			->orderByDesc('CompletedAt')
			->orderByDesc('ID')
			->first();

		if (!$backup) {
			$this->error('No completed backup was found to verify.');
			return self::FAILURE;
		}

		try {
			$result = $service->verifyBackup($backup, (bool) $this->option('keep-temp-db'));

			$this->info(sprintf(
				'Backup #%d verified successfully using temporary database %s.',
				$result['selectedBackupId'],
				$result['temporaryDatabase'],
			));

			foreach ($result['tables'] as $table => $summary) {
				$this->line(sprintf('- %s: %d rows', $table, (int) ($summary['rowCount'] ?? 0)));
			}

			if (!(bool) $result['keptTemporaryDatabase']) {
				$this->line('Temporary verification database was dropped.');
			}

			return self::SUCCESS;
		} catch (Throwable $exception) {
			$this->error($exception->getMessage());
			return self::FAILURE;
		}
	}
}
