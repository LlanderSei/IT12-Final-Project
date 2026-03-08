<?php

namespace App\Services;

use App\Models\DatabaseBackup;
use App\Models\DatabaseBackupChange;
use App\Models\DatabaseBackupSetting;
use App\Models\User;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class DatabaseBackupService {
    private const RESTORE_CORRECTION_TABLES = [
        'products',
        'inventory',
        'production_batch_details',
        'payments',
        'product_leftover_snapshots',
        'inventory_leftover_snapshots',
    ];

    private const LOCK_TIMEOUT_SECONDS = 15;

    public function trackedTables(): array {
        return config('database-backups.tracked_tables', []);
    }

    public function settings(): DatabaseBackupSetting {
        return DatabaseBackupSetting::query()->firstOrCreate(
            ['ID' => 1],
            [
                'SnapshotRetentionCount' => 10,
                'IncrementalRetentionCount' => 30,
                'DeleteFailedBackups' => false,
                'DateAdded' => now(),
                'DateModified' => now(),
            ],
        );
    }

    public function updateSettings(array $attributes): DatabaseBackupSetting {
        $settings = $this->settings();
        $settings->update([
            'SnapshotRetentionCount' => (int) $attributes['SnapshotRetentionCount'],
            'IncrementalRetentionCount' => (int) $attributes['IncrementalRetentionCount'],
            'DeleteFailedBackups' => (bool) $attributes['DeleteFailedBackups'],
            'DateModified' => now(),
        ]);

        return $settings->fresh();
    }

    public function createSnapshot(?User $user = null, ?string $notes = null): DatabaseBackup {
        $this->prepareLongRunningOperation();
        return $this->withBackupLock(function () use ($user, $notes) {
            return $this->createSnapshotInternal($user, $notes);
        });
    }

    public function createIncremental(?User $user = null, ?string $notes = null): DatabaseBackup {
        $this->prepareLongRunningOperation();
        return $this->withBackupLock(function () use ($user, $notes) {
            return $this->createIncrementalInternal($user, $notes);
        });
    }

    public function previewRestore(DatabaseBackup $backup): array {
        $chain = $this->restoreChain($backup);
        return [
            'selectedBackupId' => (int) $backup->ID,
            'chainLength' => count($chain),
            'chain' => array_map(fn (DatabaseBackup $item) => [
                'id' => (int) $item->ID,
                'type' => $item->BackupType,
                'status' => $item->BackupStatus,
                'fileName' => $item->FileName,
                'fromChangeLogId' => $item->FromChangeLogID,
                'toChangeLogId' => $item->ToChangeLogID,
                'completedAt' => optional($item->CompletedAt)->toIso8601String(),
            ], $chain),
        ];
    }

    public function restoreBackup(DatabaseBackup $backup, ?User $user = null, ?string $notes = null): DatabaseBackup {
        $this->prepareLongRunningOperation();
        return $this->withBackupLock(function () use ($backup, $user, $notes) {
            $selectedBackup = DatabaseBackup::query()->findOrFail($backup->ID);
            $safetySnapshot = $this->createSnapshotInternal(
                $user,
                trim('Pre-restore safety snapshot | target backup #' . $selectedBackup->ID . ($notes ? ' | ' . $notes : '')),
            );

            try {
                $this->applyRestoreChain($selectedBackup);
            } catch (Throwable $exception) {
                try {
                    $this->applyRestoreChain($safetySnapshot);
                    $this->createSnapshotInternal(
                        $user,
                        trim('Rollback baseline after failed restore | safety snapshot #' . $safetySnapshot->ID . ' | target backup #' . $selectedBackup->ID),
                    );
                } catch (Throwable $rollbackException) {
                    throw new RuntimeException(sprintf(
                        'Restore failed for backup #%d and automatic rollback from safety snapshot #%d also failed. Restore error: %s | Rollback error: %s',
                        $selectedBackup->ID,
                        $safetySnapshot->ID,
                        $exception->getMessage(),
                        $rollbackException->getMessage(),
                    ), previous: $rollbackException);
                }

                throw new RuntimeException(sprintf(
                    'Restore failed for backup #%d. Database was rolled back using safety snapshot #%d. Original error: %s',
                    $selectedBackup->ID,
                    $safetySnapshot->ID,
                    $exception->getMessage(),
                ), previous: $exception);
            }

            $restoreNotes = trim(collect([
                'Post-restore baseline',
                'restored from backup #' . $selectedBackup->ID,
                'safety snapshot #' . $safetySnapshot->ID,
                $notes,
            ])->filter()->implode(' | '));

            return $this->createSnapshotInternal($user, $restoreNotes);
        });
    }

    public function verifyBackup(DatabaseBackup $backup, bool $keepTemporaryDatabase = false): array {
        $this->prepareLongRunningOperation();
        return $this->withBackupLock(function () use ($backup, $keepTemporaryDatabase) {
            $selectedBackup = DatabaseBackup::query()->findOrFail($backup->ID);
            $chain = $this->restoreChain($selectedBackup);
            $sourceDatabase = DB::getDatabaseName();
            $connectionName = (string) config('database.default');
            $baseConnection = config("database.connections.{$connectionName}");

            if (($baseConnection['driver'] ?? null) !== 'mysql') {
                throw new RuntimeException('Backup verification currently supports only MySQL connections.');
            }

            $temporaryDatabase = $this->temporaryDatabaseName($sourceDatabase);
            $verificationConnectionName = 'backup_verify';
            $tables = $this->trackedTables();

            DB::statement(sprintf(
                'CREATE DATABASE `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
                $temporaryDatabase,
            ));

            try {
                foreach ($tables as $table) {
                    DB::statement(sprintf(
                        'CREATE TABLE `%s`.`%s` LIKE `%s`.`%s`',
                        $temporaryDatabase,
                        $table,
                        $sourceDatabase,
                        $table,
                    ));
                }

                config([
                    "database.connections.{$verificationConnectionName}" => array_merge($baseConnection, [
                        'database' => $temporaryDatabase,
                    ]),
                ]);

                DB::purge($verificationConnectionName);
                $verificationConnection = DB::connection($verificationConnectionName);

                $this->applyRestoreChainToConnection($verificationConnection, $chain, false);

                $tableSummaries = [];
                foreach ($tables as $table) {
                    $tableSummaries[$table] = [
                        'rowCount' => (int) $verificationConnection->table($table)->count(),
                    ];
                }

                return [
                    'selectedBackupId' => (int) $selectedBackup->ID,
                    'temporaryDatabase' => $temporaryDatabase,
                    'keptTemporaryDatabase' => $keepTemporaryDatabase,
                    'chainLength' => count($chain),
                    'tables' => $tableSummaries,
                ];
            } finally {
                DB::purge($verificationConnectionName);
                if (!$keepTemporaryDatabase) {
                    DB::statement(sprintf('DROP DATABASE IF EXISTS `%s`', $temporaryDatabase));
                }
            }
        });
    }

    public function cleanupBackups(?DatabaseBackupSetting $settings = null): array {
        return $this->withBackupLock(function () use ($settings) {
            $settings ??= $this->settings();
            $allBackups = DatabaseBackup::query()
                ->orderByDesc('CompletedAt')
                ->orderByDesc('ID')
                ->get();

            $completedSnapshots = $allBackups->where('BackupStatus', 'Completed')->where('BackupType', 'Snapshot')->values();
            $completedIncrementals = $allBackups->where('BackupStatus', 'Completed')->where('BackupType', 'Incremental')->values();

            $keepIds = collect();
            $keepIds = $keepIds->merge($completedSnapshots->take((int) $settings->SnapshotRetentionCount)->pluck('ID'));
            $keepIds = $keepIds->merge($completedIncrementals->take((int) $settings->IncrementalRetentionCount)->pluck('ID'));

            $byId = $allBackups->keyBy('ID');
            $queue = $keepIds->unique()->values();
            while ($queue->isNotEmpty()) {
                $id = (int) $queue->shift();
                $backup = $byId->get($id);
                if (!$backup || !$backup->BaseBackupID) {
                    continue;
                }
                if (!$keepIds->contains((int) $backup->BaseBackupID)) {
                    $keepIds->push((int) $backup->BaseBackupID);
                    $queue->push((int) $backup->BaseBackupID);
                }
            }

            if (!(bool) $settings->DeleteFailedBackups) {
                $keepIds = $keepIds->merge($allBackups->where('BackupStatus', 'Failed')->pluck('ID'));
            }
            $keepIds = $keepIds->unique()->values();

            $candidates = $allBackups->filter(function (DatabaseBackup $backup) use ($keepIds) {
                if ($backup->BackupStatus === 'Pending') {
                    return false;
                }

                return !$keepIds->contains((int) $backup->ID);
            })->values();

            $deletedFiles = 0;
            $deletedRows = 0;
            foreach ($candidates as $backup) {
                if ($backup->FilePath && Storage::disk('local')->exists($backup->FilePath)) {
                    Storage::disk('local')->delete($backup->FilePath);
                    $deletedFiles++;
                }
                $backup->delete();
                $deletedRows++;
            }

            return [
                'deletedBackups' => $deletedRows,
                'deletedFiles' => $deletedFiles,
                'keptBackups' => $allBackups->count() - $deletedRows,
            ];
        });
    }

    public function downloadResponse(DatabaseBackup $backup) {
        if (!$backup->FilePath || !Storage::disk('local')->exists($backup->FilePath)) {
            throw new RuntimeException('Backup file is missing from local storage.');
        }

        $this->assertBackupFileIntegrity($backup);

        return Storage::disk('local')->download($backup->FilePath, $backup->FileName ?: basename($backup->FilePath));
    }

    private function createSnapshotInternal(?User $user = null, ?string $notes = null): DatabaseBackup {
        $tables = $this->trackedTables();
        $backup = $this->createPendingBackup('Snapshot', $user, $notes, $tables);

        try {
            $databaseName = DB::getDatabaseName();
            $summary = [];
            $data = [];
            $toChangeLogId = 0;

            DB::statement('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
            DB::beginTransaction();

            try {
                foreach ($tables as $table) {
                    $rows = DB::table($table)
                        ->orderBy($this->primaryKeyForTable(DB::connection(), $table))
                        ->get()
                        ->map(fn ($row) => $this->normalizeRow((array) $row))
                        ->all();
                    $data[$table] = $rows;
                    $summary[$table] = count($rows);
                }

                $toChangeLogId = $this->latestChangeLogId();
                DB::commit();
            } catch (Throwable $exception) {
                DB::rollBack();
                throw $exception;
            }

            $payload = [
                'metadata' => [
                    'backupId' => $backup->ID,
                    'backupType' => 'Snapshot',
                    'database' => $databaseName,
                    'generatedAt' => now()->toIso8601String(),
                    'toChangeLogId' => $toChangeLogId,
                    'tables' => $tables,
                    'notes' => $notes,
                ],
                'summary' => $summary,
                'data' => $data,
            ];

            $stored = $this->storePayload('Snapshot', $payload);
            return $this->completeBackup($backup, [
                'FileName' => $stored['fileName'],
                'FilePath' => $stored['filePath'],
                'FileSizeBytes' => $stored['fileSizeBytes'],
                'ChecksumSha256' => $stored['checksum'],
                'FromChangeLogID' => null,
                'ToChangeLogID' => $toChangeLogId,
                'Summary' => $summary,
            ]);
        } catch (Throwable $exception) {
            $this->failBackup($backup, $exception);
            throw $exception;
        }
    }

    private function createIncrementalInternal(?User $user = null, ?string $notes = null): DatabaseBackup {
        $tables = $this->trackedTables();
        $latestCompleted = DatabaseBackup::query()
            ->where('BackupStatus', 'Completed')
            ->orderByDesc('CompletedAt')
            ->orderByDesc('ID')
            ->first();

        if (!$latestCompleted) {
            throw new RuntimeException('Create a snapshot backup first before generating incrementals.');
        }

        $this->assertBackupFileIntegrity($latestCompleted);

        $fromChangeLogId = (int) ($latestCompleted->ToChangeLogID ?? 0);
        $toChangeLogId = $this->latestChangeLogId();
        $backup = $this->createPendingBackup('Incremental', $user, $notes, $tables, $latestCompleted->ID, $fromChangeLogId, $toChangeLogId);

        try {
            $changes = DatabaseBackupChange::query()
                ->where('ID', '>', $fromChangeLogId)
                ->where('ID', '<=', $toChangeLogId)
                ->orderBy('ID', 'asc')
                ->get()
                ->map(function (DatabaseBackupChange $change) {
                    return [
                        'id' => (int) $change->ID,
                        'table' => $change->TableName,
                        'recordId' => $change->RecordID,
                        'action' => $change->Action,
                        'rowData' => $change->RowData,
                        'changedAt' => optional($change->ChangedAt)->toIso8601String(),
                    ];
                })
                ->all();

            $summary = collect($changes)
                ->groupBy('table')
                ->map(fn ($rows) => [
                    'count' => $rows->count(),
                    'actions' => $rows->groupBy('action')->map->count()->all(),
                ])
                ->all();

            $payload = [
                'metadata' => [
                    'backupId' => $backup->ID,
                    'backupType' => 'Incremental',
                    'generatedAt' => now()->toIso8601String(),
                    'baseBackupId' => (int) $latestCompleted->ID,
                    'fromChangeLogId' => $fromChangeLogId,
                    'toChangeLogId' => $toChangeLogId,
                    'tables' => $tables,
                    'notes' => $notes,
                ],
                'summary' => $summary,
                'changes' => $changes,
            ];

            $stored = $this->storePayload('Incremental', $payload);
            return $this->completeBackup($backup, [
                'FileName' => $stored['fileName'],
                'FilePath' => $stored['filePath'],
                'FileSizeBytes' => $stored['fileSizeBytes'],
                'ChecksumSha256' => $stored['checksum'],
                'Summary' => $summary,
            ]);
        } catch (Throwable $exception) {
            $this->failBackup($backup, $exception);
            throw $exception;
        }
    }

    private function createPendingBackup(
        string $type,
        ?User $user,
        ?string $notes,
        array $tables,
        ?int $baseBackupId = null,
        ?int $fromChangeLogId = null,
        ?int $toChangeLogId = null,
    ): DatabaseBackup {
        return DatabaseBackup::query()->create([
            'UserID' => $user?->id,
            'BackupType' => $type,
            'BackupStatus' => 'Pending',
            'BaseBackupID' => $baseBackupId,
            'FromChangeLogID' => $fromChangeLogId,
            'ToChangeLogID' => $toChangeLogId,
            'TablesIncluded' => $tables,
            'Notes' => $this->normalizeNotes($notes),
            'StartedAt' => now(),
            'DateAdded' => now(),
            'DateModified' => now(),
        ]);
    }

    private function completeBackup(DatabaseBackup $backup, array $attributes): DatabaseBackup {
        $backup->forceFill(array_merge($attributes, [
            'BackupStatus' => 'Completed',
            'CompletedAt' => now(),
            'DateModified' => now(),
        ]))->save();

        return $backup->fresh(['user:id,FullName', 'baseBackup']);
    }

    private function failBackup(DatabaseBackup $backup, Throwable $exception): void {
        $backup->forceFill([
            'BackupStatus' => 'Failed',
            'FailureMessage' => Str::limit($exception->getMessage(), 2000, ''),
            'CompletedAt' => now(),
            'DateModified' => now(),
        ])->save();
    }

    private function storePayload(string $type, array $payload): array {
        $directory = $type === 'Snapshot'
            ? config('database-backups.snapshot_directory')
            : config('database-backups.incremental_directory');

        Storage::disk('local')->makeDirectory($directory);

        $timestamp = now()->format('Ymd_His');
        $fileName = strtolower($type) . '_' . $timestamp . '_' . Str::lower(Str::random(8)) . '.json';
        $filePath = trim($directory, '/') . '/' . $fileName;
        $json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        if ($json === false) {
            throw new RuntimeException('Failed to encode backup payload to JSON.');
        }

        Storage::disk('local')->put($filePath, $json);
        $absolutePath = Storage::disk('local')->path($filePath);

        return [
            'fileName' => $fileName,
            'filePath' => $filePath,
            'fileSizeBytes' => (int) filesize($absolutePath),
            'checksum' => hash_file('sha256', $absolutePath),
        ];
    }

    private function loadPayload(DatabaseBackup $backup): array {
        if (!$backup->FilePath || !Storage::disk('local')->exists($backup->FilePath)) {
            throw new RuntimeException(sprintf('Backup file for #%d is missing.', $backup->ID));
        }

        $this->assertBackupFileIntegrity($backup);

        $decoded = json_decode(Storage::disk('local')->get($backup->FilePath), true);
        if (!is_array($decoded)) {
            throw new RuntimeException(sprintf('Backup file for #%d is invalid JSON.', $backup->ID));
        }

        $metadata = is_array($decoded['metadata'] ?? null) ? $decoded['metadata'] : [];
        if ((int) ($metadata['backupId'] ?? 0) !== (int) $backup->ID) {
            throw new RuntimeException(sprintf('Backup file for #%d does not match its metadata backup ID.', $backup->ID));
        }

        if (($metadata['backupType'] ?? null) !== $backup->BackupType) {
            throw new RuntimeException(sprintf('Backup file for #%d does not match its backup type.', $backup->ID));
        }

        if ($backup->BackupType === 'Incremental' && (int) ($metadata['baseBackupId'] ?? 0) !== (int) $backup->BaseBackupID) {
            throw new RuntimeException(sprintf('Incremental backup #%d has a mismatched base backup reference.', $backup->ID));
        }

        if (!empty($metadata['tables'])) {
            $unexpectedTables = array_diff($metadata['tables'], $this->trackedTables());
            if (!empty($unexpectedTables)) {
                throw new RuntimeException(sprintf(
                    'Backup file for #%d contains unexpected tables: %s',
                    $backup->ID,
                    implode(', ', $unexpectedTables),
                ));
            }
        }

        return $decoded;
    }

    private function restoreChain(DatabaseBackup $backup): array {
        $chain = [];
        $current = $backup->fresh(['baseBackup']);
        $visited = [];

        while ($current) {
            if (isset($visited[$current->ID])) {
                throw new RuntimeException(sprintf('Restore chain for backup #%d contains a cycle.', $backup->ID));
            }
            $visited[$current->ID] = true;

            if ($current->BackupStatus !== 'Completed') {
                throw new RuntimeException(sprintf('Backup #%d is not completed and cannot be restored.', $current->ID));
            }

            $this->assertBackupFileIntegrity($current);
            $chain[] = $current;
            $current = $current->BaseBackupID
                ? DatabaseBackup::query()->find($current->BaseBackupID)
                : null;
        }

        $ordered = array_reverse($chain);
        $this->assertRestoreChainContinuity($ordered);

        return $ordered;
    }

    private function truncateTrackedTables(ConnectionInterface $connection, array $tables): void {
        foreach (array_reverse($tables) as $table) {
            $connection->table($table)->truncate();
        }
    }

    private function importSnapshotPayload(ConnectionInterface $connection, array $payload, array $tables, bool $applyCorrectionUpserts = true): void {
        $data = $payload['data'] ?? [];
        foreach ($tables as $table) {
            $rows = $data[$table] ?? [];
            $this->insertRows($connection, $table, $rows);
        }

        if ($applyCorrectionUpserts) {
            foreach (self::RESTORE_CORRECTION_TABLES as $table) {
                $rows = $data[$table] ?? [];
                $this->upsertRows($connection, $table, $rows);
            }
        }
    }

    private function applyIncrementalPayload(ConnectionInterface $connection, array $payload): void {
        foreach (($payload['changes'] ?? []) as $change) {
            $table = $change['table'] ?? null;
            $rowData = $change['rowData'] ?? null;
            if (!$table || !is_array($rowData)) {
                continue;
            }

            $primaryKey = $this->primaryKeyForTable($connection, $table, $rowData);
            $recordId = Arr::get($rowData, $primaryKey);
            if ($recordId === null) {
                continue;
            }

            if (($change['action'] ?? null) === 'Delete') {
                $connection->table($table)->where($primaryKey, $recordId)->delete();
                continue;
            }

            $this->upsertRows($connection, $table, [$rowData]);
        }
    }

    private function insertRows(ConnectionInterface $connection, string $table, array $rows): void {
        if (empty($rows)) {
            return;
        }

        foreach (array_chunk(array_map(fn ($row) => $this->normalizeRow($row), $rows), 200) as $chunk) {
            $connection->table($table)->insert($chunk);
        }
    }

    private function upsertRows(ConnectionInterface $connection, string $table, array $rows): void {
        if (empty($rows)) {
            return;
        }

        $normalizedRows = array_map(fn ($row) => $this->normalizeRow($row), $rows);
        $primaryKey = $this->primaryKeyForTable($connection, $table, $normalizedRows[0] ?? []);
        $updateColumns = array_values(array_filter(array_keys($normalizedRows[0] ?? []), fn ($column) => $column !== $primaryKey));

        foreach (array_chunk($normalizedRows, 200) as $chunk) {
            $connection->table($table)->upsert($chunk, [$primaryKey], $updateColumns);
        }
    }

    private function normalizeRow(array $row): array {
        return collect($row)->map(function ($value) {
            if ($value instanceof \DateTimeInterface) {
                return $value->format(DATE_ATOM);
            }
            return $value;
        })->all();
    }

    private function primaryKeyForTable(ConnectionInterface $connection, string $table, array $row = []): string {
        if (array_key_exists('ID', $row)) {
            return 'ID';
        }
        if (array_key_exists('id', $row)) {
            return 'id';
        }

        return $connection->selectOne("SHOW KEYS FROM `{$table}` WHERE Key_name = 'PRIMARY'")?->Column_name ?? 'ID';
    }

    private function latestChangeLogId(): int {
        return (int) (DatabaseBackupChange::query()->max('ID') ?? 0);
    }

    private function normalizeNotes(?string $notes): ?string {
        $normalized = trim((string) $notes);
        return $normalized === '' ? null : $normalized;
    }

    private function applyRestoreChain(DatabaseBackup $backup): void {
        $chain = $this->restoreChain($backup);
        $this->applyRestoreChainToConnection(DB::connection(), $chain, true);
    }

    private function applyRestoreChainToConnection(ConnectionInterface $connection, array $chain, bool $resetChangeLog): void {
        $snapshot = $chain[0] ?? null;
        if (!$snapshot || $snapshot->BackupType !== 'Snapshot') {
            throw new RuntimeException('A snapshot backup is required at the start of the restore chain.');
        }

        $snapshotPayload = $this->loadPayload($snapshot);
        $tables = $this->trackedTables();

        $connection->statement('SET FOREIGN_KEY_CHECKS=0');
        try {
            $this->truncateTrackedTables($connection, $tables);
            $this->importSnapshotPayload($connection, $snapshotPayload, $tables, $resetChangeLog);

            foreach (array_slice($chain, 1) as $incremental) {
                $this->applyIncrementalPayload($connection, $this->loadPayload($incremental));
            }

            if ($resetChangeLog && in_array('database_backup_changes', $tables, true) === false && $this->tableExists($connection, 'database_backup_changes')) {
                $connection->table('database_backup_changes')->truncate();
            }
        } finally {
            $connection->statement('SET FOREIGN_KEY_CHECKS=1');
        }
    }

    private function assertRestoreChainContinuity(array $chain): void {
        if (empty($chain)) {
            throw new RuntimeException('Restore chain is empty.');
        }

        $expectedSnapshot = $chain[0];
        if ($expectedSnapshot->BackupType !== 'Snapshot') {
            throw new RuntimeException(sprintf('Restore chain must start with a snapshot backup, got %s.', $expectedSnapshot->BackupType));
        }

        for ($index = 1; $index < count($chain); $index++) {
            $previous = $chain[$index - 1];
            $current = $chain[$index];

            if ($current->BackupType !== 'Incremental') {
                throw new RuntimeException(sprintf(
                    'Restore chain backup #%d is invalid: only incrementals may follow the base snapshot.',
                    $current->ID,
                ));
            }

            if ((int) $current->BaseBackupID !== (int) $previous->ID) {
                throw new RuntimeException(sprintf(
                    'Restore chain for backup #%d is broken between backup #%d and backup #%d.',
                    $chain[count($chain) - 1]->ID,
                    $previous->ID,
                    $current->ID,
                ));
            }

            if ($previous->ToChangeLogID !== null && $current->FromChangeLogID !== null
                && (int) $current->FromChangeLogID !== (int) $previous->ToChangeLogID) {
                throw new RuntimeException(sprintf(
                    'Incremental backup #%d does not start from the prior backup change-log position.',
                    $current->ID,
                ));
            }

            if ($current->FromChangeLogID !== null && $current->ToChangeLogID !== null
                && (int) $current->ToChangeLogID < (int) $current->FromChangeLogID) {
                throw new RuntimeException(sprintf(
                    'Incremental backup #%d has an invalid change-log range.',
                    $current->ID,
                ));
            }
        }
    }

    private function assertBackupFileIntegrity(DatabaseBackup $backup): void {
        if (!$backup->FilePath || !Storage::disk('local')->exists($backup->FilePath)) {
            throw new RuntimeException(sprintf('Backup file for #%d is missing.', $backup->ID));
        }

        if ($backup->ChecksumSha256) {
            $absolutePath = Storage::disk('local')->path($backup->FilePath);
            $actualChecksum = hash_file('sha256', $absolutePath);

            if (!hash_equals((string) $backup->ChecksumSha256, (string) $actualChecksum)) {
                throw new RuntimeException(sprintf('Backup file for #%d failed checksum verification.', $backup->ID));
            }
        }
    }

    private function withBackupLock(callable $callback) {
        $lockName = (string) config('database-backups.lock_name', 'mommas_bakeshop_database_backups');
        $timeout = (int) config('database-backups.lock_timeout_seconds', self::LOCK_TIMEOUT_SECONDS);
        $lockAcquired = (int) (DB::selectOne('SELECT GET_LOCK(?, ?) AS lock_acquired', [$lockName, $timeout])->lock_acquired ?? 0);

        if ($lockAcquired !== 1) {
            throw new RuntimeException('Another backup, restore, or cleanup operation is already running.');
        }

        try {
            return $callback();
        } finally {
            DB::selectOne('SELECT RELEASE_LOCK(?) AS lock_released', [$lockName]);
        }
    }

    private function temporaryDatabaseName(string $sourceDatabase): string {
        $cleanSource = preg_replace('/[^a-z0-9_]+/i', '_', $sourceDatabase);
        $suffix = strtolower(Str::random(8));
        return substr("{$cleanSource}_verify_{$suffix}", 0, 64);
    }

    private function tableExists(ConnectionInterface $connection, string $table): bool {
        return $connection
            ->table('information_schema.tables')
            ->where('table_schema', $connection->getDatabaseName())
            ->where('table_name', $table)
            ->exists();
    }

    private function prepareLongRunningOperation(): void {
        if (function_exists('ignore_user_abort')) {
            @ignore_user_abort(true);
        }

        if (function_exists('set_time_limit')) {
            @set_time_limit(0);
        }

        @ini_set('max_execution_time', '0');
        @ini_set('memory_limit', '-1');
    }
}
