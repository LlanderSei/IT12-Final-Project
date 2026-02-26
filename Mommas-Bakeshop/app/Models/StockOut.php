<?php

namespace App\Models;

use App\Models\Concerns\BuildsReadableAuditChanges;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class StockOut extends Model implements Auditable {
  use AuditableTrait, BuildsReadableAuditChanges;
  protected $table = 'stock_outs';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'StockOutDetailsID',
    'InventoryID',
    'ProductID',
    'ItemType',
    'QuantityRemoved',
    'SubAmount',
    'DateAdded',
  ];

  protected $auditEvents = [
    'created',
    'updated',
    'deleted',
  ];

  public function transformAudit(array $data): array {
    $data['UserID'] = \Illuminate\Support\Facades\Auth::id();
    $data['TableEdited'] = 'StockOuts';
    $data['PreviousChanges'] = !empty($data['old_values']) ? json_encode($data['old_values']) : null;
    $data['SavedChanges'] = !empty($data['new_values']) ? json_encode($data['new_values']) : null;
    $data['Action'] = ucfirst($data['event']);
    $data['ReadableChanges'] = $this->buildReadableChanges($data);
    $data['Source'] = 'Application';
    $data['DateAdded'] = now();

    return $data;
  }

  protected $casts = [
    'QuantityRemoved' => 'integer',
    'SubAmount' => 'decimal:2',
    'DateAdded' => 'datetime',
  ];

  // Relationships
  public function inventory() {
    return $this->belongsTo(Inventory::class, 'InventoryID');
  }

  public function product() {
    return $this->belongsTo(Product::class, 'ProductID');
  }

  public function stockOutDetails() {
    return $this->belongsTo(StockOutDetail::class, 'StockOutDetailsID');
  }
}


