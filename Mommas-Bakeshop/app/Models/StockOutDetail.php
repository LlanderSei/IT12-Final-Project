<?php

namespace App\Models;

use App\Models\Concerns\BuildsReadableAuditChanges;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class StockOutDetail extends Model implements Auditable {
  use AuditableTrait, BuildsReadableAuditChanges;

  protected $table = 'stock_out_details';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'UserID',
    'TotalQuantity',
    'Reason',
    'DateAdded',
  ];

  protected $casts = [
    'TotalQuantity' => 'integer',
    'DateAdded' => 'datetime',
  ];

  protected $auditEvents = [
    'created',
    'updated',
    'deleted',
  ];

  public function transformAudit(array $data): array {
    $data['UserID'] = \Illuminate\Support\Facades\Auth::id();
    $data['TableEdited'] = 'StockOutDetails';
    $data['PreviousChanges'] = !empty($data['old_values']) ? json_encode($data['old_values']) : null;
    $data['SavedChanges'] = !empty($data['new_values']) ? json_encode($data['new_values']) : null;
    $data['Action'] = ucfirst($data['event']);
    $data['ReadableChanges'] = $this->buildReadableChanges($data);
    $data['Source'] = 'Application';
    $data['DateAdded'] = now();

    return $data;
  }

  public function user() {
    return $this->belongsTo(User::class, 'UserID');
  }

  public function stockOuts() {
    return $this->hasMany(StockOut::class, 'StockOutDetailsID');
  }
}


