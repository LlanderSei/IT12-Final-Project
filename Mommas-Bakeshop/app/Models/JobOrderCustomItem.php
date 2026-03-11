<?php

namespace App\Models;

use App\Models\Concerns\BuildsReadableAuditChanges;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class JobOrderCustomItem extends Model implements Auditable {
	use AuditableTrait, BuildsReadableAuditChanges;

	protected $table = 'job_order_custom_items';
	protected $primaryKey = 'ID';
	public $timestamps = false;

	protected $fillable = [
		'JobOrderID',
		'CustomOrderDescription',
		'Quantity',
		'PricePerUnit',
	];

	protected $casts = [
		'Quantity' => 'integer',
		'PricePerUnit' => 'decimal:2',
	];

	protected $auditEvents = [
		'created',
		'updated',
		'deleted',
	];

	public function transformAudit(array $data): array {
		$data['UserID'] = \Illuminate\Support\Facades\Auth::id();
		$data['TableEdited'] = 'JobOrderCustomItems';
		$data['PreviousChanges'] = !empty($data['old_values']) ? json_encode($data['old_values']) : null;
		$data['SavedChanges'] = !empty($data['new_values']) ? json_encode($data['new_values']) : null;
		$data['Action'] = ucfirst($data['event']);
		$data['ReadableChanges'] = $this->buildReadableChanges($data);
		$data['Source'] = 'Application';
		$data['DateAdded'] = now();

		return $data;
	}

	public function jobOrder() {
		return $this->belongsTo(JobOrder::class, 'JobOrderID');
	}
}
