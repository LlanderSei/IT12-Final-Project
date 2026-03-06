<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Collection;

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

  public function productLeftoverSnapshots() {
    return $this->hasMany(ProductLeftoverSnapshot::class, 'UserID');
  }

  public function inventoryLeftoverSnapshots() {
    return $this->hasMany(InventoryLeftoverSnapshot::class, 'UserID');
  }

  public function hasPermission(string $permissionName): bool {
    if ($permissionName === '') {
      return false;
    }

    $permissions = $this->permissionNames();
    return $permissions->contains($permissionName);
  }

  public function hasAnyPermission(array $permissionNames): bool {
    $permissionNames = collect($permissionNames)
      ->filter(fn ($name) => is_string($name) && trim($name) !== '')
      ->values();

    if ($permissionNames->isEmpty()) {
      return false;
    }

    $permissions = $this->permissionNames();
    return $permissionNames->contains(fn ($name) => $permissions->contains($name));
  }

  public function permissionNames(): Collection {
    $this->loadMissing('permissionsSet.permission:ID,PermissionName');

    return $this->permissionsSet
      ->where('Allowable', true)
      ->map(fn ($set) => $set->permission?->PermissionName)
      ->filter()
      ->values();
  }
}

