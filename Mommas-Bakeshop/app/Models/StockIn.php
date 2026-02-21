<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockIn extends Model {
  protected $table = 'StockIns';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'UserID',
    'InventoryID',
    'Supplier',
    'PricePerUnit',
    'QuantityAdded',
    'TotalAmount',
    'AdditionalDetails',
    'DateAdded',
  ];

  protected $casts = [
    'PricePerUnit' => 'decimal:2',
    'QuantityAdded' => 'integer',
    'TotalAmount' => 'decimal:2',
    'DateAdded' => 'datetime',
  ];

  // Relationships
  public function user() {
    return $this->belongsTo(User::class, 'UserID');
  }

  public function inventory() {
    return $this->belongsTo(Inventory::class, 'InventoryID');
  }
}
