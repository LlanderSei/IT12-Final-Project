<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class PermissionsSeeder extends Seeder {
	/**
	 * Run the database seeds.
	 */
	public function run(): void {
		$permissions = [
			// POS
			['PermissionName' => 'CanViewCashier', 'PermissionDescription' => 'Can access the cashier interface.'],
			['PermissionName' => 'CanProcessSales', 'PermissionDescription' => 'Can process sales and cashier checkout flows.'],
			['PermissionName' => 'CanViewSalesHistory', 'PermissionDescription' => 'Can access sales history and related records.'],
			['PermissionName' => 'CanViewSalesHistorySales', 'PermissionDescription' => 'Can access the Sales tab in sales history.'],
			['PermissionName' => 'CanViewSalesHistoryPendingPayments', 'PermissionDescription' => 'Can access the Pending Payments tab in sales history.'],
			['PermissionName' => 'CanRecordSalePayment', 'PermissionDescription' => 'Can record or update pending payment entries.'],

			// Inventory
			['PermissionName' => 'CanViewInventoryLevels', 'PermissionDescription' => 'Can access inventory levels and management.'],
			['PermissionName' => 'CanCreateInventoryItem', 'PermissionDescription' => 'Can add new inventory items.'],
			['PermissionName' => 'CanUpdateInventoryItem', 'PermissionDescription' => 'Can modify existing inventory items.'],
			['PermissionName' => 'CanDeleteInventoryItem', 'PermissionDescription' => 'Can delete inventory items.'],
			['PermissionName' => 'CanCreateStockIn', 'PermissionDescription' => 'Can perform stock-in operations.'],
			['PermissionName' => 'CanUpdateStockIn', 'PermissionDescription' => 'Can modify stock-in records.'],
			['PermissionName' => 'CanDeleteStockIn', 'PermissionDescription' => 'Can delete stock-in records.'],
			['PermissionName' => 'CanCreateStockOut', 'PermissionDescription' => 'Can perform stock-out operations.'],
			['PermissionName' => 'CanUpdateStockOut', 'PermissionDescription' => 'Can modify stock-out records.'],
			['PermissionName' => 'CanDeleteStockOut', 'PermissionDescription' => 'Can delete stock-out records.'],

			// Product and Batch Management
			['PermissionName' => 'CanViewProductsAndBatches', 'PermissionDescription' => 'Can access products and batches management.'],
			['PermissionName' => 'CanCreateProduct', 'PermissionDescription' => 'Can add new products.'],
			['PermissionName' => 'CanUpdateProduct', 'PermissionDescription' => 'Can modify existing products.'],
			['PermissionName' => 'CanDeleteProduct', 'PermissionDescription' => 'Can delete products.'],
			['PermissionName' => 'CanCreateProductCategory', 'PermissionDescription' => 'Can add new product categories.'],
			['PermissionName' => 'CanUpdateProductCategory', 'PermissionDescription' => 'Can modify existing product categories.'],
			['PermissionName' => 'CanDeleteProductCategory', 'PermissionDescription' => 'Can delete product categories.'],
			['PermissionName' => 'CanCreateProductionBatch', 'PermissionDescription' => 'Can record production batches.'],
			['PermissionName' => 'CanUpdateProductionBatch', 'PermissionDescription' => 'Can edit production batch records.'],
			['PermissionName' => 'CanDeleteProductionBatch', 'PermissionDescription' => 'Can delete production batch records.'],

			// Administration
			['PermissionName' => 'CanViewReports', 'PermissionDescription' => 'Can view reports and analytics.'],
			['PermissionName' => 'CanViewReportsOverview', 'PermissionDescription' => 'Can access the overview tab in reports.'],
			['PermissionName' => 'CanExportReportsOverview', 'PermissionDescription' => 'Can export overview report data to external formats.'],
			['PermissionName' => 'CanViewReportsFullBreakdown', 'PermissionDescription' => 'Can access the full breakdown tab in reports.'],
			['PermissionName' => 'CanExportReportsFullBreakdown', 'PermissionDescription' => 'Can export full breakdown report data to external formats.'],

			// Users and Permissions
			['PermissionName' => 'CanViewUserManagement', 'PermissionDescription' => 'Can access user management features.'],
			['PermissionName' => 'CanViewUserManagementUsers', 'PermissionDescription' => 'Can access the Users tab in user management.'],
			['PermissionName' => 'CanCreateUser', 'PermissionDescription' => 'Can add new user accounts.'],
			['PermissionName' => 'CanUpdateUser', 'PermissionDescription' => 'Can modify existing user accounts.'],
			['PermissionName' => 'CanDeleteUser', 'PermissionDescription' => 'Can delete user accounts.'],
			['PermissionName' => 'CanViewUserManagementPermissions', 'PermissionDescription' => 'Can access the Permissions tab in user management.'],
			['PermissionName' => 'CanUpdateUserPermissions', 'PermissionDescription' => 'Can change user permissions.'],
			['PermissionName' => 'CanViewAudits', 'PermissionDescription' => 'Can read audit logs and details.'],

			// Deferred:
			// Sales and Shrinkage report tab permissions are intentionally postponed
			// until the final reports top-nav scope is finalized.
		];

		foreach ($permissions as $permission) {
			Permission::updateOrCreate(
				['PermissionName' => $permission['PermissionName']],
				['PermissionDescription' => $permission['PermissionDescription']]
			);
		}
	}
}
