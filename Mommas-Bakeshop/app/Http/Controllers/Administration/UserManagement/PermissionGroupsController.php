<?php

namespace App\Http\Controllers\Administration\UserManagement;

use App\Models\PermissionGroup;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PermissionGroupsController extends UserManagementBaseController {
  public function index(Request $request) {
    return $this->renderUserManagementTabs($request, 'Permission Groups');
  }

  public function storePermissionGroup(Request $request) {
    $validated = $request->validate([
      'GroupName' => ['required', 'string', 'max:255', 'unique:permission_groups,GroupName'],
      'GroupDescription' => ['nullable', 'string', 'max:1000'],
    ]);

    PermissionGroup::query()->create([
      'GroupName' => trim($validated['GroupName']),
      'GroupDescription' => trim((string) ($validated['GroupDescription'] ?? '')),
      'DisplayOrder' => ((int) PermissionGroup::query()->max('DisplayOrder')) + 1,
      'DateAdded' => now(),
      'DateModified' => now(),
    ]);

    return redirect()->route('admin.permission-groups')->with('success', 'Permission group created successfully.');
  }

  public function updatePermissionGroup(Request $request, int $id) {
    $group = PermissionGroup::query()->findOrFail($id);
    $validated = $request->validate([
      'GroupName' => ['required', 'string', 'max:255', Rule::unique('permission_groups', 'GroupName')->ignore($group->ID, 'ID')],
      'GroupDescription' => ['nullable', 'string', 'max:1000'],
    ]);

    $group->update([
      'GroupName' => trim($validated['GroupName']),
      'GroupDescription' => trim((string) ($validated['GroupDescription'] ?? '')),
      'DateModified' => now(),
    ]);

    return redirect()->route('admin.permission-groups')->with('success', 'Permission group updated successfully.');
  }

  public function destroyPermissionGroup(Request $request, int $id) {
    $group = PermissionGroup::query()->withCount('permissions')->findOrFail($id);

    if ((int) $group->permissions_count > 0) {
      return redirect()->back()->with('error', 'Reassign or remove permissions from this group before deleting it.');
    }

    $group->delete();
    $this->resequencePermissionGroups();

    return redirect()->route('admin.permission-groups')->with('success', 'Permission group deleted successfully.');
  }
}
