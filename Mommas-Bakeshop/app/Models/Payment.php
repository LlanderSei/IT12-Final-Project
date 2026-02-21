<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model {
  protected $table = 'Payments';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'SalesID',
    'PaidAmount',
    'TotalAmount',
    'Change',
    'PaymentMethod',
    'PaymentStatus',
    'PaymentDueDate',
    'DateAdded',
  ];

  protected $casts = [
    'PaidAmount' => 'decimal:2',
    'TotalAmount' => 'decimal:2',
    'Change' => 'decimal:2',
    'PaymentDueDate' => 'datetime',
    'DateAdded' => 'datetime',
  ];

  // Relationships
  public function sale() {
    return $this->belongsTo(Sale::class, 'SalesID');
  }
}
