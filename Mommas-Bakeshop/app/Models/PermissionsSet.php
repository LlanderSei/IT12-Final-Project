<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PermissionsSet extends Model {
  protected $table = 'PermissionsSet';
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
}
