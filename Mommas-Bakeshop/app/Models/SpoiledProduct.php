<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class SpoiledProduct extends Model implements Auditable {
  use AuditableTrait;

  protected $table = 'SpoiledProducts';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'SpoilageID',
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
    $data['TableEdited'] = 'SpoiledProducts';
    $data['PreviousChanges'] = !empty($data['old_values']) ? json_encode($data['old_values']) : null;
    $data['SavedChanges'] = !empty($data['new_values']) ? json_encode($data['new_values']) : null;
    $data['Action'] = ucfirst($data['event']);
    $data['DateAdded'] = now();

    return $data;
  }

  // Relationships
  public function spoilage() {
    return $this->belongsTo(Spoilage::class, 'SpoilageID');
  }

  public function product() {
    return $this->belongsTo(Product::class, 'ProductID');
  }
}
