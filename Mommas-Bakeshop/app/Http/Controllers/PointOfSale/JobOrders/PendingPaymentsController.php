<?php

namespace App\Http\Controllers\PointOfSale\JobOrders;

use Illuminate\Http\Request;

class PendingPaymentsController extends JobOrdersController {
  public function index(Request $request) {
    return $this->renderJobOrders($request, 'Pending Payments');
  }
}
