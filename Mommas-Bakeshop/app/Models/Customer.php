<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model {
  protected $table = 'Customers';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'CustomerName',
    'CustomerType',
    'ContactDetails',
    'Address',
    'DateAdded',
    'DateModified',
  ];

  protected $casts = [
    'DateAdded' => 'datetime',
    'DateModified' => 'datetime',
  ];

  // Relationships
  public function sales() {
    return $this->hasMany(Sale::class, 'CustomerID');
  }
}
