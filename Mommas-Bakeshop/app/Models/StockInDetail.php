<?php

namespace App\Models;

use App\Models\Concerns\BuildsReadableAuditChanges;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class StockInDetail extends Model implements Auditable {
  use AuditableTrait, BuildsReadableAuditChanges;

  protected $table = 'stock_in_details';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'UserID',
    'Supplier',
    'PurchaseDate',
    'Source',
    'ReceiptNumber',
    'InvoiceNumber',
    'TotalQuantity',
    'TotalAmount',
    'AdditionalDetails',
    'DateAdded',
  ];

  protected $casts = [
    'PurchaseDate' => 'datetime',
    'TotalQuantity' => 'integer',
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
    $data['TableEdited'] = 'StockInDetails';
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
    $staffName = $this->auditUserName($values['UserID'] ?? null);
    $supplier = trim((string) ($values['Supplier'] ?? ''));
    $source = trim((string) ($values['Source'] ?? ''));
    $context = $supplier !== '' ? $supplier : ($source !== '' ? $source : 'stock intake');

    return match ($event) {
      'created' => "Stock-in recorded by Staff: {$staffName} from {$context}",
      'deleted' => "Stock-in record removed from {$context}",
      default => "Stock-in details updated for {$context}",
    };
  }

  public function user() {
    return $this->belongsTo(User::class, 'UserID');
  }

  public function stockIns() {
    return $this->hasMany(StockIn::class, 'StockInDetailsID');
  }
}


