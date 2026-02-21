<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sale extends Model {
  protected $table = 'Sales';
  protected $primaryKey = 'ID';
  public $timestamps = false;

  protected $fillable = [
    'UserID',
    'CustomerID',
    'TotalAmount',
    'DateAdded',
  ];

  protected $casts = [
    'TotalAmount' => 'decimal:2',
    'DateAdded' => 'datetime',
  ];

  // Relationships
  public function user() {
    return $this->belongsTo(User::class, 'UserID');
  }

  public function customer() {
    return $this->belongsTo(Customer::class, 'CustomerID');
  }

  public function payment() {
    return $this->hasOne(Payment::class, 'SalesID');
  }

  public function soldProducts() {
    return $this->hasMany(SoldProduct::class, 'SalesID');
  }
}
