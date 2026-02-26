<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class BakeshopCatalogSeeder extends Seeder {
  public function run(): void {
    $userId = DB::table('users')->value('id');

    if (!$userId) {
      $this->command?->warn('BakeshopCatalogSeeder skipped: no user found for UserID foreign keys.');
      return;
    }

    $now = now();

    $this->seedCategories($now);
    $this->seedProducts($now);
    $this->seedProductionBatches((int) $userId);
    $this->seedStockIns((int) $userId);
  }

  private function seedCategories(Carbon $now): void {
    $categories = [
      ['CategoryName' => 'Breads', 'CategoryDescription' => 'Freshly baked bread selections.'],
      ['CategoryName' => 'Drinks', 'CategoryDescription' => 'Ready-to-drink beverages and refreshments.'],
      ['CategoryName' => 'Pastries', 'CategoryDescription' => 'Sweet and savory pastry offerings.'],
    ];

    foreach ($categories as $category) {
      DB::table('categories')->updateOrInsert(
        ['CategoryName' => $category['CategoryName']],
        [
          'CategoryDescription' => $category['CategoryDescription'],
          'DateAdded' => $now,
          'DateModified' => $now,
        ]
      );
    }
  }

  private function seedProducts(Carbon $now): void {
    $categoryIds = DB::table('categories')
      ->whereIn('CategoryName', ['Breads', 'Drinks', 'Pastries'])
      ->pluck('ID', 'CategoryName');

    $breadNames = [
      'Pandesal', 'Monay', 'Ensaymada Bread', 'Spanish Bread', 'Pan de Coco',
      'Pan de Regla', 'Cheese Bread', 'Garlic Bread', 'Whole Wheat Loaf', 'Milk Bread Loaf',
      'Monggo Bread', 'Ube Bread', 'Raisin Bread', 'Butter Loaf', 'Malunggay Bread',
      'Corn Bread Roll', 'Brioche Bun', 'Dinner Roll', 'Crusty French Loaf', 'Potato Bread',
      'Double Cheese Loaf', 'Ham and Cheese Roll', 'Sesame Bread', 'Banana Bread Loaf', 'Choco Swirl Bread',
      'Caramel Bread Twist', 'Classic White Loaf', 'Brown Bread Loaf', 'Herb Focaccia', 'Cinnamon Bread Roll',
      'Soft Roll Supreme', 'Honey Oat Bread', 'Sunflower Seed Bread', 'Olive Bread', 'Onion Bread',
      'Pesto Bread', 'Cheddar Bread', 'Red Bean Bread', 'Maple Bread', 'Vanilla Cream Bread',
    ];

    $pastryNames = [
      'Cheese Ensaymada', 'Chocolate Croissant', 'Butter Croissant', 'Ham and Cheese Croissant', 'Apple Turnover',
      'Blueberry Danish', 'Strawberry Danish', 'Cinnamon Roll', 'Chocolate Danish', 'Egg Tart',
      'Custard Tart', 'Fruit Tart Slice', 'Mango Tart Slice', 'Mini Eclair', 'Chocolate Eclair',
      'Cream Puff', 'Ube Cream Puff', 'Pineapple Pie', 'Buko Pie Slice', 'Banoffee Pie Slice',
      'Brownie Bar', 'Fudge Brownie', 'Choco Crinkle', 'Ube Crinkle', 'Polvoron Pastry',
      'Buttermilk Scone', 'Raisin Scone', 'Blueberry Muffin', 'Chocolate Muffin', 'Banana Muffin',
      'Mocha Muffin', 'Red Velvet Muffin', 'Mini Donut Glazed', 'Mini Donut Choco', 'Apple Cinnamon Donut',
      'Sugar Twist Donut', 'Almond Puff', 'Caramel Puff', 'Cheese Puff', 'Coconut Macaroon',
    ];

    $drinkNames = [
      'Bottled Water', 'Calamansi Juice', 'Iced Tea Classic', 'Iced Tea Lemon', 'Iced Coffee Original',
      'Iced Coffee Mocha', 'Hot Chocolate', 'Milk Tea Wintermelon', 'Milk Tea Okinawa', 'Milk Tea Taro',
      'Mango Shake', 'Strawberry Shake', 'Chocolate Milk', 'Fresh Milk', 'Orange Juice',
      'Pineapple Juice', 'Apple Juice', 'Grape Juice', 'Soda Cola', 'Soda Lemon-Lime',
      'Soda Orange', 'Sparkling Water', 'Coconut Water', 'Brewed Coffee', 'Americano',
    ];

    $products = [];

    foreach ($breadNames as $name) {
      $products[] = $this->makeProductRow(
        $name,
        'Breads',
        (int) $categoryIds['Breads'],
        'Produced',
        random_int(25, 120),
        $now
      );
    }

    foreach ($pastryNames as $name) {
      $products[] = $this->makeProductRow(
        $name,
        'Pastries',
        (int) $categoryIds['Pastries'],
        'Produced',
        random_int(30, 180),
        $now
      );
    }

    foreach ($drinkNames as $name) {
      $products[] = $this->makeProductRow(
        $name,
        'Drinks',
        (int) $categoryIds['Drinks'],
        'Purchased',
        random_int(20, 95),
        $now
      );
    }

    foreach ($products as $product) {
      DB::table('products')->updateOrInsert(
        ['ProductName' => $product['ProductName']],
        $product
      );
    }
  }

  private function makeProductRow(
    string $name,
    string $categoryName,
    int $categoryId,
    string $productFrom,
    int $price,
    Carbon $now
  ): array {
    return [
      'ProductName' => $name,
      'ProductDescription' => $categoryName . ' item: ' . $name,
      'CategoryID' => $categoryId,
      'ProductImage' => null,
      'ProductFrom' => $productFrom,
      'Price' => number_format($price, 2, '.', ''),
      'LowStockThreshold' => random_int(8, 20),
      'Quantity' => 0,
      'DateAdded' => $now,
      'DateModified' => $now,
    ];
  }

  private function seedProductionBatches(int $userId): void {
    $producedProductIds = DB::table('products')
      ->where('ProductFrom', 'Produced')
      ->pluck('ID')
      ->all();

    if (count($producedProductIds) === 0) {
      return;
    }

    $batchRecordCount = random_int(75, 100);

    for ($i = 1; $i <= $batchRecordCount; $i++) {
      $dateAdded = now()->subDays(random_int(0, 90))->setTime(random_int(4, 18), random_int(0, 59), random_int(0, 59));
      $pickedIds = collect($producedProductIds)->shuffle()->take(random_int(1, min(10, count($producedProductIds))))->values();

      $batchDetailId = DB::table('production_batch_details')->insertGetId([
        'UserID' => $userId,
        'BatchDescription' => "Generated production batch #{$i}",
        'TotalProductsProduced' => 0,
        'DateAdded' => $dateAdded,
      ]);

      $rows = [];
      foreach ($pickedIds as $productId) {
        $rows[] = [
          'BatchDetailsID' => $batchDetailId,
          'ProductID' => (int) $productId,
          'QuantityProduced' => random_int(20, 50),
          'DateAdded' => $dateAdded,
        ];
      }

      DB::table('production_batches')->insert($rows);
    }
  }

  private function seedStockIns(int $userId): void {
    $purchasedProducts = DB::table('products')
      ->where('ProductFrom', 'Purchased')
      ->select('ID', 'Price')
      ->get();

    if ($purchasedProducts->isEmpty()) {
      return;
    }

    $stockInRecordCount = random_int(50, 100);
    $supplierNames = [
      'Morning Dew Beverages',
      'Fresh Sip Trading',
      'Brewline Distributors',
      'Metro Drink Supply',
      'Daily Refreshments Co.',
      'Golden Cup Wholesale',
    ];

    for ($i = 1; $i <= $stockInRecordCount; $i++) {
      $dateAdded = now()->subDays(random_int(0, 90))->setTime(random_int(6, 17), random_int(0, 59), random_int(0, 59));
      $picked = $purchasedProducts->shuffle()->take(random_int(1, min(10, $purchasedProducts->count())))->values();

      $totalQuantity = 0;
      $totalAmount = 0.0;
      $rows = [];

      foreach ($picked as $product) {
        $quantityAdded = random_int(5, 50);
        $unitCost = (float) $product->Price;
        $subAmount = round($unitCost * $quantityAdded, 2);

        $rows[] = [
          'InventoryID' => null,
          'ProductID' => (int) $product->ID,
          'ItemType' => 'Product',
          'QuantityAdded' => $quantityAdded,
          'SubAmount' => $subAmount,
          'DateAdded' => $dateAdded,
        ];

        $totalQuantity += $quantityAdded;
        $totalAmount += $subAmount;
      }

      $stockInDetailId = DB::table('stock_in_details')->insertGetId([
        'UserID' => $userId,
        'Supplier' => $supplierNames[array_rand($supplierNames)],
        'PurchaseDate' => $dateAdded,
        'Source' => 'Purchased',
        'ReceiptNumber' => 'RCPT-' . str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT),
        'InvoiceNumber' => 'INV-' . str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT),
        'TotalQuantity' => $totalQuantity,
        'TotalAmount' => round($totalAmount, 2),
        'AdditionalDetails' => 'Auto-generated stock-in batch.',
        'DateAdded' => $dateAdded,
      ]);

      foreach ($rows as &$row) {
        $row['StockInDetailsID'] = $stockInDetailId;
      }
      unset($row);

      DB::table('stock_ins')->insert($rows);
    }
  }
}

