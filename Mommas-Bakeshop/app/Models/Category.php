<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model {
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

  // Relationships
  public function products() {
    return $this->hasMany(Product::class, 'CategoryID');
  }
}
