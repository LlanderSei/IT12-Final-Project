<?php

namespace App\Http\Controllers;

use App\Models\Audit;
use App\Models\Inventory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AuditController extends Controller {
  public function index() {
    $audits = Audit::with('user')->orderBy('DateAdded', 'desc')->get();

    return Inertia::render('Administration/Audits', [
      'audits' => $audits,
    ]);
  }
}
