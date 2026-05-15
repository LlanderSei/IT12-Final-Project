<?php

use App\Models\Role;
use App\Models\User;

test('registration screen can be rendered', function () {
    $response = $this->get('/register');

    $response->assertStatus(200);
});

test('new users can register', function () {
    Role::create([
        'RoleName' => 'Clerk',
        'RoleDescription' => 'Basic operational access.',
        'RoleColor' => '#10B981',
        'RoleRank' => 4,
    ]);

    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));

    $user = User::query()->where('email', 'test@example.com')->first();
    expect($user)->not->toBeNull();
    expect($user->FullName)->toBe('Test User');
    expect((int) $user->RoleID)->toBe((int) Role::query()->where('RoleName', 'Clerk')->value('ID'));
});
