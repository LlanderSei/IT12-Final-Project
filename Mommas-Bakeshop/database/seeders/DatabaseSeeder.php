<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder {
  use WithoutModelEvents;

  /**
   * Seed the application's database.
   */
  public function run(): void {
    // User::factory(10)->create();

    $roles = [
      ['RoleName' => 'Owner', 'RoleDescription' => 'Business owner with full access.', 'RoleRank' => 1],
      ['RoleName' => 'Admin', 'RoleDescription' => 'Administrative access for operations.', 'RoleRank' => 2],
      ['RoleName' => 'Cashier', 'RoleDescription' => 'Sales and payment handling access.', 'RoleRank' => 3],
      ['RoleName' => 'Clerk', 'RoleDescription' => 'Basic operational access.', 'RoleRank' => 4],
    ];

    foreach ($roles as $role) {
      Role::updateOrCreate(
        ['RoleName' => $role['RoleName']],
        [
          'RoleDescription' => $role['RoleDescription'],
          'RoleRank' => $role['RoleRank'],
          'DateModified' => now(),
        ]
      );
    }

    $ownerRoleId = Role::query()->where('RoleName', 'Owner')->value('ID');

    User::updateOrCreate(
      ['email' => 'owner@example.com'],
      [
        'FullName' => "Momma's Bakeshop Owner",
        'password' => Hash::make('owner123'),
        'RoleID' => $ownerRoleId,
      ]
    );

    $this->call(BakeshopCatalogSeeder::class);
  }
}
