<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Audit extends Model {
  protected $table = 'Audits';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'UserID',
    'TableEdited',
    'PreviousChanges',
    'SavedChanges',
    'Action',
    'DateAdded',
  ];

  protected $casts = [
    'DateAdded' => 'datetime',
  ];

  // Relationships
  public function user() {
    return $this->belongsTo(User::class, 'UserID');
  }
}
