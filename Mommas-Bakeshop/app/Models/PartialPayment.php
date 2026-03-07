<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PartialPayment extends Model {
  protected $table = 'partial_payments';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'SalesID',
    'PaidAmount',
    'ReceiptNumber',
    'ReceiptIssuedAt',
    'PaymentMethod',
    'AdditionalDetails',
    'DateAdded',
  ];

  protected $casts = [
    'PaidAmount' => 'decimal:2',
    'ReceiptIssuedAt' => 'datetime',
    'DateAdded' => 'datetime',
  ];

  public function sale() {
    return $this->belongsTo(Sale::class, 'SalesID');
  }
}
