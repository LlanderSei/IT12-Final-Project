<?php

namespace App\Models;

use App\Models\Concerns\BuildsReadableAuditChanges;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

class SystemOperation extends Model implements Auditable {
	use AuditableTrait, BuildsReadableAuditChanges;

	protected $connection = 'mysql_control';
	protected $table = 'system_operations';
	protected $primaryKey = 'ID';
	public $timestamps = false;

	protected $fillable = [
		'UserID',
		'CreatedByName',
		'Scope',
		'OperationType',
		'Title',
		'Status',
		'LockWrites',
		'Payload',
		'Result',
		'Notes',
		'FailureMessage',
		'StartedAt',
		'CompletedAt',
		'DateAdded',
		'DateModified',
	];

	protected $auditEvents = ['created', 'updated', 'deleted'];

	protected $casts = [
		'UserID' => 'integer',
		'LockWrites' => 'boolean',
		'Payload' => 'array',
		'Result' => 'array',
		'StartedAt' => 'datetime',
		'CompletedAt' => 'datetime',
		'DateAdded' => 'datetime',
		'DateModified' => 'datetime',
	];

	public function transformAudit(array $data): array {
		$data['UserID'] = \Illuminate\Support\Facades\Auth::id()
			?: $this->UserID
			?: User::query()->orderBy('id')->value('id');
		$data['TableEdited'] = 'SystemOperations';
		$data['PreviousChanges'] = !empty($data['old_values']) ? json_encode($data['old_values']) : null;
		$data['SavedChanges'] = !empty($data['new_values']) ? json_encode($data['new_values']) : null;
		$data['Action'] = ucfirst($data['event']);
		$data['ReadableChanges'] = $this->buildReadableChanges($data);
		$data['Source'] = 'Application';
		$data['DateAdded'] = now();

		return $data;
	}
}
