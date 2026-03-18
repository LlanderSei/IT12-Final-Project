<?php

namespace App\Models;

use App\Models\Concerns\BuildsReadableAuditChanges;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;
use App\Models\JobOrder;

class Sale extends Model implements Auditable {
  use AuditableTrait, BuildsReadableAuditChanges;

  protected $table = 'sales';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'UserID',
    'CustomerID',
    'SaleType',
    'TotalAmount',
    'DateAdded',
  ];

  protected $casts = [
    'TotalAmount' => 'decimal:2',
    'DateAdded' => 'datetime',
  ];

  protected $auditEvents = [
    'created',
    'updated',
    'deleted',
  ];

  public function transformAudit(array $data): array {
    $data['UserID'] = \Illuminate\Support\Facades\Auth::id();
    $data['TableEdited'] = 'Sales';
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
    $saleLabel = $this->auditSaleLabel($values['ID'] ?? $this->ID);
    $staffName = $this->auditUserName($values['UserID'] ?? null);
    $customerName = $this->auditCustomerName($values['CustomerID'] ?? null);
    $saleType = strtolower((string) ($values['SaleType'] ?? 'sale'));

    return match ($event) {
      'created' => $saleType === 'walkin' || $customerName === 'Walk-in customer'
        ? "New walk-in sale recorded by Staff: {$staffName}"
        : ucfirst($saleType) . " sale recorded for {$customerName} by Staff: {$staffName}",
      'deleted' => "{$saleLabel} removed.",
      default => "{$saleLabel} updated.",
    };
  }

  // Relationships
  public function user() {
    return $this->belongsTo(User::class, 'UserID');
  }

  public function customer() {
    return $this->belongsTo(Customer::class, 'CustomerID');
  }

  public function payment() {
    return $this->hasOne(Payment::class, 'SalesID');
  }

  public function soldProducts() {
    return $this->hasMany(SoldProduct::class, 'SalesID');
  }

  public function partialPayments() {
    return $this->hasMany(PartialPayment::class, 'SalesID');
  }

  public function jobOrder() {
    return $this->hasOne(JobOrder::class, 'SalesID');
  }

  public function isWalkIn(): bool {
    return $this->SaleType === 'WalkIn';
  }

  public function isJobOrder(): bool {
    return $this->SaleType === 'JobOrder';
  }
}
