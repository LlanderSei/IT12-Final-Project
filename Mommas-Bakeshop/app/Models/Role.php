<?php

namespace App\Models;

use App\Models\Concerns\BuildsReadableAuditChanges;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class Role extends Model implements Auditable {
  use AuditableTrait, BuildsReadableAuditChanges;

  protected $table = 'roles';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'RoleName',
    'RoleDescription',
    'RoleRank',
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
    $data['TableEdited'] = 'Roles';
    $data['PreviousChanges'] = !empty($data['old_values']) ? json_encode($data['old_values']) : null;
    $data['SavedChanges'] = !empty($data['new_values']) ? json_encode($data['new_values']) : null;
    $data['Action'] = ucfirst($data['event']);
    $data['ReadableChanges'] = $this->buildReadableChanges($data);
    $data['Source'] = 'Application';
    $data['DateAdded'] = now();

    return $data;
  }

  protected $casts = [
    'RoleRank' => 'integer',
    'DateAdded' => 'datetime',
    'DateModified' => 'datetime',
  ];

  public function users() {
    return $this->hasMany(User::class, 'RoleID', 'ID');
  }

  public function presetPermissions() {
    return $this->hasMany(RolePresetPermission::class, 'RoleID', 'ID');
  }
}
