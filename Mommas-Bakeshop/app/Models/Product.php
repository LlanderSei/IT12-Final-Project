<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class Product extends Model implements Auditable {
  use AuditableTrait;

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
    'LowStockThreshold',
    'DateAdded',
    'DateModified',
  ];

  protected $auditEvents = [
    'created',
    'updated',
    'deleted',
  ];

  public function transformAudit(array $data): array {
    $data['UserID'] = \Illuminate\Support\Facades\Auth::id();
    $data['TableEdited'] = 'Products';
    $data['PreviousChanges'] = !empty($data['old_values']) ? json_encode($data['old_values']) : null;
    $data['SavedChanges'] = !empty($data['new_values']) ? json_encode($data['new_values']) : null;
    $data['Action'] = ucfirst($data['event']);
    $data['DateAdded'] = now();

    // Remove default keys to avoid confusion, though our Audit model will only fill what's in $fillable
    return $data;
  }

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
