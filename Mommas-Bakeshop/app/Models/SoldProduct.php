<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SoldProduct extends Model {
  protected $table = 'SoldProducts';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'SalesID',
    'ProductID',
    'PricePerUnit',
    'Quantity',
    'SubAmount',
  ];

  protected $casts = [
    'PricePerUnit' => 'decimal:2',
    'Quantity' => 'integer',
    'SubAmount' => 'decimal:2',
  ];

  // Relationships
  public function sale() {
    return $this->belongsTo(Sale::class, 'SalesID');
  }

  public function product() {
    return $this->belongsTo(Product::class, 'ProductID');
  }
}
