<?php

namespace App\Http\Controllers\Administration\UserManagement;

use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class RolesController extends UserManagementBaseController {
  public function index(Request $request) {
    return $this->renderUserManagementTabs($request, 'Roles');
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
}
