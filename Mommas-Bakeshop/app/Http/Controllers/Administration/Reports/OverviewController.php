<?php

namespace App\Http\Controllers\Administration\Reports;

use Illuminate\Http\Request;

class OverviewController extends ReportsBaseController {
  public function index(Request $request) {
    return $this->renderReports($request, 'Overview');
  }
}
