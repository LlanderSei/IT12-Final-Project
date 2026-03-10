<?php

namespace App\Console\Commands;

use App\Models\Role;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\File;
use PDO;

class DesktopBootstrapCommand extends Command {
	protected $signature = 'desktop:bootstrap
		{--skip-seed : Skip role and permission seed synchronization}
		{--force : Force bootstrap tasks even in production}';

	protected $description = 'Prepare the local desktop runtime by ensuring env, storage, database, migrations, and core seed data.';

	public function handle(): int {
		$this->ensureEnvFile();
		$this->ensureDesktopDirectories();
		$this->syncDesktopEnvironmentDefaults();
		$this->ensureAppKey();
		$this->ensureManagedMysqlDatabase();
		$this->runMigrations();
		$this->ensureStorageLink();

		if (!$this->option('skip-seed')) {
			$this->seedCoreAccessData();
		}

		$this->info('Desktop bootstrap completed.');
		return self::SUCCESS;
	}

	private function ensureEnvFile(): void {
		$envPath = base_path('.env');
		$examplePath = base_path('.env.example');

		if (File::exists($envPath) || !File::exists($examplePath)) {
			return;
		}

		File::copy($examplePath, $envPath);
		$this->info('Created .env from .env.example');
	}

	private function ensureDesktopDirectories(): void {
		$directories = [
			storage_path('app/private/desktop'),
			storage_path('app/private/desktop/mysql'),
			config('desktop.managed_mysql.data_dir'),
			config('desktop.managed_mysql.log_dir'),
			storage_path('app/private/backups'),
			storage_path('app/public/products'),
		];

		foreach ($directories as $directory) {
			if (!is_string($directory) || $directory === '') {
				continue;
			}

			File::ensureDirectoryExists($directory);
		}
	}

	private function syncDesktopEnvironmentDefaults(): void {
		$managedMysql = config('desktop.managed_mysql');
		if (!is_array($managedMysql)) {
			return;
		}

		$this->upsertEnvValue('APP_URL', sprintf('http://%s:%d', config('desktop.host'), config('desktop.port')));
		$this->upsertEnvValue('DESKTOP_HOST', (string) config('desktop.host'));
		$this->upsertEnvValue('DESKTOP_PORT', (string) config('desktop.port'));

		if (!($managedMysql['enabled'] ?? false)) {
			return;
		}

		$this->upsertEnvValue('DB_CONNECTION', 'mysql');
		$this->upsertEnvValue('DB_HOST', (string) ($managedMysql['host'] ?? '127.0.0.1'));
		$this->upsertEnvValue('DB_PORT', (string) ($managedMysql['port'] ?? 3307));
		$this->upsertEnvValue('DB_DATABASE', (string) ($managedMysql['database'] ?? 'mommas_bakeshop_desktop'));
		$this->upsertEnvValue('DB_USERNAME', (string) ($managedMysql['username'] ?? 'root'));
		$this->upsertEnvValue('DB_PASSWORD', (string) ($managedMysql['password'] ?? ''));
		$this->applyManagedMysqlConfiguration($managedMysql);
	}

	private function ensureAppKey(): void {
		if (config('app.key')) {
			return;
		}

		Artisan::call('key:generate', [
			'--force' => true,
		]);

		$this->line(trim((string) Artisan::output()));
	}

	private function ensureManagedMysqlDatabase(): void {
		$managedMysql = config('desktop.managed_mysql');
		if (!is_array($managedMysql) || !($managedMysql['enabled'] ?? false)) {
			return;
		}

		$host = (string) ($managedMysql['host'] ?? '127.0.0.1');
		$port = (int) ($managedMysql['port'] ?? 3307);
		$database = (string) ($managedMysql['database'] ?? 'mommas_bakeshop_desktop');
		$username = (string) ($managedMysql['username'] ?? 'root');
		$password = (string) ($managedMysql['password'] ?? '');
		$adminDatabase = (string) ($managedMysql['admin_database'] ?? 'mysql');

		$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $host, $port, $adminDatabase);
		$pdo = new PDO($dsn, $username, $password, [
			PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
		]);

		$quotedDatabase = str_replace('`', '``', $database);
		$pdo->exec(sprintf(
			'CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
			$quotedDatabase,
		));
	}

	private function runMigrations(): void {
		Artisan::call('migrate', [
			'--force' => true,
		]);

		$output = trim((string) Artisan::output());
		if ($output !== '') {
			$this->line($output);
		}
	}

	private function ensureStorageLink(): void {
		$publicStoragePath = public_path('storage');

		if (is_link($publicStoragePath) || File::exists($publicStoragePath)) {
			return;
		}

		Artisan::call('storage:link');
		$output = trim((string) Artisan::output());
		if ($output !== '') {
			$this->line($output);
		}
	}

	private function seedCoreAccessData(): void {
		$roles = [
			['RoleName' => 'Owner', 'RoleDescription' => 'Business owner with full access.', 'RoleColor' => '#2563EB', 'RoleRank' => 1],
			['RoleName' => 'Admin', 'RoleDescription' => 'Administrative access for operations.', 'RoleColor' => '#7C3AED', 'RoleRank' => 2],
			['RoleName' => 'Cashier', 'RoleDescription' => 'Sales and payment handling access.', 'RoleColor' => '#F59E0B', 'RoleRank' => 3],
			['RoleName' => 'Clerk', 'RoleDescription' => 'Basic operational access.', 'RoleColor' => '#10B981', 'RoleRank' => 4],
		];

		foreach ($roles as $role) {
			Role::query()->updateOrCreate(
				['RoleName' => $role['RoleName']],
				[
					'RoleDescription' => $role['RoleDescription'],
					'RoleColor' => $role['RoleColor'],
					'RoleRank' => $role['RoleRank'],
					'DateModified' => now(),
				],
			);
		}

		Artisan::call('db:seed', [
			'--class' => 'Database\\Seeders\\PermissionsSeeder',
			'--force' => true,
		]);
		Artisan::call('db:seed', [
			'--class' => 'Database\\Seeders\\RolePermissionSeeder',
			'--force' => true,
		]);

		$output = trim((string) Artisan::output());
		if ($output !== '') {
			$this->line($output);
		}
	}

	private function upsertEnvValue(string $key, string $value): void {
		$path = base_path('.env');
		if (!File::exists($path)) {
			return;
		}

		$content = File::get($path);
		$escapedValue = $this->formatEnvValue($value);
		$pattern = sprintf('/^%s=.*$/m', preg_quote($key, '/'));

		if (preg_match($pattern, $content) === 1) {
			$content = preg_replace($pattern, sprintf('%s=%s', $key, $escapedValue), $content) ?? $content;
		} else {
			$content = rtrim($content) . PHP_EOL . sprintf('%s=%s', $key, $escapedValue) . PHP_EOL;
		}

		File::put($path, $content);
	}

	private function formatEnvValue(string $value): string {
		if ($value === '') {
			return '';
		}

		if (preg_match('/\s/', $value) === 1) {
			return '"' . addcslashes($value, '"') . '"';
		}

		return $value;
	}

	private function applyManagedMysqlConfiguration(array $managedMysql): void {
		Config::set('database.default', 'mysql');
		Config::set('database.connections.mysql.host', (string) ($managedMysql['host'] ?? '127.0.0.1'));
		Config::set('database.connections.mysql.port', (string) ($managedMysql['port'] ?? 3307));
		Config::set('database.connections.mysql.database', (string) ($managedMysql['database'] ?? 'mommas_bakeshop_desktop'));
		Config::set('database.connections.mysql.username', (string) ($managedMysql['username'] ?? 'root'));
		Config::set('database.connections.mysql.password', (string) ($managedMysql['password'] ?? ''));

		DB::purge('mysql');
		DB::reconnect('mysql');
	}
}
