<?php

namespace App\Http\Controllers\PointOfSale\JobOrders;

use Illuminate\Http\Request;

class PendingJobOrdersController extends JobOrdersController {
  public function index(Request $request) {
    return $this->renderJobOrders($request, 'Pending Job Orders');
  }
}
