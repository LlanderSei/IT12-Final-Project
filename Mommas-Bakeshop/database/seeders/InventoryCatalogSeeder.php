<?php

namespace Database\Seeders;

use Carbon\CarbonPeriod;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class InventoryCatalogSeeder extends Seeder {
	private const STOCK_IN_NOTE = 'Auto-generated inventory stock-in cycle from InventoryCatalogSeeder.';
	private const STOCK_OUT_REASON = 'Auto-generated bakery inventory usage from InventoryCatalogSeeder';

	public function run(): void {
		$userId = DB::table('users')->value('id');

		if (!$userId) {
			$this->command?->warn('InventoryCatalogSeeder skipped: no user found for UserID foreign keys.');
			return;
		}

		$today = now()->startOfDay();
		$startDate = $today->copy()->startOfYear();
		$now = now();

		$items = $this->inventoryCatalog($now);
		$this->seedInventoryCatalog($items);

		if ($this->generatedCyclesAlreadyExist()) {
			$this->command?->warn('InventoryCatalogSeeder stock cycles skipped: generated stock-in/out rows already exist.');
			return;
		}

		$inventoryItems = DB::table('inventory')
			->whereIn('ItemName', array_column($items, 'ItemName'))
			->select('ID', 'ItemName', 'Measurement')
			->orderBy('ID')
			->get()
			->keyBy('ItemName');

		if ($inventoryItems->isEmpty()) {
			$this->command?->warn('InventoryCatalogSeeder skipped: no inventory rows were available after catalog seeding.');
			return;
		}

		$runningQuantities = $inventoryItems->mapWithKeys(fn($item) => [(int) $item->ID => 0])->all();

		foreach (CarbonPeriod::create($startDate, $today) as $date) {
			$day = Carbon::instance($date)->startOfDay();
			$stockInLines = $this->buildStockInLines($day, $inventoryItems, $runningQuantities);
			if (!empty($stockInLines)) {
				$this->insertStockInBatch((int) $userId, $day, $stockInLines);
				foreach ($stockInLines as $line) {
					$runningQuantities[$line['InventoryID']] += $line['QuantityAdded'];
				}
			}

			$stockOutLines = $this->buildStockOutLines($day, $inventoryItems, $runningQuantities);
			if (!empty($stockOutLines)) {
				$this->insertStockOutBatch((int) $userId, $day, $stockOutLines);
				foreach ($stockOutLines as $line) {
					$runningQuantities[$line['InventoryID']] -= $line['QuantityRemoved'];
				}
			}
		}
	}

	private function inventoryCatalog(Carbon $now): array {
		$timestamp = $now->copy();

		return [
			$this->makeInventoryRow('Bread Flour', 'Primary flour used for breads and rolls.', 'Dry Goods', 'kg', 0, 40, $timestamp),
			$this->makeInventoryRow('Cake Flour', 'Fine flour for softer pastries and cakes.', 'Dry Goods', 'kg', 0, 18, $timestamp),
			$this->makeInventoryRow('Granulated Sugar', 'White sugar for doughs, fillings, and beverages.', 'Dry Goods', 'kg', 0, 25, $timestamp),
			$this->makeInventoryRow('Brown Sugar', 'Brown sugar for sweet breads and toppings.', 'Dry Goods', 'kg', 0, 10, $timestamp),
			$this->makeInventoryRow('Powdered Sugar', 'Sugar for dusting pastries and icings.', 'Dry Goods', 'kg', 0, 6, $timestamp),
			$this->makeInventoryRow('Baking Powder', 'Leavening agent for pastries and cakes.', 'Baking Supply', 'tubs', 0, 4, $timestamp),
			$this->makeInventoryRow('Instant Dry Yeast', 'Yeast used for fermented breads.', 'Baking Supply', 'packs', 0, 12, $timestamp),
			$this->makeInventoryRow('Salt', 'Fine salt used across bakery recipes.', 'Seasoning', 'kg', 0, 8, $timestamp),
			$this->makeInventoryRow('Butter', 'Butter for laminated dough, icing, and fillings.', 'Dairy', 'blocks', 0, 14, $timestamp),
			$this->makeInventoryRow('Margarine', 'Margarine for bread spread and baking.', 'Dairy', 'tubs', 0, 10, $timestamp),
			$this->makeInventoryRow('Fresh Milk', 'Milk for dough, fillings, and beverages.', 'Dairy', 'liters', 0, 16, $timestamp),
			$this->makeInventoryRow('Eggs', 'Fresh eggs for bread wash and pastry batter.', 'Dairy', 'trays', 0, 18, $timestamp),
			$this->makeInventoryRow('Cheese', 'Cheese for ensaymada and bread toppings.', 'Dairy', 'blocks', 0, 10, $timestamp),
			$this->makeInventoryRow('Ube Flavoring', 'Flavoring used for ube bread and fillings.', 'Flavoring', 'bottles', 0, 5, $timestamp),
			$this->makeInventoryRow('Chocolate Chips', 'Chocolate ingredient for muffins and pastries.', 'Flavoring', 'packs', 0, 8, $timestamp),
			$this->makeInventoryRow('Condensed Milk', 'Milk ingredient for sweet fillings and glaze.', 'Dairy', 'cans', 0, 14, $timestamp),
			$this->makeInventoryRow('Plastic Bread Bags', 'Packaging bags for bread sales.', 'Packaging', 'packs', 0, 15, $timestamp),
			$this->makeInventoryRow('Cake Boxes', 'Boxes for pastry and cake takeout.', 'Packaging', 'bundles', 0, 8, $timestamp),
			$this->makeInventoryRow('Paper Cups', 'Hot and cold drink serving cups.', 'Packaging', 'packs', 0, 10, $timestamp),
			$this->makeInventoryRow('Cup Lids', 'Matching lids for drink cups.', 'Packaging', 'packs', 0, 10, $timestamp),
			$this->makeInventoryRow('Takeout Boxes', 'Boxes for pastries and snack packs.', 'Packaging', 'bundles', 0, 9, $timestamp),
			$this->makeInventoryRow('Dishwashing Liquid', 'Cleaning liquid for kitchen sanitation.', 'Cleaning Supply', 'bottles', 0, 6, $timestamp),
			$this->makeInventoryRow('Food Gloves', 'Disposable gloves for food handling.', 'Cleaning Supply', 'boxes', 0, 6, $timestamp),
			$this->makeInventoryRow('Tissue Napkins', 'Customer napkins for dine-in and takeout.', 'Packaging', 'packs', 0, 10, $timestamp),
		];
	}

	private function makeInventoryRow(
		string $name,
		string $description,
		string $itemType,
		string $measurement,
		int $quantity,
		int $lowCountThreshold,
		Carbon $timestamp,
	): array {
		return [
			'ItemName' => $name,
			'ItemDescription' => $description,
			'ItemType' => $itemType,
			'Measurement' => $measurement,
			'Quantity' => $quantity,
			'LowCountThreshold' => $lowCountThreshold,
			'DateAdded' => $timestamp,
			'DateModified' => $timestamp,
		];
	}

	private function seedInventoryCatalog(array $items): void {
		foreach ($items as $item) {
			DB::table('inventory')->updateOrInsert(
				['ItemName' => $item['ItemName']],
				$item
			);
		}
	}

	private function generatedCyclesAlreadyExist(): bool {
		return DB::table('stock_in_details')
			->where('AdditionalDetails', self::STOCK_IN_NOTE)
			->exists()
			|| DB::table('stock_out_details')
			->where('Reason', self::STOCK_OUT_REASON)
			->exists();
	}

	private function buildStockInLines(Carbon $day, Collection $inventoryItems, array $runningQuantities): array {
		$lines = [];

		foreach ($inventoryItems as $itemName => $item) {
			$inventoryId = (int) $item->ID;
			$itemName = (string) $itemName;
			$measurement = (string) $item->Measurement;
			$currentQuantity = (int) ($runningQuantities[$inventoryId] ?? 0);
			$weekday = (int) $day->dayOfWeekIso;
			$seasonalBoost = $day->month === 12 ? 2 : 0;

			$shouldRestock = $currentQuantity <= $this->preferredFloor($itemName)
				|| (($this->stableNumber($itemName . $day->toDateString() . '-restock') + $weekday) % 7 === 0);

			if (!$shouldRestock) {
				continue;
			}

			$quantityAdded = $this->stockInQuantity($itemName, $measurement) + $seasonalBoost;
			$unitCost = $this->unitCost($itemName, $measurement);

			$lines[] = [
				'InventoryID' => $inventoryId,
				'QuantityAdded' => $quantityAdded,
				'SubAmount' => round($unitCost * $quantityAdded, 2),
			];
		}

		return $lines;
	}

	private function buildStockOutLines(Carbon $day, Collection $inventoryItems, array $runningQuantities): array {
		$lines = [];

		foreach ($inventoryItems as $itemName => $item) {
			$inventoryId = (int) $item->ID;
			$measurement = (string) $item->Measurement;
			$available = (int) ($runningQuantities[$inventoryId] ?? 0);

			if ($available <= 0) {
				continue;
			}

			$baseUsage = $this->stockOutQuantity($itemName, $measurement, $day);
			$quantityRemoved = min($available, $baseUsage);

			if ($quantityRemoved <= 0) {
				continue;
			}

			$lines[] = [
				'InventoryID' => $inventoryId,
				'QuantityRemoved' => $quantityRemoved,
				'SubAmount' => round($this->unitCost((string) $itemName, $measurement) * $quantityRemoved, 2),
			];
		}

		return $lines;
	}

	private function insertStockInBatch(int $userId, Carbon $day, array $lines): void {
		$dateAdded = $day->copy()->setTime(7 + ($day->day % 3), 15 + ($day->day % 4) * 10, 0);
		$totalQuantity = array_sum(array_column($lines, 'QuantityAdded'));
		$totalAmount = round(array_sum(array_column($lines, 'SubAmount')), 2);

		$detailId = DB::table('stock_in_details')->insertGetId([
			'UserID' => $userId,
			'Supplier' => $this->supplierName($day),
			'PurchaseDate' => $dateAdded,
			'Source' => 'Purchased',
			'ReceiptNumber' => sprintf('INV-INT-%s', $day->format('Ymd')),
			'InvoiceNumber' => sprintf('REC-INT-%s', $day->format('Ymd')),
			'TotalQuantity' => $totalQuantity,
			'TotalAmount' => $totalAmount,
			'AdditionalDetails' => self::STOCK_IN_NOTE,
			'DateAdded' => $dateAdded,
		]);

		$rows = array_map(fn(array $line) => [
			'StockInDetailsID' => $detailId,
			'InventoryID' => $line['InventoryID'],
			'ProductID' => null,
			'ItemType' => 'Inventory',
			'QuantityAdded' => $line['QuantityAdded'],
			'SubAmount' => $line['SubAmount'],
			'DateAdded' => $dateAdded,
		], $lines);

		DB::table('stock_ins')->insert($rows);
	}

	private function insertStockOutBatch(int $userId, Carbon $day, array $lines): void {
		$dateAdded = $day->copy()->setTime(16 + ($day->day % 2), 20 + ($day->day % 3) * 10, 0);
		$totalQuantity = array_sum(array_column($lines, 'QuantityRemoved'));

		$detailId = DB::table('stock_out_details')->insertGetId([
			'UserID' => $userId,
			'TotalQuantity' => $totalQuantity,
			'Reason' => self::STOCK_OUT_REASON,
			'DateAdded' => $dateAdded,
		]);

		$rows = array_map(fn(array $line) => [
			'StockOutDetailsID' => $detailId,
			'InventoryID' => $line['InventoryID'],
			'ProductID' => null,
			'ItemType' => 'Inventory',
			'QuantityRemoved' => $line['QuantityRemoved'],
			'SubAmount' => $line['SubAmount'],
			'DateAdded' => $dateAdded,
		], $lines);

		DB::table('stock_outs')->insert($rows);
	}

	private function stockInQuantity(string $itemName, string $measurement): int {
		$base = match ($measurement) {
			'kg', 'liters' => 6,
			'packs', 'boxes', 'bundles', 'tubs', 'bottles', 'cans' => 4,
			'trays', 'blocks' => 3,
			default => 5,
		};

		return $base + ($this->stableNumber($itemName . '-stock-in') % 7);
	}

	private function stockOutQuantity(string $itemName, string $measurement, Carbon $day): int {
		$base = match ($measurement) {
			'kg', 'liters' => 2,
			'packs', 'boxes', 'bundles', 'tubs', 'bottles', 'cans' => 1,
			'trays', 'blocks' => 1,
			default => 1,
		};

		$weekdayBoost = in_array($day->dayOfWeekIso, [5, 6, 7], true) ? 1 : 0;
		$variation = $this->stableNumber($itemName . $day->toDateString() . '-stock-out') % 3;

		return $base + $weekdayBoost + $variation;
	}

	private function preferredFloor(string $itemName): int {
		return 5 + ($this->stableNumber($itemName . '-floor') % 6);
	}

	private function unitCost(string $itemName, string $measurement): float {
		$base = match ($measurement) {
			'kg' => 58.0,
			'liters' => 72.0,
			'packs' => 95.0,
			'boxes' => 180.0,
			'bundles' => 140.0,
			'tubs' => 165.0,
			'bottles' => 88.0,
			'cans' => 60.0,
			'trays' => 235.0,
			'blocks' => 150.0,
			default => 100.0,
		};

		return $base + ($this->stableNumber($itemName . '-cost') % 35);
	}

	private function supplierName(Carbon $day): string {
		$suppliers = [
			'Baker\'s Pantry Trading',
			'Golden Grain Wholesale',
			'Fresh Dairy Depot',
			'Sweet Supply Hub',
			'BakePack Essentials',
			'Metro Kitchen Provisions',
		];

		return $suppliers[$day->dayOfYear % count($suppliers)];
	}

	private function stableNumber(string $seed): int {
		return abs((int) crc32($seed));
	}
}
