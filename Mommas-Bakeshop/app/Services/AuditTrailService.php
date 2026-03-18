<?php

namespace App\Services;

use App\Models\Audit;
use App\Models\User;

class AuditTrailService {
	public function record(
		?User $user,
		string $tableEdited,
		string $action,
		string $readableChanges,
		array $savedChanges = [],
		array $previousChanges = [],
		string $source = 'Application',
	): Audit {
		return Audit::query()->create([
			'UserID' => $user?->id ?: User::query()->orderBy('id')->value('id'),
			'TableEdited' => $tableEdited,
			'PreviousChanges' => !empty($previousChanges) ? json_encode($previousChanges) : null,
			'SavedChanges' => !empty($savedChanges) ? json_encode($savedChanges) : null,
			'ReadableChanges' => $readableChanges,
			'Action' => $action,
			'Source' => $source,
			'DateAdded' => now(),
		]);
	}
}
