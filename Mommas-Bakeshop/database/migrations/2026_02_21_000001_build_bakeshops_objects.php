<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;


return new class extends Migration {
	public function up(): void {
		Schema::create('customers', function (Blueprint $table) {
			$table->id('ID');
			$table->text('CustomerName');
			$table->text('CustomerType');
			$table->text('ContactDetails');
			$table->text('Address');
			$table->timestamp('DateAdded')->useCurrent();
			$table->timestamp('DateModified')->useCurrent();
		});

		Schema::create('permission_groups', function (Blueprint $table) {
			$table->id('ID');
			$table->string('GroupName')->unique();
			$table->text('GroupDescription')->nullable();
			$table->unsignedInteger('DisplayOrder')->default(0);
			$table->timestamp('DateAdded')->useCurrent();
			$table->timestamp('DateModified')->useCurrent();
		});

		Schema::create('permissions', function (Blueprint $table) {
			$table->id('ID');
			$table->string('PermissionName');
			$table->string('PermissionDescription')->nullable();
			$table->foreignId('PermissionGroupID')->nullable()->constrained('permission_groups', 'ID')->nullOnDelete();
			$table->timestamp('DateAdded')->useCurrent();
			$table->timestamp('DateModified')->useCurrent();
		});

		Schema::create('role_preset_permissions', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('RoleID')->constrained('roles', 'ID')->onDelete('cascade');
			$table->foreignId('PermissionID')->constrained('permissions', 'ID')->onDelete('cascade');
			$table->boolean('Allowable')->default(0);
			$table->timestamp('DateAdded')->useCurrent();
			$table->timestamp('DateModified')->useCurrent();
			$table->unique(['RoleID', 'PermissionID'], 'ux_role_preset_permissions_role_permission');
		});

		Schema::create('permissions_set', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('UserID')->constrained('users', 'id')->onDelete('cascade');
			$table->foreignId('PermissionID')->constrained('permissions', 'ID')->onDelete('cascade');
			$table->boolean('Allowable')->default(0);
			$table->timestamp('DateAdded')->useCurrent();
			$table->timestamp('DateModified')->useCurrent();
		});

		Schema::create('audits', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('UserID')->constrained('users', 'id')->onDelete('cascade');
			$table->text('TableEdited');
			$table->text('PreviousChanges')->nullable();
			$table->text('SavedChanges')->nullable();
			$table->text('ReadableChanges')->nullable();
			$table->text('Action');
			$table->enum('Source', ['Application', 'Trigger'])->default('Application');
			$table->timestamp('DateAdded')->useCurrent();
		});

		Schema::create('categories', function (Blueprint $table) {
			$table->id('ID');
			$table->text('CategoryName');
			$table->text('CategoryDescription');
			$table->timestamp('DateAdded')->useCurrent();
			$table->timestamp('DateModified')->useCurrent();
		});

		Schema::create('products', function (Blueprint $table) {
			$table->id('ID');
			$table->text('ProductName');
			$table->text('ProductDescription');
			$table->foreignId('CategoryID')->constrained('categories', 'ID')->onDelete('cascade');
			$table->text('ProductImage')->nullable();
			$table->enum('ProductFrom', ['Produced', 'Purchased', 'Consignment'])->default('Produced'); // e.g. "Owned", "Consignment", "Drop-shipped"
			$table->text('Price');
			$table->unsignedBigInteger('LowStockThreshold')->default(10);
			$table->unsignedBigInteger('Quantity');
			$table->timestamp('DateAdded')->useCurrent();
			$table->timestamp('DateModified')->useCurrent();
		});

		Schema::create('production_batch_details', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('UserID')->constrained('users', 'id')->onDelete('cascade');
			$table->text('BatchDescription')->nullable();
			$table->unsignedBigInteger('TotalProductsProduced')->default(0);
			$table->timestamp('DateAdded')->useCurrent();
		});

		Schema::create('production_batches', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('BatchDetailsID')->constrained('production_batch_details', 'ID')->onDelete('cascade');
			$table->foreignId('ProductID')->constrained('products', 'ID')->onDelete('cascade');
			$table->unsignedBigInteger('QuantityProduced');
			$table->timestamp('DateAdded')->useCurrent();
		});

		Schema::create('product_leftover_snapshots', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('UserID')->constrained('users', 'id')->onDelete('cascade');
			$table->unsignedBigInteger('TotalProducts')->default(0);
			$table->unsignedBigInteger('TotalLeftovers')->default(0);
			$table->decimal('TotalAmount', 12, 2)->default(0);
			$table->timestamp('SnapshotTime')->useCurrent();
		});

		Schema::create('product_leftovers', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('ProductLeftoverID')->constrained('product_leftover_snapshots', 'ID')->onDelete('cascade');
			$table->foreignId('ProductID')->constrained('products', 'ID')->onDelete('cascade');
			$table->unsignedBigInteger('LeftoverQuantity')->default(0);
			$table->decimal('PerUnitAmount', 10, 2)->default(0);
			$table->timestamp('DateAdded')->useCurrent();
			$table->unique(['ProductLeftoverID', 'ProductID'], 'ux_product_leftovers_snapshot_product');
		});

		Schema::create('sales', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('UserID')->constrained('users', 'id')->onDelete('cascade');
			$table->foreignId('CustomerID')->nullable()->constrained('customers', 'ID')->onDelete('cascade');
			$table->string('SaleType', 50)->default('WalkIn')->index();
			$table->decimal('TotalAmount', 10, 2);
			$table->timestamp('DateAdded')->useCurrent();
		});

		Schema::create('payments', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('SalesID')->constrained('sales', 'ID')->onDelete('cascade');
			$table->string('PaymentMethod')->default('Cash');
			$table->decimal('PaidAmount', 10, 2);
			$table->decimal('TotalAmount', 10, 2);
			$table->decimal('Change', 10, 2);
			$table->enum('PaymentStatus', ['Paid', 'Partially Paid', 'Unpaid'])->default('Unpaid');
			$table->string('InvoiceNumber')->nullable()->unique();
			$table->timestamp('InvoiceIssuedAt')->nullable();
			$table->string('ReceiptNumber')->nullable()->unique();
			$table->timestamp('ReceiptIssuedAt')->nullable();
			$table->timestamp('PaymentDueDate')->nullable();
			$table->text('AdditionalDetails')->nullable();
			$table->timestamp('DateAdded')->useCurrent();
		});

		Schema::create('partial_payments', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('SalesID')->references('ID')->on('sales')->onDelete('cascade');
			$table->decimal('PaidAmount', 10, 2);
			$table->string('ReceiptNumber')->nullable()->unique();
			$table->timestamp('ReceiptIssuedAt')->nullable();
			$table->text('PaymentMethod');
			$table->text('AdditionalDetails')->nullable();
			$table->timestamp('DateAdded')->useCurrent();
		});

		Schema::create('sold_products', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('SalesID')->references('ID')->on('sales')->onDelete('cascade');
			$table->foreignId('ProductID')->references('ID')->on('products')->onDelete('cascade');
			$table->decimal('PricePerUnit', 10, 2);
			$table->unsignedBigInteger('Quantity');
			$table->decimal('SubAmount', 10, 2);
		});

		Schema::create('job_orders', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('UserID')->constrained('users', 'id')->onDelete('cascade');
			$table->foreignId('CustomerID')->constrained('customers', 'ID')->onDelete('cascade');
			$table->foreignId('SalesID')->nullable()->constrained('sales', 'ID')->nullOnDelete();
			$table->enum('Status', ['Pending', 'Delivered', 'Cancelled'])->default('Pending')->index();
			$table->timestamp('DeliveryAt');
			$table->text('Notes')->nullable();
			$table->decimal('TotalAmount', 10, 2);
			$table->timestamp('DateAdded')->useCurrent();
			$table->timestamp('DateModified')->useCurrent();
		});

		Schema::create('job_order_items', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('JobOrderID')->constrained('job_orders', 'ID')->onDelete('cascade');
			$table->foreignId('ProductID')->constrained('products', 'ID')->onDelete('cascade');
			$table->decimal('PricePerUnit', 10, 2);
			$table->unsignedBigInteger('Quantity');
			$table->decimal('SubAmount', 10, 2);
		});

		Schema::create('job_order_custom_items', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('JobOrderID')->constrained('job_orders', 'ID')->onDelete('cascade');
			$table->text('CustomOrderDescription');
			$table->unsignedBigInteger('Quantity');
			$table->decimal('PricePerUnit', 10, 2);
		});

		Schema::create('shrinkages', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('UserID')->references('id')->on('users')->onDelete('cascade');
			$table->unsignedBigInteger('Quantity');
			$table->decimal('TotalAmount', 10, 2);
			$table->enum('Reason', ['Spoiled', 'Theft', 'Lost'])->default('Spoiled');
			$table->enum('VerificationStatus', ['Pending', 'Verified', 'Rejected'])->default('Pending')->index();
			$table->timestamp('DateAdded')->useCurrent();
		});

		Schema::create('shrinked_products', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('ShrinkageID')->references('ID')->on('shrinkages')->onDelete('cascade');
			$table->foreignId('ProductID')->references('ID')->on('products')->onDelete('cascade');
			$table->unsignedBigInteger('Quantity');
			$table->decimal('SubAmount', 10, 2);
		});

		Schema::create('inventory', function (Blueprint $table) {
			$table->id('ID');
			$table->text('ItemName');
			$table->text('ItemDescription');
			$table->text('ItemType');
			$table->text('Measurement');
			$table->unsignedBigInteger('Quantity');
			$table->unsignedBigInteger('LowCountThreshold');
			$table->timestamp('DateAdded')->useCurrent();
			$table->timestamp('DateModified')->useCurrent();
		});

		Schema::create('stock_in_details', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('UserID')->constrained('users', 'id')->onDelete('cascade');
			$table->text('Supplier');
			$table->timestamp('PurchaseDate')->nullable();
			$table->enum('Source', ['Purchased', 'Business', 'Donation'])->default('Purchased');
			$table->text('ReceiptNumber')->nullable();
			$table->text('InvoiceNumber')->nullable();
			$table->unsignedBigInteger('TotalQuantity');
			$table->decimal('TotalAmount', 10, 2);
			$table->text('AdditionalDetails')->nullable();
			$table->timestamp('DateAdded')->useCurrent();
		});

		Schema::create('stock_ins', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('StockInDetailsID')->constrained('stock_in_details', 'ID')->onDelete('cascade');
			$table->foreignId('InventoryID')->nullable()->constrained('inventory', 'ID')->onDelete('cascade');
			$table->foreignId('ProductID')->nullable()->constrained('products', 'ID')->onDelete('cascade');
			$table->enum('ItemType', ['Inventory', 'Product']); // Inventory or Product
			$table->unsignedBigInteger('QuantityAdded');
			$table->decimal('SubAmount', 10, 2);
			$table->timestamp('DateAdded')->useCurrent();
		});

		Schema::create('stock_out_details', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('UserID')->constrained('users', 'id')->onDelete('cascade');
			$table->unsignedBigInteger('TotalQuantity');
			$table->text('Reason')->nullable();
			$table->timestamp('DateAdded')->useCurrent();
		});

		Schema::create('stock_outs', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('StockOutDetailsID')->constrained('stock_out_details', 'ID')->onDelete('cascade');
			$table->foreignId('InventoryID')->nullable()->constrained('inventory', 'ID')->onDelete('cascade');
			$table->foreignId('ProductID')->nullable()->constrained('products', 'ID')->onDelete('cascade');
			$table->enum('ItemType', ['Inventory', 'Product']); // Inventory or Product
			$table->unsignedBigInteger('QuantityRemoved');
			$table->decimal('SubAmount', 10, 2);
			$table->timestamp('DateAdded')->useCurrent();
		});

		Schema::create('inventory_leftover_snapshots', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('UserID')->constrained('users', 'id')->onDelete('cascade');
			$table->unsignedBigInteger('TotalItems')->default(0);
			$table->unsignedBigInteger('TotalLeftovers')->default(0);
			$table->timestamp('SnapshotTime')->useCurrent();
		});

		Schema::create('inventory_leftovers', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('InventoryLeftoverID')->constrained('inventory_leftover_snapshots', 'ID')->onDelete('cascade');
			$table->foreignId('InventoryID')->constrained('inventory', 'ID')->onDelete('cascade');
			$table->unsignedBigInteger('LeftoverQuantity')->default(0);
			$table->timestamp('DateAdded')->useCurrent();
			$table->unique(['InventoryLeftoverID', 'InventoryID'], 'ux_inventory_leftovers_snapshot_inventory');
		});

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

		Schema::create('database_backup_settings', function (Blueprint $table) {
			$table->id('ID');
			$table->unsignedInteger('SnapshotRetentionCount')->default(10);
			$table->unsignedInteger('IncrementalRetentionCount')->default(30);
			$table->boolean('DeleteFailedBackups')->default(false);
			$table->timestamp('DateAdded')->useCurrent();
			$table->timestamp('DateModified')->useCurrent();
		});

		$controlSchema = Schema::connection('mysql_control');
		if (!$controlSchema->hasTable('system_operations')) {
			$controlSchema->create('system_operations', function (Blueprint $table) {
				$table->id('ID');
				$table->foreignId('UserID')->nullable()->constrained('users', 'id')->nullOnDelete();
				$table->string('CreatedByName')->nullable();
				$table->string('Scope', 100)->default('Database');
				$table->string('OperationType', 150);
				$table->string('Title', 255);
				$table->enum('Status', ['Pending', 'Running', 'Completed', 'Failed'])->default('Pending');
				$table->boolean('LockWrites')->default(false);
				$table->json('Payload')->nullable();
				$table->json('Result')->nullable();
				$table->text('Notes')->nullable();
				$table->text('FailureMessage')->nullable();
				$table->timestamp('StartedAt')->nullable();
				$table->timestamp('CompletedAt')->nullable();
				$table->timestamp('DateAdded')->useCurrent();
				$table->timestamp('DateModified')->useCurrent();

				$table->index(['Scope', 'Status']);
				$table->index(['LockWrites', 'Status']);
				$table->index(['OperationType', 'Status']);
			});
		}

		Schema::create('system_settings', function (Blueprint $table) {
			$table->id('ID');
			$table->string('SettingKey')->unique();
			$table->text('SettingValue')->nullable();
			$table->timestamp('DateAdded')->useCurrent();
			$table->timestamp('DateModified')->useCurrent();
		});
	}

	public function down(): void {
		Schema::connection('mysql_control')->dropIfExists('system_operations');
		Schema::dropIfExists('database_backup_settings');
		Schema::dropIfExists('database_backup_changes');
		Schema::dropIfExists('database_backups');
		Schema::dropIfExists('inventory_leftovers');
		Schema::dropIfExists('inventory_leftover_snapshots');
		Schema::dropIfExists('stock_outs');
		Schema::dropIfExists('stock_out_details');
		Schema::dropIfExists('stock_ins');
		Schema::dropIfExists('stock_in_details');
		Schema::dropIfExists('job_order_custom_items');
		Schema::dropIfExists('job_order_items');
		Schema::dropIfExists('job_orders');
		Schema::dropIfExists('inventory');
		Schema::dropIfExists('shrinked_products');
		Schema::dropIfExists('shrinkages');
		Schema::dropIfExists('sold_products');
		Schema::dropIfExists('partial_payments');
		Schema::dropIfExists('payments');
		Schema::dropIfExists('sales');
		Schema::dropIfExists('product_leftovers');
		Schema::dropIfExists('product_leftover_snapshots');
		Schema::dropIfExists('production_batches');
		Schema::dropIfExists('production_batch_details');
		Schema::dropIfExists('products');
		Schema::dropIfExists('categories');
		Schema::dropIfExists('audits');
		Schema::dropIfExists('permissions_set');
		Schema::dropIfExists('role_preset_permissions');
		Schema::dropIfExists('permissions');
		Schema::dropIfExists('permission_groups');
		Schema::dropIfExists('customers');
		Schema::dropIfExists('system_settings');
	}
};
