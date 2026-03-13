<?php

namespace App\Http\Controllers\Administration;

use App\Http\Controllers\Controller;
use App\Models\Audit;
use Inertia\Inertia;

class AuditsController extends Controller {
  public function index() {
    $audits = Audit::with('user')->orderBy('DateAdded', 'desc')->get();

    return Inertia::render('Administration/Audits', [
      'audits' => $audits,
    ]);
  }
}
