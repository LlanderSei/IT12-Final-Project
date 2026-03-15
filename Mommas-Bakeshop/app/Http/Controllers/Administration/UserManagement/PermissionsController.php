<?php

namespace App\Http\Controllers\Administration\UserManagement;

use App\Models\Permission;
use App\Models\PermissionsSet;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PermissionsController extends UserManagementBaseController {
  public function index(Request $request) {
    return $this->renderUserManagementTabs($request, 'Permissions');
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
}
