<?php

namespace App\Models;

use App\Models\Concerns\BuildsReadableAuditChanges;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class ShrinkedProduct extends Model implements Auditable {
  use AuditableTrait, BuildsReadableAuditChanges;

  protected $table = 'shrinked_products';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'ShrinkageID',
    'ProductID',
    'Quantity',
    'SubAmount',
  ];

  protected $casts = [
    'Quantity' => 'integer',
    'SubAmount' => 'decimal:2',
  ];

  protected $auditEvents = [
    'created',
    'updated',
    'deleted',
  ];

  public function transformAudit(array $data): array {
    $data['UserID'] = \Illuminate\Support\Facades\Auth::id();
    $data['TableEdited'] = 'ShrinkedProducts';
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
    $productName = $this->auditProductName($values['ProductID'] ?? null);
    $quantity = $this->auditFormatQuantity($values['Quantity'] ?? 0);
    $shrinkageLabel = 'Shrinkage #' . ($values['ShrinkageID'] ?? 'record');

    return match ($event) {
      'created' => "{$quantity} units recorded as shrinkage for {$productName} on {$shrinkageLabel}",
      'deleted' => "Shrinkage line removed for {$productName} from {$shrinkageLabel}",
      default => "Shrinkage line updated for {$productName} on {$shrinkageLabel}",
    };
  }

  // Relationships
  public function shrinkage() {
    return $this->belongsTo(Shrinkage::class, 'ShrinkageID');
  }

  public function product() {
    return $this->belongsTo(Product::class, 'ProductID');
  }
}


