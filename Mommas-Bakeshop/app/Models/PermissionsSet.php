<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class PermissionsSet extends Model implements Auditable {
  use AuditableTrait;

  protected $table = 'permissions_set';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'UserID',
    'PermissionID',
    'Allowable',
    'DateAdded',
    'DateModified',
  ];

  protected $casts = [
    'Allowable' => 'boolean',
    'DateAdded' => 'datetime',
    'DateModified' => 'datetime',
  ];

  // Relationships
  public function user() {
    return $this->belongsTo(User::class, 'UserID');
  }

  public function permission() {
    return $this->belongsTo(Permission::class, 'PermissionID');
  }

  public function transformAudit(array $data): array {
    $data['UserID'] = \Illuminate\Support\Facades\Auth::id();
    $data['TableEdited'] = 'PermissionsSet';
    $data['PreviousChanges'] = !empty($data['old_values']) ? json_encode($data['old_values']) : null;
    $data['SavedChanges'] = !empty($data['new_values']) ? json_encode($data['new_values']) : null;
    $data['Action'] = ucfirst($data['event']);
    $data['ReadableChanges'] = !empty($data['new_values']) ? 'Permission assignment updated.' : null;
    $data['Source'] = 'Application';
    $data['DateAdded'] = now();

    return $data;
  }
}
