<?php

namespace Database\Seeders;

use Carbon\CarbonPeriod;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class BusinessHoursCycleSeeder extends Seeder {
  private const BATCH_DESCRIPTION_PREFIX = '[BusinessHoursSeeder] Production batch';
  private const STOCK_IN_NOTE = '[BusinessHoursSeeder] Generated stock-in';
  private const STOCK_OUT_REASON_PREFIX = '[BusinessHoursSeeder]';
  private const PAYMENT_NOTE = '[BusinessHoursSeeder] Walk-in sale';

  private int $stockInSequence = 1;
  private int $stockOutSequence = 1;
  private int $batchSequence = 1;
  private int $saleSequence = 1;
  private int $shrinkageSequence = 1;

  public function run(): void {
    $userId = DB::table('users')->value('id');

    if (!$userId) {
      $this->command?->warn('BusinessHoursCycleSeeder skipped: no user found for foreign-key ownership.');
      return;
    }

    if ($this->generatedHistoryAlreadyExists()) {
      $this->command?->warn('BusinessHoursCycleSeeder skipped: generated history already exists.');
      return;
    }

    DB::transaction(function () use ($userId) {
      $now = now();
      $startDate = $now->copy()->startOfYear()->startOfDay();
      $endDate = $now->copy()->startOfDay();

      $this->seedCategories($now);
      $this->seedProducts($now);
      $this->seedInventory($now);

      $products = DB::table('products')
        ->select('ID', 'ProductName', 'ProductFrom', 'Price', 'LowStockThreshold')
        ->orderBy('ID')
        ->get()
        ->keyBy('ProductName');
      $inventory = DB::table('inventory')
        ->select('ID', 'ItemName', 'Measurement', 'LowCountThreshold')
        ->orderBy('ID')
        ->get()
        ->keyBy('ItemName');

      if ($products->isEmpty() || $inventory->isEmpty()) {
        $this->command?->warn('BusinessHoursCycleSeeder skipped: products or inventory catalogs were not available after seeding.');
        return;
      }

      $recipes = $this->buildRecipes($products, $inventory);
      $productState = $products->mapWithKeys(fn ($product) => [(int) $product->ID => 0])->all();
      $inventoryState = $inventory->mapWithKeys(fn ($item) => [(int) $item->ID => 0])->all();

      foreach (CarbonPeriod::create($startDate, $endDate) as $date) {
        $day = Carbon::instance($date)->startOfDay();
        $attempts = $this->makeAttemptBudget($day);
        $forcedEvent = null;

        $this->seedInitialPreparation(
          (int) $userId,
          $day,
          $products,
          $inventory,
          $recipes,
          $productState,
          $inventoryState,
          $attempts,
          $forcedEvent,
        );

        $tick = $day->copy()->setTime(7, 0, 0);
        $closeTime = $day->copy()->setTime(19, 0, 0);
        while ($tick < $closeTime) {
          $event = $forcedEvent ?: $this->pickTickEvent($tick, $products, $inventory, $recipes, $productState, $inventoryState, $attempts);
          $forcedEvent = null;

          switch ($event) {
            case 'sale':
              $this->recordSale((int) $userId, $tick, $products, $productState, $attempts);
              break;
            case 'batch':
              $forcedEvent = $this->recordBatch((int) $userId, $tick, $products, $inventory, $recipes, $productState, $inventoryState, $attempts);
              break;
            case 'stock_in':
              $this->recordStockIn((int) $userId, $tick, $products, $inventory, $productState, $inventoryState, $attempts, false);
              break;
            case 'stock_out':
              $this->recordGeneralStockOut((int) $userId, $tick, $inventory, $inventoryState, $attempts);
              break;
            case 'shrinkage':
              $this->recordShrinkage((int) $userId, $tick, $products, $productState, $attempts);
              break;
            default:
              break;
          }

          $tick->addMinutes(5);
        }
      }
    });
  }

  private function generatedHistoryAlreadyExists(): bool {
    return DB::table('production_batch_details')
      ->where('BatchDescription', 'like', self::BATCH_DESCRIPTION_PREFIX . '%')
      ->exists()
      || DB::table('stock_in_details')->where('AdditionalDetails', 'like', self::STOCK_IN_NOTE . '%')->exists()
      || DB::table('stock_out_details')->where('Reason', 'like', self::STOCK_OUT_REASON_PREFIX . '%')->exists()
      || DB::table('payments')->where('AdditionalDetails', 'like', self::PAYMENT_NOTE . '%')->exists();
  }

  private function seedCategories(Carbon $now): void {
    $categories = [
      ['CategoryName' => 'Daily Bread', 'CategoryDescription' => 'Core breads baked throughout the day.'],
      ['CategoryName' => 'Sweet Bread', 'CategoryDescription' => 'Sweet and filled breads for snack sales.'],
      ['CategoryName' => 'Pastries', 'CategoryDescription' => 'Pastries and enriched baked goods.'],
      ['CategoryName' => 'Muffins & Cakes', 'CategoryDescription' => 'Small cakes and muffin items.'],
      ['CategoryName' => 'Drinks', 'CategoryDescription' => 'Ready-to-sell bottled and canned beverages.'],
      ['CategoryName' => 'Merch Counter', 'CategoryDescription' => 'Purchased counter products and impulse buys.'],
    ];

    foreach ($categories as $category) {
      DB::table('categories')->updateOrInsert(
        ['CategoryName' => $category['CategoryName']],
        [
          'CategoryDescription' => $category['CategoryDescription'],
          'DateAdded' => $now,
          'DateModified' => $now,
        ],
      );
    }
  }

  private function seedProducts(Carbon $now): void {
    $categoryIds = DB::table('categories')->pluck('ID', 'CategoryName');

    $products = [
      $this->makeProduct('Pandesal', 'Daily Bread', (int) $categoryIds['Daily Bread'], 'Produced', 2.50, 45, $now),
      $this->makeProduct('Monay', 'Daily Bread', (int) $categoryIds['Daily Bread'], 'Produced', 7.00, 20, $now),
      $this->makeProduct('Spanish Bread', 'Sweet Bread', (int) $categoryIds['Sweet Bread'], 'Produced', 9.00, 18, $now),
      $this->makeProduct('Pan de Coco', 'Sweet Bread', (int) $categoryIds['Sweet Bread'], 'Produced', 9.00, 16, $now),
      $this->makeProduct('Pan de Regla', 'Sweet Bread', (int) $categoryIds['Sweet Bread'], 'Produced', 10.00, 14, $now),
      $this->makeProduct('Cheese Bread', 'Sweet Bread', (int) $categoryIds['Sweet Bread'], 'Produced', 8.00, 18, $now),
      $this->makeProduct('Ube Cheese Pandesal', 'Sweet Bread', (int) $categoryIds['Sweet Bread'], 'Produced', 12.00, 14, $now),
      $this->makeProduct('Ensaymada', 'Pastries', (int) $categoryIds['Pastries'], 'Produced', 18.00, 12, $now),
      $this->makeProduct('Cheese Ensaymada', 'Pastries', (int) $categoryIds['Pastries'], 'Produced', 22.00, 10, $now),
      $this->makeProduct('Cinnamon Roll', 'Pastries', (int) $categoryIds['Pastries'], 'Produced', 24.00, 10, $now),
      $this->makeProduct('Butter Croissant', 'Pastries', (int) $categoryIds['Pastries'], 'Produced', 28.00, 8, $now),
      $this->makeProduct('Chocolate Muffin', 'Muffins & Cakes', (int) $categoryIds['Muffins & Cakes'], 'Produced', 30.00, 8, $now),
      $this->makeProduct('Banana Muffin', 'Muffins & Cakes', (int) $categoryIds['Muffins & Cakes'], 'Produced', 28.00, 8, $now),
      $this->makeProduct('Garlic Bread Stick', 'Pastries', (int) $categoryIds['Pastries'], 'Produced', 15.00, 12, $now),
      $this->makeProduct('Ham and Cheese Roll', 'Daily Bread', (int) $categoryIds['Daily Bread'], 'Produced', 20.00, 10, $now),
      $this->makeProduct('Dinner Roll', 'Daily Bread', (int) $categoryIds['Daily Bread'], 'Produced', 6.00, 18, $now),
      $this->makeProduct('Milk Bread Loaf', 'Daily Bread', (int) $categoryIds['Daily Bread'], 'Produced', 75.00, 6, $now),
      $this->makeProduct('Chocolate Swirl Bread', 'Sweet Bread', (int) $categoryIds['Sweet Bread'], 'Produced', 85.00, 5, $now),
      $this->makeProduct('Bottled Water', 'Drinks', (int) $categoryIds['Drinks'], 'Purchased', 20.00, 18, $now),
      $this->makeProduct('Calamansi Juice', 'Drinks', (int) $categoryIds['Drinks'], 'Purchased', 35.00, 12, $now),
      $this->makeProduct('Lemon Iced Tea', 'Drinks', (int) $categoryIds['Drinks'], 'Purchased', 40.00, 12, $now),
      $this->makeProduct('Chocolate Milk', 'Drinks', (int) $categoryIds['Drinks'], 'Purchased', 38.00, 10, $now),
      $this->makeProduct('Canned Coffee', 'Drinks', (int) $categoryIds['Drinks'], 'Purchased', 45.00, 10, $now),
      $this->makeProduct('Orange Juice', 'Drinks', (int) $categoryIds['Drinks'], 'Purchased', 42.00, 10, $now),
      $this->makeProduct('Bottled Cold Brew', 'Drinks', (int) $categoryIds['Drinks'], 'Purchased', 55.00, 8, $now),
      $this->makeProduct('Premium Butter Cookies', 'Merch Counter', (int) $categoryIds['Merch Counter'], 'Purchased', 65.00, 6, $now),
      $this->makeProduct('Brownie Bar', 'Merch Counter', (int) $categoryIds['Merch Counter'], 'Purchased', 35.00, 8, $now),
      $this->makeProduct('Banana Bread Slice', 'Merch Counter', (int) $categoryIds['Merch Counter'], 'Purchased', 32.00, 8, $now),
    ];

    foreach ($products as $product) {
      DB::table('products')->updateOrInsert(
        ['ProductName' => $product['ProductName']],
        $product,
      );
    }
  }

  private function makeProduct(
    string $name,
    string $descriptionGroup,
    int $categoryId,
    string $productFrom,
    float $price,
    int $lowStockThreshold,
    Carbon $timestamp,
  ): array {
    return [
      'ProductName' => $name,
      'ProductDescription' => $descriptionGroup . ': ' . $name,
      'CategoryID' => $categoryId,
      'ProductImage' => null,
      'ProductFrom' => $productFrom,
      'Price' => number_format($price, 2, '.', ''),
      'LowStockThreshold' => $lowStockThreshold,
      'Quantity' => 0,
      'DateAdded' => $timestamp,
      'DateModified' => $timestamp,
    ];
  }

  private function seedInventory(Carbon $now): void {
    $items = [
      $this->makeInventory('Bread Flour', 'Primary bread flour for daily dough.', 'Dry Goods', 'kg', 40, $now),
      $this->makeInventory('Cake Flour', 'Fine flour for muffins and pastries.', 'Dry Goods', 'kg', 18, $now),
      $this->makeInventory('Granulated Sugar', 'Standard sugar for dough and fillings.', 'Dry Goods', 'kg', 24, $now),
      $this->makeInventory('Brown Sugar', 'Brown sugar for sweet fillings and toppings.', 'Dry Goods', 'kg', 10, $now),
      $this->makeInventory('Powdered Sugar', 'Dusting and icing sugar.', 'Dry Goods', 'kg', 8, $now),
      $this->makeInventory('Salt', 'Baking salt for dough balance.', 'Dry Goods', 'kg', 8, $now),
      $this->makeInventory('Instant Dry Yeast', 'Yeast for fermented dough.', 'Baking Supply', 'packs', 14, $now),
      $this->makeInventory('Baking Powder', 'Leavener for pastries and muffins.', 'Baking Supply', 'tubs', 5, $now),
      $this->makeInventory('Butter', 'Butter for pastry and bread recipes.', 'Dairy', 'blocks', 14, $now),
      $this->makeInventory('Margarine', 'Margarine for bread production.', 'Dairy', 'tubs', 10, $now),
      $this->makeInventory('Fresh Milk', 'Milk for dough and fillings.', 'Dairy', 'liters', 16, $now),
      $this->makeInventory('Eggs', 'Egg trays for dough, wash, and pastries.', 'Dairy', 'trays', 16, $now),
      $this->makeInventory('Cheese', 'Cheese blocks for toppings and fillings.', 'Dairy', 'blocks', 10, $now),
      $this->makeInventory('Ube Flavoring', 'Ube extract and flavoring.', 'Flavoring', 'bottles', 5, $now),
      $this->makeInventory('Chocolate Chips', 'Chocolate chips for muffins and toppings.', 'Flavoring', 'packs', 7, $now),
      $this->makeInventory('Cinnamon Powder', 'Cinnamon for rolls and sweet breads.', 'Flavoring', 'packs', 5, $now),
      $this->makeInventory('Coconut Filling', 'Sweet coconut filling for pan de coco.', 'Prepared Filling', 'packs', 6, $now),
      $this->makeInventory('Red Filling', 'Sweet red filling for pan de regla.', 'Prepared Filling', 'packs', 6, $now),
      $this->makeInventory('Ham Slices', 'Ham for savory rolls.', 'Cold Cuts', 'packs', 6, $now),
      $this->makeInventory('Bread Bags', 'Plastic bread bags for takeout.', 'Packaging', 'packs', 18, $now),
      $this->makeInventory('Loaf Bags', 'Large bags for loaf products.', 'Packaging', 'packs', 10, $now),
      $this->makeInventory('Drink Cups', 'Cups for beverage service.', 'Packaging', 'packs', 12, $now),
      $this->makeInventory('Cup Lids', 'Lids for beverage cups.', 'Packaging', 'packs', 12, $now),
      $this->makeInventory('Cake Boxes', 'Boxes for pastry and cake takeout.', 'Packaging', 'bundles', 8, $now),
      $this->makeInventory('Paper Liners', 'Muffin and pastry paper liners.', 'Packaging', 'packs', 9, $now),
      $this->makeInventory('Napkins', 'Customer tissue napkins.', 'Packaging', 'packs', 12, $now),
      $this->makeInventory('Food Gloves', 'Disposable gloves for prep and service.', 'Cleaning Supply', 'boxes', 6, $now),
      $this->makeInventory('Dishwashing Liquid', 'Cleaning liquid for bakery operations.', 'Cleaning Supply', 'bottles', 6, $now),
      $this->makeInventory('All-Purpose Cleaner', 'Surface cleaner for prep stations.', 'Cleaning Supply', 'bottles', 5, $now),
      $this->makeInventory('Baking Paper', 'Non-stick paper for trays and pans.', 'Baking Supply', 'rolls', 7, $now),
      $this->makeInventory('Cooking Oil', 'Oil for baking prep and pan greasing.', 'Baking Supply', 'liters', 8, $now),
    ];

    foreach ($items as $item) {
      DB::table('inventory')->updateOrInsert(
        ['ItemName' => $item['ItemName']],
        $item,
      );
    }
  }

  private function makeInventory(
    string $name,
    string $description,
    string $itemType,
    string $measurement,
    int $lowCountThreshold,
    Carbon $timestamp,
  ): array {
    return [
      'ItemName' => $name,
      'ItemDescription' => $description,
      'ItemType' => $itemType,
      'Measurement' => $measurement,
      'Quantity' => 0,
      'LowCountThreshold' => $lowCountThreshold,
      'DateAdded' => $timestamp,
      'DateModified' => $timestamp,
    ];
  }

  private function buildRecipes(Collection $products, Collection $inventory): array {
    $rawRecipes = [
      'Pandesal' => ['Bread Flour' => 2, 'Granulated Sugar' => 1, 'Salt' => 1, 'Instant Dry Yeast' => 1, 'Bread Bags' => 1],
      'Monay' => ['Bread Flour' => 2, 'Granulated Sugar' => 1, 'Salt' => 1, 'Instant Dry Yeast' => 1, 'Bread Bags' => 1],
      'Spanish Bread' => ['Bread Flour' => 2, 'Granulated Sugar' => 1, 'Butter' => 1, 'Instant Dry Yeast' => 1, 'Bread Bags' => 1],
      'Pan de Coco' => ['Bread Flour' => 2, 'Granulated Sugar' => 1, 'Coconut Filling' => 1, 'Instant Dry Yeast' => 1, 'Bread Bags' => 1],
      'Pan de Regla' => ['Bread Flour' => 2, 'Granulated Sugar' => 1, 'Red Filling' => 1, 'Instant Dry Yeast' => 1, 'Bread Bags' => 1],
      'Cheese Bread' => ['Bread Flour' => 2, 'Granulated Sugar' => 1, 'Cheese' => 1, 'Instant Dry Yeast' => 1, 'Bread Bags' => 1],
      'Ube Cheese Pandesal' => ['Bread Flour' => 2, 'Granulated Sugar' => 1, 'Ube Flavoring' => 1, 'Cheese' => 1, 'Instant Dry Yeast' => 1, 'Bread Bags' => 1],
      'Ensaymada' => ['Bread Flour' => 2, 'Granulated Sugar' => 1, 'Butter' => 1, 'Eggs' => 1, 'Bread Bags' => 1],
      'Cheese Ensaymada' => ['Bread Flour' => 2, 'Granulated Sugar' => 1, 'Butter' => 1, 'Eggs' => 1, 'Cheese' => 1, 'Bread Bags' => 1],
      'Cinnamon Roll' => ['Bread Flour' => 2, 'Granulated Sugar' => 1, 'Cinnamon Powder' => 1, 'Butter' => 1, 'Paper Liners' => 1],
      'Butter Croissant' => ['Bread Flour' => 2, 'Butter' => 2, 'Fresh Milk' => 1, 'Eggs' => 1, 'Cake Boxes' => 1],
      'Chocolate Muffin' => ['Cake Flour' => 2, 'Granulated Sugar' => 1, 'Eggs' => 1, 'Chocolate Chips' => 1, 'Paper Liners' => 1],
      'Banana Muffin' => ['Cake Flour' => 2, 'Granulated Sugar' => 1, 'Eggs' => 1, 'Paper Liners' => 1],
      'Garlic Bread Stick' => ['Bread Flour' => 2, 'Butter' => 1, 'Salt' => 1, 'Bread Bags' => 1],
      'Ham and Cheese Roll' => ['Bread Flour' => 2, 'Ham Slices' => 1, 'Cheese' => 1, 'Instant Dry Yeast' => 1, 'Bread Bags' => 1],
      'Dinner Roll' => ['Bread Flour' => 2, 'Instant Dry Yeast' => 1, 'Salt' => 1, 'Bread Bags' => 1],
      'Milk Bread Loaf' => ['Bread Flour' => 3, 'Fresh Milk' => 1, 'Granulated Sugar' => 1, 'Instant Dry Yeast' => 1, 'Loaf Bags' => 1],
      'Chocolate Swirl Bread' => ['Bread Flour' => 3, 'Chocolate Chips' => 1, 'Fresh Milk' => 1, 'Granulated Sugar' => 1, 'Loaf Bags' => 1],
    ];

    $recipes = [];
    foreach ($rawRecipes as $productName => $ingredients) {
      if (!$products->has($productName)) {
        continue;
      }

      $productId = (int) $products->get($productName)->ID;
      $recipes[$productId] = [];

      foreach ($ingredients as $itemName => $quantity) {
        if (!$inventory->has($itemName)) {
          continue;
        }

        $recipes[$productId][] = [
          'InventoryID' => (int) $inventory->get($itemName)->ID,
          'ItemName' => $itemName,
          'QuantityRemoved' => (int) $quantity,
        ];
      }
    }

    return $recipes;
  }

  private function makeAttemptBudget(Carbon $day): array {
    $weekdayBoost = in_array($day->dayOfWeekIso, [5, 6, 7], true) ? 8 : 0;

    return [
      'sales' => random_int(32, 58) + $weekdayBoost,
      'batches' => random_int(2, 5),
      'stock_ins' => random_int(2, 4),
      'stock_outs' => random_int(3, 6),
      'shrinkage' => random_int(0, 2),
    ];
  }

  private function seedInitialPreparation(
    int $userId,
    Carbon $day,
    Collection $products,
    Collection $inventory,
    array $recipes,
    array &$productState,
    array &$inventoryState,
    array &$attempts,
    ?string &$forcedEvent,
  ): void {
    $stockInAt = $day->copy()->setTime(6, 0, 0);
    $stockOutAt = $day->copy()->setTime(6, 5, 0);
    $batchAt = $day->copy()->setTime(6, 10, 0);

    $this->recordStockIn($userId, $stockInAt, $products, $inventory, $productState, $inventoryState, $attempts, true);
    $this->recordGeneralStockOut($userId, $stockOutAt, $inventory, $inventoryState, $attempts, true);
    $forcedEvent = $this->recordBatch($userId, $batchAt, $products, $inventory, $recipes, $productState, $inventoryState, $attempts, true);
  }

  private function pickTickEvent(
    Carbon $tick,
    Collection $products,
    Collection $inventory,
    array $recipes,
    array $productState,
    array $inventoryState,
    array $attempts,
  ): ?string {
    $canSell = $attempts['sales'] > 0 && $this->hasSellableProducts($products, $productState);
    $canOperate = (int) $tick->format('H') < 15;
    $hasLowInventory = $this->hasLowInventory($inventory, $inventoryState);
    $hasLowProducedStock = $this->hasLowProducedStock($products, $productState);

    if ($canOperate && $hasLowInventory && $attempts['stock_ins'] > 0) {
      return random_int(1, 100) <= 75 ? 'stock_in' : ($canSell ? 'sale' : 'stock_in');
    }

    if ($canOperate && $hasLowProducedStock && $attempts['batches'] > 0 && $this->canRecordBatch($products, $recipes, $productState, $inventoryState)) {
      return random_int(1, 100) <= 65 ? 'batch' : ($canSell ? 'sale' : 'batch');
    }

    if ($canSell && random_int(1, 100) <= 75) {
      return 'sale';
    }

    if (!$canOperate) {
      return $canSell && random_int(1, 100) <= 55 ? 'sale' : null;
    }

    $weights = [];
    if ($canSell) {
      $weights['sale'] = 20;
    }
    if ($attempts['batches'] > 0 && $this->canRecordBatch($products, $recipes, $productState, $inventoryState)) {
      $weights['batch'] = $hasLowProducedStock ? 30 : 16;
    }
    if ($attempts['stock_ins'] > 0 && $this->canRecordStockIn($products, $inventory, $productState, $inventoryState)) {
      $weights['stock_in'] = $hasLowInventory ? 28 : 14;
    }
    if ($attempts['stock_outs'] > 0 && $this->canRecordGeneralStockOut($inventoryState)) {
      $weights['stock_out'] = 10;
    }
    if ($attempts['shrinkage'] > 0 && $this->canRecordShrinkage($products, $productState)) {
      $weights['shrinkage'] = (int) $tick->format('H') >= 11 ? 8 : 4;
    }

    $weights['none'] = 18;

    return $this->pickWeighted($weights);
  }

  private function recordSale(
    int $userId,
    Carbon $tick,
    Collection $products,
    array &$productState,
    array &$attempts,
  ): void {
    if ($attempts['sales'] <= 0) {
      return;
    }

    $eligibleProducts = $products
      ->filter(fn ($product) => ($productState[(int) $product->ID] ?? 0) > 0)
      ->values();

    if ($eligibleProducts->isEmpty()) {
      return;
    }

    $lineCount = random_int(1, min(4, $eligibleProducts->count()));
    $pickedProducts = $eligibleProducts->shuffle()->take($lineCount);
    $saleTime = $tick->copy()->addMinutes(random_int(0, 4))->addSeconds(random_int(0, 50));

    $saleId = DB::table('sales')->insertGetId([
      'UserID' => $userId,
      'CustomerID' => null,
      'SaleType' => 'WalkIn',
      'TotalAmount' => 0,
      'DateAdded' => $saleTime,
    ]);

    $totalAmount = 0.0;
    foreach ($pickedProducts as $product) {
      $productId = (int) $product->ID;
      $available = (int) ($productState[$productId] ?? 0);
      $quantity = min($available, random_int(1, min(4, max(1, $available))));
      if ($quantity <= 0) {
        continue;
      }

      $pricePerUnit = round((float) $product->Price, 2);
      $subAmount = round($pricePerUnit * $quantity, 2);

      DB::table('sold_products')->insert([
        'SalesID' => $saleId,
        'ProductID' => $productId,
        'PricePerUnit' => $pricePerUnit,
        'Quantity' => $quantity,
        'SubAmount' => $subAmount,
      ]);

      $productState[$productId] -= $quantity;
      $totalAmount += $subAmount;
    }

    if ($totalAmount <= 0) {
      DB::table('sales')->where('ID', $saleId)->delete();
      return;
    }

    DB::table('sales')->where('ID', $saleId)->update([
      'TotalAmount' => round($totalAmount, 2),
    ]);

    $invoiceNumber = sprintf('INV-BH-%s-%05d', $saleTime->format('Ymd'), $this->saleSequence);
    $receiptNumber = sprintf('RCP-BH-%s-%05d', $saleTime->format('Ymd'), $this->saleSequence);
    $paymentMethod = $this->pickWeighted([
      'Cash' => 68,
      'GCash' => 20,
      'Card' => 7,
      'Bank Transfer' => 5,
    ]) ?: 'Cash';

    DB::table('payments')->insert([
      'SalesID' => $saleId,
      'PaymentMethod' => $paymentMethod,
      'PaidAmount' => round($totalAmount, 2),
      'TotalAmount' => round($totalAmount, 2),
      'Change' => 0,
      'PaymentStatus' => 'Paid',
      'InvoiceNumber' => $invoiceNumber,
      'InvoiceIssuedAt' => $saleTime,
      'ReceiptNumber' => $receiptNumber,
      'ReceiptIssuedAt' => $saleTime,
      'PaymentDueDate' => null,
      'AdditionalDetails' => self::PAYMENT_NOTE . ' #' . $this->saleSequence,
      'DateAdded' => $saleTime,
    ]);

    $this->saleSequence++;
    $attempts['sales']--;
  }

  private function recordBatch(
    int $userId,
    Carbon $tick,
    Collection $products,
    Collection $inventory,
    array $recipes,
    array &$productState,
    array &$inventoryState,
    array &$attempts,
    bool $isInitial = false,
  ): ?string {
    if ($attempts['batches'] <= 0 || !$this->canRecordBatch($products, $recipes, $productState, $inventoryState)) {
      return null;
    }

    $producedProducts = $products
      ->filter(function ($product) use ($recipes) {
        $productId = (int) $product->ID;
        return $product->ProductFrom === 'Produced' && isset($recipes[$productId]);
      })
      ->sortBy(function ($product) use ($productState) {
        return ($productState[(int) $product->ID] ?? 0) - (int) $product->LowStockThreshold;
      })
      ->values();

    $selectedProducts = [];
    $projectedInventoryState = $inventoryState;
    foreach ($producedProducts as $product) {
      if (count($selectedProducts) >= ($isInitial ? 3 : random_int(1, 3))) {
        break;
      }

      $productId = (int) $product->ID;
      $desiredQuantity = $this->batchQuantityForProduct($product, $productState[$productId] ?? 0, $isInitial);
      $quantityToProduce = $this->capBatchQuantityToAvailable($recipes[$productId], $desiredQuantity, $projectedInventoryState);
      if ($quantityToProduce <= 0) {
        continue;
      }

      $required = $this->multiplyRecipe($recipes[$productId], $quantityToProduce);
      if (!$this->inventoryCanCover($required, $projectedInventoryState)) {
        continue;
      }

      foreach ($required as $line) {
        $projectedInventoryState[(int) $line['InventoryID']] -= (int) $line['QuantityRemoved'];
      }

      $selectedProducts[] = [
        'product' => $product,
        'quantity' => $quantityToProduce,
        'requiredInventory' => $required,
      ];
    }

    if (empty($selectedProducts)) {
      return $attempts['stock_ins'] > 0 ? 'stock_in' : null;
    }

    $stockOutLines = $this->mergeInventoryLines(array_map(fn ($row) => $row['requiredInventory'], $selectedProducts));
    $stockOutTime = $tick->copy()->addMinutes($isInitial ? 0 : random_int(0, 2));
    $batchTime = $tick->copy()->addMinutes($isInitial ? 4 : random_int(2, 4));

    $this->insertStockOutBatch(
      $userId,
      $stockOutTime,
      $stockOutLines,
      self::STOCK_OUT_REASON_PREFIX . ' Batch preparation #' . $this->batchSequence,
    );

    foreach ($stockOutLines as $line) {
      $inventoryState[$line['InventoryID']] -= $line['QuantityRemoved'];
    }

    $detailId = DB::table('production_batch_details')->insertGetId([
      'UserID' => $userId,
      'BatchDescription' => self::BATCH_DESCRIPTION_PREFIX . ' #' . $this->batchSequence,
      'TotalProductsProduced' => 0,
      'DateAdded' => $batchTime,
    ]);

    foreach ($selectedProducts as $row) {
      $productId = (int) $row['product']->ID;
      DB::table('production_batches')->insert([
        'BatchDetailsID' => $detailId,
        'ProductID' => $productId,
        'QuantityProduced' => $row['quantity'],
        'DateAdded' => $batchTime,
      ]);

      $productState[$productId] += (int) $row['quantity'];
    }

    $attempts['batches']--;
    $this->batchSequence++;

    if ($attempts['stock_ins'] > 0 && random_int(1, 100) <= 35) {
      return 'stock_in';
    }

    return null;
  }

  private function recordStockIn(
    int $userId,
    Carbon $tick,
    Collection $products,
    Collection $inventory,
    array &$productState,
    array &$inventoryState,
    array &$attempts,
    bool $isInitial,
  ): void {
    if ($attempts['stock_ins'] <= 0) {
      return;
    }

    $inventoryLines = [];
    $inventoryTargets = $inventory
      ->sortBy(function ($item) use ($inventoryState) {
        return ($inventoryState[(int) $item->ID] ?? 0) - (int) $item->LowCountThreshold;
      })
      ->values();

    foreach ($inventoryTargets as $item) {
      if (count($inventoryLines) >= ($isInitial ? 7 : random_int(3, 6))) {
        break;
      }

      $itemId = (int) $item->ID;
      $current = (int) ($inventoryState[$itemId] ?? 0);
      $needsRestock = $isInitial || $current <= (int) $item->LowCountThreshold || random_int(1, 100) <= 12;
      if (!$needsRestock) {
        continue;
      }

      $quantityAdded = $this->stockInQuantity((string) $item->Measurement, $current, true);
      $inventoryLines[] = [
        'InventoryID' => $itemId,
        'ProductID' => null,
        'ItemType' => 'Inventory',
        'QuantityAdded' => $quantityAdded,
        'SubAmount' => round($quantityAdded * $this->inventoryUnitCost((string) $item->Measurement), 2),
      ];
    }

    $productLines = [];
    $purchasedProducts = $products
      ->filter(fn ($product) => $product->ProductFrom === 'Purchased')
      ->sortBy(function ($product) use ($productState) {
        return ($productState[(int) $product->ID] ?? 0) - (int) $product->LowStockThreshold;
      })
      ->values();

    foreach ($purchasedProducts as $product) {
      if (count($productLines) >= ($isInitial ? 4 : random_int(2, 4))) {
        break;
      }

      $productId = (int) $product->ID;
      $current = (int) ($productState[$productId] ?? 0);
      $needsRestock = $isInitial || $current <= (int) $product->LowStockThreshold || random_int(1, 100) <= 18;
      if (!$needsRestock) {
        continue;
      }

      $quantityAdded = $this->stockInQuantity('packs', $current, false);
      $productLines[] = [
        'InventoryID' => null,
        'ProductID' => $productId,
        'ItemType' => 'Product',
        'QuantityAdded' => $quantityAdded,
        'SubAmount' => round($quantityAdded * ((float) $product->Price * 0.62), 2),
      ];
    }

    $lines = array_merge($inventoryLines, $productLines);
    if (empty($lines)) {
      return;
    }

    $stockInTime = $tick->copy()->addMinutes(random_int(0, 2));
    $detailId = DB::table('stock_in_details')->insertGetId([
      'UserID' => $userId,
      'Supplier' => $this->supplierName($stockInTime),
      'PurchaseDate' => $stockInTime,
      'Source' => 'Purchased',
      'ReceiptNumber' => sprintf('RCPT-BH-%s-%05d', $stockInTime->format('Ymd'), $this->stockInSequence),
      'InvoiceNumber' => sprintf('INV-BH-SI-%s-%05d', $stockInTime->format('Ymd'), $this->stockInSequence),
      'TotalQuantity' => array_sum(array_column($lines, 'QuantityAdded')),
      'TotalAmount' => round(array_sum(array_column($lines, 'SubAmount')), 2),
      'AdditionalDetails' => self::STOCK_IN_NOTE . ' #' . $this->stockInSequence,
      'DateAdded' => $stockInTime,
    ]);

    foreach ($lines as $line) {
      DB::table('stock_ins')->insert([
        'StockInDetailsID' => $detailId,
        'InventoryID' => $line['InventoryID'],
        'ProductID' => $line['ProductID'],
        'ItemType' => $line['ItemType'],
        'QuantityAdded' => $line['QuantityAdded'],
        'SubAmount' => $line['SubAmount'],
        'DateAdded' => $stockInTime,
      ]);

      if ($line['ItemType'] === 'Inventory') {
        $inventoryState[(int) $line['InventoryID']] += (int) $line['QuantityAdded'];
      } else {
        $productState[(int) $line['ProductID']] += (int) $line['QuantityAdded'];
      }
    }

    $attempts['stock_ins']--;
    $this->stockInSequence++;
  }

  private function recordGeneralStockOut(
    int $userId,
    Carbon $tick,
    Collection $inventory,
    array &$inventoryState,
    array &$attempts,
    bool $isInitial = false,
  ): void {
    if ($attempts['stock_outs'] <= 0 || !$this->canRecordGeneralStockOut($inventoryState)) {
      return;
    }

    $availableItems = $inventory
      ->filter(fn ($item) => ($inventoryState[(int) $item->ID] ?? 0) > 0)
      ->shuffle()
      ->values();

    if ($availableItems->isEmpty()) {
      return;
    }

    $lines = [];
    $targetCount = min($availableItems->count(), $isInitial ? 4 : random_int(2, 5));
    foreach ($availableItems as $item) {
      if (count($lines) >= $targetCount) {
        break;
      }

      $itemId = (int) $item->ID;
      $available = (int) ($inventoryState[$itemId] ?? 0);
      $quantityRemoved = min($available, $this->stockOutQuantity((string) $item->Measurement, $isInitial));
      if ($quantityRemoved <= 0) {
        continue;
      }

      $lines[] = [
        'InventoryID' => $itemId,
        'QuantityRemoved' => $quantityRemoved,
        'SubAmount' => round($quantityRemoved * $this->inventoryUnitCost((string) $item->Measurement), 2),
      ];
    }

    if (empty($lines)) {
      return;
    }

    $reason = $isInitial
      ? self::STOCK_OUT_REASON_PREFIX . ' Opening prep stock-out #' . $this->stockOutSequence
      : self::STOCK_OUT_REASON_PREFIX . ' Operational usage #' . $this->stockOutSequence;

    $stockOutTime = $tick->copy()->addMinutes(random_int(0, 2));
    $this->insertStockOutBatch($userId, $stockOutTime, $lines, $reason);

    foreach ($lines as $line) {
      $inventoryState[$line['InventoryID']] -= $line['QuantityRemoved'];
    }

    $attempts['stock_outs']--;
    $this->stockOutSequence++;
  }

  private function insertStockOutBatch(int $userId, Carbon $time, array $lines, string $reason): void {
    $detailId = DB::table('stock_out_details')->insertGetId([
      'UserID' => $userId,
      'TotalQuantity' => array_sum(array_column($lines, 'QuantityRemoved')),
      'Reason' => $reason,
      'DateAdded' => $time,
    ]);

    foreach ($lines as $line) {
      DB::table('stock_outs')->insert([
        'StockOutDetailsID' => $detailId,
        'InventoryID' => $line['InventoryID'],
        'ProductID' => null,
        'ItemType' => 'Inventory',
        'QuantityRemoved' => $line['QuantityRemoved'],
        'SubAmount' => $line['SubAmount'] ?? 0,
        'DateAdded' => $time,
      ]);
    }
  }

  private function recordShrinkage(
    int $userId,
    Carbon $tick,
    Collection $products,
    array &$productState,
    array &$attempts,
  ): void {
    if ($attempts['shrinkage'] <= 0 || !$this->canRecordShrinkage($products, $productState)) {
      return;
    }

    $eligibleProducts = $products
      ->filter(function ($product) use ($productState) {
        $current = (int) ($productState[(int) $product->ID] ?? 0);
        return $product->ProductFrom === 'Produced' && $current > 2;
      })
      ->sortByDesc(fn ($product) => $productState[(int) $product->ID] ?? 0)
      ->values();

    if ($eligibleProducts->isEmpty()) {
      return;
    }

    $lineCount = min($eligibleProducts->count(), random_int(1, 2));
    $picked = $eligibleProducts->take($lineCount);
    $time = $tick->copy()->addMinutes(random_int(0, 3));
    $reason = $this->pickWeighted([
      'Spoiled' => 74,
      'Lost' => 18,
      'Theft' => 8,
    ]) ?: 'Spoiled';

    $totalQuantity = 0;
    $totalAmount = 0.0;
    $lines = [];

    foreach ($picked as $product) {
      $productId = (int) $product->ID;
      $available = (int) ($productState[$productId] ?? 0);
      $quantity = min($available, random_int(1, min(3, max(1, $available))));
      if ($quantity <= 0) {
        continue;
      }

      $subAmount = round(((float) $product->Price) * $quantity, 2);
      $lines[] = [
        'ProductID' => $productId,
        'Quantity' => $quantity,
        'SubAmount' => $subAmount,
      ];
      $totalQuantity += $quantity;
      $totalAmount += $subAmount;
    }

    if (empty($lines)) {
      return;
    }

    $shrinkageId = DB::table('shrinkages')->insertGetId([
      'UserID' => $userId,
      'Quantity' => $totalQuantity,
      'TotalAmount' => round($totalAmount, 2),
      'Reason' => $reason,
      'VerificationStatus' => 'Verified',
      'DateAdded' => $time,
    ]);

    foreach ($lines as $line) {
      DB::table('shrinked_products')->insert([
        'ShrinkageID' => $shrinkageId,
        'ProductID' => $line['ProductID'],
        'Quantity' => $line['Quantity'],
        'SubAmount' => $line['SubAmount'],
      ]);

      $productId = (int) $line['ProductID'];
      $productState[$productId] -= (int) $line['Quantity'];

      DB::table('products')
        ->where('ID', $productId)
        ->update([
          'Quantity' => $productState[$productId],
          'DateModified' => $time,
        ]);
    }

    $attempts['shrinkage']--;
    $this->shrinkageSequence++;
  }

  private function hasSellableProducts(Collection $products, array $productState): bool {
    foreach ($products as $product) {
      if (($productState[(int) $product->ID] ?? 0) > 0) {
        return true;
      }
    }

    return false;
  }

  private function hasLowInventory(Collection $inventory, array $inventoryState): bool {
    foreach ($inventory as $item) {
      if (($inventoryState[(int) $item->ID] ?? 0) <= (int) $item->LowCountThreshold) {
        return true;
      }
    }

    return false;
  }

  private function hasLowProducedStock(Collection $products, array $productState): bool {
    foreach ($products as $product) {
      if ($product->ProductFrom !== 'Produced') {
        continue;
      }

      if (($productState[(int) $product->ID] ?? 0) <= (int) $product->LowStockThreshold) {
        return true;
      }
    }

    return false;
  }

  private function canRecordBatch(Collection $products, array $recipes, array $productState, array $inventoryState): bool {
    foreach ($products as $product) {
      $productId = (int) $product->ID;
      if ($product->ProductFrom !== 'Produced' || !isset($recipes[$productId])) {
        continue;
      }

      if ($this->inventoryCanCover($recipes[$productId], $inventoryState)) {
        return true;
      }
    }

    return false;
  }

  private function canRecordStockIn(Collection $products, Collection $inventory, array $productState, array $inventoryState): bool {
    return $this->hasLowInventory($inventory, $inventoryState) || $this->hasLowProducedStock($products, $productState);
  }

  private function canRecordGeneralStockOut(array $inventoryState): bool {
    foreach ($inventoryState as $quantity) {
      if ((int) $quantity > 0) {
        return true;
      }
    }

    return false;
  }

  private function canRecordShrinkage(Collection $products, array $productState): bool {
    foreach ($products as $product) {
      if ($product->ProductFrom === 'Produced' && ($productState[(int) $product->ID] ?? 0) > 2) {
        return true;
      }
    }

    return false;
  }

  private function batchQuantityForProduct(object $product, int $currentQuantity, bool $isInitial): int {
    if ($isInitial) {
      return random_int(6, 14);
    }

    $threshold = (int) $product->LowStockThreshold;
    if ($currentQuantity <= 0) {
      return random_int(8, 16);
    }
    if ($currentQuantity <= $threshold) {
      return random_int(5, 12);
    }

    return random_int(2, 6);
  }

  private function multiplyRecipe(array $recipe, int $multiplier): array {
    return array_map(function ($line) use ($multiplier) {
      return [
        'InventoryID' => $line['InventoryID'],
        'ItemName' => $line['ItemName'],
        'QuantityRemoved' => $line['QuantityRemoved'] * $multiplier,
      ];
    }, $recipe);
  }

  private function capBatchQuantityToAvailable(array $recipe, int $desiredQuantity, array $inventoryState): int {
    if ($desiredQuantity <= 0) {
      return 0;
    }

    $maxQuantity = $desiredQuantity;
    foreach ($recipe as $line) {
      $requiredPerUnit = (int) $line['QuantityRemoved'];
      if ($requiredPerUnit <= 0) {
        continue;
      }

      $available = (int) ($inventoryState[(int) $line['InventoryID']] ?? 0);
      $maxQuantity = min($maxQuantity, intdiv($available, $requiredPerUnit));
      if ($maxQuantity <= 0) {
        return 0;
      }
    }

    return $maxQuantity;
  }

  private function inventoryCanCover(array $requiredLines, array $inventoryState): bool {
    foreach ($requiredLines as $line) {
      if (($inventoryState[(int) $line['InventoryID']] ?? 0) < (int) $line['QuantityRemoved']) {
        return false;
      }
    }

    return true;
  }

  private function mergeInventoryLines(array $lineSets): array {
    $merged = [];
    foreach ($lineSets as $lineSet) {
      foreach ($lineSet as $line) {
        $inventoryId = (int) $line['InventoryID'];
        if (!isset($merged[$inventoryId])) {
          $merged[$inventoryId] = [
            'InventoryID' => $inventoryId,
            'QuantityRemoved' => 0,
            'SubAmount' => 0.0,
          ];
        }

        $merged[$inventoryId]['QuantityRemoved'] += (int) $line['QuantityRemoved'];
      }
    }

    foreach ($merged as &$line) {
      $line['SubAmount'] = round($line['QuantityRemoved'] * $this->inventoryUnitCost('kg'), 2);
    }
    unset($line);

    return array_values($merged);
  }

  private function stockInQuantity(string $measurement, int $currentQuantity, bool $inventoryLine): int {
    $base = match ($measurement) {
      'kg', 'liters' => 6,
      'trays', 'blocks', 'bundles' => 4,
      'packs', 'boxes', 'bottles', 'rolls', 'tubs' => 5,
      default => 6,
    };

    if ($currentQuantity <= 0) {
      return $base + random_int(6, 10);
    }

    return $base + random_int($inventoryLine ? 2 : 1, $inventoryLine ? 6 : 4);
  }

  private function stockOutQuantity(string $measurement, bool $isInitial): int {
    $base = match ($measurement) {
      'kg', 'liters' => 2,
      'trays', 'blocks', 'bundles' => 1,
      default => 1,
    };

    return $base + ($isInitial ? 1 : random_int(0, 2));
  }

  private function inventoryUnitCost(string $measurement): float {
    return match ($measurement) {
      'kg' => 68.0,
      'liters' => 84.0,
      'trays' => 220.0,
      'blocks' => 170.0,
      'bundles' => 150.0,
      'packs' => 96.0,
      'boxes' => 180.0,
      'bottles' => 88.0,
      'rolls' => 110.0,
      'tubs' => 145.0,
      default => 95.0,
    };
  }

  private function supplierName(Carbon $day): string {
    $suppliers = [
      'Golden Grain Wholesale',
      'Metro Dairy and Baking Supply',
      'Sunrise Foodservice Trading',
      'BakePack Essentials',
      'Fresh Brew Beverage Depot',
      'Daily Pantry Distributors',
    ];

    return $suppliers[$day->dayOfYear % count($suppliers)];
  }

  private function pickWeighted(array $weights): ?string {
    $total = array_sum($weights);
    if ($total <= 0) {
      return null;
    }

    $roll = random_int(1, $total);
    $running = 0;
    foreach ($weights as $value => $weight) {
      $running += $weight;
      if ($roll <= $running) {
        return $value;
      }
    }

    return array_key_first($weights);
  }
}
