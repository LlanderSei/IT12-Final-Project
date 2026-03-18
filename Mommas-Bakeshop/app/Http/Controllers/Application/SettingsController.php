<?php

namespace App\Http\Controllers\Application;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use App\Services\AuditTrailService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SettingsController extends Controller {
  public function index() {
    $settings = [
      'image_hosting_service' => SystemSetting::get('image_hosting_service', 'ImgBB'),
      'imgbb_api_key' => SystemSetting::get('imgbb_api_key', config('services.imgbb.key')),
    ];

    return Inertia::render('Application/Settings', [
      'settings' => $settings,
    ]);
  }

  public function update(Request $request, AuditTrailService $auditTrail) {
    if (!$request->user()->hasPermission('CanUpdateImageHosting')) {
      return redirect()->back()->with('error', 'Insufficient permission.');
    }

    $data = $request->validate([
      'image_hosting_service' => 'required|string|in:ImgBB',
      'imgbb_api_key' => 'required|string',
    ]);

    $previousService = SystemSetting::get('image_hosting_service', 'ImgBB');
    $hadPreviousKey = trim((string) SystemSetting::get('imgbb_api_key', config('services.imgbb.key'))) !== '';

    SystemSetting::set('image_hosting_service', $data['image_hosting_service']);
    SystemSetting::set('imgbb_api_key', $data['imgbb_api_key']);

    $auditTrail->record(
      $request->user(),
      'ApplicationSettings',
      'Updated',
      'Application image hosting settings updated',
      [
        'image_hosting_service' => $data['image_hosting_service'],
        'imgbb_api_key' => '[updated]',
      ],
      [
        'image_hosting_service' => $previousService,
        'imgbb_api_key' => $hadPreviousKey ? '[saved]' : '[none]',
      ],
    );

    return redirect()->back()->with('success', 'Settings updated successfully.');
  }
}
