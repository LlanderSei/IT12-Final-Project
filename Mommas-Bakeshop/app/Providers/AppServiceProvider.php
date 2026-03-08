<?php

namespace App\Providers;

use App\Services\DatabaseConnectionManager;
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
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->app->make(DatabaseConnectionManager::class)->bootActiveConnection();
        Vite::prefetch(concurrency: 3);
    }
}
