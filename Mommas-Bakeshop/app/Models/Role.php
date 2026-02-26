<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model {
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

  protected $casts = [
    'RoleRank' => 'integer',
    'DateAdded' => 'datetime',
    'DateModified' => 'datetime',
  ];

  public function users() {
    return $this->hasMany(User::class, 'RoleID', 'ID');
  }
}
