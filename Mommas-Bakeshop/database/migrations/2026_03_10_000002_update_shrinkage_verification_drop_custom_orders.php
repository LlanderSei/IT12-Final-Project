<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
	public function up(): void {
		if (Schema::hasTable('custom_orders')) {
			Schema::drop('custom_orders');
		}
		if (Schema::hasTable('custom_order_details')) {
			Schema::drop('custom_order_details');
		}

		if (Schema::hasTable('shrinkages') && !Schema::hasColumn('shrinkages', 'VerificationStatus')) {
			Schema::table('shrinkages', function (Blueprint $table) {
				$table->enum('VerificationStatus', ['Pending', 'Verified', 'Rejected'])
					->default('Pending')
					->index();
			});
		}

		DB::unprepared('DROP TRIGGER IF EXISTS UpdateProductQuantitiesOnShrinkage');
	}

	public function down(): void {
		if (Schema::hasTable('shrinkages') && Schema::hasColumn('shrinkages', 'VerificationStatus')) {
			Schema::table('shrinkages', function (Blueprint $table) {
				$table->dropColumn('VerificationStatus');
			});
		}

		if (!Schema::hasTable('custom_order_details')) {
			Schema::create('custom_order_details', function (Blueprint $table) {
				$table->id('ID');
				$table->foreignId('SalesID')->constrained('sales', 'ID')->onDelete('cascade');
				$table->text('OrderDescription');
				$table->decimal('TotalAmount', 10, 2);
				$table->timestamp('DateAdded')->useCurrent();
				$table->timestamp('DateModified')->useCurrent();
			});
		}

		if (!Schema::hasTable('custom_orders')) {
			Schema::create('custom_orders', function (Blueprint $table) {
				$table->id('ID');
				$table->foreignId('CustomOrderDetailsID')->constrained('custom_order_details', 'ID')->onDelete('cascade');
				$table->text('CustomOrderDescription');
				$table->unsignedBigInteger('Quantity');
				$table->decimal('PricePerUnit', 10, 2);
				$table->timestamp('DateAdded')->useCurrent();
			});
		}

		DB::unprepared('DROP TRIGGER IF EXISTS UpdateProductQuantitiesOnShrinkage');
		DB::unprepared('
			CREATE TRIGGER UpdateProductQuantitiesOnShrinkage
			AFTER INSERT ON shrinked_products
			FOR EACH ROW
			BEGIN
				DECLARE old_product_quantity BIGINT;
				DECLARE shrinkage_user_id BIGINT;

				SELECT Quantity INTO old_product_quantity
				FROM products
				WHERE ID = NEW.ProductID;

				SELECT UserID INTO shrinkage_user_id
				FROM shrinkages
				WHERE ID = NEW.ShrinkageID;

				UPDATE products
				SET Quantity = Quantity - NEW.Quantity
				WHERE ID = NEW.ProductID;

				INSERT INTO audits (UserID, TableEdited, PreviousChanges, SavedChanges, ReadableChanges, Action, Source, DateAdded)
				VALUES (
					shrinkage_user_id,
					"products",
					CONCAT("{\"ID\":", NEW.ProductID, ",\"Quantity\":", old_product_quantity, "}"),
					CONCAT("{\"ID\":", NEW.ProductID, ",\"Quantity\":", old_product_quantity - NEW.Quantity, "}"),
					CONCAT("Trigger UpdateProductQuantitiesOnShrinkage deducted ", NEW.Quantity, " from products.ID=", NEW.ProductID),
					"Update Quantity",
					"Trigger",
					NOW()
				);
			END
		');
	}
};
