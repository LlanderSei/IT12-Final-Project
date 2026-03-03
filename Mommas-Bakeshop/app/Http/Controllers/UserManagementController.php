<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class UserManagementController extends Controller {
  public function index(Request $request) {
    $roles = Role::query()
      ->select(['ID', 'RoleName', 'RoleRank'])
      ->orderBy('RoleRank', 'asc')
      ->orderBy('RoleName', 'asc')
      ->get();

    $users = User::query()
      ->select(['id', 'FullName', 'email', 'RoleID', 'created_at'])
      ->with(['role:ID,RoleName,RoleRank'])
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

    return Inertia::render('Administration/UserManagementTabs', [
      'users' => $users,
      'roles' => $roles,
      'initialTab' => $request->route('tab') ?? 'Users',
    ]);
  }

  public function store(Request $request) {
    $this->mergeRoleIdFromName($request);

    $data = $request->validate([
      'FullName' => ['required', 'string', 'max:255'],
      'email' => ['required', 'email', 'max:255', 'unique:users,email'],
      'RoleID' => ['required', 'integer', 'exists:roles,ID'],
      'password' => ['required', 'string', 'min:8', 'confirmed'],
    ]);

    User::create([
      'FullName' => $data['FullName'],
      'email' => strtolower($data['email']),
      'RoleID' => $data['RoleID'],
      'password' => Hash::make($data['password']),
    ]);

    return redirect()->route('admin.users')->with('success', 'User created successfully.');
  }

  public function update(Request $request, int $id) {
    $user = User::findOrFail($id);
    $this->mergeRoleIdFromName($request);

    $data = $request->validate([
      'FullName' => ['required', 'string', 'max:255'],
      'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
      'RoleID' => ['required', 'integer', 'exists:roles,ID'],
      'password' => ['nullable', 'string', 'min:8', 'confirmed'],
    ]);

    $actor = $request->user();
    if (
      $actor &&
      (int) $actor->id === (int) $user->id &&
      isset($data['RoleID']) &&
      (int) $data['RoleID'] !== (int) $user->RoleID
    ) {
      return redirect()->back()->with('error', 'You cannot change your own role rank.');
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
}
