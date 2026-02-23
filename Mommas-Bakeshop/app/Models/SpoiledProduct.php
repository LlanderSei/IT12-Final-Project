<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SpoiledProduct extends Model {
  protected $table = 'SpoiledProducts';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'SpoilageID',
    'ProductID',
    'Quantity',
    'SubAmount',
  ];

  protected $casts = [
    'Quantity' => 'integer',
    'SubAmount' => 'decimal:2',
  ];

  // Relationships
  public function spoilage() {
    return $this->belongsTo(Spoilage::class, 'SpoilageID');
  }

  public function product() {
    return $this->belongsTo(Product::class, 'ProductID');
  }
}
