<?php

namespace App\Models;

use App\Models\Concerns\BuildsReadableAuditChanges;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class SoldProduct extends Model implements Auditable {
  use AuditableTrait, BuildsReadableAuditChanges;

  protected $table = 'sold_products';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'SalesID',
    'ProductID',
    'PricePerUnit',
    'Quantity',
    'SubAmount',
  ];

  protected $casts = [
    'PricePerUnit' => 'decimal:2',
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
    $data['TableEdited'] = 'SoldProducts';
    $data['PreviousChanges'] = !empty($data['old_values']) ? json_encode($data['old_values']) : null;
    $data['SavedChanges'] = !empty($data['new_values']) ? json_encode($data['new_values']) : null;
    $data['Action'] = ucfirst($data['event']);
    $data['ReadableChanges'] = $this->buildReadableChanges($data);
    $data['Source'] = 'Application';
    $data['DateAdded'] = now();

    return $data;
  }

  // Relationships
  public function sale() {
    return $this->belongsTo(Sale::class, 'SalesID');
  }

  public function product() {
    return $this->belongsTo(Product::class, 'ProductID');
  }
}


