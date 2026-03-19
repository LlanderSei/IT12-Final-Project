<?php

namespace App\Http\Controllers\Administration\UserManagement;

use App\Models\Role;
use App\Models\User;
use App\Services\AuditTrailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UsersController extends UserManagementBaseController {
  public function index(Request $request) {
    return $this->renderUserManagementTabs($request, 'Users');
  }

  public function store(Request $request) {
    $this->mergeRoleIdFromName($request);

    $data = $request->validate([
      'FullName' => ['required', 'string', 'max:255'],
      'email' => ['required', 'email', 'max:255', 'unique:users,email'],
      'RoleID' => ['required', 'integer', 'exists:roles,ID'],
      'IsActive' => ['nullable', 'boolean'],
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
      'IsActive' => $this->normalizeBoolean($data['IsActive'] ?? true),
      'password' => Hash::make($data['password']),
    ]);
    $this->syncUserPermissionsFromRole($user);

    return redirect()->route('admin.users')->with('success', 'User created successfully.');
  }

  public function update(Request $request, int $id) {
    $user = User::query()->notArchived()->findOrFail($id);
    $originalRoleId = (int) $user->RoleID;
    $this->mergeRoleIdFromName($request);

    $data = $request->validate([
      'FullName' => ['required', 'string', 'max:255'],
      'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
      'RoleID' => ['required', 'integer', 'exists:roles,ID'],
      'IsActive' => ['nullable', 'boolean'],
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

    $isSelfUpdate = $actor && (int) $actor->id === (int) $user->id;
    $isOwnerSelfUpdate = $isSelfUpdate && $actor?->role && $this->isSystemOwnerRole($actor->role);
    if ($isOwnerSelfUpdate && array_key_exists('IsActive', $data)) {
      $requestedActive = $this->normalizeBoolean($data['IsActive']);
      if ($requestedActive === false) {
        return redirect()->back()->with('error', 'Owner accounts cannot be deactivated.');
      }
    }

    $targetRole = Role::query()->find($data['RoleID']);
    if (!$this->canAssignByRole($actor?->role?->RoleRank, $targetRole?->RoleRank)) {
      return redirect()->back()->with('error', 'You cannot assign a role higher than your own.');
    }

    $payload = [
      'FullName' => $data['FullName'],
      'email' => strtolower($data['email']),
      'RoleID' => $data['RoleID'],
      'IsActive' => $this->normalizeBoolean($data['IsActive'] ?? $user->IsActive),
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

  public function destroy(Request $request, int $id, AuditTrailService $auditTrail) {
    $target = User::query()->notArchived()->findOrFail($id);
    $currentUser = $request->user();
    $currentUser?->loadMissing('role');
    $target->loadMissing('role');

    if ((int) $currentUser->id === (int) $target->id) {
      return redirect()->back()->with('error', 'You cannot archive your own account.');
    }

    if (!$this->canDeleteByRole($currentUser?->role?->RoleRank, $target->role?->RoleRank)) {
      return redirect()->back()->with('error', 'You can only archive users with the same role or lower.');
    }

    $reason = trim((string) $request->input('ArchiveReason', ''));
    $target->update([
      'IsActive' => false,
      'IsArchived' => true,
      'ArchivedAt' => now(),
      'ArchivedByUserID' => $currentUser?->id,
      'ArchiveReason' => $reason !== '' ? $reason : null,
    ]);

    $auditTrail->record(
      $currentUser,
      'Users',
      'Archived',
      $reason !== ''
        ? "User archived: {$target->FullName} ({$reason})"
        : "User archived: {$target->FullName}",
      [
        'id' => $target->id,
        'FullName' => $target->FullName,
        'IsArchived' => true,
        'ArchiveReason' => $reason !== '' ? $reason : null,
      ],
      [
        'IsArchived' => false,
      ],
    );

    return redirect()->back()->with('success', 'User archived successfully.');
  }

  public function restore(Request $request, int $id, AuditTrailService $auditTrail) {
    $target = User::query()->onlyArchived()->findOrFail($id);
    $currentUser = $request->user();
    $currentUser?->loadMissing('role');
    $target->loadMissing('role');

    if (!$this->canDeleteByRole($currentUser?->role?->RoleRank, $target->role?->RoleRank)) {
      return redirect()->back()->with('error', 'You can only restore users with the same role or lower.');
    }

    $target->update([
      'IsActive' => true,
      'IsArchived' => false,
      'ArchivedAt' => null,
      'ArchivedByUserID' => null,
      'ArchiveReason' => null,
    ]);

    $auditTrail->record(
      $currentUser,
      'Users',
      'Restored',
      "User restored: {$target->FullName}",
      [
        'id' => $target->id,
        'FullName' => $target->FullName,
        'IsArchived' => false,
      ],
      [
        'IsArchived' => true,
      ],
    );

    return redirect()->back()->with('success', 'User restored successfully.');
  }
}
