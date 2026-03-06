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
			$table->timestamp('DateAdded');
			$table->timestamp('DateModified');
		});

		Schema::create('permissions', function (Blueprint $table) {
			$table->id('ID');
			$table->string('PermissionName');
			$table->string('PermissionDescription')->nullable();
			$table->timestamp('DateAdded')->useCurrent();
			$table->timestamp('DateModified')->useCurrent();
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
			$table->timestamp('PaymentDueDate')->nullable();
			$table->text('AdditionalDetails')->nullable();
			$table->timestamp('DateAdded')->useCurrent();
		});

		Schema::create('partial_payments', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('SalesID')->references('ID')->on('sales')->onDelete('cascade');
			$table->decimal('PaidAmount', 10, 2);
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

		Schema::create('custom_order_details', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('SalesID')->constrained('sales', 'ID')->onDelete('cascade');
			$table->text('OrderDescription');
			$table->decimal('TotalAmount', 10, 2);
			$table->timestamp('DateAdded')->useCurrent();
			$table->timestamp('DateModified')->useCurrent();
		});

		Schema::create('custom_orders', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('CustomOrderDetailsID')->constrained('custom_order_details', 'ID')->onDelete('cascade');
			$table->text('CustomOrderDescription');
			$table->unsignedBigInteger('Quantity');
			$table->decimal('PricePerUnit', 10, 2);
			$table->timestamp('DateAdded')->useCurrent();
		});

		Schema::create('shrinkages', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('UserID')->references('id')->on('users')->onDelete('cascade');
			$table->unsignedBigInteger('Quantity');
			$table->decimal('TotalAmount', 10, 2);
			$table->enum('Reason', ['Spoiled', 'Theft', 'Lost'])->default('Spoiled');
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
	}

	public function down(): void {
		Schema::dropIfExists('inventory_leftovers');
		Schema::dropIfExists('inventory_leftover_snapshots');
		Schema::dropIfExists('stock_outs');
		Schema::dropIfExists('stock_out_details');
		Schema::dropIfExists('stock_ins');
		Schema::dropIfExists('stock_in_details');
		Schema::dropIfExists('custom_orders');
		Schema::dropIfExists('custom_order_details');
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
		Schema::dropIfExists('permissions');
		Schema::dropIfExists('customers');
	}
};
