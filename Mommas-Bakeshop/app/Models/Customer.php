<?php

namespace App\Models;

use App\Models\Concerns\BuildsReadableAuditChanges;
use App\Models\Concerns\HasArchiveState;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class Customer extends Model implements Auditable {
  use AuditableTrait, BuildsReadableAuditChanges, HasArchiveState;

  protected $table = 'customers';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'CustomerName',
    'CustomerType',
    'ContactDetails',
    'Address',
    'DateAdded',
    'DateModified',
    'IsArchived',
    'ArchivedAt',
    'ArchivedByUserID',
    'ArchiveReason',
  ];

  protected $casts = [
    'DateAdded' => 'datetime',
    'DateModified' => 'datetime',
    'IsArchived' => 'boolean',
    'ArchivedAt' => 'datetime',
  ];

  protected $auditEvents = [
    'created',
    'updated',
    'deleted',
  ];

  public function transformAudit(array $data): array {
    $data['UserID'] = \Illuminate\Support\Facades\Auth::id();
    $data['TableEdited'] = 'Customers';
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
    $customerName = trim((string) ($values['CustomerName'] ?? $oldValues['CustomerName'] ?? 'Customer'));

    if ($event === 'created') {
      return "New customer recorded: {$customerName}";
    }

    if ($event === 'deleted') {
      return "Customer removed: {$customerName}";
    }

    if (($oldValues['IsArchived'] ?? null) !== ($values['IsArchived'] ?? null)) {
      $reason = trim((string) ($values['ArchiveReason'] ?? ''));
      if (!empty($values['IsArchived'])) {
        return $reason !== ''
          ? "Customer archived: {$customerName} ({$reason})"
          : "Customer archived: {$customerName}";
      }

      return "Customer restored: {$customerName}";
    }

    return "Customer details updated for {$customerName}";
  }

  // Relationships
  public function sales() {
    return $this->hasMany(Sale::class, 'CustomerID');
  }
}


