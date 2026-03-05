<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\PermissionsSet;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder {
	/**
	 * Sync user-level permission rows based on role defaults.
	 */
	public function run(): void {
		$permissions = Permission::query()
			->select(['ID', 'PermissionName'])
			->get();

		if ($permissions->isEmpty()) {
			return;
		}

		$permissionIdsByName = $permissions->pluck('ID', 'PermissionName');
		$allPermissionIds = $permissions->pluck('ID')->all();

		$rolePermissionMap = [
			// Full access.
			'Owner' => '*',

			// Broad operational + administrative access except cashier checkout actions.
			'Admin' => [
				'CanViewSalesHistory',
				'CanViewSalesHistorySales',
				'CanViewSalesHistoryPendingPayments',
				'CanRecordSalePayment',
				'CanViewInventoryLevels',
				'CanCreateInventoryItem',
				'CanUpdateInventoryItem',
				'CanDeleteInventoryItem',
				'CanCreateStockIn',
				'CanUpdateStockIn',
				'CanDeleteStockIn',
				'CanCreateStockOut',
				'CanUpdateStockOut',
				'CanDeleteStockOut',
				'CanViewProductsAndBatches',
				'CanCreateProduct',
				'CanUpdateProduct',
				'CanDeleteProduct',
				'CanCreateProductCategory',
				'CanUpdateProductCategory',
				'CanDeleteProductCategory',
				'CanCreateProductionBatch',
				'CanUpdateProductionBatch',
				'CanDeleteProductionBatch',
				'CanViewReports',
				'CanViewReportsOverview',
				'CanExportReportsOverview',
				'CanViewReportsFullBreakdown',
				'CanExportReportsFullBreakdown',
				'CanViewUserManagement',
				'CanViewUserManagementUsers',
				'CanCreateUser',
				'CanUpdateUser',
				'CanDeleteUser',
				'CanViewUserManagementPermissions',
				'CanUpdateUserPermissions',
				'CanViewAudits',
			],

			// POS-focused access.
			'Cashier' => [
				'CanViewCashier',
				'CanProcessSalesWalkIn',
				'CanProcessSalesJobOrders',
				'CanProcessSalesShrinkage',
				'CanViewSalesHistory',
				'CanViewSalesHistorySales',
				'CanViewSalesHistoryPendingPayments',
				'CanRecordSalePayment',
			],

			// Inventory/product operations without admin management access.
			'Clerk' => [
				'CanViewInventoryLevels',
				'CanCreateInventoryItem',
				'CanUpdateInventoryItem',
				'CanCreateStockIn',
				'CanUpdateStockIn',
				'CanCreateStockOut',
				'CanUpdateStockOut',
				'CanViewProductsAndBatches',
				'CanCreateProduct',
				'CanUpdateProduct',
				'CanCreateProductCategory',
				'CanUpdateProductCategory',
				'CanCreateProductionBatch',
				'CanUpdateProductionBatch',
			],
		];

		foreach ($rolePermissionMap as $roleName => $grants) {
			$roleId = Role::query()
				->where('RoleName', $roleName)
				->value('ID');

			if (!$roleId) {
				continue;
			}

			$userIds = User::query()
				->where('RoleID', $roleId)
				->pluck('id');

			if ($userIds->isEmpty()) {
				continue;
			}

			$allowedPermissionIds = $grants === '*'
				? $allPermissionIds
				: collect($grants)
				->map(fn($name) => $permissionIdsByName->get($name))
				->filter()
				->values()
				->all();

			$allowedLookup = array_flip($allowedPermissionIds);
			$now = now();

			foreach ($userIds as $userId) {
				foreach ($allPermissionIds as $permissionId) {
					$permissionSet = PermissionsSet::query()->firstOrNew([
						'UserID' => $userId,
						'PermissionID' => $permissionId,
					]);

					if (!$permissionSet->exists) {
						$permissionSet->DateAdded = $now;
					}

					$permissionSet->Allowable = isset($allowedLookup[$permissionId]);
					$permissionSet->DateModified = $now;
					$permissionSet->save();
				}
			}
		}
	}
}
