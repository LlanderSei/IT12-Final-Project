<?php

namespace App\Http\Controllers\PointOfSale\SaleHistory;

use App\Http\Controllers\Controller;
use App\Http\Controllers\PointOfSale\Concerns\HandlesSaleHistory;
use Illuminate\Http\Request;

class SalesController extends Controller {
  use HandlesSaleHistory;

  public function index(Request $request) {
    return $this->renderSaleHistory($request, 'Sales');
  }
}
