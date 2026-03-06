<?php

namespace App\Models;

use App\Models\Concerns\BuildsReadableAuditChanges;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class ProductLeftover extends Model implements Auditable {
  use AuditableTrait, BuildsReadableAuditChanges;

  protected $table = 'product_leftovers';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'ProductLeftoverID',
    'ProductID',
    'LeftoverQuantity',
    'PerUnitAmount',
    'DateAdded',
  ];

  protected $casts = [
    'LeftoverQuantity' => 'integer',
    'PerUnitAmount' => 'decimal:2',
    'DateAdded' => 'datetime',
  ];

  protected $auditEvents = [
    'created',
    'updated',
    'deleted',
  ];

  public function transformAudit(array $data): array {
    $data['UserID'] = \Illuminate\Support\Facades\Auth::id();
    $data['TableEdited'] = 'ProductLeftovers';
    $data['PreviousChanges'] = !empty($data['old_values']) ? json_encode($data['old_values']) : null;
    $data['SavedChanges'] = !empty($data['new_values']) ? json_encode($data['new_values']) : null;
    $data['Action'] = ucfirst($data['event']);
    $data['ReadableChanges'] = $this->buildReadableChanges($data);
    $data['Source'] = 'Application';
    $data['DateAdded'] = now();

    return $data;
  }

  public function snapshot() {
    return $this->belongsTo(ProductLeftoverSnapshot::class, 'ProductLeftoverID');
  }

  public function product() {
    return $this->belongsTo(Product::class, 'ProductID');
  }
}
