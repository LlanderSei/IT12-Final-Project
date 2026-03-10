<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
	public function up(): void {
		if (!Schema::hasTable('job_orders')) {
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
		}

		if (!Schema::hasTable('job_order_items')) {
			Schema::create('job_order_items', function (Blueprint $table) {
				$table->id('ID');
				$table->foreignId('JobOrderID')->constrained('job_orders', 'ID')->onDelete('cascade');
				$table->foreignId('ProductID')->constrained('products', 'ID')->onDelete('cascade');
				$table->decimal('PricePerUnit', 10, 2);
				$table->unsignedBigInteger('Quantity');
				$table->decimal('SubAmount', 10, 2);
			});
		}

		if (!Schema::hasTable('job_order_custom_items')) {
			Schema::create('job_order_custom_items', function (Blueprint $table) {
				$table->id('ID');
				$table->foreignId('JobOrderID')->constrained('job_orders', 'ID')->onDelete('cascade');
				$table->text('CustomOrderDescription');
				$table->unsignedBigInteger('Quantity');
				$table->decimal('PricePerUnit', 10, 2);
			});
		}
	}

	public function down(): void {
		Schema::dropIfExists('job_order_custom_items');
		Schema::dropIfExists('job_order_items');
		Schema::dropIfExists('job_orders');
	}
};
