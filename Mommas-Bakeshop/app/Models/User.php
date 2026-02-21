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
    'Roles',
  ];

  protected $hidden = [
    'password',
    'remember_token',
  ];

  protected function casts(): array {
    return [
      'email_verified_at' => 'datetime',
      'password' => 'hashed',
    ];
  }

  // Relationships
  public function permissionsSet() {
    return $this->hasMany(PermissionsSet::class, 'UserID');
  }

  public function audits() {
    return $this->hasMany(Audit::class, 'UserID');
  }

  public function productionBatches() {
    return $this->hasMany(ProductionBatch::class, 'UserID');
  }

  public function sales() {
    return $this->hasMany(Sale::class, 'UserID');
  }

  public function spoilages() {
    return $this->hasMany(Spoilage::class, 'UserID');
  }

  public function stockIns() {
    return $this->hasMany(StockIn::class, 'UserID');
  }

  public function stockOuts() {
    return $this->hasMany(StockOut::class, 'UserID');
  }
}
