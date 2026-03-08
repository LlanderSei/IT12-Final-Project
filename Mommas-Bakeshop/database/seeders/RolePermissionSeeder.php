<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\PermissionsSet;
use App\Models\Role;
use App\Models\RolePresetPermission;
use App\Models\User;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder {
	/**
	 * Seed role preset permissions, then sync user-level permission rows from presets.
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
				'CanViewJobOrderInvoices',
				'CanExportJobOrderInvoices',
				'CanViewPaymentReceipts',
				'CanExportPaymentReceipts',
				'CanViewShrinkageHistory',
				'CanUpdateShrinkageRecord',
				'CanDeleteShrinkageRecord',
				'CanRecordSalePayment',
				'CanViewCustomers',
				'CanCreateCustomer',
				'CanUpdateCustomer',
				'CanDeleteCustomer',
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
				'CanViewInventorySnapshots',
				'CanRecordInventorySnapshot',
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
				'CanViewProductSnapshots',
				'CanRecordProductSnapshot',
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
				'CanViewUserManagementRoles',
				'CanCreateRole',
				'CanUpdateRole',
				'CanDeleteRole',
				'CanUpdateRoleOrder',
				'CanViewUserManagementPermissionGroups',
				'CanCreatePermissionGroup',
				'CanUpdatePermissionGroup',
				'CanDeletePermissionGroup',
				'CanViewAudits',
				'CanViewDatabase',
				'CanCreateDatabaseSnapshot',
				'CanCreateDatabaseIncremental',
				'CanRestoreDatabaseBackup',
				'CanManageDatabaseBackupSettings',
				'CanCleanupDatabaseBackups',
				'CanDownloadDatabaseBackup',
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
				'CanViewJobOrderInvoices',
				'CanExportJobOrderInvoices',
				'CanViewPaymentReceipts',
				'CanExportPaymentReceipts',
				'CanViewShrinkageHistory',
				'CanCreateShrinkageRecord',
				'CanUpdateShrinkageRecord',
				'CanDeleteShrinkageRecord',
				'CanRecordSalePayment',
				'CanViewCustomers',
				'CanCreateCustomer',
				'CanUpdateCustomer',
				'CanDeleteCustomer',
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
				'CanViewInventorySnapshots',
				'CanRecordInventorySnapshot',
				'CanViewProductsAndBatches',
				'CanCreateProduct',
				'CanUpdateProduct',
				'CanCreateProductCategory',
				'CanUpdateProductCategory',
				'CanCreateProductionBatch',
				'CanUpdateProductionBatch',
				'CanViewProductSnapshots',
				'CanRecordProductSnapshot',
			],
		];

		foreach ($rolePermissionMap as $roleName => $grants) {
			$role = Role::query()
				->where('RoleName', $roleName)
				->first();

			if (!$role) {
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

			foreach ($allPermissionIds as $permissionId) {
				$preset = RolePresetPermission::query()->firstOrNew([
					'RoleID' => $role->ID,
					'PermissionID' => $permissionId,
				]);

				if (!$preset->exists) {
					$preset->DateAdded = $now;
				}

				$preset->Allowable = isset($allowedLookup[$permissionId]);
				$preset->DateModified = $now;
				$preset->save();
			}
		}

		$roles = Role::query()->select(['ID', 'RoleName'])->get();
		foreach ($roles as $role) {
			$allowedPermissionIds = RolePresetPermission::query()
				->where('RoleID', $role->ID)
				->where('Allowable', true)
				->pluck('PermissionID')
				->map(fn ($id) => (int) $id)
				->all();

			if ($role->RoleName === 'Owner' && count($allowedPermissionIds) === 0) {
				$allowedPermissionIds = $allPermissionIds;
			}

			$allowedLookup = array_flip($allowedPermissionIds);
			$now = now();
			$userIds = User::query()
				->where('RoleID', $role->ID)
				->pluck('id');

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
