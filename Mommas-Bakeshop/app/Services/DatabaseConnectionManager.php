<?php

namespace App\Services;

use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class DatabaseConnectionManager {
    private ?array $bootStatus = null;

    public function bootActiveConnection(): array {
        if ($this->bootStatus !== null) {
            return $this->bootStatus;
        }

        $state = $this->state();
        $localConfig = $this->localConnectionConfig();
        $requestedTarget = $state['activeTarget'] ?? 'local';
        $appliedTarget = 'local';
        $runtimeIssue = null;
        $runtimeConfig = $localConfig;

        if ($requestedTarget === 'remote') {
            $remoteConfig = $this->remoteConnectionConfigFromState($state);

            if (!$this->hasCompleteRemoteConfig($remoteConfig)) {
                $runtimeIssue = 'Remote MySQL connection is incomplete. Fell back to local MySQL.';
            } else {
                try {
                    $inspection = $this->inspectRemoteTarget($remoteConfig);
                    if (($inspection['state'] ?? null) !== 'ready') {
                        throw new RuntimeException($inspection['message']);
                    }

                    $runtimeConfig = $remoteConfig;
                    $appliedTarget = 'remote';
                } catch (Throwable $exception) {
                    $runtimeIssue = 'Remote MySQL connection failed. Fell back to local MySQL. ' . $exception->getMessage();
                }
            }
        }

        $this->applyRuntimeConnection($runtimeConfig);

        return $this->bootStatus = [
            'requestedTarget' => $requestedTarget,
            'appliedTarget' => $appliedTarget,
            'runtimeIssue' => $runtimeIssue,
            'local' => $this->maskConnectionConfig($localConfig),
            'remote' => [
                ...$this->maskConnectionConfig($this->remoteConnectionConfigFromState($state)),
                'hasSavedPassword' => !empty(Arr::get($state, 'remote.password')),
                'lastTestedAt' => Arr::get($state, 'remote.lastTestedAt'),
                'lastTestSucceeded' => Arr::get($state, 'remote.lastTestSucceeded'),
                'lastTestMessage' => Arr::get($state, 'remote.lastTestMessage'),
                'readiness' => Arr::get($state, 'remote.readiness'),
                'schemaReport' => Arr::get($state, 'remote.schemaReport'),
                'lastTransfer' => Arr::get($state, 'remote.lastTransfer'),
                'lastInitializedAt' => Arr::get($state, 'remote.lastInitializedAt'),
                'lastInitializedMessage' => Arr::get($state, 'remote.lastInitializedMessage'),
            ],
            'lastSwitchedAt' => Arr::get($state, 'lastSwitchedAt'),
            'lastSwitchedTarget' => Arr::get($state, 'lastSwitchedTarget'),
        ];
    }

    public function status(): array {
        return $this->bootStatus ?? $this->bootActiveConnection();
    }

    public function saveRemoteConfig(array $attributes): array {
        $state = $this->state();
        $existingPassword = Arr::get($state, 'remote.password');

        $remote = [
            'host' => trim((string) ($attributes['host'] ?? '')),
            'port' => (string) ($attributes['port'] ?? '3306'),
            'database' => trim((string) ($attributes['database'] ?? '')),
            'username' => trim((string) ($attributes['username'] ?? '')),
            'password' => array_key_exists('password', $attributes) && trim((string) $attributes['password']) !== ''
                ? (string) $attributes['password']
                : $existingPassword,
            'lastTestedAt' => null,
            'lastTestSucceeded' => null,
            'lastTestMessage' => null,
            'readiness' => null,
            'schemaReport' => null,
            'lastTransfer' => Arr::get($state, 'remote.lastTransfer'),
            'lastInitializedAt' => null,
            'lastInitializedMessage' => null,
        ];

        $state['remote'] = $remote;
        $this->persistState($state);
        $this->bootStatus = null;

        return $this->status();
    }

    public function testSavedRemoteConnection(): array {
        $state = $this->state();
        $remote = $this->remoteConnectionConfigFromState($state);

        if (!$this->hasCompleteRemoteConfig($remote)) {
            throw new RuntimeException('Remote MySQL settings are incomplete.');
        }

        $inspection = $this->inspectRemoteTarget($remote);
        $state['remote']['lastTestedAt'] = now()->toIso8601String();
        $state['remote']['lastTestSucceeded'] = (bool) ($inspection['reachable'] ?? false);
        $state['remote']['lastTestMessage'] = $inspection['message'];
        $state['remote']['readiness'] = $inspection;
        $this->persistState($state);
        $this->bootStatus = null;

        return $inspection;
    }

    public function runSchemaCompatibilityReport(): array {
        $state = $this->state();
        $remoteConfig = $this->remoteConnectionConfigFromState($state);

        if (!$this->hasCompleteRemoteConfig($remoteConfig)) {
            throw new RuntimeException('Remote MySQL settings are incomplete.');
        }

        $localConnection = $this->testConnectionConfig(
            $this->localConnectionConfig(),
            (string) config('database-connections.local_test_connection_name', 'mysql_local_test'),
            false,
        );
        $inspection = $this->inspectRemoteTarget($remoteConfig);

        if (($inspection['databaseExists'] ?? false) !== true) {
            $report = $this->buildMissingRemoteDatabaseReport($localConnection, $remoteConfig);
        } else {
            $remoteConnection = $this->testConnectionConfig(
                $remoteConfig,
                (string) config('database-connections.test_connection_name', 'mysql_remote_test'),
                false,
            );

            $report = $this->buildSchemaCompatibilityReport($localConnection, $remoteConnection);
        }

        $state['remote']['schemaReport'] = $report;
        $state['remote']['readiness'] = $inspection;
        $this->persistState($state);
        $this->bootStatus = null;

        return $report;
    }

    public function initializeRemoteDatabase(): array {
        $this->prepareLongRunningOperation();
        $state = $this->state();
        $remoteConfig = $this->remoteConnectionConfigFromState($state);

        if (!$this->hasCompleteRemoteConfig($remoteConfig)) {
            throw new RuntimeException('Remote MySQL settings are incomplete.');
        }

        $inspection = $this->inspectRemoteTarget($remoteConfig);
        if (($inspection['state'] ?? null) === 'ready') {
            $report = $this->runSchemaCompatibilityReport();
            if ($report['compatible'] ?? false) {
                throw new RuntimeException('Remote database is already initialized and schema-compatible. Use data transfer instead of initialization.');
            }
        }

        $adminConnection = $this->remoteAdminConnection($remoteConfig);
        $databaseName = (string) $remoteConfig['database'];

        if ($this->databaseExists($adminConnection, $databaseName)) {
            $this->purgeRemoteConnectionNames();
            $adminConnection->statement('DROP DATABASE ' . $this->quoteIdentifier($databaseName));
        }
        $adminConnection->statement('CREATE DATABASE ' . $this->quoteIdentifier($databaseName) . ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');

        $remoteConnectionName = (string) config('database-connections.remote_initialize_connection_name', 'mysql_remote_initialize');
        $this->testConnectionConfig($remoteConfig, $remoteConnectionName, false);

        $migrateExit = Artisan::call('migrate', [
            '--database' => $remoteConnectionName,
            '--force' => true,
        ]);
        if ($migrateExit !== 0) {
            throw new RuntimeException(trim(Artisan::output()) !== '' ? trim(Artisan::output()) : 'Remote migration failed.');
        }

        $seedExit = Artisan::call('db:seed', [
            '--database' => $remoteConnectionName,
            '--class' => 'Database\\Seeders\\DatabaseSeeder',
            '--force' => true,
        ]);
        if ($seedExit !== 0) {
            throw new RuntimeException(trim(Artisan::output()) !== '' ? trim(Artisan::output()) : 'Remote seeding failed.');
        }

        $inspection = $this->inspectRemoteTarget($remoteConfig);
        $report = $this->runSchemaCompatibilityReport();

        $result = [
            'initializedAt' => now()->toIso8601String(),
            'database' => $databaseName,
            'message' => sprintf(
                'Remote database %s was rebuilt and migrations plus seeders were applied successfully.',
                $databaseName,
            ),
            'readiness' => $inspection,
            'schemaReport' => $report,
        ];

        $state = $this->state();
        $state['remote']['lastInitializedAt'] = $result['initializedAt'];
        $state['remote']['lastInitializedMessage'] = $result['message'];
        $state['remote']['readiness'] = $inspection;
        $state['remote']['schemaReport'] = $report;
        $this->persistState($state);
        $this->bootStatus = null;

        return $result;
    }

    public function activateTarget(string $target): array {
        $target = strtolower(trim($target));
        if (!in_array($target, ['local', 'remote'], true)) {
            throw new RuntimeException('Invalid database target.');
        }

        $state = $this->state();
        if ($target === 'remote') {
            $remote = $this->remoteConnectionConfigFromState($state);
            if (!$this->hasCompleteRemoteConfig($remote)) {
                throw new RuntimeException('Remote MySQL settings are incomplete.');
            }

            $inspection = $this->inspectRemoteTarget($remote);
            if (($inspection['state'] ?? null) === 'database_missing') {
                throw new RuntimeException('Remote database does not exist yet. Initialize the remote database first.');
            }
            if (($inspection['state'] ?? null) === 'schema_missing') {
                throw new RuntimeException('Remote database schema is incomplete. Initialize the remote database or run migrations there first.');
            }

            $report = $this->runSchemaCompatibilityReport();
            if (!($report['compatible'] ?? false)) {
                throw new RuntimeException('Remote MySQL schema is not compatible with the local schema. Run and review the schema report before switching.');
            }
        }

        $state = $this->state();
        $state['activeTarget'] = $target;
        $state['lastSwitchedAt'] = now()->toIso8601String();
        $state['lastSwitchedTarget'] = $target;
        $this->persistState($state);
        $this->bootStatus = null;

        return $this->status();
    }

    public function transferLocalDataToRemote(): array {
        $this->prepareLongRunningOperation();
        $state = $this->state();
        $remoteConfig = $this->remoteConnectionConfigFromState($state);

        if (!$this->hasCompleteRemoteConfig($remoteConfig)) {
            throw new RuntimeException('Remote MySQL settings are incomplete.');
        }

        $inspection = $this->inspectRemoteTarget($remoteConfig);
        if (($inspection['state'] ?? null) === 'database_missing') {
            throw new RuntimeException('Remote database does not exist yet. Initialize the remote database first.');
        }
        if (($inspection['state'] ?? null) === 'schema_missing') {
            throw new RuntimeException('Remote schema is incomplete. Initialize the remote database first.');
        }

        $report = $this->runSchemaCompatibilityReport();
        if (!($report['compatible'] ?? false)) {
            throw new RuntimeException('Remote MySQL schema is not compatible. Fix the schema report findings before transferring data.');
        }

        $localConnection = $this->testConnectionConfig(
            $this->localConnectionConfig(),
            (string) config('database-connections.local_transfer_connection_name', 'mysql_local_transfer'),
            false,
        );
        $remoteConnection = $this->testConnectionConfig(
            $remoteConfig,
            (string) config('database-connections.remote_transfer_connection_name', 'mysql_remote_transfer'),
            false,
        );

        $tables = $this->transferTables($localConnection);
        $remoteTriggerDefinitions = $this->fetchTriggerDefinitions($remoteConnection);
        $copiedRows = [];

        try {
            $remoteConnection->statement('SET FOREIGN_KEY_CHECKS=0');
            $this->dropTriggers($remoteConnection, array_keys($remoteTriggerDefinitions));

            foreach (array_reverse($tables) as $table) {
                $remoteConnection->statement('TRUNCATE TABLE ' . $this->quoteIdentifier($table));
            }

            foreach ($tables as $table) {
                $rows = $localConnection->table($table)->get()->map(fn ($row) => (array) $row)->all();
                $copiedRows[$table] = count($rows);

                if (empty($rows)) {
                    continue;
                }

                foreach (array_chunk($rows, 250) as $chunk) {
                    $remoteConnection->table($table)->insert($chunk);
                }
            }
        } catch (Throwable $exception) {
            throw new RuntimeException('Local-to-remote transfer failed. ' . $exception->getMessage(), 0, $exception);
        } finally {
            try {
                $this->restoreTriggers($remoteConnection, $remoteTriggerDefinitions);
            } finally {
                $remoteConnection->statement('SET FOREIGN_KEY_CHECKS=1');
            }
        }

        $result = [
            'transferredAt' => now()->toIso8601String(),
            'tableCount' => count($tables),
            'rowCount' => array_sum($copiedRows),
            'tables' => $copiedRows,
            'remoteDatabase' => $remoteConnection->getDatabaseName(),
            'message' => sprintf(
                'Transferred %d rows across %d tables from local MySQL to remote MySQL.',
                array_sum($copiedRows),
                count($tables),
            ),
        ];

        $state = $this->state();
        $state['remote']['lastTransfer'] = $result;
        $this->persistState($state);
        $this->bootStatus = null;

        return $result;
    }

    public function remoteFormDefaults(): array {
        $status = $this->status();

        return [
            'host' => Arr::get($status, 'remote.host', ''),
            'port' => Arr::get($status, 'remote.port', '3306'),
            'database' => Arr::get($status, 'remote.database', ''),
            'username' => Arr::get($status, 'remote.username', ''),
            'password' => '',
            'hasSavedPassword' => (bool) Arr::get($status, 'remote.hasSavedPassword', false),
        ];
    }

    private function inspectRemoteTarget(array $remoteConfig): array {
        $adminConnection = $this->remoteAdminConnection($remoteConfig);
        $serverVersion = $adminConnection->selectOne('SELECT VERSION() AS version')?->version;
        $databaseName = (string) ($remoteConfig['database'] ?? '');

        if (!$this->databaseExists($adminConnection, $databaseName)) {
            return [
                'state' => 'database_missing',
                'reachable' => true,
                'databaseExists' => false,
                'missingTables' => [],
                'serverVersion' => $serverVersion,
                'message' => sprintf(
                    'Remote MySQL server is reachable, but database %s does not exist yet. Initialize the remote database to create it and run migrations.',
                    $databaseName,
                ),
            ];
        }

        $remoteConnection = $this->testConnectionConfig(
            $remoteConfig,
            (string) config('database-connections.test_connection_name', 'mysql_remote_test'),
            false,
        );
        $missingTables = $this->missingRequiredTables($remoteConnection);

        if (!empty($missingTables)) {
            return [
                'state' => 'schema_missing',
                'reachable' => true,
                'databaseExists' => true,
                'missingTables' => $missingTables,
                'serverVersion' => $serverVersion,
                'message' => 'Remote MySQL database is reachable, but the application schema is incomplete. Missing required tables: ' . implode(', ', $missingTables) . '. Initialize the remote database or run migrations there.',
            ];
        }

        return [
            'state' => 'ready',
            'reachable' => true,
            'databaseExists' => true,
            'missingTables' => [],
            'serverVersion' => $serverVersion,
            'message' => sprintf(
                'Remote MySQL connection succeeded for %s:%s / %s and the required tables are present.',
                $remoteConfig['host'],
                $remoteConfig['port'],
                $remoteConfig['database'],
            ),
        ];
    }

    private function remoteAdminConnection(array $remoteConfig): ConnectionInterface {
        $connectionName = (string) config('database-connections.remote_admin_connection_name', 'mysql_remote_admin');
        $adminConfig = [
            ...$remoteConfig,
            'database' => 'information_schema',
        ];

        return $this->testConnectionConfig($adminConfig, $connectionName, false);
    }

    private function prepareLongRunningOperation(): void {
        if (function_exists('ignore_user_abort')) {
            ignore_user_abort(true);
        }

        if (function_exists('set_time_limit')) {
            @set_time_limit(0);
        }

        @ini_set('max_execution_time', '0');
    }

    private function applyRuntimeConnection(array $connectionConfig): void {
        $runtimeConnectionName = (string) config('database-connections.runtime_connection_name', 'mysql_runtime');

        Config::set("database.connections.{$runtimeConnectionName}", $connectionConfig);
        Config::set('database.default', $runtimeConnectionName);

        DB::purge($runtimeConnectionName);
        DB::setDefaultConnection($runtimeConnectionName);
    }

    private function testConnectionConfig(array $connectionConfig, string $connectionName, bool $validateSchema): ConnectionInterface {
        Config::set("database.connections.{$connectionName}", $connectionConfig);
        DB::purge($connectionName);

        $connection = DB::connection($connectionName);
        $connection->getPdo();

        if ($validateSchema) {
            $this->assertRequiredTables($connection);
        }

        return $connection;
    }

    private function buildSchemaCompatibilityReport(ConnectionInterface $localConnection, ConnectionInterface $remoteConnection): array {
        $localTables = $this->schemaTables($localConnection);
        $remoteTables = $this->schemaTables($remoteConnection);

        $missingTablesOnRemote = array_values(array_diff($localTables, $remoteTables));
        $extraTablesOnRemote = array_values(array_diff($remoteTables, $localTables));
        $commonTables = array_values(array_intersect($localTables, $remoteTables));
        $tableDiffs = [];

        foreach ($commonTables as $table) {
            $localColumns = $this->columnsByName($localConnection, $table);
            $remoteColumns = $this->columnsByName($remoteConnection, $table);

            $missingColumns = array_values(array_diff(array_keys($localColumns), array_keys($remoteColumns)));
            $extraColumns = array_values(array_diff(array_keys($remoteColumns), array_keys($localColumns)));
            $changedColumns = [];

            foreach (array_intersect(array_keys($localColumns), array_keys($remoteColumns)) as $columnName) {
                if ($localColumns[$columnName] !== $remoteColumns[$columnName]) {
                    $changedColumns[] = [
                        'column' => $columnName,
                        'local' => $localColumns[$columnName],
                        'remote' => $remoteColumns[$columnName],
                    ];
                }
            }

            if (!empty($missingColumns) || !empty($extraColumns) || !empty($changedColumns)) {
                $tableDiffs[] = [
                    'table' => $table,
                    'missingColumns' => $missingColumns,
                    'extraColumns' => $extraColumns,
                    'changedColumns' => $changedColumns,
                ];
            }
        }

        $compatible = empty($missingTablesOnRemote)
            && empty($extraTablesOnRemote)
            && empty($tableDiffs);

        return [
            'checkedAt' => now()->toIso8601String(),
            'compatible' => $compatible,
            'localDatabase' => $localConnection->getDatabaseName(),
            'remoteDatabase' => $remoteConnection->getDatabaseName(),
            'remoteDatabaseExists' => true,
            'localTableCount' => count($localTables),
            'remoteTableCount' => count($remoteTables),
            'missingTablesOnRemote' => $missingTablesOnRemote,
            'extraTablesOnRemote' => $extraTablesOnRemote,
            'tableDiffs' => $tableDiffs,
            'differingTableCount' => count($tableDiffs),
            'summary' => $compatible
                ? 'Remote MySQL schema matches the local schema for all application tables.'
                : sprintf(
                    'Found %d missing tables, %d extra tables, and %d tables with column differences.',
                    count($missingTablesOnRemote),
                    count($extraTablesOnRemote),
                    count($tableDiffs),
                ),
        ];
    }

    private function buildMissingRemoteDatabaseReport(ConnectionInterface $localConnection, array $remoteConfig): array {
        $localTables = $this->schemaTables($localConnection);

        return [
            'checkedAt' => now()->toIso8601String(),
            'compatible' => false,
            'localDatabase' => $localConnection->getDatabaseName(),
            'remoteDatabase' => $remoteConfig['database'],
            'remoteDatabaseExists' => false,
            'localTableCount' => count($localTables),
            'remoteTableCount' => 0,
            'missingTablesOnRemote' => $localTables,
            'extraTablesOnRemote' => [],
            'tableDiffs' => [],
            'differingTableCount' => 0,
            'summary' => sprintf(
                'Remote database %s does not exist yet. Initialize the remote database to create it and apply migrations.',
                $remoteConfig['database'],
            ),
        ];
    }

    private function assertRequiredTables(ConnectionInterface $connection): void {
        $missingTables = $this->missingRequiredTables($connection);

        if (!empty($missingTables)) {
            throw new RuntimeException('Remote MySQL schema is missing required tables: ' . implode(', ', $missingTables));
        }
    }

    private function missingRequiredTables(ConnectionInterface $connection): array {
        $requiredTables = config('database-connections.required_tables', []);
        $missingTables = [];

        foreach ($requiredTables as $table) {
            if (!$this->tableExists($connection, $table)) {
                $missingTables[] = $table;
            }
        }

        return $missingTables;
    }

    private function hasCompleteRemoteConfig(array $remoteConfig): bool {
        return collect(['host', 'port', 'database', 'username', 'password'])
            ->every(fn ($key) => trim((string) ($remoteConfig[$key] ?? '')) !== '');
    }

    private function localConnectionConfig(): array {
        $baseDefault = env('DB_CONNECTION', config('database.default', 'mysql'));
        $baseConnectionName = in_array($baseDefault, ['mysql', 'mariadb'], true) ? $baseDefault : 'mysql';
        $baseConnection = config("database.connections.{$baseConnectionName}");

        if (!is_array($baseConnection) || !in_array(($baseConnection['driver'] ?? null), ['mysql', 'mariadb'], true)) {
            throw new RuntimeException('Phase 3 database switching requires a local MySQL or MariaDB base connection.');
        }

        return [
            ...$baseConnection,
            'driver' => 'mysql',
        ];
    }

    private function remoteConnectionConfigFromState(array $state): array {
        $local = $this->localConnectionConfig();
        $remote = Arr::get($state, 'remote', []);

        return [
            ...$local,
            'driver' => 'mysql',
            'host' => trim((string) ($remote['host'] ?? '')),
            'port' => (string) ($remote['port'] ?? '3306'),
            'database' => trim((string) ($remote['database'] ?? '')),
            'username' => trim((string) ($remote['username'] ?? '')),
            'password' => (string) ($remote['password'] ?? ''),
        ];
    }

    private function state(): array {
        $path = (string) config('database-connections.state_file');

        if (!Storage::disk('local')->exists($path)) {
            return $this->defaultState();
        }

        $encrypted = Storage::disk('local')->get($path);

        try {
            $decoded = json_decode(Crypt::decryptString($encrypted), true);
        } catch (Throwable) {
            return $this->defaultState();
        }

        if (!is_array($decoded)) {
            return $this->defaultState();
        }

        return array_replace_recursive($this->defaultState(), $decoded);
    }

    private function persistState(array $state): void {
        $path = (string) config('database-connections.state_file');
        Storage::disk('local')->makeDirectory(trim(dirname($path), '.\\/'));
        Storage::disk('local')->put($path, Crypt::encryptString(json_encode($state, JSON_UNESCAPED_SLASHES)));
    }

    private function defaultState(): array {
        return [
            'activeTarget' => 'local',
            'lastSwitchedAt' => null,
            'lastSwitchedTarget' => 'local',
            'remote' => [
                'host' => '',
                'port' => '3306',
                'database' => '',
                'username' => '',
                'password' => '',
                'lastTestedAt' => null,
                'lastTestSucceeded' => null,
                'lastTestMessage' => null,
                'readiness' => null,
                'schemaReport' => null,
                'lastTransfer' => null,
                'lastInitializedAt' => null,
                'lastInitializedMessage' => null,
            ],
        ];
    }

    private function maskConnectionConfig(array $config): array {
        return [
            'host' => $config['host'] ?? '',
            'port' => (string) ($config['port'] ?? ''),
            'database' => $config['database'] ?? '',
            'username' => $config['username'] ?? '',
        ];
    }

    private function tableExists(ConnectionInterface $connection, string $table): bool {
        return $connection
            ->table('information_schema.tables')
            ->where('table_schema', $connection->getDatabaseName())
            ->where('table_name', $table)
            ->exists();
    }

    private function databaseExists(ConnectionInterface $connection, string $database): bool {
        return $connection
            ->table('information_schema.schemata')
            ->where('schema_name', $database)
            ->exists();
    }

    private function schemaTables(ConnectionInterface $connection): array {
        return $connection
            ->table('information_schema.tables')
            ->selectRaw('TABLE_NAME as table_name')
            ->where('TABLE_SCHEMA', $connection->getDatabaseName())
            ->where('TABLE_TYPE', 'BASE TABLE')
            ->orderBy('TABLE_NAME')
            ->pluck('table_name')
            ->map(fn ($table) => (string) $table)
            ->values()
            ->all();
    }

    private function columnsByName(ConnectionInterface $connection, string $table): array {
        return $connection
            ->table('information_schema.columns')
            ->selectRaw('COLUMN_NAME as column_name, COLUMN_TYPE as column_type, IS_NULLABLE as is_nullable, COLUMN_DEFAULT as column_default, EXTRA as extra, COLUMN_KEY as column_key')
            ->where('TABLE_SCHEMA', $connection->getDatabaseName())
            ->where('TABLE_NAME', $table)
            ->orderBy('ORDINAL_POSITION')
            ->get()
            ->mapWithKeys(fn ($column) => [
                (string) $column->column_name => [
                    'type' => (string) $column->column_type,
                    'nullable' => (string) $column->is_nullable,
                    'default' => $column->column_default,
                    'extra' => (string) $column->extra,
                    'key' => (string) $column->column_key,
                ],
            ])
            ->all();
    }

    private function transferTables(ConnectionInterface $localConnection): array {
        $excluded = config('database-connections.transfer_excluded_tables', []);

        return array_values(array_filter(
            $this->schemaTables($localConnection),
            fn ($table) => !in_array($table, $excluded, true),
        ));
    }

    private function fetchTriggerDefinitions(ConnectionInterface $connection): array {
        $triggerNames = $connection
            ->table('information_schema.triggers')
            ->selectRaw('TRIGGER_NAME as trigger_name')
            ->where('TRIGGER_SCHEMA', $connection->getDatabaseName())
            ->orderBy('TRIGGER_NAME')
            ->pluck('trigger_name')
            ->map(fn ($name) => (string) $name)
            ->values()
            ->all();

        $definitions = [];

        foreach ($triggerNames as $triggerName) {
            $result = $connection->selectOne('SHOW CREATE TRIGGER ' . $this->quoteIdentifier($triggerName));
            if (!$result) {
                continue;
            }

            $statement = collect(get_object_vars($result))
                ->first(fn ($value, $key) => str_contains(strtolower((string) $key), 'statement'));

            if ($statement) {
                $definitions[$triggerName] = (string) $statement;
            }
        }

        return $definitions;
    }

    private function dropTriggers(ConnectionInterface $connection, array $triggerNames): void {
        foreach ($triggerNames as $triggerName) {
            $connection->unprepared('DROP TRIGGER IF EXISTS ' . $this->quoteIdentifier($triggerName));
        }
    }

    private function restoreTriggers(ConnectionInterface $connection, array $triggerDefinitions): void {
        if (empty($triggerDefinitions)) {
            return;
        }

        foreach ($triggerDefinitions as $triggerName => $definition) {
            $connection->unprepared('DROP TRIGGER IF EXISTS ' . $this->quoteIdentifier($triggerName));
            $connection->unprepared($definition);
        }
    }

    private function quoteIdentifier(string $identifier): string {
        return '`' . str_replace('`', '``', $identifier) . '`';
    }

    private function purgeRemoteConnectionNames(): void {
        $connectionNames = [
            config('database-connections.test_connection_name', 'mysql_remote_test'),
            config('database-connections.remote_admin_connection_name', 'mysql_remote_admin'),
            config('database-connections.remote_transfer_connection_name', 'mysql_remote_transfer'),
            config('database-connections.remote_initialize_connection_name', 'mysql_remote_initialize'),
            config('database-connections.runtime_connection_name', 'mysql_runtime'),
        ];

        foreach ($connectionNames as $connectionName) {
            DB::purge((string) $connectionName);
        }
    }
}
