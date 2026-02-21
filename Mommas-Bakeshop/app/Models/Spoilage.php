<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Spoilage extends Model {
  protected $table = 'Spoilages';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'UserID',
    'Quantity',
    'SubAmount',
  ];

  protected $casts = [
    'Quantity' => 'integer',
    'SubAmount' => 'decimal:2',
  ];

  // Relationships
  public function user() {
    return $this->belongsTo(User::class, 'UserID');
  }

  public function spoiledProducts() {
    return $this->hasMany(SpoiledProduct::class, 'SpoilageID');
  }
}
