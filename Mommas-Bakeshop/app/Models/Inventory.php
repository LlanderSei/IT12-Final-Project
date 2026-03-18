<?php

namespace App\Models;

use App\Models\Concerns\BuildsReadableAuditChanges;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class Inventory extends Model implements Auditable {
  use AuditableTrait, BuildsReadableAuditChanges;
  protected $table = 'inventory';
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
    $data['ReadableChanges'] = $this->buildReadableChanges($data);
    $data['Source'] = 'Application';
    $data['DateAdded'] = now();

    return $data;
  }

  protected function auditReadableSummary(array $data): ?string {
    $event = strtolower((string) ($data['event'] ?? 'updated'));
    $oldValues = is_array($data['old_values'] ?? null) ? $data['old_values'] : [];
    $values = $this->auditCurrentValues($data);
    $itemName = trim((string) ($values['ItemName'] ?? $oldValues['ItemName'] ?? 'Inventory item'));

    if ($event === 'created') {
      return "New inventory item recorded: {$itemName}";
    }

    if ($event === 'deleted') {
      return "Inventory item removed: {$itemName}";
    }

    if (isset($oldValues['Quantity'], $values['Quantity']) && count($this->auditChangedKeys($data)) === 1 && (string) $oldValues['Quantity'] !== (string) $values['Quantity']) {
      return "Stock level updated for {$itemName} from {$this->auditFormatQuantity($oldValues['Quantity'])} to {$this->auditFormatQuantity($values['Quantity'])}";
    }

    return "Inventory details updated for {$itemName}";
  }

  // Relationships
  public function stockIns() {
    return $this->hasMany(StockIn::class, 'InventoryID');
  }

  public function stockOuts() {
    return $this->hasMany(StockOut::class, 'InventoryID');
  }

  public function inventoryLeftovers() {
    return $this->hasMany(InventoryLeftover::class, 'InventoryID');
  }
}


