<?php
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

DB::listen(function($query) {
    echo "SQL: " . $query->sql . " [" . implode(',', $query->bindings) . "]\n";
});

function runMigration($file) {
    echo "\n--- Running migration: $file ---\n";
    try {
        $migration = require $file;
        $migration->up();
        echo "Success!\n";
    } catch (Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
        // echo "Trace: " . $e->getTraceAsString() . "\n";
        throw $e;
    }
}

try {
    // Schema::dropIfExists('migrations');
    // Schema::create('migrations', function($table) {
    //     $table->increments('id');
    //     $table->string('migration');
    //     $table->integer('batch');
    // });

    runMigration('database/migrations/0001_01_01_000000_create_users_table.php');
    runMigration('database/migrations/0001_01_01_000001_create_cache_table.php');
    runMigration('database/migrations/0001_01_01_000002_create_jobs_table.php');
    runMigration('database/migrations/2026_02_21_000001_build_bakeshops_objects.php');
    runMigration('database/migrations/2026_02_21_000002_build_bakeshops_triggers.php');
    
    echo "\nAll migrations finished successfully!\n";
} catch (Exception $e) {
    echo "\nTerminated due to error.\n";
}
