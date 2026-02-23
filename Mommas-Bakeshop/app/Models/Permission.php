<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Permission extends Model {
  protected $table = 'Permissions';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'PermissionName',
    'PermissionDescription',
    'DateAdded',
    'DateModified',
  ];

  protected $casts = [
    'DateAdded' => 'datetime',
    'DateModified' => 'datetime',
  ];

  // Relationships
  public function permissionsSet() {
    return $this->hasMany(PermissionsSet::class, 'PermissionID');
  }
}
