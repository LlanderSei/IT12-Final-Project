<?php

namespace App\Models;

use App\Models\Concerns\BuildsReadableAuditChanges;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class Payment extends Model implements Auditable {
  use AuditableTrait, BuildsReadableAuditChanges;

  protected $table = 'payments';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'SalesID',
    'PaymentMethod',
    'PaidAmount',
    'TotalAmount',
    'Change',
    'PaymentStatus',
    'InvoiceNumber',
    'InvoiceIssuedAt',
    'ReceiptNumber',
    'ReceiptIssuedAt',
    'PaymentDueDate',
    'AdditionalDetails',
    'DateAdded',
  ];

  protected $casts = [
    'PaidAmount' => 'decimal:2',
    'TotalAmount' => 'decimal:2',
    'Change' => 'decimal:2',
    'InvoiceIssuedAt' => 'datetime',
    'ReceiptIssuedAt' => 'datetime',
    'PaymentDueDate' => 'datetime',
    'DateAdded' => 'datetime',
  ];

  protected $auditEvents = [
    'created',
    'updated',
    'deleted',
  ];

  public function transformAudit(array $data): array {
    $data['UserID'] = \Illuminate\Support\Facades\Auth::id();
    $data['TableEdited'] = 'Payments';
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
    $saleLabel = $this->auditSaleLabel($values['SalesID'] ?? null);
    $method = trim((string) ($values['PaymentMethod'] ?? 'payment'));
    $paidAmount = $this->auditFormatMoney($values['PaidAmount'] ?? 0);

    return match ($event) {
      'created' => "Payment recorded for {$saleLabel}: {$paidAmount} via {$method}",
      'deleted' => "Payment removed from {$saleLabel}",
      default => isset($oldValues['PaymentStatus'], $values['PaymentStatus']) && (string) $oldValues['PaymentStatus'] !== (string) $values['PaymentStatus']
        ? "Payment status updated for {$saleLabel} from {$oldValues['PaymentStatus']} to {$values['PaymentStatus']}"
        : "Payment details updated for {$saleLabel}",
    };
  }

  // Relationships
  public function sale() {
    return $this->belongsTo(Sale::class, 'SalesID');
  }
}
