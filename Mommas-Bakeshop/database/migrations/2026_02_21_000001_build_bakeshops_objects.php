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
			$table->longText('PermissionDescription');
			$table->timestamp('DateAdded');
			$table->timestamp('DateModified');
		});

		Schema::create('permissions_set', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('UserID')->references('id')->on('users')->onDelete('cascade');
			$table->foreignId('PermissionID')->references('ID')->on('permissions')->onDelete('cascade');
			$table->boolean('Allowable')->default(0);
			$table->timestamp('DateAdded')->useCurrent();
			$table->timestamp('DateModified')->useCurrent();
		});

		Schema::create('audits', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('UserID')->references('id')->on('users')->onDelete('cascade');
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
			$table->foreignId('CategoryID')->references('ID')->on('categories')->onDelete('cascade');
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
			$table->foreignId('UserID')->references('id')->on('users')->onDelete('cascade');
			$table->text('BatchDescription')->nullable();
			$table->unsignedBigInteger('TotalProductsProduced')->default(0);
			$table->timestamp('DateAdded')->useCurrent();
		});

		Schema::create('production_batches', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('BatchDetailsID')->references('ID')->on('production_batch_details')->onDelete('cascade');
			$table->foreignId('ProductID')->references('ID')->on('products')->onDelete('cascade');
			$table->unsignedBigInteger('QuantityProduced');
			$table->timestamp('DateAdded')->useCurrent();
		});

		DB::unprepared('
			CREATE TRIGGER UpdateTotalProductsProduced
			AFTER INSERT ON production_batches
			FOR EACH ROW
			BEGIN
				DECLARE old_product_quantity BIGINT;
				DECLARE old_total_produced BIGINT;
				DECLARE batch_user_id BIGINT;

				SELECT Quantity INTO old_product_quantity
				FROM products
				WHERE ID = NEW.ProductID;

				SELECT TotalProductsProduced, UserID
				INTO old_total_produced, batch_user_id
				FROM production_batch_details
				WHERE ID = NEW.BatchDetailsID;

				UPDATE products
				SET Quantity = Quantity + NEW.QuantityProduced
				WHERE ID = NEW.ProductID;

				UPDATE production_batch_details
				SET TotalProductsProduced = TotalProductsProduced + NEW.QuantityProduced
				WHERE ID = NEW.BatchDetailsID;

				INSERT INTO audits (UserID, TableEdited, PreviousChanges, SavedChanges, ReadableChanges, Action, Source, DateAdded)
				VALUES (
					batch_user_id,
					"products",
					CONCAT("{\"ID\":", NEW.ProductID, ",\"Quantity\":", old_product_quantity, "}"),
					CONCAT("{\"ID\":", NEW.ProductID, ",\"Quantity\":", old_product_quantity + NEW.QuantityProduced, "}"),
					CONCAT("Trigger UpdateTotalProductsProduced added ", NEW.QuantityProduced, " to products.ID=", NEW.ProductID),
					"Update Quantity",
					"Trigger",
					NOW()
				);

				INSERT INTO audits (UserID, TableEdited, PreviousChanges, SavedChanges, ReadableChanges, Action, Source, DateAdded)
				VALUES (
					batch_user_id,
					"production_batch_details",
					CONCAT("{\"ID\":", NEW.BatchDetailsID, ",\"TotalProductsProduced\":", old_total_produced, "}"),
					CONCAT("{\"ID\":", NEW.BatchDetailsID, ",\"TotalProductsProduced\":", old_total_produced + NEW.QuantityProduced, "}"),
					CONCAT("Trigger UpdateTotalProductsProduced increased TotalProductsProduced by ", NEW.QuantityProduced, " for production_batch_details.ID=", NEW.BatchDetailsID),
					"Update TotalProductsProduced",
					"Trigger",
					NOW()
				);
			END
		');

		Schema::create('sales', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('UserID')->references('id')->on('users')->onDelete('cascade');
			$table->foreignId('CustomerID')->nullable()->references('ID')->on('customers')->onDelete('cascade');
			$table->decimal('TotalAmount', 10, 2);
			$table->timestamp('DateAdded')->useCurrent();
		});

		Schema::create('payments', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('SalesID')->references('ID')->on('sales')->onDelete('cascade');
			$table->decimal('PaidAmount', 10, 2);
			$table->decimal('TotalAmount', 10, 2);
			$table->decimal('Change', 10, 2);
			$table->enum('PaymentStatus', ['Paid', 'Partially Paid', 'Unpaid'])->default('Unpaid');
			$table->timestamp('PaymentDueDate')->nullable();
			$table->timestamp('DateAdded')->useCurrent();
		});

		Schema::create('partial_payments', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('SalesID')->references('ID')->on('sales')->onDelete('cascade');
			$table->decimal('PaidAmount', 10, 2);
			$table->text('PaymentMethod');
			$table->timestamp('DateAdded')->useCurrent();
		});

		DB::unprepared('
			CREATE TRIGGER UpdatePaymentStatus
			AFTER INSERT ON partial_payments
			FOR EACH ROW
			BEGIN
				DECLARE total_paid DECIMAL(10, 2);
				DECLARE total_amount DECIMAL(10, 2);
				DECLARE old_status VARCHAR(32);
				DECLARE new_status VARCHAR(32);
				DECLARE sale_user_id BIGINT;

				SELECT SUM(PaidAmount) INTO total_paid FROM partial_payments WHERE SalesID = NEW.SalesID;
				SELECT TotalAmount, PaymentStatus INTO total_amount, old_status FROM payments WHERE SalesID = NEW.SalesID;
				SELECT UserID INTO sale_user_id FROM sales WHERE ID = NEW.SalesID;

				IF total_paid >= total_amount THEN
					UPDATE payments SET PaymentStatus = "Paid" WHERE SalesID = NEW.SalesID;
					SET new_status = "Paid";
				ELSE
					UPDATE payments SET PaymentStatus = "Partially Paid" WHERE SalesID = NEW.SalesID;
					SET new_status = "Partially Paid";
				END IF;

				INSERT INTO audits (UserID, TableEdited, PreviousChanges, SavedChanges, ReadableChanges, Action, Source, DateAdded)
				VALUES (
					sale_user_id,
					"payments",
					CONCAT("{\"SalesID\":", NEW.SalesID, ",\"PaymentStatus\":\"", old_status, "\",\"TotalPaid\":", IFNULL(total_paid - NEW.PaidAmount, 0), "}"),
					CONCAT("{\"SalesID\":", NEW.SalesID, ",\"PaymentStatus\":\"", new_status, "\",\"TotalPaid\":", total_paid, "}"),
					CONCAT("Trigger UpdatePaymentStatus set payments.PaymentStatus to ", new_status, " for SalesID=", NEW.SalesID),
					"Update PaymentStatus",
					"Trigger",
					NOW()
				);
			END
		');

		Schema::create('sold_products', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('SalesID')->references('ID')->on('sales')->onDelete('cascade');
			$table->foreignId('ProductID')->references('ID')->on('products')->onDelete('cascade');
			$table->decimal('PricePerUnit', 10, 2);
			$table->unsignedBigInteger('Quantity');
			$table->decimal('SubAmount', 10, 2);
		});

		DB::unprepared('
			CREATE TRIGGER UpdateProductQuantitiesOnSale
			AFTER INSERT ON sold_products
			FOR EACH ROW
			BEGIN
				DECLARE old_product_quantity BIGINT;
				DECLARE sale_user_id BIGINT;

				SELECT Quantity INTO old_product_quantity
				FROM products
				WHERE ID = NEW.ProductID;

				SELECT UserID INTO sale_user_id
				FROM sales
				WHERE ID = NEW.SalesID;

				UPDATE products
				SET Quantity = Quantity - NEW.Quantity
				WHERE ID = NEW.ProductID;

				INSERT INTO audits (UserID, TableEdited, PreviousChanges, SavedChanges, ReadableChanges, Action, Source, DateAdded)
				VALUES (
					sale_user_id,
					"products",
					CONCAT("{\"ID\":", NEW.ProductID, ",\"Quantity\":", old_product_quantity, "}"),
					CONCAT("{\"ID\":", NEW.ProductID, ",\"Quantity\":", old_product_quantity - NEW.Quantity, "}"),
					CONCAT("Trigger UpdateProductQuantitiesOnSale deducted ", NEW.Quantity, " from products.ID=", NEW.ProductID),
					"Update Quantity",
					"Trigger",
					NOW()
				);
			END
		');

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
			$table->foreignId('UserID')->references('id')->on('users')->onDelete('cascade');
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
			$table->foreignId('StockInDetailsID')->references('ID')->on('stock_in_details')->onDelete('cascade');
			$table->foreignId('InventoryID')->nullable()->references('ID')->on('inventory')->onDelete('cascade');
			$table->foreignId('ProductID')->nullable()->references('ID')->on('products')->onDelete('cascade');
			$table->enum('ItemType', ['Inventory', 'Product']); // Inventory or Product
			$table->unsignedBigInteger('QuantityAdded');
			$table->decimal('SubAmount', 10, 2);
			$table->timestamp('DateAdded')->useCurrent();
		});

		DB::unprepared('
			CREATE TRIGGER TriggerUpdateStockQuantitiesOnStockIn
			AFTER INSERT ON stock_ins
			FOR EACH ROW
			BEGIN
				DECLARE old_quantity BIGINT;
				DECLARE stock_in_user_id BIGINT;

				SELECT UserID INTO stock_in_user_id
				FROM stock_in_details
				WHERE ID = NEW.StockInDetailsID;

				IF NEW.ItemType = "Inventory" THEN
					SELECT Quantity INTO old_quantity
					FROM inventory
					WHERE ID = NEW.InventoryID;

					UPDATE inventory
					SET Quantity = Quantity + NEW.QuantityAdded
					WHERE ID = NEW.InventoryID;

					INSERT INTO audits (UserID, TableEdited, PreviousChanges, SavedChanges, ReadableChanges, Action, Source, DateAdded)
					VALUES (
						stock_in_user_id,
						"inventory",
						CONCAT("{\"ID\":", NEW.InventoryID, ",\"Quantity\":", old_quantity, "}"),
						CONCAT("{\"ID\":", NEW.InventoryID, ",\"Quantity\":", old_quantity + NEW.QuantityAdded, "}"),
						CONCAT("Trigger TriggerUpdateStockQuantitiesOnStockIn added ", NEW.QuantityAdded, " to inventory.ID=", NEW.InventoryID),
						"Update Quantity",
						"Trigger",
						NOW()
					);
				ELSEIF NEW.ItemType = "Product" THEN
					SELECT Quantity INTO old_quantity
					FROM products
					WHERE ID = NEW.ProductID;

					UPDATE products
					SET Quantity = Quantity + NEW.QuantityAdded
					WHERE ID = NEW.ProductID;

					INSERT INTO audits (UserID, TableEdited, PreviousChanges, SavedChanges, ReadableChanges, Action, Source, DateAdded)
					VALUES (
						stock_in_user_id,
						"products",
						CONCAT("{\"ID\":", NEW.ProductID, ",\"Quantity\":", old_quantity, "}"),
						CONCAT("{\"ID\":", NEW.ProductID, ",\"Quantity\":", old_quantity + NEW.QuantityAdded, "}"),
						CONCAT("Trigger TriggerUpdateStockQuantitiesOnStockIn added ", NEW.QuantityAdded, " to products.ID=", NEW.ProductID),
						"Update Quantity",
						"Trigger",
						NOW()
					);
				END IF;
			END
		');

		Schema::create('stock_out_details', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('UserID')->references('id')->on('users')->onDelete('cascade');
			$table->unsignedBigInteger('TotalQuantity');
			$table->text('Reason')->nullable();
			$table->timestamp('DateAdded')->useCurrent();
		});

		Schema::create('stock_outs', function (Blueprint $table) {
			$table->id('ID');
			$table->foreignId('StockOutDetailsID')->references('ID')->on('stock_out_details')->onDelete('cascade');
			$table->foreignId('InventoryID')->nullable()->references('ID')->on('inventory')->onDelete('cascade');
			$table->foreignId('ProductID')->nullable()->references('ID')->on('products')->onDelete('cascade');
			$table->enum('ItemType', ['Inventory', 'Product']); // Inventory or Product
			$table->unsignedBigInteger('QuantityRemoved');
			$table->decimal('SubAmount', 10, 2);
			$table->timestamp('DateAdded')->useCurrent();
		});

		DB::unprepared('
			CREATE TRIGGER TriggerUpdateStockQuantitiesOnStockOut
			AFTER INSERT ON stock_outs
			FOR EACH ROW
			BEGIN
				DECLARE old_quantity BIGINT;
				DECLARE stock_out_user_id BIGINT;

				SELECT UserID INTO stock_out_user_id
				FROM stock_out_details
				WHERE ID = NEW.StockOutDetailsID;

				IF NEW.ItemType = "Inventory" THEN
					SELECT Quantity INTO old_quantity
					FROM inventory
					WHERE ID = NEW.InventoryID;

					UPDATE inventory
					SET Quantity = Quantity - NEW.QuantityRemoved
					WHERE ID = NEW.InventoryID;

					INSERT INTO audits (UserID, TableEdited, PreviousChanges, SavedChanges, ReadableChanges, Action, Source, DateAdded)
					VALUES (
						stock_out_user_id,
						"inventory",
						CONCAT("{\"ID\":", NEW.InventoryID, ",\"Quantity\":", old_quantity, "}"),
						CONCAT("{\"ID\":", NEW.InventoryID, ",\"Quantity\":", old_quantity - NEW.QuantityRemoved, "}"),
						CONCAT("Trigger TriggerUpdateStockQuantitiesOnStockOut deducted ", NEW.QuantityRemoved, " from inventory.ID=", NEW.InventoryID),
						"Update Quantity",
						"Trigger",
						NOW()
					);
				ELSEIF NEW.ItemType = "Product" THEN
					SELECT Quantity INTO old_quantity
					FROM products
					WHERE ID = NEW.ProductID;

					UPDATE products
					SET Quantity = Quantity - NEW.QuantityRemoved
					WHERE ID = NEW.ProductID;

					INSERT INTO audits (UserID, TableEdited, PreviousChanges, SavedChanges, ReadableChanges, Action, Source, DateAdded)
					VALUES (
						stock_out_user_id,
						"products",
						CONCAT("{\"ID\":", NEW.ProductID, ",\"Quantity\":", old_quantity, "}"),
						CONCAT("{\"ID\":", NEW.ProductID, ",\"Quantity\":", old_quantity - NEW.QuantityRemoved, "}"),
						CONCAT("Trigger TriggerUpdateStockQuantitiesOnStockOut deducted ", NEW.QuantityRemoved, " from products.ID=", NEW.ProductID),
						"Update Quantity",
						"Trigger",
						NOW()
					);
				END IF;
			END
		');
	}

	public function down(): void {
		Schema::dropIfExists('stock_outs');
		Schema::dropIfExists('stock_out_details');
		Schema::dropIfExists('stock_ins');
		Schema::dropIfExists('stock_in_details');
		Schema::dropIfExists('inventory');
		Schema::dropIfExists('shrinked_products');
		Schema::dropIfExists('shrinkages');
		Schema::dropIfExists('sold_products');
		Schema::dropIfExists('partial_payments');
		Schema::dropIfExists('payments');
		Schema::dropIfExists('sales');
		Schema::dropIfExists('production_batches');
		Schema::dropIfExists('production_batch_details');
		Schema::dropIfExists('products');
		Schema::dropIfExists('categories');
		Schema::dropIfExists('audits');
		Schema::dropIfExists('permissions_set');
		Schema::dropIfExists('permissions');
		Schema::dropIfExists('customers');

		DB::unprepared('DROP TRIGGER IF EXISTS UpdateTotalProductsProduced');
		DB::unprepared('DROP TRIGGER IF EXISTS UpdateProductQuantitiesOnSale');
		DB::unprepared('DROP TRIGGER IF EXISTS UpdateProductQuantitiesOnShrinkage');
		DB::unprepared('DROP TRIGGER IF EXISTS UpdatePaymentStatus');
		DB::unprepared('DROP TRIGGER IF EXISTS TriggerUpdateStockQuantitiesOnStockIn');
		DB::unprepared('DROP TRIGGER IF EXISTS TriggerUpdateStockQuantitiesOnStockOut');
	}
};
