<?php

namespace App\Providers;

use App\Services\DatabaseConnectionManager;
use App\Services\SystemOperationService;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(DatabaseConnectionManager::class, fn () => new DatabaseConnectionManager());
        $this->app->singleton(SystemOperationService::class, fn () => new SystemOperationService());
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $baseDefault = env('DB_CONNECTION', config('database.default', 'mysql'));
        $baseConnectionName = in_array($baseDefault, ['mysql', 'mariadb'], true) ? $baseDefault : 'mysql';
        Config::set('database.connections.mysql_control', config("database.connections.{$baseConnectionName}"));
        Config::set('queue.connections.database.connection', env('DB_QUEUE_CONNECTION', 'mysql_control'));
        Config::set('queue.batching.database', env('DB_QUEUE_CONNECTION', 'mysql_control'));
        Config::set('queue.failed.database', env('DB_QUEUE_CONNECTION', 'mysql_control'));

        $this->app->make(DatabaseConnectionManager::class)->bootActiveConnection();
        Vite::prefetch(concurrency: 3);
    }
}
