<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model {
  protected $table = 'Products';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'ProductName',
    'ProductDescription',
    'CategoryID',
    'ProductImage',
    'Price',
    'Quantity',
    'Status',
    'DateAdded',
    'DateModified',
  ];

  protected $casts = [
    'DateAdded' => 'datetime',
    'DateModified' => 'datetime',
  ];

  // Relationships
  public function category() {
    return $this->belongsTo(Category::class, 'CategoryID');
  }

  public function productionBatches() {
    return $this->hasMany(ProductionBatch::class, 'ProductID');
  }

  public function soldProducts() {
    return $this->hasMany(SoldProduct::class, 'ProductID');
  }

  public function spoiledProducts() {
    return $this->hasMany(SpoiledProduct::class, 'ProductID');
  }
}
