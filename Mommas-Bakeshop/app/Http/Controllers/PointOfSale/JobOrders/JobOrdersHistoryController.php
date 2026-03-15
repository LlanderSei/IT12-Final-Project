<?php

namespace App\Http\Controllers\PointOfSale\JobOrders;

use Illuminate\Http\Request;

class JobOrdersHistoryController extends JobOrdersController {
  public function index(Request $request) {
    return $this->renderJobOrders($request, 'Job Orders History');
  }
}
