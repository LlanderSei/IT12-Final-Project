<?php

namespace App\Models;

use App\Models\Concerns\BuildsReadableAuditChanges;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class RolePresetPermission extends Model implements Auditable {
  use AuditableTrait, BuildsReadableAuditChanges;

  protected $table = 'role_preset_permissions';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'RoleID',
    'PermissionID',
    'Allowable',
    'DateAdded',
    'DateModified',
  ];

  protected $auditEvents = [
    'created',
    'updated',
    'deleted',
  ];

  public function transformAudit(array $data): array {
    $data['UserID'] = \Illuminate\Support\Facades\Auth::id();
    $data['TableEdited'] = 'RolePresetPermissions';
    $data['PreviousChanges'] = !empty($data['old_values']) ? json_encode($data['old_values']) : null;
    $data['SavedChanges'] = !empty($data['new_values']) ? json_encode($data['new_values']) : null;
    $data['Action'] = ucfirst($data['event']);
    $data['ReadableChanges'] = $this->buildReadableChanges($data);
    $data['Source'] = 'Application';
    $data['DateAdded'] = now();

    return $data;
  }

  protected $casts = [
    'RoleID' => 'integer',
    'PermissionID' => 'integer',
    'Allowable' => 'boolean',
    'DateAdded' => 'datetime',
    'DateModified' => 'datetime',
  ];

  public function role() {
    return $this->belongsTo(Role::class, 'RoleID', 'ID');
  }

  public function permission() {
    return $this->belongsTo(Permission::class, 'PermissionID', 'ID');
  }
}
