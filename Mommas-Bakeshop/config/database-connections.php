<?php

return [
    'state_file' => 'private/database-connection-state.json',
    'runtime_connection_name' => 'mysql_runtime',
    'test_connection_name' => 'mysql_remote_test',
    'remote_admin_connection_name' => 'mysql_remote_admin',
    'local_test_connection_name' => 'mysql_local_test',
    'local_transfer_connection_name' => 'mysql_local_transfer',
    'remote_transfer_connection_name' => 'mysql_remote_transfer',
    'remote_initialize_connection_name' => 'mysql_remote_initialize',
    'required_tables' => [
        'migrations',
        'users',
        'permissions',
    ],
    'schema_excluded_tables' => [
        'jobs',
        'job_batches',
        'failed_jobs',
        'system_operations',
    ],
    'transfer_excluded_tables' => [
        'migrations',
        'jobs',
        'failed_jobs',
        'job_batches',
        'system_operations',
        'cache',
        'cache_locks',
        'sessions',
        'database_backups',
        'database_backup_changes',
        'database_backup_settings',
    ],
];
