<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
	public function up(): void {
		foreach ($this->trackedTables() as $table) {
			$primaryKey = $this->primaryKeyForTable($table);
			$insertTrigger = $this->triggerName($table, 'ai');
			$updateTrigger = $this->triggerName($table, 'au');
			$deleteTrigger = $this->triggerName($table, 'bd');
			$newJson = $this->jsonObjectExpression($table, 'NEW');
			$oldJson = $this->jsonObjectExpression($table, 'OLD');

			DB::unprepared("DROP TRIGGER IF EXISTS `{$insertTrigger}`");
			DB::unprepared("DROP TRIGGER IF EXISTS `{$updateTrigger}`");
			DB::unprepared("DROP TRIGGER IF EXISTS `{$deleteTrigger}`");

			DB::unprepared(<<<SQL
CREATE TRIGGER `{$insertTrigger}`
AFTER INSERT ON `{$table}`
FOR EACH ROW
BEGIN
    INSERT INTO `database_backup_changes` (`TableName`, `RecordID`, `Action`, `RowData`, `ChangedAt`)
    VALUES ('{$table}', CAST(NEW.`{$primaryKey}` AS CHAR), 'Insert', {$newJson}, NOW());
END
SQL);

			DB::unprepared(<<<SQL
CREATE TRIGGER `{$updateTrigger}`
AFTER UPDATE ON `{$table}`
FOR EACH ROW
BEGIN
    INSERT INTO `database_backup_changes` (`TableName`, `RecordID`, `Action`, `RowData`, `ChangedAt`)
    VALUES ('{$table}', CAST(NEW.`{$primaryKey}` AS CHAR), 'Update', {$newJson}, NOW());
END
SQL);

			DB::unprepared(<<<SQL
CREATE TRIGGER `{$deleteTrigger}`
BEFORE DELETE ON `{$table}`
FOR EACH ROW
BEGIN
    INSERT INTO `database_backup_changes` (`TableName`, `RecordID`, `Action`, `RowData`, `ChangedAt`)
    VALUES ('{$table}', CAST(OLD.`{$primaryKey}` AS CHAR), 'Delete', {$oldJson}, NOW());
END
SQL);
		}
	}

	public function down(): void {
		foreach ($this->trackedTables() as $table) {
			DB::unprepared("DROP TRIGGER IF EXISTS `{$this->triggerName($table, 'ai')}`");
			DB::unprepared("DROP TRIGGER IF EXISTS `{$this->triggerName($table, 'au')}`");
			DB::unprepared("DROP TRIGGER IF EXISTS `{$this->triggerName($table, 'bd')}`");
		}
	}

	private function trackedTables(): array {
		return config('database-backups.tracked_tables', []);
	}

	private function triggerName(string $table, string $suffix): string {
		$clean = substr(preg_replace('/[^a-z0-9]+/i', '', $table), 0, 20);
		return sprintf('bkc_%s_%s', $clean, substr(md5($table . '_' . $suffix), 0, 8));
	}

	private function primaryKeyForTable(string $table): string {
		$primary = DB::selectOne("SHOW KEYS FROM `{$table}` WHERE Key_name = 'PRIMARY'");
		return $primary?->Column_name ?? 'ID';
	}

	private function jsonObjectExpression(string $table, string $rowReference): string {
		$columns = DB::select("SHOW COLUMNS FROM `{$table}`");
		$parts = [];

		foreach ($columns as $column) {
			$name = $column->Field;
			$escaped = str_replace("'", "''", $name);
			$parts[] = "'{$escaped}', {$rowReference}.`{$name}`";
		}

		return 'JSON_OBJECT(' . implode(', ', $parts) . ')';
	}
};
