<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
	public function up(): void {
		DB::unprepared('
			CREATE TRIGGER UpdateTotalProductsProduced
			AFTER INSERT ON production_batches
			FOR EACH ROW
			BEGIN
				DECLARE old_product_quantity BIGINT;
				DECLARE old_total_produced BIGINT;
				DECLARE batch_user_id BIGINT;
				DECLARE product_name VARCHAR(255);
				DECLARE batch_description VARCHAR(255);

				SELECT Quantity, ProductName
				INTO old_product_quantity, product_name
				FROM products
				WHERE ID = NEW.ProductID;

				SELECT TotalProductsProduced, UserID, BatchDescription
				INTO old_total_produced, batch_user_id, batch_description
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
					CONCAT(NEW.QuantityProduced, " units added to stock for ", COALESCE(product_name, CONCAT("Product #", NEW.ProductID)), " from production batch ", COALESCE(batch_description, CONCAT("#", NEW.BatchDetailsID))),
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
					CONCAT("Production batch total updated by ", NEW.QuantityProduced, " for ", COALESCE(batch_description, CONCAT("Batch #", NEW.BatchDetailsID))),
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
					DECLARE product_name VARCHAR(255);

					SET line_amount = ROUND(NEW.LeftoverQuantity * NEW.PerUnitAmount, 2);

					SELECT TotalProducts, TotalLeftovers, TotalAmount, UserID
					INTO old_total_products, old_total_leftovers, old_total_amount, snapshot_user_id
					FROM product_leftover_snapshots
					WHERE ID = NEW.ProductLeftoverID;

					SELECT ProductName
					INTO product_name
					FROM products
					WHERE ID = NEW.ProductID;

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
						CONCAT("End-of-day snapshot updated for ", COALESCE(product_name, CONCAT("Product #", NEW.ProductID))),
						"Update Snapshot Totals",
						"Trigger",
						NOW()
					);
				END
			');

		DB::unprepared('
				CREATE TRIGGER UpdateProductLeftoverSnapshotOnUpdate
				AFTER UPDATE ON product_leftovers
				FOR EACH ROW
				BEGIN
					DECLARE old_total_products BIGINT;
					DECLARE old_total_leftovers BIGINT;
					DECLARE old_total_amount DECIMAL(12, 2);
					DECLARE snapshot_user_id BIGINT;
					DECLARE old_line_amount DECIMAL(14, 2);
					DECLARE new_line_amount DECIMAL(14, 2);
					DECLARE quantity_delta BIGINT;

					SET old_line_amount = ROUND(OLD.LeftoverQuantity * OLD.PerUnitAmount, 2);
					SET new_line_amount = ROUND(NEW.LeftoverQuantity * NEW.PerUnitAmount, 2);
					SET quantity_delta = CAST(CAST(NEW.LeftoverQuantity AS SIGNED) - CAST(OLD.LeftoverQuantity AS SIGNED) AS SIGNED);

					SELECT TotalProducts, TotalLeftovers, TotalAmount, UserID
					INTO old_total_products, old_total_leftovers, old_total_amount, snapshot_user_id
					FROM product_leftover_snapshots
					WHERE ID = NEW.ProductLeftoverID;

					UPDATE product_leftover_snapshots
					SET
						TotalLeftovers = GREATEST(0, CAST(CAST(TotalLeftovers AS SIGNED) + quantity_delta AS SIGNED)),
						TotalAmount = ROUND(TotalAmount + (new_line_amount - old_line_amount), 2)
					WHERE ID = NEW.ProductLeftoverID;
				END
			');

		DB::unprepared('
				CREATE TRIGGER UpdateProductLeftoverSnapshotOnDelete
				AFTER DELETE ON product_leftovers
				FOR EACH ROW
				BEGIN
					DECLARE old_total_products BIGINT;
					DECLARE old_total_leftovers BIGINT;
					DECLARE old_total_amount DECIMAL(12, 2);
					DECLARE snapshot_user_id BIGINT;
					DECLARE line_amount DECIMAL(14, 2);

					SET line_amount = ROUND(OLD.LeftoverQuantity * OLD.PerUnitAmount, 2);

					SELECT TotalProducts, TotalLeftovers, TotalAmount, UserID
					INTO old_total_products, old_total_leftovers, old_total_amount, snapshot_user_id
					FROM product_leftover_snapshots
					WHERE ID = OLD.ProductLeftoverID;

					UPDATE product_leftover_snapshots
					SET
						TotalProducts = IF(TotalProducts > 0, TotalProducts - 1, 0),
						TotalLeftovers = IF(TotalLeftovers > OLD.LeftoverQuantity, TotalLeftovers - OLD.LeftoverQuantity, 0),
						TotalAmount = ROUND(IF(TotalAmount > line_amount, TotalAmount - line_amount, 0), 2)
					WHERE ID = OLD.ProductLeftoverID;
				END
			');

		DB::unprepared('
				CREATE TRIGGER BlockProductLeftoverUpdate
				BEFORE UPDATE ON product_leftovers
				FOR EACH ROW
				BEGIN
					DECLARE snapshot_date DATE;

					SELECT DATE(SnapshotTime)
					INTO snapshot_date
					FROM product_leftover_snapshots
					WHERE ID = OLD.ProductLeftoverID;

					IF snapshot_date IS NULL OR snapshot_date <> CURDATE() THEN
						SIGNAL SQLSTATE "45000"
							SET MESSAGE_TEXT = "Snapshot leftovers are immutable; updating lines is not allowed.";
					END IF;
				END
			');

		DB::unprepared('
				CREATE TRIGGER BlockProductLeftoverDelete
				BEFORE DELETE ON product_leftovers
				FOR EACH ROW
				BEGIN
					DECLARE snapshot_date DATE;

					SELECT DATE(SnapshotTime)
					INTO snapshot_date
					FROM product_leftover_snapshots
					WHERE ID = OLD.ProductLeftoverID;

					IF snapshot_date IS NULL OR snapshot_date <> CURDATE() THEN
						SIGNAL SQLSTATE "45000"
							SET MESSAGE_TEXT = "Snapshot leftovers are immutable; deleting lines is not allowed.";
					END IF;
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
					CONCAT("Payment status updated to ", new_status, " for Sale #", NEW.SalesID, " after recording a payment"),
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
				DECLARE product_name VARCHAR(255);

				SELECT Quantity, ProductName
				INTO old_product_quantity, product_name
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
					CONCAT("Stock reduced by ", NEW.Quantity, " for ", COALESCE(product_name, CONCAT("Product #", NEW.ProductID)), " due to Sale #", NEW.SalesID),
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
				DECLARE item_name VARCHAR(255);

				SELECT UserID INTO stock_in_user_id
				FROM stock_in_details
				WHERE ID = NEW.StockInDetailsID;

				IF NEW.ItemType = "Inventory" THEN
					SELECT Quantity, ItemName
					INTO old_quantity, item_name
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
						CONCAT(NEW.QuantityAdded, " units added to stock for ", COALESCE(item_name, CONCAT("Inventory Item #", NEW.InventoryID)), " via Stock-In #", NEW.StockInDetailsID),
						"Update Quantity",
						"Trigger",
						NOW()
					);
				ELSEIF NEW.ItemType = "Product" THEN
					SELECT Quantity, ProductName
					INTO old_quantity, item_name
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
						CONCAT(NEW.QuantityAdded, " units added to stock for ", COALESCE(item_name, CONCAT("Product #", NEW.ProductID)), " via Stock-In #", NEW.StockInDetailsID),
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
				DECLARE item_name VARCHAR(255);
				DECLARE stock_out_reason VARCHAR(255);

				SELECT UserID, Reason
				INTO stock_out_user_id, stock_out_reason
				FROM stock_out_details
				WHERE ID = NEW.StockOutDetailsID;

				IF NEW.ItemType = "Inventory" THEN
					SELECT Quantity, ItemName
					INTO old_quantity, item_name
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
						CONCAT("Stock reduced by ", NEW.QuantityRemoved, " for ", COALESCE(item_name, CONCAT("Inventory Item #", NEW.InventoryID)), " due to ", COALESCE(stock_out_reason, "stock-out"), " on Stock-Out #", NEW.StockOutDetailsID),
						"Update Quantity",
						"Trigger",
						NOW()
					);
				ELSEIF NEW.ItemType = "Product" THEN
					SELECT Quantity, ProductName
					INTO old_quantity, item_name
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
						CONCAT("Stock reduced by ", NEW.QuantityRemoved, " for ", COALESCE(item_name, CONCAT("Product #", NEW.ProductID)), " due to ", COALESCE(stock_out_reason, "stock-out"), " on Stock-Out #", NEW.StockOutDetailsID),
						"Update Quantity",
						"Trigger",
						NOW()
					);
				END IF;
			END
		');

		DB::unprepared('
			CREATE TRIGGER AutoInventorySnapshotOnInsert
			AFTER INSERT ON inventory
			FOR EACH ROW
			BEGIN
				DECLARE snapshot_id BIGINT DEFAULT NULL;
				DECLARE snapshot_user_id BIGINT DEFAULT NULL;

				IF IFNULL(NEW.Quantity, 0) > 0 THEN
					SELECT ID INTO snapshot_id
					FROM inventory_leftover_snapshots
					WHERE SnapshotTime >= CURDATE()
						AND SnapshotTime < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
					ORDER BY SnapshotTime DESC, ID DESC
					LIMIT 1;

					IF snapshot_id IS NULL THEN
						SELECT id INTO snapshot_user_id FROM users ORDER BY id ASC LIMIT 1;
						INSERT INTO inventory_leftover_snapshots (UserID, TotalItems, TotalLeftovers, SnapshotTime)
						VALUES (snapshot_user_id, 0, 0, NOW());
						SET snapshot_id = LAST_INSERT_ID();
					END IF;

					INSERT INTO inventory_leftovers (InventoryLeftoverID, InventoryID, LeftoverQuantity, DateAdded)
					VALUES (snapshot_id, NEW.ID, NEW.Quantity, NOW())
					ON DUPLICATE KEY UPDATE
						LeftoverQuantity = VALUES(LeftoverQuantity),
						DateAdded = VALUES(DateAdded);
				END IF;
			END
		');

		DB::unprepared('
			CREATE TRIGGER AutoInventorySnapshotOnUpdate
			AFTER UPDATE ON inventory
			FOR EACH ROW
			BEGIN
				DECLARE snapshot_id BIGINT DEFAULT NULL;
				DECLARE snapshot_user_id BIGINT DEFAULT NULL;

				IF IFNULL(NEW.Quantity, 0) <> IFNULL(OLD.Quantity, 0) THEN
					SELECT ID INTO snapshot_id
					FROM inventory_leftover_snapshots
					WHERE SnapshotTime >= CURDATE()
						AND SnapshotTime < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
					ORDER BY SnapshotTime DESC, ID DESC
					LIMIT 1;

					IF snapshot_id IS NULL THEN
						SELECT id INTO snapshot_user_id FROM users ORDER BY id ASC LIMIT 1;
						INSERT INTO inventory_leftover_snapshots (UserID, TotalItems, TotalLeftovers, SnapshotTime)
						VALUES (snapshot_user_id, 0, 0, NOW());
						SET snapshot_id = LAST_INSERT_ID();
					END IF;

					IF IFNULL(NEW.Quantity, 0) > 0 THEN
						INSERT INTO inventory_leftovers (InventoryLeftoverID, InventoryID, LeftoverQuantity, DateAdded)
						VALUES (snapshot_id, NEW.ID, NEW.Quantity, NOW())
						ON DUPLICATE KEY UPDATE
							LeftoverQuantity = VALUES(LeftoverQuantity),
							DateAdded = VALUES(DateAdded);
					ELSE
						DELETE FROM inventory_leftovers
						WHERE InventoryLeftoverID = snapshot_id
							AND InventoryID = NEW.ID;
					END IF;
				END IF;
			END
		');

		DB::unprepared('
			CREATE TRIGGER AutoProductSnapshotOnInsert
			AFTER INSERT ON products
			FOR EACH ROW
			BEGIN
				DECLARE snapshot_id BIGINT DEFAULT NULL;
				DECLARE snapshot_user_id BIGINT DEFAULT NULL;
				DECLARE unit_amount DECIMAL(10, 2);

				IF IFNULL(NEW.Quantity, 0) > 0 THEN
					SELECT ID INTO snapshot_id
					FROM product_leftover_snapshots
					WHERE SnapshotTime >= CURDATE()
						AND SnapshotTime < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
					ORDER BY SnapshotTime DESC, ID DESC
					LIMIT 1;

					IF snapshot_id IS NULL THEN
						SELECT id INTO snapshot_user_id FROM users ORDER BY id ASC LIMIT 1;
						INSERT INTO product_leftover_snapshots (UserID, TotalProducts, TotalLeftovers, TotalAmount, SnapshotTime)
						VALUES (snapshot_user_id, 0, 0, 0, NOW());
						SET snapshot_id = LAST_INSERT_ID();
					END IF;

					SET unit_amount = ROUND(CAST(NEW.Price AS DECIMAL(10, 2)), 2);

					INSERT INTO product_leftovers (ProductLeftoverID, ProductID, LeftoverQuantity, PerUnitAmount, DateAdded)
					VALUES (snapshot_id, NEW.ID, NEW.Quantity, unit_amount, NOW())
					ON DUPLICATE KEY UPDATE
						LeftoverQuantity = VALUES(LeftoverQuantity),
						PerUnitAmount = VALUES(PerUnitAmount),
						DateAdded = VALUES(DateAdded);
				END IF;
			END
		');

		DB::unprepared('
			CREATE TRIGGER AutoProductSnapshotOnUpdate
			AFTER UPDATE ON products
			FOR EACH ROW
			BEGIN
				DECLARE snapshot_id BIGINT DEFAULT NULL;
				DECLARE snapshot_user_id BIGINT DEFAULT NULL;
				DECLARE unit_amount DECIMAL(10, 2);

				IF IFNULL(NEW.Quantity, 0) <> IFNULL(OLD.Quantity, 0)
					OR IFNULL(NEW.Price, 0) <> IFNULL(OLD.Price, 0) THEN
					SELECT ID INTO snapshot_id
					FROM product_leftover_snapshots
					WHERE SnapshotTime >= CURDATE()
						AND SnapshotTime < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
					ORDER BY SnapshotTime DESC, ID DESC
					LIMIT 1;

					IF snapshot_id IS NULL THEN
						SELECT id INTO snapshot_user_id FROM users ORDER BY id ASC LIMIT 1;
						INSERT INTO product_leftover_snapshots (UserID, TotalProducts, TotalLeftovers, TotalAmount, SnapshotTime)
						VALUES (snapshot_user_id, 0, 0, 0, NOW());
						SET snapshot_id = LAST_INSERT_ID();
					END IF;

					IF IFNULL(NEW.Quantity, 0) > 0 THEN
						SET unit_amount = ROUND(CAST(NEW.Price AS DECIMAL(10, 2)), 2);
						INSERT INTO product_leftovers (ProductLeftoverID, ProductID, LeftoverQuantity, PerUnitAmount, DateAdded)
						VALUES (snapshot_id, NEW.ID, NEW.Quantity, unit_amount, NOW())
						ON DUPLICATE KEY UPDATE
							LeftoverQuantity = VALUES(LeftoverQuantity),
							PerUnitAmount = VALUES(PerUnitAmount),
							DateAdded = VALUES(DateAdded);
					ELSE
						DELETE FROM product_leftovers
						WHERE ProductLeftoverID = snapshot_id
							AND ProductID = NEW.ID;
					END IF;
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
					DECLARE item_name VARCHAR(255);

					SELECT TotalItems, TotalLeftovers, UserID
					INTO old_total_items, old_total_leftovers, snapshot_user_id
					FROM inventory_leftover_snapshots
					WHERE ID = NEW.InventoryLeftoverID;

					SELECT ItemName
					INTO item_name
					FROM inventory
					WHERE ID = NEW.InventoryID;

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
						CONCAT("End-of-day snapshot updated for ", COALESCE(item_name, CONCAT("Inventory Item #", NEW.InventoryID))),
						"Update Snapshot Totals",
						"Trigger",
						NOW()
					);
				END
			');

		DB::unprepared('
				CREATE TRIGGER UpdateInventoryLeftoverSnapshotOnUpdate
				AFTER UPDATE ON inventory_leftovers
				FOR EACH ROW
				BEGIN
					DECLARE old_total_items BIGINT;
					DECLARE old_total_leftovers BIGINT;
					DECLARE snapshot_user_id BIGINT;
					DECLARE quantity_delta BIGINT;

					SELECT TotalItems, TotalLeftovers, UserID
					INTO old_total_items, old_total_leftovers, snapshot_user_id
					FROM inventory_leftover_snapshots
					WHERE ID = NEW.InventoryLeftoverID;

					SET quantity_delta = CAST(CAST(NEW.LeftoverQuantity AS SIGNED) - CAST(OLD.LeftoverQuantity AS SIGNED) AS SIGNED);

					UPDATE inventory_leftover_snapshots
					SET
						TotalLeftovers = GREATEST(0, CAST(CAST(TotalLeftovers AS SIGNED) + quantity_delta AS SIGNED))
					WHERE ID = NEW.InventoryLeftoverID;
				END
			');

		DB::unprepared('
				CREATE TRIGGER UpdateInventoryLeftoverSnapshotOnDelete
				AFTER DELETE ON inventory_leftovers
				FOR EACH ROW
				BEGIN
					DECLARE old_total_items BIGINT;
					DECLARE old_total_leftovers BIGINT;
					DECLARE snapshot_user_id BIGINT;

					SELECT TotalItems, TotalLeftovers, UserID
					INTO old_total_items, old_total_leftovers, snapshot_user_id
					FROM inventory_leftover_snapshots
					WHERE ID = OLD.InventoryLeftoverID;

					UPDATE inventory_leftover_snapshots
					SET
						TotalItems = IF(TotalItems > 0, TotalItems - 1, 0),
						TotalLeftovers = IF(TotalLeftovers > OLD.LeftoverQuantity, TotalLeftovers - OLD.LeftoverQuantity, 0)
					WHERE ID = OLD.InventoryLeftoverID;
				END
			');

		DB::unprepared('
				CREATE TRIGGER BlockInventoryLeftoverUpdate
				BEFORE UPDATE ON inventory_leftovers
				FOR EACH ROW
				BEGIN
					DECLARE snapshot_date DATE;

					SELECT DATE(SnapshotTime)
					INTO snapshot_date
					FROM inventory_leftover_snapshots
					WHERE ID = OLD.InventoryLeftoverID;

					IF snapshot_date IS NULL OR snapshot_date <> CURDATE() THEN
						SIGNAL SQLSTATE "45000"
							SET MESSAGE_TEXT = "Snapshot leftovers are immutable; updating lines is not allowed.";
					END IF;
				END
			');

		DB::unprepared('
				CREATE TRIGGER BlockInventoryLeftoverDelete
				BEFORE DELETE ON inventory_leftovers
				FOR EACH ROW
				BEGIN
					DECLARE snapshot_date DATE;

					SELECT DATE(SnapshotTime)
					INTO snapshot_date
					FROM inventory_leftover_snapshots
					WHERE ID = OLD.InventoryLeftoverID;

					IF snapshot_date IS NULL OR snapshot_date <> CURDATE() THEN
						SIGNAL SQLSTATE "45000"
							SET MESSAGE_TEXT = "Snapshot leftovers are immutable; deleting lines is not allowed.";
					END IF;
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
		DB::unprepared('DROP TRIGGER IF EXISTS UpdateTotalProductsProduced');
		DB::unprepared('DROP TRIGGER IF EXISTS UpdateProductQuantitiesOnSale');
		DB::unprepared('DROP TRIGGER IF EXISTS UpdateProductQuantitiesOnShrinkage');
		DB::unprepared('DROP TRIGGER IF EXISTS UpdatePaymentStatus');
		DB::unprepared('DROP TRIGGER IF EXISTS TriggerUpdateStockQuantitiesOnStockIn');
		DB::unprepared('DROP TRIGGER IF EXISTS TriggerUpdateStockQuantitiesOnStockOut');
		DB::unprepared('DROP TRIGGER IF EXISTS AutoInventorySnapshotOnInsert');
		DB::unprepared('DROP TRIGGER IF EXISTS AutoInventorySnapshotOnUpdate');
		DB::unprepared('DROP TRIGGER IF EXISTS AutoProductSnapshotOnInsert');
		DB::unprepared('DROP TRIGGER IF EXISTS AutoProductSnapshotOnUpdate');
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
