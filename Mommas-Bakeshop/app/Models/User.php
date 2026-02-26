<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable {
  /** @use HasFactory<\Database\Factories\UserFactory> */
  use HasFactory, Notifiable;

  protected $table = 'users';
  protected $primaryKey = 'id';

  protected $fillable = [
    'FullName',
    'email',
    'password',
    'RoleID',
  ];

  protected $hidden = [
    'password',
    'remember_token',
  ];

  protected function casts(): array {
    return [
      'email_verified_at' => 'datetime',
      'password' => 'hashed',
      'RoleID' => 'integer',
    ];
  }

  // Relationships
  public function role() {
    return $this->belongsTo(Role::class, 'RoleID', 'ID');
  }

  public function getRolesAttribute(): ?string {
    return $this->role?->RoleName;
  }

  public function permissionsSet() {
    return $this->hasMany(PermissionsSet::class, 'UserID');
  }

  public function audits() {
    return $this->hasMany(Audit::class, 'UserID');
  }

  public function productionBatches() {
    return $this->hasMany(ProductionBatchDetail::class, 'UserID');
  }

  public function sales() {
    return $this->hasMany(Sale::class, 'UserID');
  }

  public function shrinkages() {
    return $this->hasMany(Shrinkage::class, 'UserID');
  }

  public function stockIns() {
    return $this->hasMany(StockInDetail::class, 'UserID');
  }

  public function stockOuts() {
    return $this->hasMany(StockOutDetail::class, 'UserID');
  }
}

