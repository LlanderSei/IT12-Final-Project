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
		];
		foreach ($groups as $group) {
			PermissionGroup::updateOrCreate(
				['GroupName' => $group['GroupName']],
				[
					'GroupDescription' => $group['GroupDescription'],
					'DisplayOrder' => $group['DisplayOrder'],
					'DateModified' => now(),
				]
			);
		}

		$groupIdsByName = PermissionGroup::query()
			->pluck('ID', 'GroupName');

		$permissions = [
			// POS
			['PermissionName' => 'CanViewCashier', 'PermissionDescription' => 'Can access the cashier interface.', 'PermissionGroup' => 'Cashier'],
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
			['PermissionName' => 'CanDeleteShrinkageRecord', 'PermissionDescription' => 'Can delete shrinkage records and restore affected quantities.', 'PermissionGroup' => 'Shrinkage History'],
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

			// Deferred:
			// Sales and Shrinkage report tab permissions are intentionally postponed
			// until the final reports top-nav scope is finalized.
		];

		foreach ($permissions as $permission) {
			Permission::updateOrCreate(
				['PermissionName' => $permission['PermissionName']],
				[
					'PermissionDescription' => $permission['PermissionDescription'],
					'PermissionGroupID' => $groupIdsByName->get($permission['PermissionGroup']),
				]
			);
		}
	}
}
