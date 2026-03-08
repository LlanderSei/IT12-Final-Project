<?php

namespace App\Models;

use App\Models\Concerns\BuildsReadableAuditChanges;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

class DatabaseBackupSetting extends Model implements Auditable {
    use AuditableTrait, BuildsReadableAuditChanges;

    protected $table = 'database_backup_settings';
    protected $primaryKey = 'ID';
    public $timestamps = false;

    protected $fillable = [
        'SnapshotRetentionCount',
        'IncrementalRetentionCount',
        'DeleteFailedBackups',
        'DateAdded',
        'DateModified',
    ];

    protected $auditEvents = ['created', 'updated'];

    protected $casts = [
        'SnapshotRetentionCount' => 'integer',
        'IncrementalRetentionCount' => 'integer',
        'DeleteFailedBackups' => 'boolean',
        'DateAdded' => 'datetime',
        'DateModified' => 'datetime',
    ];

    public function transformAudit(array $data): array {
        $data['UserID'] = \Illuminate\Support\Facades\Auth::id() ?: User::query()->orderBy('id')->value('id');
        $data['TableEdited'] = 'DatabaseBackupSettings';
        $data['PreviousChanges'] = !empty($data['old_values']) ? json_encode($data['old_values']) : null;
        $data['SavedChanges'] = !empty($data['new_values']) ? json_encode($data['new_values']) : null;
        $data['Action'] = ucfirst($data['event']);
        $data['ReadableChanges'] = $this->buildReadableChanges($data);
        $data['Source'] = 'Application';
        $data['DateAdded'] = now();

        return $data;
    }
}
