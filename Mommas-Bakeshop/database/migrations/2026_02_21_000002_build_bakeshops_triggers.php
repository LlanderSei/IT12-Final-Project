<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
	public function up(): void {
		if (DB::getDriverName() !== 'mysql') {
			return;
		}
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

		DB::unprepared('
				CREATE TRIGGER UpdateProductLeftoverSnapshotOnInsert
				AFTER INSERT ON product_leftovers
				FOR EACH ROW
				BEGIN
					DECLARE old_total_products BIGINT;
					DECLARE old_total_leftovers BIGINT;
					DECLARE old_total_amount DECIMAL(12, 2);
					DECLARE snapshot_user_id BIGINT;
					DECLARE line_amount DECIMAL(14, 2);

					SET line_amount = ROUND(NEW.LeftoverQuantity * NEW.PerUnitAmount, 2);

					SELECT TotalProducts, TotalLeftovers, TotalAmount, UserID
					INTO old_total_products, old_total_leftovers, old_total_amount, snapshot_user_id
					FROM product_leftover_snapshots
					WHERE ID = NEW.ProductLeftoverID;

					UPDATE product_leftover_snapshots
					SET
						TotalProducts = TotalProducts + 1,
						TotalLeftovers = TotalLeftovers + NEW.LeftoverQuantity,
						TotalAmount = ROUND(TotalAmount + line_amount, 2)
					WHERE ID = NEW.ProductLeftoverID;

					INSERT INTO audits (UserID, TableEdited, PreviousChanges, SavedChanges, ReadableChanges, Action, Source, DateAdded)
					VALUES (
						snapshot_user_id,
						"product_leftover_snapshots",
						CONCAT("{\"ID\":", NEW.ProductLeftoverID, ",\"TotalProducts\":", old_total_products, ",\"TotalLeftovers\":", old_total_leftovers, ",\"TotalAmount\":", old_total_amount, "}"),
						CONCAT("{\"ID\":", NEW.ProductLeftoverID, ",\"TotalProducts\":", old_total_products + 1, ",\"TotalLeftovers\":", old_total_leftovers + NEW.LeftoverQuantity, ",\"TotalAmount\":", ROUND(old_total_amount + line_amount, 2), "}"),
						CONCAT("Trigger UpdateProductLeftoverSnapshotOnInsert updated product_leftover_snapshots.ID=", NEW.ProductLeftoverID),
						"Update Snapshot Totals",
						"Trigger",
						NOW()
					);
				END
			');

		DB::unprepared('
					CREATE TRIGGER BlockProductLeftoverUpdate
					BEFORE UPDATE ON product_leftovers
					FOR EACH ROW
					BEGIN
						SIGNAL SQLSTATE "45000"
							SET MESSAGE_TEXT = "Snapshot leftovers are immutable; updating lines is not allowed.";
					END
				');

		DB::unprepared('
					CREATE TRIGGER BlockProductLeftoverDelete
					BEFORE DELETE ON product_leftovers
					FOR EACH ROW
					BEGIN
						SIGNAL SQLSTATE "45000"
							SET MESSAGE_TEXT = "Snapshot leftovers are immutable; deleting lines is not allowed.";
					END
				');

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

		DB::unprepared('
				CREATE TRIGGER UpdateInventoryLeftoverSnapshotOnInsert
				AFTER INSERT ON inventory_leftovers
				FOR EACH ROW
				BEGIN
					DECLARE old_total_items BIGINT;
					DECLARE old_total_leftovers BIGINT;
					DECLARE snapshot_user_id BIGINT;

					SELECT TotalItems, TotalLeftovers, UserID
					INTO old_total_items, old_total_leftovers, snapshot_user_id
					FROM inventory_leftover_snapshots
					WHERE ID = NEW.InventoryLeftoverID;

					UPDATE inventory_leftover_snapshots
					SET
						TotalItems = TotalItems + 1,
						TotalLeftovers = TotalLeftovers + NEW.LeftoverQuantity
					WHERE ID = NEW.InventoryLeftoverID;

					INSERT INTO audits (UserID, TableEdited, PreviousChanges, SavedChanges, ReadableChanges, Action, Source, DateAdded)
					VALUES (
						snapshot_user_id,
						"inventory_leftover_snapshots",
						CONCAT("{\"ID\":", NEW.InventoryLeftoverID, ",\"TotalItems\":", old_total_items, ",\"TotalLeftovers\":", old_total_leftovers, "}"),
						CONCAT("{\"ID\":", NEW.InventoryLeftoverID, ",\"TotalItems\":", old_total_items + 1, ",\"TotalLeftovers\":", old_total_leftovers + NEW.LeftoverQuantity, "}"),
						CONCAT("Trigger UpdateInventoryLeftoverSnapshotOnInsert updated inventory_leftover_snapshots.ID=", NEW.InventoryLeftoverID),
						"Update Snapshot Totals",
						"Trigger",
						NOW()
					);
				END
			');

		DB::unprepared('
					CREATE TRIGGER BlockInventoryLeftoverUpdate
					BEFORE UPDATE ON inventory_leftovers
					FOR EACH ROW
					BEGIN
						SIGNAL SQLSTATE "45000"
							SET MESSAGE_TEXT = "Snapshot leftovers are immutable; updating lines is not allowed.";
					END
				');

		DB::unprepared('
					CREATE TRIGGER BlockInventoryLeftoverDelete
					BEFORE DELETE ON inventory_leftovers
					FOR EACH ROW
					BEGIN
						SIGNAL SQLSTATE "45000"
							SET MESSAGE_TEXT = "Snapshot leftovers are immutable; deleting lines is not allowed.";
					END
				');

		foreach ($this->trackedTables() as $table) {
			$primaryKey = $this->primaryKeyForTable($table);
			$insertTrigger = $this->backupTriggerName($table, 'ai');
			$updateTrigger = $this->backupTriggerName($table, 'au');
			$deleteTrigger = $this->backupTriggerName($table, 'bd');
			$newJson = $this->jsonObjectExpression($table, 'NEW');
			$oldJson = $this->jsonObjectExpression($table, 'OLD');

			DB::unprepared("DROP TRIGGER IF EXISTS `{$insertTrigger}`");
			DB::unprepared("DROP TRIGGER IF EXISTS `{$updateTrigger}`");
			DB::unprepared("DROP TRIGGER IF EXISTS `{$deleteTrigger}`");

			DB::unprepared(<<<SQL
				CREATE TRIGGER `{$insertTrigger}`
				AFTER INSERT ON `{$table}`
				FOR EACH ROW
				BEGIN
						INSERT INTO `database_backup_changes` (`TableName`, `RecordID`, `Action`, `RowData`, `ChangedAt`)
						VALUES ('{$table}', CAST(NEW.`{$primaryKey}` AS CHAR), 'Insert', {$newJson}, NOW());
				END
			SQL);

			DB::unprepared(<<<SQL
				CREATE TRIGGER `{$updateTrigger}`
				AFTER UPDATE ON `{$table}`
				FOR EACH ROW
				BEGIN
						INSERT INTO `database_backup_changes` (`TableName`, `RecordID`, `Action`, `RowData`, `ChangedAt`)
						VALUES ('{$table}', CAST(NEW.`{$primaryKey}` AS CHAR), 'Update', {$newJson}, NOW());
				END
			SQL);

			DB::unprepared(<<<SQL
				CREATE TRIGGER `{$deleteTrigger}`
				BEFORE DELETE ON `{$table}`
				FOR EACH ROW
				BEGIN
						INSERT INTO `database_backup_changes` (`TableName`, `RecordID`, `Action`, `RowData`, `ChangedAt`)
						VALUES ('{$table}', CAST(OLD.`{$primaryKey}` AS CHAR), 'Delete', {$oldJson}, NOW());
				END
			SQL);
		}
	}

	public function down(): void {
		if (DB::getDriverName() !== 'mysql') {
			return;
		}
		DB::unprepared('DROP TRIGGER IF EXISTS UpdateTotalProductsProduced');
		DB::unprepared('DROP TRIGGER IF EXISTS UpdateProductQuantitiesOnSale');
		DB::unprepared('DROP TRIGGER IF EXISTS UpdateProductQuantitiesOnShrinkage');
		DB::unprepared('DROP TRIGGER IF EXISTS UpdatePaymentStatus');
		DB::unprepared('DROP TRIGGER IF EXISTS TriggerUpdateStockQuantitiesOnStockIn');
		DB::unprepared('DROP TRIGGER IF EXISTS TriggerUpdateStockQuantitiesOnStockOut');
		DB::unprepared('DROP TRIGGER IF EXISTS UpdateProductLeftoverSnapshotOnInsert');
		DB::unprepared('DROP TRIGGER IF EXISTS UpdateProductLeftoverSnapshotOnUpdate');
		DB::unprepared('DROP TRIGGER IF EXISTS UpdateProductLeftoverSnapshotOnDelete');
		DB::unprepared('DROP TRIGGER IF EXISTS BlockProductLeftoverUpdate');
		DB::unprepared('DROP TRIGGER IF EXISTS BlockProductLeftoverDelete');
		DB::unprepared('DROP TRIGGER IF EXISTS UpdateInventoryLeftoverSnapshotOnInsert');
		DB::unprepared('DROP TRIGGER IF EXISTS UpdateInventoryLeftoverSnapshotOnUpdate');
		DB::unprepared('DROP TRIGGER IF EXISTS UpdateInventoryLeftoverSnapshotOnDelete');
		DB::unprepared('DROP TRIGGER IF EXISTS BlockInventoryLeftoverUpdate');
		DB::unprepared('DROP TRIGGER IF EXISTS BlockInventoryLeftoverDelete');

		foreach ($this->trackedTables() as $table) {
			DB::unprepared("DROP TRIGGER IF EXISTS `{$this->backupTriggerName($table, 'ai')}`");
			DB::unprepared("DROP TRIGGER IF EXISTS `{$this->backupTriggerName($table, 'au')}`");
			DB::unprepared("DROP TRIGGER IF EXISTS `{$this->backupTriggerName($table, 'bd')}`");
		}
	}

	private function trackedTables(): array {
		return config('database-backups.tracked_tables', []);
	}

	private function backupTriggerName(string $table, string $suffix): string {
		$clean = substr(preg_replace('/[^a-z0-9]+/i', '', $table), 0, 20);
		return sprintf('bkc_%s_%s', $clean, substr(md5($table . '_' . $suffix), 0, 8));
	}

	private function primaryKeyForTable(string $table): string {
		$primary = DB::selectOne("SHOW KEYS FROM `{$table}` WHERE Key_name = 'PRIMARY'");
		return $primary?->Column_name ?? 'ID';
	}

	private function jsonObjectExpression(string $table, string $rowReference): string {
		$columns = DB::select("SHOW COLUMNS FROM `{$table}`");
		$parts = [];

		foreach ($columns as $column) {
			$name = $column->Field;
			$escaped = str_replace("'", "''", $name);
			$parts[] = "'{$escaped}', {$rowReference}.`{$name}`";
		}

		return 'JSON_OBJECT(' . implode(', ', $parts) . ')';
	}
};
