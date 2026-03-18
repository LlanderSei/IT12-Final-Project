<?php

namespace App\Models;

use App\Models\Concerns\BuildsReadableAuditChanges;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class JobOrder extends Model implements Auditable {
	use AuditableTrait, BuildsReadableAuditChanges;

	protected $table = 'job_orders';
	protected $primaryKey = 'ID';
	public $timestamps = false;

	protected $fillable = [
		'UserID',
		'CustomerID',
		'SalesID',
		'Status',
		'DeliveryAt',
		'Notes',
		'TotalAmount',
		'DateAdded',
		'DateModified',
	];

	protected $casts = [
		'DeliveryAt' => 'datetime',
		'TotalAmount' => 'decimal:2',
		'DateAdded' => 'datetime',
		'DateModified' => 'datetime',
	];

	protected $auditEvents = [
		'created',
		'updated',
		'deleted',
	];

	public function transformAudit(array $data): array {
		$data['UserID'] = \Illuminate\Support\Facades\Auth::id();
		$data['TableEdited'] = 'JobOrders';
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
		$jobOrderLabel = $this->auditJobOrderLabel($values['ID'] ?? $this->ID);
		$customerName = $this->auditCustomerName($values['CustomerID'] ?? null);
		$staffName = $this->auditUserName($values['UserID'] ?? null);

		return match ($event) {
			'created' => "{$jobOrderLabel} recorded for {$customerName} by Staff: {$staffName}",
			'deleted' => "{$jobOrderLabel} removed for {$customerName}",
			default => isset($oldValues['Status'], $values['Status']) && (string) $oldValues['Status'] !== (string) $values['Status']
				? "{$jobOrderLabel} status updated from {$oldValues['Status']} to {$values['Status']} for {$customerName}"
				: "{$jobOrderLabel} updated for {$customerName}",
		};
	}

	public function user() {
		return $this->belongsTo(User::class, 'UserID');
	}

	public function customer() {
		return $this->belongsTo(Customer::class, 'CustomerID');
	}

	public function sale() {
		return $this->belongsTo(Sale::class, 'SalesID');
	}

	public function items() {
		return $this->hasMany(JobOrderItem::class, 'JobOrderID');
	}

	public function customItems() {
		return $this->hasMany(JobOrderCustomItem::class, 'JobOrderID');
	}
}
