<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use App\Models\PermissionsSet;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class UserManagementController extends Controller {
  public function index(Request $request) {
    $requestedTab = $request->route('tab');
    $initialTab = in_array($requestedTab, ['Users', 'Permissions'], true)
      ? $requestedTab
      : 'Users';
    $user = $request->user();
    $canViewUsers = $user?->hasPermission('CanViewUserManagementUsers') ?? false;
    $canViewPermissions = $user?->hasPermission('CanViewUserManagementPermissions') ?? false;

    if ($initialTab === 'Users' && !$canViewUsers) {
      if ($canViewPermissions) {
        return redirect()->route('admin.permissions');
      }

      abort(403);
    }

    if ($initialTab === 'Permissions' && !$canViewPermissions) {
      if ($canViewUsers) {
        return redirect()->route('admin.users');
      }

      abort(403);
    }

    $actor = $request->user();
    $actor?->loadMissing('role');
    $actorRoleRank = $actor?->role?->RoleRank;
    $roles = Role::query()
      ->select(['ID', 'RoleName', 'RoleRank'])
      ->orderBy('RoleRank', 'asc')
      ->orderBy('RoleName', 'asc')
      ->get();

    $users = User::query()
      ->select(['id', 'FullName', 'email', 'RoleID', 'created_at'])
      ->with(['role:ID,RoleName,RoleRank'])
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

    $permissionGroups = $this->permissionGroups();
    $allowedPermissionNames = collect($permissionGroups)->flatten()->unique()->values();
    $permissionsByName = Permission::query()
      ->whereIn('PermissionName', $allowedPermissionNames)
      ->orderBy('PermissionName', 'asc')
      ->get(['ID', 'PermissionName'])
      ->keyBy('PermissionName');

    $permissionGroupsForView = collect($permissionGroups)->map(function ($names) use ($permissionsByName) {
      return collect($names)
        ->filter(fn ($name) => $permissionsByName->has($name))
        ->map(fn ($name) => [
          'name' => $name,
          'label' => $name,
        ])
        ->values()
        ->all();
    })->all();

    $permissionsUsers = $users->map(function ($user) use ($allowedPermissionNames) {
      $assigned = $user->permissionsSet
        ->where('Allowable', true)
        ->pluck('permission.PermissionName')
        ->filter()
        ->values()
        ->all();

      $flags = [];
      foreach ($allowedPermissionNames as $permissionName) {
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

    return Inertia::render('Administration/UserManagementTabs', [
      'users' => $users,
      'roles' => $roles,
      'permissionsUsers' => $permissionsUsers,
      'permissionGroups' => $permissionGroupsForView,
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

    $permissionGroups = $this->permissionGroups();
    $permissionEditRanks = $this->permissionEditMaxRoleRanks();
    $managedNames = collect($permissionGroups)->flatten()->unique()->values();
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
      $selfCriticalPermissions = ['CanViewUserManagementPermissions', 'CanUpdateUserPermissions'];
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

    $permissionGroupByName = [];
    foreach ($permissionGroups as $groupKey => $names) {
      foreach ($names as $name) {
        $permissionGroupByName[$name] = $groupKey;
      }
    }

    foreach ($managedNames as $permissionName) {
      if (!$permissions->has($permissionName)) {
        continue;
      }

      $allowable = $this->normalizeBoolean($submitted->get($permissionName, false));
      $permissionId = (int) $permissions[$permissionName]->ID;
      $currentAllowable = $this->normalizeBoolean($existingByPermissionId->get($permissionId, false));
      $groupKey = $permissionGroupByName[$permissionName] ?? null;
      $maxRoleRank = $groupKey ? ($permissionEditRanks[$groupKey] ?? PHP_INT_MAX) : PHP_INT_MAX;
      $isAboveActorLevel = ($actorRoleRank ?? PHP_INT_MAX) > $maxRoleRank;
      if ($isAboveActorLevel && $allowable !== $currentAllowable) {
        throw ValidationException::withMessages([
          'permissions' => "You cannot edit {$groupKey} permissions because they are above your role level.",
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

  private function permissionGroups(): array {
    return [
      'cashierLevel' => [
        'CanViewCashier',
        'CanProcessSales',
        'CanViewSalesHistory',
        'CanViewSalesHistorySales',
        'CanViewSalesHistoryPendingPayments',
        'CanRecordSalePayment',
      ],
      'clerkLevel' => [
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
        'CanViewAudits',
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

  private function rolePermissionMap(): array {
    return [
      'Owner' => '*',
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
      'Cashier' => [
        'CanViewCashier',
        'CanProcessSales',
        'CanViewSalesHistory',
        'CanViewSalesHistorySales',
        'CanViewSalesHistoryPendingPayments',
        'CanRecordSalePayment',
      ],
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
  }

  private function syncUserPermissionsFromRole(User $user): void {
    $user->loadMissing('role');
    $roleName = $user->role?->RoleName;
    if (!$roleName) {
      return;
    }

    $roleMap = $this->rolePermissionMap();
    $grants = $roleMap[$roleName] ?? [];
    $permissions = Permission::query()
      ->select(['ID', 'PermissionName'])
      ->get();

    if ($permissions->isEmpty()) {
      return;
    }

    $permissionIdsByName = $permissions->pluck('ID', 'PermissionName');
    $allPermissionIds = $permissions->pluck('ID')->all();
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
      $entry = PermissionsSet::query()->firstOrNew([
        'UserID' => $user->id,
        'PermissionID' => $permissionId,
      ]);

      if (!$entry->exists) {
        $entry->DateAdded = $now;
      }

      $entry->Allowable = isset($allowedLookup[$permissionId]);
      $entry->DateModified = $now;
      $entry->save();
    }
  }
}
