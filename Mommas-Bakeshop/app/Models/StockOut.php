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

  protected function auditReadableSummary(array $data): ?string {
    $event = strtolower((string) ($data['event'] ?? 'updated'));
    $values = $this->auditCurrentValues($data);
    $itemName = ($values['ItemType'] ?? '') === 'Inventory'
      ? $this->auditInventoryName($values['InventoryID'] ?? null)
      : $this->auditProductName($values['ProductID'] ?? null);
    $quantity = $this->auditFormatQuantity($values['QuantityRemoved'] ?? 0);
    $detailId = $values['StockOutDetailsID'] ?? null;
    $reason = $detailId ? optional(StockOutDetail::query()->find($detailId))->Reason : null;
    $context = $reason ? " due to {$reason}" : '';
    $stockOutLabel = 'Stock-Out #' . ($detailId ?? 'record');

    return match ($event) {
      'created' => "{$quantity} units reduced from stock for {$itemName}{$context} via {$stockOutLabel}",
      'deleted' => "Stock-out line removed for {$itemName} from {$stockOutLabel}",
      default => "Stock-out line updated for {$itemName} on {$stockOutLabel}",
    };
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


