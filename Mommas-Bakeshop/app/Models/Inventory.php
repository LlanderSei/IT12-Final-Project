<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Inventory extends Model {
  protected $table = 'Inventory';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'ItemName',
    'ItemDescription',
    'ItemType',
    'Measurement',
    'Quantity',
    'LowCountThreshold',
    'DateAdded',
    'DateModified',
  ];

  protected $casts = [
    'Quantity' => 'integer',
    'LowCountThreshold' => 'integer',
    'DateAdded' => 'datetime',
    'DateModified' => 'datetime',
  ];

  // Relationships
  public function stockIns() {
    return $this->hasMany(StockIn::class, 'InventoryID');
  }

  public function stockOuts() {
    return $this->hasMany(StockOut::class, 'InventoryID');
  }
}
