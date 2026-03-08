<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
	public function up(): void {
		Schema::create('database_backups', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('UserID')->nullable()->constrained('users', 'id')->nullOnDelete();
			$table->enum('BackupType', ['Snapshot', 'Incremental']);
			$table->enum('BackupStatus', ['Pending', 'Completed', 'Failed'])->default('Pending');
			$table->string('FileName')->nullable();
			$table->string('FilePath')->nullable();
			$table->unsignedBigInteger('FileSizeBytes')->nullable();
			$table->string('ChecksumSha256', 64)->nullable();
			$table->foreignId('BaseBackupID')->nullable()->constrained('database_backups', 'ID')->nullOnDelete();
			$table->unsignedBigInteger('FromChangeLogID')->nullable();
			$table->unsignedBigInteger('ToChangeLogID')->nullable();
			$table->json('TablesIncluded')->nullable();
			$table->json('Summary')->nullable();
			$table->text('FailureMessage')->nullable();
			$table->text('Notes')->nullable();
			$table->timestamp('StartedAt')->nullable();
			$table->timestamp('CompletedAt')->nullable();
			$table->timestamp('DateAdded')->useCurrent();
			$table->timestamp('DateModified')->useCurrent();

			$table->index(['BackupType', 'BackupStatus']);
			$table->index(['CompletedAt']);
		});

		Schema::create('database_backup_changes', function (Blueprint $table) {
			$table->id('ID');
			$table->string('TableName');
			$table->string('RecordID', 191);
			$table->enum('Action', ['Insert', 'Update', 'Delete']);
			$table->json('RowData');
			$table->timestamp('ChangedAt')->useCurrent();

			$table->index(['TableName', 'RecordID']);
			$table->index(['ChangedAt']);
		});
	}

	public function down(): void {
		Schema::dropIfExists('database_backup_changes');
		Schema::dropIfExists('database_backups');
	}
};
