<?php

return [
	'host' => env('DESKTOP_HOST', '127.0.0.1'),
	'port' => (int) env('DESKTOP_PORT', 8123),
	'health_path' => env('DESKTOP_HEALTH_PATH', '/desktop/health'),
	'health_timeout_seconds' => (int) env('DESKTOP_HEALTH_TIMEOUT', 90),
	'managed_mysql' => [
		'enabled' => filter_var(env('DESKTOP_MANAGED_MYSQL', false), FILTER_VALIDATE_BOOL),
		'host' => env('DESKTOP_MYSQL_HOST', '127.0.0.1'),
		'port' => (int) env('DESKTOP_MYSQL_PORT', 3307),
		'database' => env('DESKTOP_MYSQL_DATABASE', 'mommas_bakeshop_desktop'),
		'username' => env('DESKTOP_MYSQL_USERNAME', 'root'),
		'password' => env('DESKTOP_MYSQL_PASSWORD', ''),
		'admin_database' => env('DESKTOP_MYSQL_ADMIN_DATABASE', 'mysql'),
		'data_dir' => env('DESKTOP_MYSQL_DATA_DIR', storage_path('app/private/desktop/mysql/data')),
		'log_dir' => env('DESKTOP_MYSQL_LOG_DIR', storage_path('app/private/desktop/mysql/logs')),
		'pid_file' => env('DESKTOP_MYSQL_PID_FILE', storage_path('app/private/desktop/mysql/mysql.pid')),
	],
];
