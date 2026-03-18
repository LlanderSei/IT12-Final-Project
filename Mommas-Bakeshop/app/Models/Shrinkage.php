<?php

namespace App\Models;

use App\Models\Concerns\BuildsReadableAuditChanges;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class Shrinkage extends Model implements Auditable {
  use AuditableTrait, BuildsReadableAuditChanges;

  protected $table = 'shrinkages';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'UserID',
    'Quantity',
    'TotalAmount',
    'Reason',
    'VerificationStatus',
    'DateAdded',
  ];

  protected $casts = [
    'Quantity' => 'integer',
    'TotalAmount' => 'decimal:2',
    'VerificationStatus' => 'string',
    'DateAdded' => 'datetime',
  ];

  protected $auditEvents = [
    'created',
    'updated',
    'deleted',
  ];

  public function transformAudit(array $data): array {
    $data['UserID'] = \Illuminate\Support\Facades\Auth::id();
    $data['TableEdited'] = 'Shrinkages';
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
    $staffName = $this->auditUserName($values['UserID'] ?? null);
    $reason = trim((string) ($values['Reason'] ?? 'shrinkage'));

    return match ($event) {
      'created' => "Shrinkage recorded by Staff: {$staffName} due to {$reason}",
      'deleted' => "Shrinkage record removed for {$reason}",
      default => isset($oldValues['VerificationStatus'], $values['VerificationStatus']) && (string) $oldValues['VerificationStatus'] !== (string) $values['VerificationStatus']
        ? "Shrinkage verification updated from {$oldValues['VerificationStatus']} to {$values['VerificationStatus']}"
        : "Shrinkage details updated for {$reason}",
    };
  }

  // Relationships
  public function user() {
    return $this->belongsTo(User::class, 'UserID');
  }

  public function shrinkedProducts() {
    return $this->hasMany(ShrinkedProduct::class, 'ShrinkageID');
  }
}


