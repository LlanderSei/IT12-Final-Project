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
			['RoleName' => 'Owner', 'RoleDescription' => 'Business owner with full access.', 'RoleColor' => '#2563EB', 'RoleRank' => 1],
			['RoleName' => 'Admin', 'RoleDescription' => 'Administrative access for operations.', 'RoleColor' => '#7C3AED', 'RoleRank' => 2],
			['RoleName' => 'Cashier', 'RoleDescription' => 'Sales and payment handling access.', 'RoleColor' => '#F59E0B', 'RoleRank' => 3],
			['RoleName' => 'Clerk', 'RoleDescription' => 'Basic operational access.', 'RoleColor' => '#10B981', 'RoleRank' => 4],
		];

		foreach ($roles as $role) {
			Role::firstOrCreate(
				['RoleName' => $role['RoleName']],
				[
					'RoleDescription' => $role['RoleDescription'],
					'RoleColor' => $role['RoleColor'],
					'RoleRank' => $role['RoleRank'],
				]
			);
		}

		$ownerRoleId = Role::query()->where('RoleName', 'Owner')->value('ID');

		User::firstOrCreate(
			['email' => 'owner@example.com'],
			[
				'FullName' => "Momma's Bakeshop Owner",
				'password' => Hash::make('owner123'),
				'RoleID' => $ownerRoleId,
			]
		);

		$this->call(PermissionsSeeder::class);
		$this->call(RolePermissionSeeder::class);
		// $this->call(BakeshopCatalogSeeder::class);
	}
}
