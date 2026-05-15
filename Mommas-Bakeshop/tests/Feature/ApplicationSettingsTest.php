<?php

use App\Models\Permission;
use App\Models\PermissionsSet;
use App\Models\SystemSetting;
use App\Models\User;

function grantPermission(User $user, string $permissionName): void {
  $permission = Permission::firstOrCreate(
    ['PermissionName' => $permissionName],
    [
      'PermissionDescription' => $permissionName,
      'DateAdded' => now(),
      'DateModified' => now(),
    ],
  );

  PermissionsSet::updateOrCreate(
    [
      'UserID' => $user->id,
      'PermissionID' => $permission->ID,
    ],
    [
      'Allowable' => true,
      'DateAdded' => now(),
      'DateModified' => now(),
    ],
  );
}

test('application settings page requires can update image hosting permission', function () {
  $user = User::factory()->create();

  $this->actingAs($user)
    ->get(route('application.settings'))
    ->assertForbidden();
});

test('authorized user can access application settings page', function () {
  $user = User::factory()->create();
  grantPermission($user, 'CanUpdateImageHosting');

  SystemSetting::set('image_hosting_service', 'ImgBB');
  SystemSetting::set('imgbb_api_key', 'secret-key');

  $this->actingAs($user)
    ->get(route('application.settings'))
    ->assertOk()
    ->assertInertia(fn ($page) => $page
      ->component('Application/Settings')
      ->where('canUpdateImageHosting', true)
      ->where('settings.image_hosting_service', 'ImgBB')
      ->where('settings.imgbb_api_key', 'secret-key'));
});
