<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockOut extends Model {
  protected $table = 'StockOuts';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'UserID',
    'InventoryID',
    'QuantityRemoved',
    'Reason',
    'DateAdded',
  ];

  protected $casts = [
    'QuantityRemoved' => 'integer',
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
