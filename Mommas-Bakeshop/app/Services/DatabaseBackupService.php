<?php

namespace App\Services;

use App\Models\DatabaseBackup;
use App\Models\DatabaseBackupChange;
use App\Models\DatabaseBackupSetting;
use App\Models\User;
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
        $tables = $this->trackedTables();
        $backup = $this->createPendingBackup('Snapshot', $user, $notes, $tables);

        try {
            $toChangeLogId = $this->latestChangeLogId();
            $databaseName = DB::getDatabaseName();
            $summary = [];
            $data = [];

            foreach ($tables as $table) {
                $rows = DB::table($table)->get()->map(fn ($row) => $this->normalizeRow((array) $row))->all();
                $data[$table] = $rows;
                $summary[$table] = count($rows);
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

    public function createIncremental(?User $user = null, ?string $notes = null): DatabaseBackup {
        $tables = $this->trackedTables();
        $latestCompleted = DatabaseBackup::query()
            ->where('BackupStatus', 'Completed')
            ->orderByDesc('CompletedAt')
            ->orderByDesc('ID')
            ->first();

        if (!$latestCompleted) {
            throw new RuntimeException('Create a snapshot backup first before generating incrementals.');
        }

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
        $chain = $this->restoreChain($backup);
        $snapshot = $chain[0] ?? null;
        if (!$snapshot || $snapshot->BackupType !== 'Snapshot') {
            throw new RuntimeException('A snapshot backup is required at the start of the restore chain.');
        }

        $snapshotPayload = $this->loadPayload($snapshot);
        $tables = $this->trackedTables();

        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        try {
            $this->truncateTrackedTables($tables);
            $this->importSnapshotPayload($snapshotPayload, $tables);

            foreach (array_slice($chain, 1) as $incremental) {
                $this->applyIncrementalPayload($this->loadPayload($incremental));
            }

            DB::table('database_backup_changes')->truncate();
        } catch (Throwable $exception) {
            throw $exception;
        } finally {
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        }

        $restoreNotes = trim(collect([
            'Post-restore baseline',
            'restored from backup #' . $backup->ID,
            $notes,
        ])->filter()->implode(' | '));

        return $this->createSnapshot($user, $restoreNotes);
    }

    public function cleanupBackups(?DatabaseBackupSetting $settings = null): array {
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
    }

    public function downloadResponse(DatabaseBackup $backup) {
        if (!$backup->FilePath || !Storage::disk('local')->exists($backup->FilePath)) {
            throw new RuntimeException('Backup file is missing from local storage.');
        }

        return Storage::disk('local')->download($backup->FilePath, $backup->FileName ?: basename($backup->FilePath));
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

        $decoded = json_decode(Storage::disk('local')->get($backup->FilePath), true);
        if (!is_array($decoded)) {
            throw new RuntimeException(sprintf('Backup file for #%d is invalid JSON.', $backup->ID));
        }

        return $decoded;
    }

    private function restoreChain(DatabaseBackup $backup): array {
        $chain = [];
        $current = $backup->fresh(['baseBackup']);

        while ($current) {
            if ($current->BackupStatus !== 'Completed') {
                throw new RuntimeException(sprintf('Backup #%d is not completed and cannot be restored.', $current->ID));
            }

            $chain[] = $current;
            $current = $current->BaseBackupID
                ? DatabaseBackup::query()->find($current->BaseBackupID)
                : null;
        }

        return array_reverse($chain);
    }

    private function truncateTrackedTables(array $tables): void {
        foreach (array_reverse($tables) as $table) {
            DB::table($table)->truncate();
        }
    }

    private function importSnapshotPayload(array $payload, array $tables): void {
        $data = $payload['data'] ?? [];
        foreach ($tables as $table) {
            $rows = $data[$table] ?? [];
            $this->insertRows($table, $rows);
        }

        foreach (self::RESTORE_CORRECTION_TABLES as $table) {
            $rows = $data[$table] ?? [];
            $this->upsertRows($table, $rows);
        }
    }

    private function applyIncrementalPayload(array $payload): void {
        foreach (($payload['changes'] ?? []) as $change) {
            $table = $change['table'] ?? null;
            $rowData = $change['rowData'] ?? null;
            if (!$table || !is_array($rowData)) {
                continue;
            }

            $primaryKey = $this->primaryKeyForTable($table, $rowData);
            $recordId = Arr::get($rowData, $primaryKey);
            if ($recordId === null) {
                continue;
            }

            if (($change['action'] ?? null) === 'Delete') {
                DB::table($table)->where($primaryKey, $recordId)->delete();
                continue;
            }

            $this->upsertRows($table, [$rowData]);
        }
    }

    private function insertRows(string $table, array $rows): void {
        if (empty($rows)) {
            return;
        }

        foreach (array_chunk(array_map(fn ($row) => $this->normalizeRow($row), $rows), 200) as $chunk) {
            DB::table($table)->insert($chunk);
        }
    }

    private function upsertRows(string $table, array $rows): void {
        if (empty($rows)) {
            return;
        }

        $normalizedRows = array_map(fn ($row) => $this->normalizeRow($row), $rows);
        $primaryKey = $this->primaryKeyForTable($table, $normalizedRows[0] ?? []);
        $updateColumns = array_values(array_filter(array_keys($normalizedRows[0] ?? []), fn ($column) => $column !== $primaryKey));

        foreach (array_chunk($normalizedRows, 200) as $chunk) {
            DB::table($table)->upsert($chunk, [$primaryKey], $updateColumns);
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

    private function primaryKeyForTable(string $table, array $row = []): string {
        if (array_key_exists('ID', $row)) {
            return 'ID';
        }
        if (array_key_exists('id', $row)) {
            return 'id';
        }

        return DB::selectOne("SHOW KEYS FROM `{$table}` WHERE Key_name = 'PRIMARY'")?->Column_name ?? 'ID';
    }

    private function latestChangeLogId(): int {
        return (int) (DatabaseBackupChange::query()->max('ID') ?? 0);
    }

    private function normalizeNotes(?string $notes): ?string {
        $normalized = trim((string) $notes);
        return $normalized === '' ? null : $normalized;
    }
}
