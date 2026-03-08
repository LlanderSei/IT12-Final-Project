<?php

namespace App\Models;

use App\Models\Concerns\BuildsReadableAuditChanges;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

class DatabaseBackup extends Model implements Auditable {
    use AuditableTrait, BuildsReadableAuditChanges;

    protected $table = 'database_backups';
    protected $primaryKey = 'ID';
    public $timestamps = false;

    protected $fillable = [
        'UserID',
        'BackupType',
        'BackupStatus',
        'FileName',
        'FilePath',
        'FileSizeBytes',
        'ChecksumSha256',
        'BaseBackupID',
        'FromChangeLogID',
        'ToChangeLogID',
        'TablesIncluded',
        'Summary',
        'FailureMessage',
        'Notes',
        'StartedAt',
        'CompletedAt',
        'DateAdded',
        'DateModified',
    ];

    protected $auditEvents = ['created', 'updated', 'deleted'];

    protected $casts = [
        'UserID' => 'integer',
        'FileSizeBytes' => 'integer',
        'BaseBackupID' => 'integer',
        'FromChangeLogID' => 'integer',
        'ToChangeLogID' => 'integer',
        'TablesIncluded' => 'array',
        'Summary' => 'array',
        'StartedAt' => 'datetime',
        'CompletedAt' => 'datetime',
        'DateAdded' => 'datetime',
        'DateModified' => 'datetime',
    ];

    public function transformAudit(array $data): array {
        $data['UserID'] = \Illuminate\Support\Facades\Auth::id()
            ?: $this->UserID
            ?: User::query()->orderBy('id')->value('id');
        $data['TableEdited'] = 'DatabaseBackups';
        $data['PreviousChanges'] = !empty($data['old_values']) ? json_encode($data['old_values']) : null;
        $data['SavedChanges'] = !empty($data['new_values']) ? json_encode($data['new_values']) : null;
        $data['Action'] = ucfirst($data['event']);
        $data['ReadableChanges'] = $this->buildReadableChanges($data);
        $data['Source'] = 'Application';
        $data['DateAdded'] = now();

        return $data;
    }

    public function user() {
        return $this->belongsTo(User::class, 'UserID', 'id');
    }

    public function baseBackup() {
        return $this->belongsTo(self::class, 'BaseBackupID', 'ID');
    }
}
