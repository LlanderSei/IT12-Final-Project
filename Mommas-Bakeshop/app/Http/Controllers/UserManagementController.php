<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class UserManagementController extends Controller {
  private const ROLE_RANK = [
    'owner' => 4,
    'admin' => 3,
    'cashier' => 2,
    'clerk' => 1,
  ];

  public function index() {
    $users = User::query()
      ->select(['id', 'FullName', 'email', 'Roles', 'created_at'])
      ->withCount([
        'permissionsSet',
        'audits',
        'productionBatches',
        'sales',
        'spoilages',
        'stockIns',
        'stockOuts',
      ])
      ->orderBy('FullName', 'asc')
      ->get()
      ->map(function ($user) {
        $user->RelationCount =
          $user->permissions_set_count +
          $user->audits_count +
          $user->production_batches_count +
          $user->sales_count +
          $user->spoilages_count +
          $user->stock_ins_count +
          $user->stock_outs_count;

        return $user;
      });

    return Inertia::render('Administration/UserManagementTabs', [
      'users' => $users,
    ]);
  }

  public function store(Request $request) {
    $data = $request->validate([
      'FullName' => ['required', 'string', 'max:255'],
      'email' => ['required', 'email', 'max:255', 'unique:users,email'],
      'Roles' => ['required', 'string', 'max:255'],
      'password' => ['required', 'string', 'min:8', 'confirmed'],
    ]);

    User::create([
      'FullName' => $data['FullName'],
      'email' => strtolower($data['email']),
      'Roles' => $data['Roles'],
      'password' => Hash::make($data['password']),
    ]);

    return redirect()->route('admin.users')->with('success', 'User created successfully.');
  }

  public function update(Request $request, int $id) {
    $user = User::findOrFail($id);

    $data = $request->validate([
      'FullName' => ['required', 'string', 'max:255'],
      'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
      'Roles' => ['required', 'string', 'max:255'],
      'password' => ['nullable', 'string', 'min:8', 'confirmed'],
    ]);

    $payload = [
      'FullName' => $data['FullName'],
      'email' => strtolower($data['email']),
      'Roles' => $data['Roles'],
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

    if ((int) $currentUser->id === (int) $target->id) {
      return redirect()->back()->with('error', 'You cannot delete your own account.');
    }

    if (!$this->canDeleteByRole($currentUser->Roles, $target->Roles)) {
      return redirect()->back()->with('error', 'You can only delete users with the same role or lower.');
    }

    $target->delete();

    return redirect()->back()->with('success', 'User deleted successfully.');
  }

  private function canDeleteByRole(?string $currentRole, ?string $targetRole): bool {
    $currentRank = self::ROLE_RANK[strtolower((string) $currentRole)] ?? 0;
    $targetRank = self::ROLE_RANK[strtolower((string) $targetRole)] ?? 0;

    return $currentRank >= $targetRank;
  }
}
