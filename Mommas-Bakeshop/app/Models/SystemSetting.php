<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model {
  protected $table = 'system_settings';
  protected $primaryKey = 'ID';
  
  const CREATED_AT = 'DateAdded';
  const UPDATED_AT = 'DateModified';

  protected $fillable = [
    'SettingKey',
    'SettingValue',
  ];

  /**
   * Get a setting value by key.
   */
  public static function get($key, $default = null) {
    try {
      $setting = self::where('SettingKey', $key)->first();
      return $setting ? $setting->SettingValue : $default;
    } catch (\Exception $e) {
      return $default;
    }
  }

  /**
   * Set a setting value by key.
   */
  public static function set($key, $value) {
    return self::updateOrCreate(
      ['SettingKey' => $key],
      ['SettingValue' => $value]
    );
  }
}
