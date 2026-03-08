<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DatabaseBackupChange extends Model {
    protected $table = 'database_backup_changes';
    protected $primaryKey = 'ID';
    public $timestamps = false;

    protected $fillable = [
        'TableName',
        'RecordID',
        'Action',
        'RowData',
        'ChangedAt',
    ];

    protected $casts = [
        'RowData' => 'array',
        'ChangedAt' => 'datetime',
    ];
}
