<?php

namespace App\Http\Controllers\Administration\UserManagement;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\PermissionGroup;
use App\Models\PermissionsSet;
use App\Models\Role;
use App\Models\RolePresetPermission;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class UserManagementBaseController extends Controller {
  protected function renderUserManagementTabs(Request $request, ?string $forcedTab = null) {
    $requestedTab = $forcedTab ?? $request->route('tab');
    $actor = $request->user();
    $actor?->loadMissing('role');
    $canViewUsers = $actor?->hasPermission('CanViewUserManagementUsers') ?? false;
    $canViewPermissions = $actor?->hasPermission('CanViewUserManagementPermissions') ?? false;
    $canViewRoles = $actor?->hasPermission('CanViewUserManagementRoles') ?? false;
    $canViewPermissionGroups = $actor?->hasPermission('CanViewUserManagementPermissionGroups') ?? false;
    $availableTabs = [
      'Users' => $canViewUsers,
      'Permissions' => $canViewPermissions,
      'Roles' => $canViewRoles,
      'Permission Groups' => $canViewPermissionGroups,
    ];
    $fallbackTab = collect($availableTabs)
      ->filter()
      ->keys()
      ->first();
    $initialTab = array_key_exists($requestedTab, $availableTabs) ? $requestedTab : $fallbackTab;

    if (!$initialTab || !$availableTabs[$initialTab]) {
      if ($canViewUsers) {
        return redirect()->route('admin.users');
      }
      if ($canViewPermissions) {
        return redirect()->route('admin.permissions');
      }
      if ($canViewRoles) {
        return redirect()->route('admin.roles');
      }
      if ($canViewPermissionGroups) {
        return redirect()->route('admin.permission-groups');
      }
      abort(403);
    }

    $actorRoleRank = $actor?->role?->RoleRank;
    $roles = Role::query()
      ->select(['ID', 'RoleName', 'RoleDescription', 'RoleColor', 'RoleRank'])
      ->withCount('users')
      ->orderBy('RoleRank', 'asc')
      ->orderBy('RoleName', 'asc')
      ->get();

    $users = User::query()
      ->notArchived()
      ->select(['id', 'FullName', 'email', 'RoleID', 'IsActive', 'created_at'])
      ->with(['role:ID,RoleName,RoleColor,RoleRank'])
      ->with(['permissionsSet.permission:ID,PermissionName'])
      ->withCount([
        'permissionsSet',
        'audits',
        'productionBatches',
        'sales',
        'shrinkages',
        'stockIns',
        'stockOuts',
      ])
      ->orderBy('FullName', 'asc')
      ->get()
      ->map(function ($user) {
        $user->Roles = $user->role?->RoleName;
        $user->RoleRank = $user->role?->RoleRank;
        $user->RelationCount =
          $user->permissions_set_count +
          $user->audits_count +
          $user->production_batches_count +
          $user->sales_count +
          $user->shrinkages_count +
          $user->stock_ins_count +
          $user->stock_outs_count;

        return $user;
      });

    $permissionColumns = $this->permissionColumns();
    $managedPermissionNames = collect($permissionColumns)->flatten()->unique()->values();
    $permissions = Permission::query()
      ->whereIn('PermissionName', $managedPermissionNames)
      ->with('group:ID,GroupName,GroupDescription')
      ->orderBy('PermissionName', 'asc')
      ->get(['ID', 'PermissionName', 'PermissionDescription', 'PermissionGroupID'])
      ->keyBy('PermissionName');

    $permissionGroupsForView = collect($permissionColumns)->map(function ($names) use ($permissions) {
      return collect($names)
        ->filter(fn ($name) => $permissions->has($name))
        ->map(function ($name) use ($permissions) {
          $permission = $permissions->get($name);

          return [
            'id' => (int) $permission->ID,
            'name' => $name,
            'label' => $name,
            'description' => $permission->PermissionDescription,
            'groupName' => $permission->group?->GroupName,
            'groupDescription' => $permission->group?->GroupDescription,
          ];
        })
        ->values()
        ->all();
    })->all();

    $permissionsUsers = $users->map(function ($user) use ($managedPermissionNames) {
      $assigned = $user->permissionsSet
        ->where('Allowable', true)
        ->pluck('permission.PermissionName')
        ->filter()
        ->values()
        ->all();

      $flags = [];
      foreach ($managedPermissionNames as $permissionName) {
        $flags[$permissionName] = in_array($permissionName, $assigned, true);
      }

      return [
        'id' => $user->id,
        'FullName' => $user->FullName,
        'Role' => $user->role?->RoleName,
        'RoleRank' => $user->role?->RoleRank,
        'permissions' => $flags,
      ];
    })->values();

    $rolePresetRows = Role::query()
      ->select(['ID', 'RoleName', 'RoleDescription', 'RoleColor', 'RoleRank'])
      ->withCount('users')
      ->with([
        'presetPermissions' => fn ($query) => $query
          ->where('Allowable', true)
          ->with('permission:ID,PermissionName'),
      ])
      ->orderBy('RoleRank', 'asc')
      ->orderBy('RoleName', 'asc')
      ->get()
      ->map(function ($role) use ($managedPermissionNames) {
        $assigned = $role->presetPermissions
          ->pluck('permission.PermissionName')
          ->filter()
          ->values()
          ->all();

        $flags = [];
        foreach ($managedPermissionNames as $permissionName) {
          $flags[$permissionName] = in_array($permissionName, $assigned, true);
        }

        return [
          'id' => (int) $role->ID,
          'RoleName' => $role->RoleName,
          'RoleDescription' => $role->RoleDescription,
          'RoleColor' => $role->RoleColor,
          'RoleRank' => (int) $role->RoleRank,
          'UsersCount' => (int) $role->users_count,
          'PresetPermissionCount' => count(array_filter($flags)),
          'IsSystemOwner' => $this->isSystemOwnerRole($role),
          'permissions' => $flags,
        ];
      })
      ->values();

    $permissionGroupRows = PermissionGroup::query()
      ->select(['ID', 'GroupName', 'GroupDescription', 'DisplayOrder'])
      ->withCount('permissions')
      ->orderBy('DisplayOrder', 'asc')
      ->orderBy('GroupName', 'asc')
      ->get()
      ->map(fn ($group) => [
        'id' => (int) $group->ID,
        'GroupName' => $group->GroupName,
        'GroupDescription' => $group->GroupDescription,
        'DisplayOrder' => (int) $group->DisplayOrder,
        'PermissionsCount' => (int) $group->permissions_count,
      ])
      ->values();

    return Inertia::render('Administration/UserManagementTabs', [
      'users' => $users,
      'roles' => $roles,
      'permissionsUsers' => $permissionsUsers,
      'permissionGroups' => $permissionGroupsForView,
      'rolePresets' => $rolePresetRows,
      'permissionGroupRows' => $permissionGroupRows,
      'currentUserRoleRank' => $actorRoleRank,
      'initialTab' => $initialTab,
    ]);
  }

  protected function mergeRoleIdFromName(Request $request): void {
    if ($request->filled('RoleID')) {
      return;
    }

    $roleName = trim((string) $request->input('Roles'));

    if ($roleName === '') {
      return;
    }

    $roleId = Role::query()
      ->whereRaw('LOWER(RoleName) = ?', [strtolower($roleName)])
      ->value('ID');

    if ($roleId !== null) {
      $request->merge(['RoleID' => (int) $roleId]);
    }
  }

  protected function canDeleteByRole(?int $currentRank, ?int $targetRank): bool {
    $currentRank = $currentRank ?? PHP_INT_MAX;
    $targetRank = $targetRank ?? PHP_INT_MAX;

    return $currentRank <= $targetRank;
  }

  protected function canManageByRole(?int $currentRank, ?int $targetRank): bool {
    return $this->canDeleteByRole($currentRank, $targetRank);
  }

  protected function canAssignByRole(?int $currentRank, ?int $targetRank): bool {
    return $this->canDeleteByRole($currentRank, $targetRank);
  }

  protected function permissionColumns(): array {
    return [
      'cashierLevel' => [
        'CanViewCashier',
        'CanViewJobOrders',
        'CanCreateJobOrders',
        'CanViewPendingJobOrders',
        'CanViewJobOrdersHistory',
        'CanCancelJobOrders',
        'CanPrintJobOrders',
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
        'CanRecordSalePayment',
        'CanViewCustomers',
        'CanCreateCustomer',
        'CanUpdateCustomer',
        'CanArchiveCustomer',
      ],
      'clerkLevel' => [
        'CanViewShrinkageHistory',
        'CanCreateShrinkageRecord',
        'CanUpdateShrinkageRecord',
        'CanDeleteShrinkageRecord',
        'CanVerifyShrinkageRecord',
        'CanViewInventoryLevels',
        'CanCreateInventoryItem',
        'CanUpdateInventoryItem',
        'CanArchiveInventoryItem',
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
        'CanArchiveProduct',
        'CanCreateProductCategory',
        'CanUpdateProductCategory',
        'CanDeleteProductCategory',
        'CanCreateProductionBatch',
        'CanUpdateProductionBatch',
        'CanDeleteProductionBatch',
        'CanViewProductSnapshots',
        'CanRecordProductSnapshot',
      ],
      'adminLevel' => [
        'CanViewReports',
        'CanViewReportsOverview',
        'CanExportReportsOverview',
        'CanViewReportsFullBreakdown',
        'CanExportReportsFullBreakdown',
        'CanViewUserManagement',
        'CanViewUserManagementUsers',
        'CanCreateUser',
        'CanUpdateUser',
        'CanArchiveUser',
        'CanRestoreUser',
        'CanViewArchives',
        'CanRestoreCustomer',
        'CanRestoreProduct',
        'CanRestoreInventoryItem',
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
        'CanViewDatabaseBackups',
        'CanViewDatabaseConnections',
        'CanViewDatabaseMaintenanceJobs',
        'CanViewDatabaseSchemaReport',
        'CanViewDatabaseDataTransfer',
        'CanViewDatabaseRetentionCleanup',
        'CanManageDatabaseConnections',
        'CanTestDatabaseConnections',
        'CanInitializeRemoteDatabase',
        'CanRunDatabaseSchemaReport',
        'CanTransferDatabaseToRemote',
        'CanCreateDatabaseSnapshot',
        'CanCreateDatabaseIncremental',
        'CanVerifyDatabaseBackup',
        'CanRestoreDatabaseBackup',
        'CanManageDatabaseBackupSettings',
        'CanCleanupDatabaseBackups',
        'CanDownloadDatabaseBackup',
      ],
      'systemsLevel' => [
        'CanUpdateImageHosting',
      ],
    ];
  }

  protected function permissionEditMaxRoleRanks(): array {
    return [
      'cashierLevel' => 3,
      'clerkLevel' => 4,
      'adminLevel' => 2,
      'systemsLevel' => 1,
    ];
  }

  protected function normalizeBoolean($value): bool {
    if (is_bool($value)) {
      return $value;
    }

    if (is_int($value) || is_float($value)) {
      return (int) $value === 1;
    }

    if (is_string($value)) {
      $normalized = strtolower(trim($value));
      return in_array($normalized, ['1', 'true', 'on', 'yes'], true);
    }

    return false;
  }

  protected function resolveManagedPermissions() {
    $managedPermissionNames = collect($this->permissionColumns())
      ->flatten()
      ->unique()
      ->values();

    return Permission::query()
      ->whereIn('PermissionName', $managedPermissionNames)
      ->orderBy('PermissionName', 'asc')
      ->get(['ID', 'PermissionName']);
  }

  protected function syncRolePresetPermissions(Role $role, array $submittedPermissions, $permissions): void {
    $submitted = collect($submittedPermissions);
    $now = now();

    foreach ($permissions as $permission) {
      $entry = RolePresetPermission::query()->firstOrNew([
        'RoleID' => $role->ID,
        'PermissionID' => $permission->ID,
      ]);

      if (!$entry->exists) {
        $entry->DateAdded = $now;
      }

      $entry->Allowable = $this->normalizeBoolean($submitted->get($permission->PermissionName, false));
      $entry->DateModified = $now;
      $entry->save();
    }
  }

  protected function syncUserPermissionsFromRole(User $user): void {
    $user->loadMissing('role');
    $role = $user->role;
    if (!$role) {
      return;
    }

    $permissions = Permission::query()
      ->select(['ID'])
      ->orderBy('ID', 'asc')
      ->get();

    if ($permissions->isEmpty()) {
      return;
    }

    $allowedPermissionIds = RolePresetPermission::query()
      ->where('RoleID', $role->ID)
      ->where('Allowable', true)
      ->pluck('PermissionID')
      ->map(fn ($id) => (int) $id)
      ->all();

    if ($this->isSystemOwnerRole($role) && count($allowedPermissionIds) === 0) {
      $allowedPermissionIds = $permissions->pluck('ID')->map(fn ($id) => (int) $id)->all();
    }

    $allowedLookup = array_flip($allowedPermissionIds);
    $now = now();

    foreach ($permissions as $permission) {
      $entry = PermissionsSet::query()->firstOrNew([
        'UserID' => $user->id,
        'PermissionID' => $permission->ID,
      ]);

      if (!$entry->exists) {
        $entry->DateAdded = $now;
      }

      $entry->Allowable = isset($allowedLookup[(int) $permission->ID]);
      $entry->DateModified = $now;
      $entry->save();
    }
  }

  protected function syncUsersForRole(Role $role): void {
    User::query()
      ->where('RoleID', $role->ID)
      ->get()
      ->each(fn ($user) => $this->syncUserPermissionsFromRole($user));
  }

  protected function assertPermissionsWithinActorScope(array $submittedPermissions, $permissions, ?int $actorRoleRank): void {
    $permissionEditRanks = $this->permissionEditMaxRoleRanks();
    $columnByPermission = [];
    foreach ($this->permissionColumns() as $columnKey => $names) {
      foreach ($names as $name) {
        $columnByPermission[$name] = $columnKey;
      }
    }

    $submitted = collect($submittedPermissions);
    foreach ($permissions as $permission) {
      $columnKey = $columnByPermission[$permission->PermissionName] ?? null;
      $maxRoleRank = $columnKey ? ($permissionEditRanks[$columnKey] ?? PHP_INT_MAX) : PHP_INT_MAX;
      if (($actorRoleRank ?? PHP_INT_MAX) > $maxRoleRank && $this->normalizeBoolean($submitted->get($permission->PermissionName, false))) {
        throw ValidationException::withMessages([
          'permissions' => "You cannot assign {$columnKey} permissions above your role level.",
        ]);
      }
    }
  }

  protected function assertRoleManageable(?int $actorRoleRank, Role $role): void {
    if (!$this->canManageByRole($actorRoleRank, $role->RoleRank)) {
      throw ValidationException::withMessages([
        'role' => 'You can only manage roles with the same rank or lower.',
      ]);
    }
  }

  protected function isSystemOwnerRole(Role $role): bool {
    return (int) $role->RoleRank === 1 || strtolower(trim((string) $role->RoleName)) === 'owner';
  }

  protected function resequenceRoles(): void {
    $roles = Role::query()
      ->select(['ID', 'RoleName', 'RoleRank'])
      ->orderBy('RoleRank', 'asc')
      ->orderBy('RoleName', 'asc')
      ->get();

    $ownerRole = $roles->first(fn ($role) => $this->isSystemOwnerRole($role));
    if ($ownerRole && (int) $ownerRole->RoleRank !== 1) {
      $ownerRole->forceFill([
        'RoleRank' => 1,
        'DateModified' => now(),
      ])->save();
    }

    $rank = 2;
    foreach ($roles->reject(fn ($role) => $this->isSystemOwnerRole($role)) as $role) {
      if ((int) $role->RoleRank === $rank) {
        $rank++;
        continue;
      }

      $role->forceFill([
        'RoleRank' => $rank++,
        'DateModified' => now(),
      ])->save();
    }
  }

  protected function resequencePermissionGroups(): void {
    $order = 1;
    foreach (
      PermissionGroup::query()
        ->select(['ID', 'DisplayOrder', 'GroupName'])
        ->orderBy('DisplayOrder', 'asc')
        ->orderBy('GroupName', 'asc')
        ->get() as $group
    ) {
      if ((int) $group->DisplayOrder === $order) {
        $order++;
        continue;
      }

      $group->forceFill([
        'DisplayOrder' => $order++,
        'DateModified' => now(),
      ])->save();
    }
  }
}
