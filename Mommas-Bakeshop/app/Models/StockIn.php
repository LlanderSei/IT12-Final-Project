<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class StockIn extends Model implements Auditable {
  use AuditableTrait;
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
    $data['DateAdded'] = now();

    return $data;
  }

  // Relationships
  public function user() {
    return $this->belongsTo(User::class, 'UserID');
  }

  public function inventory() {
    return $this->belongsTo(Inventory::class, 'InventoryID');
  }
}
