<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use App\Models\PermissionGroup;
use App\Models\PermissionsSet;
use App\Models\Role;
use App\Models\RolePresetPermission;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class UserManagementController extends Controller {
  public function index(Request $request) {
    $requestedTab = $request->route('tab');
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
      ->select(['id', 'FullName', 'email', 'RoleID', 'created_at'])
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

  public function updatePermissions(Request $request, int $id) {
    $targetUser = User::query()->findOrFail($id);
    $targetUser->loadMissing('role');
    $actor = $request->user();
    $actor?->loadMissing('role');
    $actorRoleRank = $actor?->role?->RoleRank;
    $targetRoleRank = $targetUser->role?->RoleRank;
    if (!$this->canManageByRole($actorRoleRank, $targetRoleRank)) {
      throw ValidationException::withMessages([
        'permissions' => 'You can only edit permissions for users with the same role or lower.',
      ]);
    }

    $permissionColumns = $this->permissionColumns();
    $permissionEditRanks = $this->permissionEditMaxRoleRanks();
    $managedNames = collect($permissionColumns)->flatten()->unique()->values();
    $permissions = Permission::query()
      ->whereIn('PermissionName', $managedNames)
      ->get(['ID', 'PermissionName'])
      ->keyBy('PermissionName');

    $validated = $request->validate([
      'permissions' => ['required', 'array'],
      'permissions.*' => ['nullable'],
    ]);

    $submitted = collect($validated['permissions']);
    $now = now();
    $isSelfUpdate = (int) $targetUser->id === (int) ($actor?->id ?? 0);
    if ($isSelfUpdate) {
      $selfCriticalPermissions = [
        'CanViewUserManagementPermissions',
        'CanUpdateUserPermissions',
      ];
      foreach ($selfCriticalPermissions as $permissionName) {
        $submittedValue = $submitted->get($permissionName, null);
        if ($submittedValue === null) {
          continue;
        }
        if ($this->normalizeBoolean($submittedValue) === false) {
          throw ValidationException::withMessages([
            'permissions' => 'Warning: You cannot revoke your own permissions to view or update permissions.',
          ]);
        }
      }
    }

    $permissionIds = $permissions->pluck('ID')->values()->all();
    $existingByPermissionId = PermissionsSet::query()
      ->where('UserID', $targetUser->id)
      ->whereIn('PermissionID', $permissionIds)
      ->pluck('Allowable', 'PermissionID');

    $permissionColumnByName = [];
    foreach ($permissionColumns as $columnKey => $names) {
      foreach ($names as $name) {
        $permissionColumnByName[$name] = $columnKey;
      }
    }

    foreach ($managedNames as $permissionName) {
      if (!$permissions->has($permissionName)) {
        continue;
      }

      $allowable = $this->normalizeBoolean($submitted->get($permissionName, false));
      $permissionId = (int) $permissions[$permissionName]->ID;
      $currentAllowable = $this->normalizeBoolean($existingByPermissionId->get($permissionId, false));
      $columnKey = $permissionColumnByName[$permissionName] ?? null;
      $maxRoleRank = $columnKey ? ($permissionEditRanks[$columnKey] ?? PHP_INT_MAX) : PHP_INT_MAX;
      $isAboveActorLevel = ($actorRoleRank ?? PHP_INT_MAX) > $maxRoleRank;
      if ($isAboveActorLevel && $allowable !== $currentAllowable) {
        throw ValidationException::withMessages([
          'permissions' => "You cannot edit {$columnKey} permissions because they are above your role level.",
        ]);
      }

      $entry = PermissionsSet::query()->firstOrNew([
        'UserID' => $targetUser->id,
        'PermissionID' => $permissionId,
      ]);

      if (!$entry->exists) {
        $entry->DateAdded = $now;
      }

      $entry->Allowable = $allowable;
      $entry->DateModified = $now;
      $entry->save();
    }

    return redirect()
      ->route('admin.permissions')
      ->with('success', 'User permissions updated.');
  }

  public function store(Request $request) {
    $this->mergeRoleIdFromName($request);

    $data = $request->validate([
      'FullName' => ['required', 'string', 'max:255'],
      'email' => ['required', 'email', 'max:255', 'unique:users,email'],
      'RoleID' => ['required', 'integer', 'exists:roles,ID'],
      'password' => ['required', 'string', 'min:8', 'confirmed'],
    ]);

    $actor = $request->user();
    $actor?->loadMissing('role');
    $targetRole = Role::query()->find($data['RoleID']);
    if (!$this->canAssignByRole($actor?->role?->RoleRank, $targetRole?->RoleRank)) {
      return redirect()->back()->with('error', 'You cannot assign a role higher than your own.');
    }

    $user = User::create([
      'FullName' => $data['FullName'],
      'email' => strtolower($data['email']),
      'RoleID' => $data['RoleID'],
      'password' => Hash::make($data['password']),
    ]);
    $this->syncUserPermissionsFromRole($user);

    return redirect()->route('admin.users')->with('success', 'User created successfully.');
  }

  public function update(Request $request, int $id) {
    $user = User::findOrFail($id);
    $originalRoleId = (int) $user->RoleID;
    $this->mergeRoleIdFromName($request);

    $data = $request->validate([
      'FullName' => ['required', 'string', 'max:255'],
      'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
      'RoleID' => ['required', 'integer', 'exists:roles,ID'],
      'password' => ['nullable', 'string', 'min:8', 'confirmed'],
    ]);

    $actor = $request->user();
    $actor?->loadMissing('role');
    $user->loadMissing('role');
    if (!$this->canManageByRole($actor?->role?->RoleRank, $user->role?->RoleRank)) {
      return redirect()->back()->with('error', 'You can only edit users with the same role or lower.');
    }
    if (
      $actor &&
      (int) $actor->id === (int) $user->id &&
      isset($data['RoleID']) &&
      (int) $data['RoleID'] !== (int) $user->RoleID
    ) {
      return redirect()->back()->with('error', 'You cannot change your own role rank.');
    }

    $targetRole = Role::query()->find($data['RoleID']);
    if (!$this->canAssignByRole($actor?->role?->RoleRank, $targetRole?->RoleRank)) {
      return redirect()->back()->with('error', 'You cannot assign a role higher than your own.');
    }

    $payload = [
      'FullName' => $data['FullName'],
      'email' => strtolower($data['email']),
      'RoleID' => $data['RoleID'],
    ];

    if (!empty($data['password'])) {
      $payload['password'] = Hash::make($data['password']);
    }

    $user->update($payload);
    if ($originalRoleId !== (int) $user->RoleID) {
      $this->syncUserPermissionsFromRole($user);
    }

    return redirect()->back()->with('success', 'User updated successfully.');
  }

  public function destroy(Request $request, int $id) {
    $target = User::findOrFail($id);
    $currentUser = $request->user();
    $currentUser?->loadMissing('role');
    $target->loadMissing('role');

    if ((int) $currentUser->id === (int) $target->id) {
      return redirect()->back()->with('error', 'You cannot delete your own account.');
    }

    if (!$this->canDeleteByRole($currentUser?->role?->RoleRank, $target->role?->RoleRank)) {
      return redirect()->back()->with('error', 'You can only delete users with the same role or lower.');
    }

    $target->delete();

    return redirect()->back()->with('success', 'User deleted successfully.');
  }

  public function storeRole(Request $request) {
    $actor = $request->user();
    $actor?->loadMissing('role');

    $validated = $request->validate([
      'RoleName' => ['required', 'string', 'max:255', 'unique:roles,RoleName'],
      'RoleDescription' => ['nullable', 'string', 'max:1000'],
      'RoleColor' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
      'permissions' => ['required', 'array'],
      'permissions.*' => ['nullable'],
    ]);

    if (strtolower(trim($validated['RoleName'])) === 'owner') {
      throw ValidationException::withMessages([
        'RoleName' => 'The Owner role is reserved and cannot be recreated.',
      ]);
    }

    $permissions = $this->resolveManagedPermissions();
    $this->assertPermissionsWithinActorScope($validated['permissions'], $permissions, $actor?->role?->RoleRank);

    $nextRank = ((int) Role::query()->max('RoleRank')) + 1;
    $role = Role::query()->create([
      'RoleName' => trim($validated['RoleName']),
      'RoleDescription' => trim((string) ($validated['RoleDescription'] ?? '')),
      'RoleColor' => strtoupper($validated['RoleColor']),
      'RoleRank' => max(2, $nextRank),
      'DateAdded' => now(),
      'DateModified' => now(),
    ]);

    $this->syncRolePresetPermissions($role, $validated['permissions'], $permissions);

    return redirect()->route('admin.roles')->with('success', 'Role created successfully.');
  }

  public function updateRole(Request $request, int $id) {
    $actor = $request->user();
    $actor?->loadMissing('role');
    $role = Role::query()->withCount('users')->findOrFail($id);
    $this->assertRoleManageable($actor?->role?->RoleRank, $role);

    $validated = $request->validate([
      'RoleName' => ['required', 'string', 'max:255', Rule::unique('roles', 'RoleName')->ignore($role->ID, 'ID')],
      'RoleDescription' => ['nullable', 'string', 'max:1000'],
      'RoleColor' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
      'permissions' => ['required', 'array'],
      'permissions.*' => ['nullable'],
    ]);

    if ($this->isSystemOwnerRole($role)) {
      $role->update([
        'RoleColor' => strtoupper($validated['RoleColor']),
        'DateModified' => now(),
      ]);

      return redirect()->route('admin.roles')->with('success', 'Owner role color updated successfully.');
    }

    if (strtolower(trim($validated['RoleName'])) === 'owner') {
      throw ValidationException::withMessages([
        'RoleName' => 'The Owner role name is reserved.',
      ]);
    }

    $permissions = $this->resolveManagedPermissions();
    $this->assertPermissionsWithinActorScope($validated['permissions'], $permissions, $actor?->role?->RoleRank);

    $role->update([
      'RoleName' => trim($validated['RoleName']),
      'RoleDescription' => trim((string) ($validated['RoleDescription'] ?? '')),
      'RoleColor' => strtoupper($validated['RoleColor']),
      'DateModified' => now(),
    ]);

    $this->syncRolePresetPermissions($role, $validated['permissions'], $permissions);
    $this->syncUsersForRole($role);

    return redirect()->route('admin.roles')->with('success', 'Role preset updated successfully.');
  }

  public function destroyRole(Request $request, int $id) {
    $actor = $request->user();
    $actor?->loadMissing('role');
    $role = Role::query()->withCount('users')->findOrFail($id);
    $this->assertRoleManageable($actor?->role?->RoleRank, $role);

    if ($this->isSystemOwnerRole($role)) {
      return redirect()->back()->with('error', 'The Owner role cannot be deleted.');
    }

    if ((int) $role->users_count > 0) {
      return redirect()->back()->with('error', 'Delete or reassign users from this role before deleting it.');
    }

    $role->delete();
    $this->resequenceRoles();

    return redirect()->route('admin.roles')->with('success', 'Role deleted successfully.');
  }

  public function reorderRoles(Request $request) {
    $actor = $request->user();
    $actor?->loadMissing('role');

    $validated = $request->validate([
      'roleIds' => ['required', 'array', 'min:1'],
      'roleIds.*' => ['integer', 'distinct', 'exists:roles,ID'],
    ]);

    $allRoles = Role::query()
      ->select(['ID', 'RoleName', 'RoleRank'])
      ->orderBy('RoleRank', 'asc')
      ->orderBy('RoleName', 'asc')
      ->get();

    $ownerRole = $allRoles->first(fn ($role) => $this->isSystemOwnerRole($role));
    $reorderableRoles = $allRoles->reject(fn ($role) => $this->isSystemOwnerRole($role))->values();
    $submittedIds = collect($validated['roleIds'])->map(fn ($id) => (int) $id)->values();
    $expectedIds = $reorderableRoles->pluck('ID')->map(fn ($id) => (int) $id)->values();

    if ($submittedIds->sort()->values()->all() !== $expectedIds->sort()->values()->all()) {
      throw ValidationException::withMessages([
        'roleIds' => 'Role order payload is invalid or incomplete.',
      ]);
    }

    foreach ($reorderableRoles as $role) {
      $this->assertRoleManageable($actor?->role?->RoleRank, $role);
    }

    $orderedRoles = $submittedIds
      ->map(fn ($roleId) => $reorderableRoles->firstWhere('ID', $roleId))
      ->filter()
      ->values();

    if ($ownerRole) {
      $ownerRole->forceFill([
        'RoleRank' => 1,
        'DateModified' => now(),
      ])->save();
    }

    $rank = 2;
    foreach ($orderedRoles as $role) {
      $role->forceFill([
        'RoleRank' => $rank++,
        'DateModified' => now(),
      ])->save();
    }

    return redirect()->route('admin.roles')->with('success', 'Role order updated successfully.');
  }

  public function storePermissionGroup(Request $request) {
    $validated = $request->validate([
      'GroupName' => ['required', 'string', 'max:255', 'unique:permission_groups,GroupName'],
      'GroupDescription' => ['nullable', 'string', 'max:1000'],
    ]);

    PermissionGroup::query()->create([
      'GroupName' => trim($validated['GroupName']),
      'GroupDescription' => trim((string) ($validated['GroupDescription'] ?? '')),
      'DisplayOrder' => ((int) PermissionGroup::query()->max('DisplayOrder')) + 1,
      'DateAdded' => now(),
      'DateModified' => now(),
    ]);

    return redirect()->route('admin.permission-groups')->with('success', 'Permission group created successfully.');
  }

  public function updatePermissionGroup(Request $request, int $id) {
    $group = PermissionGroup::query()->findOrFail($id);
    $validated = $request->validate([
      'GroupName' => ['required', 'string', 'max:255', Rule::unique('permission_groups', 'GroupName')->ignore($group->ID, 'ID')],
      'GroupDescription' => ['nullable', 'string', 'max:1000'],
    ]);

    $group->update([
      'GroupName' => trim($validated['GroupName']),
      'GroupDescription' => trim((string) ($validated['GroupDescription'] ?? '')),
      'DateModified' => now(),
    ]);

    return redirect()->route('admin.permission-groups')->with('success', 'Permission group updated successfully.');
  }

  public function destroyPermissionGroup(Request $request, int $id) {
    $group = PermissionGroup::query()->withCount('permissions')->findOrFail($id);

    if ((int) $group->permissions_count > 0) {
      return redirect()->back()->with('error', 'Reassign or remove permissions from this group before deleting it.');
    }

    $group->delete();
    $this->resequencePermissionGroups();

    return redirect()->route('admin.permission-groups')->with('success', 'Permission group deleted successfully.');
  }

  private function mergeRoleIdFromName(Request $request): void {
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

  private function canDeleteByRole(?int $currentRank, ?int $targetRank): bool {
    $currentRank = $currentRank ?? PHP_INT_MAX;
    $targetRank = $targetRank ?? PHP_INT_MAX;

    return $currentRank <= $targetRank;
  }

  private function canManageByRole(?int $currentRank, ?int $targetRank): bool {
    return $this->canDeleteByRole($currentRank, $targetRank);
  }

  private function canAssignByRole(?int $currentRank, ?int $targetRank): bool {
    return $this->canDeleteByRole($currentRank, $targetRank);
  }

  private function permissionColumns(): array {
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
        'CanDeleteCustomer',
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
    ];
  }

  private function permissionEditMaxRoleRanks(): array {
    return [
      'cashierLevel' => 3,
      'clerkLevel' => 4,
      'adminLevel' => 2,
    ];
  }

  private function normalizeBoolean($value): bool {
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

  private function resolveManagedPermissions() {
    $managedPermissionNames = collect($this->permissionColumns())
      ->flatten()
      ->unique()
      ->values();

    return Permission::query()
      ->whereIn('PermissionName', $managedPermissionNames)
      ->orderBy('PermissionName', 'asc')
      ->get(['ID', 'PermissionName']);
  }

  private function syncRolePresetPermissions(Role $role, array $submittedPermissions, $permissions): void {
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

  private function syncUserPermissionsFromRole(User $user): void {
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

  private function syncUsersForRole(Role $role): void {
    User::query()
      ->where('RoleID', $role->ID)
      ->get()
      ->each(fn ($user) => $this->syncUserPermissionsFromRole($user));
  }

  private function assertPermissionsWithinActorScope(array $submittedPermissions, $permissions, ?int $actorRoleRank): void {
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

  private function assertRoleManageable(?int $actorRoleRank, Role $role): void {
    if (!$this->canManageByRole($actorRoleRank, $role->RoleRank)) {
      throw ValidationException::withMessages([
        'role' => 'You can only manage roles with the same rank or lower.',
      ]);
    }
  }

  private function isSystemOwnerRole(Role $role): bool {
    return (int) $role->RoleRank === 1 || strtolower(trim((string) $role->RoleName)) === 'owner';
  }

  private function resequenceRoles(): void {
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

  private function resequencePermissionGroups(): void {
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
