<?php

namespace App\Models;

use App\Models\Concerns\BuildsReadableAuditChanges;
use App\Models\Concerns\HasArchiveState;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class Product extends Model implements Auditable {
  use AuditableTrait, BuildsReadableAuditChanges, HasArchiveState;

  protected $table = 'products';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'ProductName',
    'ProductDescription',
    'CategoryID',
    'ProductImage',
    'ProductFrom',
    'Price',
    'Quantity',
    'LowStockThreshold',
    'DateAdded',
    'DateModified',
    'IsArchived',
    'ArchivedAt',
    'ArchivedByUserID',
    'ArchiveReason',
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
    $data['ReadableChanges'] = $this->buildReadableChanges($data);
    $data['Source'] = 'Application';
    $data['DateAdded'] = now();

    // Remove default keys to avoid confusion, though our Audit model will only fill what's in $fillable
    return $data;
  }

  protected function auditReadableSummary(array $data): ?string {
    $event = strtolower((string) ($data['event'] ?? 'updated'));
    $oldValues = is_array($data['old_values'] ?? null) ? $data['old_values'] : [];
    $values = $this->auditCurrentValues($data);
    $productName = trim((string) ($values['ProductName'] ?? $oldValues['ProductName'] ?? 'Product'));

    if ($event === 'created') {
      return "New product recorded: {$productName}";
    }

    if ($event === 'deleted') {
      return "Product removed: {$productName}";
    }

    if (($oldValues['IsArchived'] ?? null) !== ($values['IsArchived'] ?? null)) {
      $reason = trim((string) ($values['ArchiveReason'] ?? ''));
      if (!empty($values['IsArchived'])) {
        return $reason !== ''
          ? "Product archived: {$productName} ({$reason})"
          : "Product archived: {$productName}";
      }

      return "Product restored: {$productName}";
    }

    if (isset($oldValues['Quantity'], $values['Quantity']) && count($this->auditChangedKeys($data)) === 1 && (string) $oldValues['Quantity'] !== (string) $values['Quantity']) {
      return "Stock level updated for {$productName} from {$this->auditFormatQuantity($oldValues['Quantity'])} to {$this->auditFormatQuantity($values['Quantity'])}";
    }

    return "Product details updated for {$productName}";
  }

  protected $casts = [
    'DateAdded' => 'datetime',
    'DateModified' => 'datetime',
    'IsArchived' => 'boolean',
    'ArchivedAt' => 'datetime',
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

  public function shrinkedProducts() {
    return $this->hasMany(ShrinkedProduct::class, 'ProductID');
  }

  public function productLeftovers() {
    return $this->hasMany(ProductLeftover::class, 'ProductID');
  }
}



