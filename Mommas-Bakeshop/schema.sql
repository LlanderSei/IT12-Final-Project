-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: mommas_bakeshop
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `audits`
--

DROP TABLE IF EXISTS `audits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audits` (
  `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `UserID` bigint(20) unsigned NOT NULL,
  `TableEdited` text NOT NULL,
  `PreviousChanges` text DEFAULT NULL,
  `SavedChanges` text DEFAULT NULL,
  `ReadableChanges` text DEFAULT NULL,
  `Action` text NOT NULL,
  `Source` enum('Application','Trigger') NOT NULL DEFAULT 'Application',
  `DateAdded` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`ID`),
  KEY `audits_userid_foreign` (`UserID`),
  CONSTRAINT `audits_userid_foreign` FOREIGN KEY (`UserID`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4081 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cache`
--

DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cache_locks`
--

DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` int(11) NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categories` (
  `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `CategoryName` text NOT NULL,
  `CategoryDescription` text NOT NULL,
  `DateAdded` timestamp NOT NULL DEFAULT current_timestamp(),
  `DateModified` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customers` (
  `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `CustomerName` text NOT NULL,
  `CustomerType` text NOT NULL,
  `ContactDetails` text NOT NULL,
  `Address` text NOT NULL,
  `DateAdded` timestamp NOT NULL DEFAULT current_timestamp(),
  `DateModified` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `failed_jobs`
--

DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `failed_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inventory`
--

DROP TABLE IF EXISTS `inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory` (
  `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `ItemName` text NOT NULL,
  `ItemDescription` text NOT NULL,
  `ItemType` text NOT NULL,
  `Measurement` text NOT NULL,
  `Quantity` bigint(20) unsigned NOT NULL,
  `LowCountThreshold` bigint(20) unsigned NOT NULL,
  `DateAdded` timestamp NOT NULL DEFAULT current_timestamp(),
  `DateModified` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `job_batches`
--

DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) unsigned NOT NULL,
  `reserved_at` int(10) unsigned DEFAULT NULL,
  `available_at` int(10) unsigned NOT NULL,
  `created_at` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `partial_payments`
--

DROP TABLE IF EXISTS `partial_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `partial_payments` (
  `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `SalesID` bigint(20) unsigned NOT NULL,
  `PaidAmount` decimal(10,2) NOT NULL,
  `PaymentMethod` text NOT NULL,
  `DateAdded` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`ID`),
  KEY `partial_payments_salesid_foreign` (`SalesID`),
  CONSTRAINT `partial_payments_salesid_foreign` FOREIGN KEY (`SalesID`) REFERENCES `sales` (`ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER UpdatePaymentStatus
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
			END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payments` (
  `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `SalesID` bigint(20) unsigned NOT NULL,
  `PaidAmount` decimal(10,2) NOT NULL,
  `TotalAmount` decimal(10,2) NOT NULL,
  `Change` decimal(10,2) NOT NULL,
  `PaymentStatus` enum('Paid','Partially Paid','Unpaid') NOT NULL DEFAULT 'Unpaid',
  `PaymentDueDate` timestamp NULL DEFAULT NULL,
  `DateAdded` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`ID`),
  KEY `payments_salesid_foreign` (`SalesID`),
  CONSTRAINT `payments_salesid_foreign` FOREIGN KEY (`SalesID`) REFERENCES `sales` (`ID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `permissions` (
  `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `PermissionName` varchar(255) NOT NULL,
  `PermissionDescription` longtext NOT NULL,
  `DateAdded` timestamp NOT NULL DEFAULT current_timestamp(),
  `DateModified` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `permissions_set`
--

DROP TABLE IF EXISTS `permissions_set`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `permissions_set` (
  `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `UserID` bigint(20) unsigned NOT NULL,
  `PermissionID` bigint(20) unsigned NOT NULL,
  `Allowable` tinyint(1) NOT NULL DEFAULT 0,
  `DateAdded` timestamp NOT NULL DEFAULT current_timestamp(),
  `DateModified` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`ID`),
  KEY `permissions_set_userid_foreign` (`UserID`),
  KEY `permissions_set_permissionid_foreign` (`PermissionID`),
  CONSTRAINT `permissions_set_permissionid_foreign` FOREIGN KEY (`PermissionID`) REFERENCES `permissions` (`ID`) ON DELETE CASCADE,
  CONSTRAINT `permissions_set_userid_foreign` FOREIGN KEY (`UserID`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `production_batch_details`
--

DROP TABLE IF EXISTS `production_batch_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `production_batch_details` (
  `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `UserID` bigint(20) unsigned NOT NULL,
  `BatchDescription` text DEFAULT NULL,
  `TotalProductsProduced` bigint(20) unsigned NOT NULL DEFAULT 0,
  `DateAdded` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`ID`),
  KEY `production_batch_details_userid_foreign` (`UserID`),
  CONSTRAINT `production_batch_details_userid_foreign` FOREIGN KEY (`UserID`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=264 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `production_batches`
--

DROP TABLE IF EXISTS `production_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `production_batches` (
  `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `BatchDetailsID` bigint(20) unsigned NOT NULL,
  `ProductID` bigint(20) unsigned NOT NULL,
  `QuantityProduced` bigint(20) unsigned NOT NULL,
  `DateAdded` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`ID`),
  KEY `production_batches_batchdetailsid_foreign` (`BatchDetailsID`),
  KEY `production_batches_productid_foreign` (`ProductID`),
  CONSTRAINT `production_batches_batchdetailsid_foreign` FOREIGN KEY (`BatchDetailsID`) REFERENCES `production_batch_details` (`ID`) ON DELETE CASCADE,
  CONSTRAINT `production_batches_productid_foreign` FOREIGN KEY (`ProductID`) REFERENCES `products` (`ID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1426 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER UpdateTotalProductsProduced
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
			END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `products` (
  `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `ProductName` text NOT NULL,
  `ProductDescription` text NOT NULL,
  `CategoryID` bigint(20) unsigned NOT NULL,
  `ProductImage` text DEFAULT NULL,
  `ProductFrom` enum('Produced','Purchased','Consignment') NOT NULL DEFAULT 'Produced',
  `Price` text NOT NULL,
  `LowStockThreshold` bigint(20) unsigned NOT NULL DEFAULT 10,
  `Quantity` bigint(20) unsigned NOT NULL,
  `DateAdded` timestamp NOT NULL DEFAULT current_timestamp(),
  `DateModified` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`ID`),
  KEY `products_categoryid_foreign` (`CategoryID`),
  CONSTRAINT `products_categoryid_foreign` FOREIGN KEY (`CategoryID`) REFERENCES `categories` (`ID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=106 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `RoleName` text NOT NULL,
  `RoleDescription` text NOT NULL,
  `RoleRank` bigint(20) unsigned NOT NULL,
  `DateAdded` timestamp NOT NULL DEFAULT current_timestamp(),
  `DateModified` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sales`
--

DROP TABLE IF EXISTS `sales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sales` (
  `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `UserID` bigint(20) unsigned NOT NULL,
  `CustomerID` bigint(20) unsigned DEFAULT NULL,
  `TotalAmount` decimal(10,2) NOT NULL,
  `DateAdded` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`ID`),
  KEY `sales_userid_foreign` (`UserID`),
  KEY `sales_customerid_foreign` (`CustomerID`),
  CONSTRAINT `sales_customerid_foreign` FOREIGN KEY (`CustomerID`) REFERENCES `customers` (`ID`) ON DELETE CASCADE,
  CONSTRAINT `sales_userid_foreign` FOREIGN KEY (`UserID`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `shrinkages`
--

DROP TABLE IF EXISTS `shrinkages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `shrinkages` (
  `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `UserID` bigint(20) unsigned NOT NULL,
  `Quantity` bigint(20) unsigned NOT NULL,
  `TotalAmount` decimal(10,2) NOT NULL,
  `Reason` enum('Spoiled','Theft','Lost') NOT NULL DEFAULT 'Spoiled',
  `DateAdded` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`ID`),
  KEY `shrinkages_userid_foreign` (`UserID`),
  CONSTRAINT `shrinkages_userid_foreign` FOREIGN KEY (`UserID`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `shrinked_products`
--

DROP TABLE IF EXISTS `shrinked_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `shrinked_products` (
  `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `ShrinkageID` bigint(20) unsigned NOT NULL,
  `ProductID` bigint(20) unsigned NOT NULL,
  `Quantity` bigint(20) unsigned NOT NULL,
  `SubAmount` decimal(10,2) NOT NULL,
  PRIMARY KEY (`ID`),
  KEY `shrinked_products_shrinkageid_foreign` (`ShrinkageID`),
  KEY `shrinked_products_productid_foreign` (`ProductID`),
  CONSTRAINT `shrinked_products_productid_foreign` FOREIGN KEY (`ProductID`) REFERENCES `products` (`ID`) ON DELETE CASCADE,
  CONSTRAINT `shrinked_products_shrinkageid_foreign` FOREIGN KEY (`ShrinkageID`) REFERENCES `shrinkages` (`ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER UpdateProductQuantitiesOnShrinkage
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
			END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `sold_products`
--

DROP TABLE IF EXISTS `sold_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sold_products` (
  `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `SalesID` bigint(20) unsigned NOT NULL,
  `ProductID` bigint(20) unsigned NOT NULL,
  `PricePerUnit` decimal(10,2) NOT NULL,
  `Quantity` bigint(20) unsigned NOT NULL,
  `SubAmount` decimal(10,2) NOT NULL,
  PRIMARY KEY (`ID`),
  KEY `sold_products_salesid_foreign` (`SalesID`),
  KEY `sold_products_productid_foreign` (`ProductID`),
  CONSTRAINT `sold_products_productid_foreign` FOREIGN KEY (`ProductID`) REFERENCES `products` (`ID`) ON DELETE CASCADE,
  CONSTRAINT `sold_products_salesid_foreign` FOREIGN KEY (`SalesID`) REFERENCES `sales` (`ID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER UpdateProductQuantitiesOnSale
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
			END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `stock_in_details`
--

DROP TABLE IF EXISTS `stock_in_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock_in_details` (
  `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `UserID` bigint(20) unsigned NOT NULL,
  `Supplier` text NOT NULL,
  `PurchaseDate` timestamp NULL DEFAULT NULL,
  `Source` enum('Purchased','Business','Donation') NOT NULL DEFAULT 'Purchased',
  `ReceiptNumber` text DEFAULT NULL,
  `InvoiceNumber` text DEFAULT NULL,
  `TotalQuantity` bigint(20) unsigned NOT NULL,
  `TotalAmount` decimal(10,2) NOT NULL,
  `AdditionalDetails` text DEFAULT NULL,
  `DateAdded` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`ID`),
  KEY `stock_in_details_userid_foreign` (`UserID`),
  CONSTRAINT `stock_in_details_userid_foreign` FOREIGN KEY (`UserID`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=241 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stock_ins`
--

DROP TABLE IF EXISTS `stock_ins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock_ins` (
  `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `StockInDetailsID` bigint(20) unsigned NOT NULL,
  `InventoryID` bigint(20) unsigned DEFAULT NULL,
  `ProductID` bigint(20) unsigned DEFAULT NULL,
  `ItemType` enum('Inventory','Product') NOT NULL,
  `QuantityAdded` bigint(20) unsigned NOT NULL,
  `SubAmount` decimal(10,2) NOT NULL,
  `DateAdded` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`ID`),
  KEY `stock_ins_stockindetailsid_foreign` (`StockInDetailsID`),
  KEY `stock_ins_inventoryid_foreign` (`InventoryID`),
  KEY `stock_ins_productid_foreign` (`ProductID`),
  CONSTRAINT `stock_ins_inventoryid_foreign` FOREIGN KEY (`InventoryID`) REFERENCES `inventory` (`ID`) ON DELETE CASCADE,
  CONSTRAINT `stock_ins_productid_foreign` FOREIGN KEY (`ProductID`) REFERENCES `products` (`ID`) ON DELETE CASCADE,
  CONSTRAINT `stock_ins_stockindetailsid_foreign` FOREIGN KEY (`StockInDetailsID`) REFERENCES `stock_in_details` (`ID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1208 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER TriggerUpdateStockQuantitiesOnStockIn
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
			END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `stock_out_details`
--

DROP TABLE IF EXISTS `stock_out_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock_out_details` (
  `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `UserID` bigint(20) unsigned NOT NULL,
  `TotalQuantity` bigint(20) unsigned NOT NULL,
  `Reason` text DEFAULT NULL,
  `DateAdded` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`ID`),
  KEY `stock_out_details_userid_foreign` (`UserID`),
  CONSTRAINT `stock_out_details_userid_foreign` FOREIGN KEY (`UserID`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stock_outs`
--

DROP TABLE IF EXISTS `stock_outs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock_outs` (
  `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `StockOutDetailsID` bigint(20) unsigned NOT NULL,
  `InventoryID` bigint(20) unsigned DEFAULT NULL,
  `ProductID` bigint(20) unsigned DEFAULT NULL,
  `ItemType` enum('Inventory','Product') NOT NULL,
  `QuantityRemoved` bigint(20) unsigned NOT NULL,
  `SubAmount` decimal(10,2) NOT NULL,
  `DateAdded` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`ID`),
  KEY `stock_outs_stockoutdetailsid_foreign` (`StockOutDetailsID`),
  KEY `stock_outs_inventoryid_foreign` (`InventoryID`),
  KEY `stock_outs_productid_foreign` (`ProductID`),
  CONSTRAINT `stock_outs_inventoryid_foreign` FOREIGN KEY (`InventoryID`) REFERENCES `inventory` (`ID`) ON DELETE CASCADE,
  CONSTRAINT `stock_outs_productid_foreign` FOREIGN KEY (`ProductID`) REFERENCES `products` (`ID`) ON DELETE CASCADE,
  CONSTRAINT `stock_outs_stockoutdetailsid_foreign` FOREIGN KEY (`StockOutDetailsID`) REFERENCES `stock_out_details` (`ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER TriggerUpdateStockQuantitiesOnStockOut
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
			END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `FullName` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `RoleID` bigint(20) unsigned NOT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_roleid_foreign` (`RoleID`),
  CONSTRAINT `users_roleid_foreign` FOREIGN KEY (`RoleID`) REFERENCES `roles` (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-09 21:02:13
