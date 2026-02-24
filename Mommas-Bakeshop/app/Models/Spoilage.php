<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class Spoilage extends Model implements Auditable {
  use AuditableTrait;

  protected $table = 'Spoilages';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'UserID',
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
    $data['TableEdited'] = 'Spoilages';
    $data['PreviousChanges'] = !empty($data['old_values']) ? json_encode($data['old_values']) : null;
    $data['SavedChanges'] = !empty($data['new_values']) ? json_encode($data['new_values']) : null;
    $data['Action'] = ucfirst($data['event']);
    $data['DateAdded'] = now();

    return $data;
  }

  // Relationships
  public function user() {
    return $this->belongsTo(User::class, 'UserID');
  }

  public function spoiledProducts() {
    return $this->hasMany(SpoiledProduct::class, 'SpoilageID');
  }
}
