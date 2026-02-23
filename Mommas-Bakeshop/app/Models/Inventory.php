<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class Inventory extends Model implements Auditable {
  use AuditableTrait;
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

  protected $auditEvents = [
    'created',
    'updated',
    'deleted',
  ];

  public function transformAudit(array $data): array {
    $data['UserID'] = \Illuminate\Support\Facades\Auth::id();
    $data['TableEdited'] = 'Inventory';
    $data['PreviousChanges'] = !empty($data['old_values']) ? json_encode($data['old_values']) : null;
    $data['SavedChanges'] = !empty($data['new_values']) ? json_encode($data['new_values']) : null;
    $data['Action'] = ucfirst($data['event']);
    $data['DateAdded'] = now();

    return $data;
  }

  // Relationships
  public function stockIns() {
    return $this->hasMany(StockIn::class, 'InventoryID');
  }

  public function stockOuts() {
    return $this->hasMany(StockOut::class, 'InventoryID');
  }
}
