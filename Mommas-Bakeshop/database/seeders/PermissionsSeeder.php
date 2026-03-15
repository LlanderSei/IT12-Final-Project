<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\PermissionGroup;
use Illuminate\Database\Seeder;

class PermissionsSeeder extends Seeder {
	/**
	 * Run the database seeds.
	 */
	public function run(): void {
		$groups = [
			['GroupName' => 'Cashier', 'GroupDescription' => 'Cashier access and checkout actions.', 'DisplayOrder' => 1],
			['GroupName' => 'Sale History', 'GroupDescription' => 'Sales history and pending payment access.', 'DisplayOrder' => 2],
			['GroupName' => 'Shrinkage History', 'GroupDescription' => 'Shrinkage history access and actions.', 'DisplayOrder' => 3],
			['GroupName' => 'Customers', 'GroupDescription' => 'Customer directory and maintenance.', 'DisplayOrder' => 4],
			['GroupName' => 'Inventory Levels', 'GroupDescription' => 'Inventory level records and stock movements.', 'DisplayOrder' => 5],
			['GroupName' => 'Inventory Snapshots', 'GroupDescription' => 'Inventory snapshot viewing and recording.', 'DisplayOrder' => 6],
			['GroupName' => 'Products & Batches', 'GroupDescription' => 'Product, category, and production batch management.', 'DisplayOrder' => 7],
			['GroupName' => 'Product Snapshots', 'GroupDescription' => 'Product snapshot viewing and recording.', 'DisplayOrder' => 8],
			['GroupName' => 'Reports', 'GroupDescription' => 'Reports viewing and export access.', 'DisplayOrder' => 9],
			['GroupName' => 'User Management', 'GroupDescription' => 'Users, permissions, and roles administration.', 'DisplayOrder' => 10],
			['GroupName' => 'Audits', 'GroupDescription' => 'Audit history access.', 'DisplayOrder' => 11],
			['GroupName' => 'Database', 'GroupDescription' => 'Database backup management and local backup downloads.', 'DisplayOrder' => 12],
			['GroupName' => 'Application', 'GroupDescription' => 'General application settings and configurations.', 'DisplayOrder' => 13],
		];
		foreach ($groups as $group) {
			PermissionGroup::firstOrCreate(
				['GroupName' => $group['GroupName']],
				[
					'GroupDescription' => $group['GroupDescription'],
					'DisplayOrder' => $group['DisplayOrder'],
				]
			);
		}

		$groupIdsByName = PermissionGroup::query()
			->pluck('ID', 'GroupName');

		$permissions = [
			// POS
			['PermissionName' => 'CanViewCashier', 'PermissionDescription' => 'Can access the cashier interface.', 'PermissionGroup' => 'Cashier'],
			['PermissionName' => 'CanViewJobOrders', 'PermissionDescription' => 'Can access job order management screens.', 'PermissionGroup' => 'Cashier'],
			['PermissionName' => 'CanCreateJobOrders', 'PermissionDescription' => 'Can create new job orders.', 'PermissionGroup' => 'Cashier'],
			['PermissionName' => 'CanViewPendingJobOrders', 'PermissionDescription' => 'Can access pending job orders.', 'PermissionGroup' => 'Cashier'],
			['PermissionName' => 'CanViewJobOrdersHistory', 'PermissionDescription' => 'Can access job order history records.', 'PermissionGroup' => 'Cashier'],
			['PermissionName' => 'CanCancelJobOrders', 'PermissionDescription' => 'Can cancel pending job orders.', 'PermissionGroup' => 'Cashier'],
			['PermissionName' => 'CanPrintJobOrders', 'PermissionDescription' => 'Can print job order summaries.', 'PermissionGroup' => 'Cashier'],
			['PermissionName' => 'CanProcessSalesWalkIn', 'PermissionDescription' => 'Can process walk-in sales checkout.', 'PermissionGroup' => 'Cashier'],
			['PermissionName' => 'CanProcessSalesJobOrders', 'PermissionDescription' => 'Can process job-order sales checkout.', 'PermissionGroup' => 'Cashier'],
			['PermissionName' => 'CanProcessSalesShrinkage', 'PermissionDescription' => 'Can record shrinkage transactions.', 'PermissionGroup' => 'Cashier'],
			['PermissionName' => 'CanViewSalesHistory', 'PermissionDescription' => 'Can access sales history and related records.', 'PermissionGroup' => 'Sale History'],
			['PermissionName' => 'CanViewSalesHistorySales', 'PermissionDescription' => 'Can access the Sales tab in sales history.', 'PermissionGroup' => 'Sale History'],
			['PermissionName' => 'CanViewSalesHistoryPendingPayments', 'PermissionDescription' => 'Can access the Pending Payments tab in sales history.', 'PermissionGroup' => 'Sale History'],
			['PermissionName' => 'CanViewJobOrderInvoices', 'PermissionDescription' => 'Can view job order invoice details.', 'PermissionGroup' => 'Sale History'],
			['PermissionName' => 'CanExportJobOrderInvoices', 'PermissionDescription' => 'Can export job order invoices to PDF.', 'PermissionGroup' => 'Sale History'],
			['PermissionName' => 'CanViewPaymentReceipts', 'PermissionDescription' => 'Can view job order payment receipt details.', 'PermissionGroup' => 'Sale History'],
			['PermissionName' => 'CanExportPaymentReceipts', 'PermissionDescription' => 'Can export payment receipts to PDF.', 'PermissionGroup' => 'Sale History'],
			['PermissionName' => 'CanViewShrinkageHistory', 'PermissionDescription' => 'Can access shrinkage history records and details.', 'PermissionGroup' => 'Shrinkage History'],
			['PermissionName' => 'CanCreateShrinkageRecord', 'PermissionDescription' => 'Can record new shrinkage entries from shrinkage history.', 'PermissionGroup' => 'Shrinkage History'],
			['PermissionName' => 'CanUpdateShrinkageRecord', 'PermissionDescription' => 'Can modify existing shrinkage records and their line items.', 'PermissionGroup' => 'Shrinkage History'],
			['PermissionName' => 'CanDeleteShrinkageRecord', 'PermissionDescription' => 'Can delete pending shrinkage records.', 'PermissionGroup' => 'Shrinkage History'],
			['PermissionName' => 'CanVerifyShrinkageRecord', 'PermissionDescription' => 'Can verify or reject pending shrinkage records.', 'PermissionGroup' => 'Shrinkage History'],
			['PermissionName' => 'CanRecordSalePayment', 'PermissionDescription' => 'Can record or update pending payment entries.', 'PermissionGroup' => 'Sale History'],
			['PermissionName' => 'CanViewCustomers', 'PermissionDescription' => 'Can access customer records and details.', 'PermissionGroup' => 'Customers'],
			['PermissionName' => 'CanCreateCustomer', 'PermissionDescription' => 'Can add new customers.', 'PermissionGroup' => 'Customers'],
			['PermissionName' => 'CanUpdateCustomer', 'PermissionDescription' => 'Can modify customer records.', 'PermissionGroup' => 'Customers'],
			['PermissionName' => 'CanDeleteCustomer', 'PermissionDescription' => 'Can delete customer records that have no sales history.', 'PermissionGroup' => 'Customers'],

			// Inventory
			['PermissionName' => 'CanViewInventoryLevels', 'PermissionDescription' => 'Can access inventory levels and management.', 'PermissionGroup' => 'Inventory Levels'],
			['PermissionName' => 'CanCreateInventoryItem', 'PermissionDescription' => 'Can add new inventory items.', 'PermissionGroup' => 'Inventory Levels'],
			['PermissionName' => 'CanUpdateInventoryItem', 'PermissionDescription' => 'Can modify existing inventory items.', 'PermissionGroup' => 'Inventory Levels'],
			['PermissionName' => 'CanDeleteInventoryItem', 'PermissionDescription' => 'Can delete inventory items.', 'PermissionGroup' => 'Inventory Levels'],
			['PermissionName' => 'CanCreateStockIn', 'PermissionDescription' => 'Can perform stock-in operations.', 'PermissionGroup' => 'Inventory Levels'],
			['PermissionName' => 'CanUpdateStockIn', 'PermissionDescription' => 'Can modify stock-in records.', 'PermissionGroup' => 'Inventory Levels'],
			['PermissionName' => 'CanDeleteStockIn', 'PermissionDescription' => 'Can delete stock-in records.', 'PermissionGroup' => 'Inventory Levels'],
			['PermissionName' => 'CanCreateStockOut', 'PermissionDescription' => 'Can perform stock-out operations.', 'PermissionGroup' => 'Inventory Levels'],
			['PermissionName' => 'CanUpdateStockOut', 'PermissionDescription' => 'Can modify stock-out records.', 'PermissionGroup' => 'Inventory Levels'],
			['PermissionName' => 'CanDeleteStockOut', 'PermissionDescription' => 'Can delete stock-out records.', 'PermissionGroup' => 'Inventory Levels'],
			['PermissionName' => 'CanViewInventorySnapshots', 'PermissionDescription' => 'Can access inventory snapshots tab and details.', 'PermissionGroup' => 'Inventory Snapshots'],
			['PermissionName' => 'CanRecordInventorySnapshot', 'PermissionDescription' => 'Can record inventory snapshots.', 'PermissionGroup' => 'Inventory Snapshots'],

			// Product and Batch Management
			['PermissionName' => 'CanViewProductsAndBatches', 'PermissionDescription' => 'Can access products and batches management.', 'PermissionGroup' => 'Products & Batches'],
			['PermissionName' => 'CanCreateProduct', 'PermissionDescription' => 'Can add new products.', 'PermissionGroup' => 'Products & Batches'],
			['PermissionName' => 'CanUpdateProduct', 'PermissionDescription' => 'Can modify existing products.', 'PermissionGroup' => 'Products & Batches'],
			['PermissionName' => 'CanDeleteProduct', 'PermissionDescription' => 'Can delete products.', 'PermissionGroup' => 'Products & Batches'],
			['PermissionName' => 'CanCreateProductCategory', 'PermissionDescription' => 'Can add new product categories.', 'PermissionGroup' => 'Products & Batches'],
			['PermissionName' => 'CanUpdateProductCategory', 'PermissionDescription' => 'Can modify existing product categories.', 'PermissionGroup' => 'Products & Batches'],
			['PermissionName' => 'CanDeleteProductCategory', 'PermissionDescription' => 'Can delete product categories.', 'PermissionGroup' => 'Products & Batches'],
			['PermissionName' => 'CanCreateProductionBatch', 'PermissionDescription' => 'Can record production batches.', 'PermissionGroup' => 'Products & Batches'],
			['PermissionName' => 'CanUpdateProductionBatch', 'PermissionDescription' => 'Can edit production batch records.', 'PermissionGroup' => 'Products & Batches'],
			['PermissionName' => 'CanDeleteProductionBatch', 'PermissionDescription' => 'Can delete production batch records.', 'PermissionGroup' => 'Products & Batches'],
			['PermissionName' => 'CanViewProductSnapshots', 'PermissionDescription' => 'Can access product snapshots tab and details.', 'PermissionGroup' => 'Product Snapshots'],
			['PermissionName' => 'CanRecordProductSnapshot', 'PermissionDescription' => 'Can record product snapshots.', 'PermissionGroup' => 'Product Snapshots'],

			// Administration
			['PermissionName' => 'CanViewReports', 'PermissionDescription' => 'Can view reports and analytics.', 'PermissionGroup' => 'Reports'],
			['PermissionName' => 'CanViewReportsOverview', 'PermissionDescription' => 'Can access the overview tab in reports.', 'PermissionGroup' => 'Reports'],
			['PermissionName' => 'CanExportReportsOverview', 'PermissionDescription' => 'Can export overview report data to external formats.', 'PermissionGroup' => 'Reports'],
			['PermissionName' => 'CanViewReportsFullBreakdown', 'PermissionDescription' => 'Can access the full breakdown tab in reports.', 'PermissionGroup' => 'Reports'],
			['PermissionName' => 'CanExportReportsFullBreakdown', 'PermissionDescription' => 'Can export full breakdown report data to external formats.', 'PermissionGroup' => 'Reports'],

			// Users and Permissions
			['PermissionName' => 'CanViewUserManagement', 'PermissionDescription' => 'Can access user management features.', 'PermissionGroup' => 'User Management'],
			['PermissionName' => 'CanViewUserManagementUsers', 'PermissionDescription' => 'Can access the Users tab in user management.', 'PermissionGroup' => 'User Management'],
			['PermissionName' => 'CanCreateUser', 'PermissionDescription' => 'Can add new user accounts.', 'PermissionGroup' => 'User Management'],
			['PermissionName' => 'CanUpdateUser', 'PermissionDescription' => 'Can modify existing user accounts.', 'PermissionGroup' => 'User Management'],
			['PermissionName' => 'CanDeleteUser', 'PermissionDescription' => 'Can delete user accounts.', 'PermissionGroup' => 'User Management'],
			['PermissionName' => 'CanViewUserManagementPermissions', 'PermissionDescription' => 'Can access the Permissions tab in user management.', 'PermissionGroup' => 'User Management'],
			['PermissionName' => 'CanUpdateUserPermissions', 'PermissionDescription' => 'Can change user permissions.', 'PermissionGroup' => 'User Management'],
			['PermissionName' => 'CanViewUserManagementRoles', 'PermissionDescription' => 'Can access the Roles tab in user management.', 'PermissionGroup' => 'User Management'],
			['PermissionName' => 'CanCreateRole', 'PermissionDescription' => 'Can create new role presets.', 'PermissionGroup' => 'User Management'],
			['PermissionName' => 'CanUpdateRole', 'PermissionDescription' => 'Can edit existing role presets.', 'PermissionGroup' => 'User Management'],
			['PermissionName' => 'CanDeleteRole', 'PermissionDescription' => 'Can delete existing role presets.', 'PermissionGroup' => 'User Management'],
			['PermissionName' => 'CanUpdateRoleOrder', 'PermissionDescription' => 'Can reorder role ranks.', 'PermissionGroup' => 'User Management'],
			['PermissionName' => 'CanViewUserManagementPermissionGroups', 'PermissionDescription' => 'Can access the Permission Groups tab in user management.', 'PermissionGroup' => 'User Management'],
			['PermissionName' => 'CanCreatePermissionGroup', 'PermissionDescription' => 'Can create permission groups.', 'PermissionGroup' => 'User Management'],
			['PermissionName' => 'CanUpdatePermissionGroup', 'PermissionDescription' => 'Can edit permission groups.', 'PermissionGroup' => 'User Management'],
			['PermissionName' => 'CanDeletePermissionGroup', 'PermissionDescription' => 'Can delete permission groups that are no longer assigned.', 'PermissionGroup' => 'User Management'],
			['PermissionName' => 'CanViewAudits', 'PermissionDescription' => 'Can read audit logs and details.', 'PermissionGroup' => 'Audits'],
			['PermissionName' => 'CanViewDatabase', 'PermissionDescription' => 'Can access the database backup administration page.', 'PermissionGroup' => 'Database'],
			['PermissionName' => 'CanViewDatabaseBackups', 'PermissionDescription' => 'Can access the Backups tab in database administration.', 'PermissionGroup' => 'Database'],
			['PermissionName' => 'CanViewDatabaseConnections', 'PermissionDescription' => 'Can access the Connection Management tab in database administration.', 'PermissionGroup' => 'Database'],
			['PermissionName' => 'CanViewDatabaseMaintenanceJobs', 'PermissionDescription' => 'Can access the Maintenance Jobs tab in database administration.', 'PermissionGroup' => 'Database'],
			['PermissionName' => 'CanViewDatabaseSchemaReport', 'PermissionDescription' => 'Can access the Schema Report tab in database administration.', 'PermissionGroup' => 'Database'],
			['PermissionName' => 'CanViewDatabaseDataTransfer', 'PermissionDescription' => 'Can access the Data Transfer tab in database administration.', 'PermissionGroup' => 'Database'],
			['PermissionName' => 'CanViewDatabaseRetentionCleanup', 'PermissionDescription' => 'Can access the Retention & Cleanup tab in database administration.', 'PermissionGroup' => 'Database'],
			['PermissionName' => 'CanManageDatabaseConnections', 'PermissionDescription' => 'Can save and switch local versus remote MySQL connection settings.', 'PermissionGroup' => 'Database'],
			['PermissionName' => 'CanTestDatabaseConnections', 'PermissionDescription' => 'Can test the configured remote MySQL connection.', 'PermissionGroup' => 'Database'],
			['PermissionName' => 'CanInitializeRemoteDatabase', 'PermissionDescription' => 'Can create the configured remote MySQL database and run migrations plus seeders there.', 'PermissionGroup' => 'Database'],
			['PermissionName' => 'CanRunDatabaseSchemaReport', 'PermissionDescription' => 'Can run a full local-versus-remote schema compatibility report.', 'PermissionGroup' => 'Database'],
			['PermissionName' => 'CanTransferDatabaseToRemote', 'PermissionDescription' => 'Can overwrite the configured remote MySQL database with local application data.', 'PermissionGroup' => 'Database'],
			['PermissionName' => 'CanCreateDatabaseSnapshot', 'PermissionDescription' => 'Can create full snapshot backups locally.', 'PermissionGroup' => 'Database'],
			['PermissionName' => 'CanCreateDatabaseIncremental', 'PermissionDescription' => 'Can create incremental backups from the database change log.', 'PermissionGroup' => 'Database'],
			['PermissionName' => 'CanVerifyDatabaseBackup', 'PermissionDescription' => 'Can verify a backup chain by replaying it into a temporary MySQL database.', 'PermissionGroup' => 'Database'],
			['PermissionName' => 'CanRestoreDatabaseBackup', 'PermissionDescription' => 'Can restore local database backups and create a fresh post-restore baseline.', 'PermissionGroup' => 'Database'],
			['PermissionName' => 'CanManageDatabaseBackupSettings', 'PermissionDescription' => 'Can update local backup retention and cleanup settings.', 'PermissionGroup' => 'Database'],
			['PermissionName' => 'CanCleanupDatabaseBackups', 'PermissionDescription' => 'Can delete old local backups using the configured retention rules.', 'PermissionGroup' => 'Database'],
			['PermissionName' => 'CanDownloadDatabaseBackup', 'PermissionDescription' => 'Can download generated database backup files.', 'PermissionGroup' => 'Database'],

			// Application Settings
			['PermissionName' => 'CanUpdateImageHosting', 'PermissionDescription' => 'Can modify image hosting service and API keys.', 'PermissionGroup' => 'Application'],

			// Deferred:
			// Sales and Shrinkage report tab permissions are intentionally postponed
			// until the final reports top-nav scope is finalized.
		];

		foreach ($permissions as $permission) {
			Permission::firstOrCreate(
				['PermissionName' => $permission['PermissionName']],
				[
					'PermissionDescription' => $permission['PermissionDescription'],
					'PermissionGroupID' => $groupIdsByName->get($permission['PermissionGroup']),
				]
			);
		}

		Permission::query()
			->whereIn('PermissionName', ['CanManageJobOrders'])
			->delete();
	}
}
