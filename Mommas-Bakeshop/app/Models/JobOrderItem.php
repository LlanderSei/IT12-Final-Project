<?php

namespace App\Models;

use App\Models\Concerns\BuildsReadableAuditChanges;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class JobOrderItem extends Model implements Auditable {
	use AuditableTrait, BuildsReadableAuditChanges;

	protected $table = 'job_order_items';
	protected $primaryKey = 'ID';
	public $timestamps = false;

	protected $fillable = [
		'JobOrderID',
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
		$data['TableEdited'] = 'JobOrderItems';
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
		$jobOrderLabel = $this->auditJobOrderLabel($values['JobOrderID'] ?? null);
		$productName = $this->auditProductName($values['ProductID'] ?? null);
		$quantity = $this->auditFormatQuantity($values['Quantity'] ?? 0);

		return match ($event) {
			'created' => "Item added to {$jobOrderLabel} - {$productName} x{$quantity}",
			'deleted' => "Item removed from {$jobOrderLabel} - {$productName} x{$quantity}",
			default => "{$jobOrderLabel} item updated: {$productName}",
		};
	}

	public function jobOrder() {
		return $this->belongsTo(JobOrder::class, 'JobOrderID');
	}

	public function product() {
		return $this->belongsTo(Product::class, 'ProductID');
	}
}
