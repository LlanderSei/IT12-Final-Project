<?php

namespace App\Models;

use App\Models\Concerns\BuildsReadableAuditChanges;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class InventoryLeftover extends Model implements Auditable {
  use AuditableTrait, BuildsReadableAuditChanges;

  protected $table = 'inventory_leftovers';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'InventoryLeftoverID',
    'InventoryID',
    'LeftoverQuantity',
    'DateAdded',
  ];

  protected $casts = [
    'LeftoverQuantity' => 'integer',
    'DateAdded' => 'datetime',
  ];

  protected $auditEvents = [
    'created',
    'updated',
    'deleted',
  ];

  public function transformAudit(array $data): array {
    $data['UserID'] = \Illuminate\Support\Facades\Auth::id();
    $data['TableEdited'] = 'InventoryLeftovers';
    $data['PreviousChanges'] = !empty($data['old_values']) ? json_encode($data['old_values']) : null;
    $data['SavedChanges'] = !empty($data['new_values']) ? json_encode($data['new_values']) : null;
    $data['Action'] = ucfirst($data['event']);
    $data['ReadableChanges'] = $this->buildReadableChanges($data);
    $data['Source'] = 'Application';
    $data['DateAdded'] = now();

    return $data;
  }

  public function snapshot() {
    return $this->belongsTo(InventoryLeftoverSnapshot::class, 'InventoryLeftoverID');
  }

  public function inventory() {
    return $this->belongsTo(Inventory::class, 'InventoryID');
  }
}
