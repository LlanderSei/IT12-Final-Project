<?php

namespace App\Models;

use App\Models\Concerns\BuildsReadableAuditChanges;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class StockIn extends Model implements Auditable {
  use AuditableTrait, BuildsReadableAuditChanges;
  protected $table = 'stock_ins';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'StockInDetailsID',
    'InventoryID',
    'ProductID',
    'ItemType',
    'QuantityAdded',
    'SubAmount',
    'DateAdded',
  ];

  protected $casts = [
    'QuantityAdded' => 'integer',
    'SubAmount' => 'decimal:2',
    'DateAdded' => 'datetime',
  ];

  protected $auditEvents = [
    'created',
    'updated',
    'deleted',
  ];

  public function transformAudit(array $data): array {
    $data['UserID'] = \Illuminate\Support\Facades\Auth::id();
    $data['TableEdited'] = 'StockIns';
    $data['PreviousChanges'] = !empty($data['old_values']) ? json_encode($data['old_values']) : null;
    $data['SavedChanges'] = !empty($data['new_values']) ? json_encode($data['new_values']) : null;
    $data['Action'] = ucfirst($data['event']);
    $data['ReadableChanges'] = $this->buildReadableChanges($data);
    $data['Source'] = 'Application';
    $data['DateAdded'] = now();

    return $data;
  }

  // Relationships
  public function inventory() {
    return $this->belongsTo(Inventory::class, 'InventoryID');
  }

  public function product() {
    return $this->belongsTo(Product::class, 'ProductID');
  }

  public function stockInDetails() {
    return $this->belongsTo(StockInDetail::class, 'StockInDetailsID');
  }
}


