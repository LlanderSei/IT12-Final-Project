<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use OwenIt\Auditing\Contracts\Auditable;

class Category extends Model implements Auditable {
  use \OwenIt\Auditing\Auditable;
  protected $table = 'Categories';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'CategoryName',
    'CategoryDescription',
    'DateAdded',
    'DateModified',
  ];

  protected $casts = [
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
    $data['TableEdited'] = 'Categories';
    $data['PreviousChanges'] = !empty($data['old_values']) ? json_encode($data['old_values']) : null;
    $data['SavedChanges'] = !empty($data['new_values']) ? json_encode($data['new_values']) : null;
    $data['Action'] = ucfirst($data['event']);
    $data['DateAdded'] = now();

    return $data;
  }

  // Relationships
  public function products() {
    return $this->hasMany(Product::class, 'CategoryID');
  }
}
