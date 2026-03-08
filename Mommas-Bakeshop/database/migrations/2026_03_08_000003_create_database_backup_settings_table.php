<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('database_backup_settings', function (Blueprint $table) {
            $table->id('ID');
            $table->unsignedInteger('SnapshotRetentionCount')->default(10);
            $table->unsignedInteger('IncrementalRetentionCount')->default(30);
            $table->boolean('DeleteFailedBackups')->default(false);
            $table->timestamp('DateAdded')->useCurrent();
            $table->timestamp('DateModified')->useCurrent();
        });
    }

    public function down(): void {
        Schema::dropIfExists('database_backup_settings');
    }
};
