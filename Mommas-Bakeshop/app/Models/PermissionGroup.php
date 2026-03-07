<?php

namespace App\Models;

use App\Models\Concerns\BuildsReadableAuditChanges;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class PermissionGroup extends Model implements Auditable {
  use AuditableTrait, BuildsReadableAuditChanges;

  protected $table = 'permission_groups';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'GroupName',
    'GroupDescription',
    'DisplayOrder',
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
    $data['TableEdited'] = 'PermissionGroups';
    $data['PreviousChanges'] = !empty($data['old_values']) ? json_encode($data['old_values']) : null;
    $data['SavedChanges'] = !empty($data['new_values']) ? json_encode($data['new_values']) : null;
    $data['Action'] = ucfirst($data['event']);
    $data['ReadableChanges'] = $this->buildReadableChanges($data);
    $data['Source'] = 'Application';
    $data['DateAdded'] = now();

    return $data;
  }

  protected $casts = [
    'DisplayOrder' => 'integer',
    'DateAdded' => 'datetime',
    'DateModified' => 'datetime',
  ];

  public function permissions() {
    return $this->hasMany(Permission::class, 'PermissionGroupID', 'ID');
  }
}
