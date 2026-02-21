<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductionBatch extends Model {
  protected $table = 'ProductionBatches';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'UserID',
    'ProductID',
    'BatchDescription',
    'QuantityAdded',
    'DateAdded',
  ];

  protected $casts = [
    'QuantityAdded' => 'integer',
    'DateAdded' => 'datetime',
  ];

  // Relationships
  public function user() {
    return $this->belongsTo(User::class, 'UserID');
  }

  public function product() {
    return $this->belongsTo(Product::class, 'ProductID');
  }
}
