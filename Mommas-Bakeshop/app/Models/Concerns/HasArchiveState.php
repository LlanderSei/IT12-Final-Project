<?php

namespace App\Models\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

trait HasArchiveState {
  public function scopeNotArchived(Builder $query): Builder {
    return $query->where('IsArchived', false);
  }

  public function scopeOnlyArchived(Builder $query): Builder {
    return $query->where('IsArchived', true);
  }

  public function archivedBy() {
    return $this->belongsTo(User::class, 'ArchivedByUserID', 'id');
  }

  public function isArchived(): bool {
    return (bool) ($this->IsArchived ?? false);
  }
}
