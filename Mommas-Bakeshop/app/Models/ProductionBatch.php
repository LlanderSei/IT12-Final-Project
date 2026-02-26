<?php

namespace App\Models;

use App\Models\Concerns\BuildsReadableAuditChanges;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class ProductionBatch extends Model implements Auditable {
  use AuditableTrait, BuildsReadableAuditChanges;

  protected $table = 'production_batches';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'BatchDetailsID',
    'ProductID',
    'QuantityProduced',
    'DateAdded',
  ];

  protected $auditEvents = [
    'created',
  ];

  public function transformAudit(array $data): array {
    $data['UserID'] = \Illuminate\Support\Facades\Auth::id();
    $data['TableEdited'] = 'ProductionBatches';
    $data['PreviousChanges'] = !empty($data['old_values']) ? json_encode($data['old_values']) : null;
    $data['SavedChanges'] = !empty($data['new_values']) ? json_encode($data['new_values']) : null;
    $data['Action'] = ucfirst($data['event']);
    $data['ReadableChanges'] = $this->buildReadableChanges($data);
    $data['Source'] = 'Application';
    $data['DateAdded'] = now();

    return $data;
  }

  protected $casts = [
    'QuantityProduced' => 'integer',
    'DateAdded' => 'datetime',
  ];

  // Relationships
  public function product() {
    return $this->belongsTo(Product::class, 'ProductID');
  }

  public function batchDetails() {
    return $this->belongsTo(ProductionBatchDetail::class, 'BatchDetailsID');
  }
}


