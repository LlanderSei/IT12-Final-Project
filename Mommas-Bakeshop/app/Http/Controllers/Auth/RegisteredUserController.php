<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\PermissionsSet;
use App\Models\Role;
use App\Models\RolePresetPermission;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::create([
            'FullName' => $data['name'],
            'email' => strtolower($data['email']),
            'RoleID' => $this->defaultRegistrationRole()->ID,
            'password' => Hash::make($data['password']),
        ]);
        $this->syncUserPermissionsFromRole($user);

        event(new Registered($user));

        Auth::login($user);

        return redirect(route('dashboard', absolute: false));
    }

    protected function defaultRegistrationRole(): Role
    {
        return Role::query()->firstOrCreate(
            ['RoleName' => 'Clerk'],
            [
                'RoleDescription' => 'Basic operational access.',
                'RoleColor' => '#10B981',
                'RoleRank' => 4,
                'DateAdded' => now(),
                'DateModified' => now(),
            ],
        );
    }

    protected function syncUserPermissionsFromRole(User $user): void
    {
        $user->loadMissing('role');
        $role = $user->role;

        if (!$role) {
            return;
        }

        $permissions = Permission::query()
            ->select(['ID'])
            ->orderBy('ID', 'asc')
            ->get();

        if ($permissions->isEmpty()) {
            return;
        }

        $allowedPermissionIds = RolePresetPermission::query()
            ->where('RoleID', $role->ID)
            ->where('Allowable', true)
            ->pluck('PermissionID')
            ->map(fn ($id) => (int) $id)
            ->all();

        $allowedLookup = array_flip($allowedPermissionIds);
        $now = now();

        foreach ($permissions as $permission) {
            $entry = PermissionsSet::query()->firstOrNew([
                'UserID' => $user->id,
                'PermissionID' => $permission->ID,
            ]);

            if (!$entry->exists) {
                $entry->DateAdded = $now;
            }

            $entry->Allowable = isset($allowedLookup[(int) $permission->ID]);
            $entry->DateModified = $now;
            $entry->save();
        }
    }
}
