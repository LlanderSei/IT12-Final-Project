<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReportDemoSeeder extends Seeder {
    public function run(): void {
        $userId = DB::table('users')->value('id');

        if (!$userId) {
            $this->command?->warn('ReportDemoSeeder skipped: no user found.');
            return;
        }

        $this->seedSales((int) $userId);
        $this->seedShrinkages((int) $userId);
        $this->seedStockOuts((int) $userId);
    }

    private function seedSales(int $userId): void {
        // Fetch some products to sell
        $products = DB::table('products')->select('ID', 'Price', 'Quantity')->get();
        if ($products->isEmpty()) return;

        // Generate sales over the past 30 days
        $salesCount = random_int(80, 150);

        for ($i = 0; $i < $salesCount; $i++) {
            $dateAdded = now()->subDays(random_int(0, 30))->setTime(random_int(8, 18), random_int(0, 59));
            
            $saleId = DB::table('sales')->insertGetId([
                'UserID' => $userId,
                'CustomerID' => null, // Walk-ins
                'SaleType' => 'WalkIn',
                'TotalAmount' => 0, // Will update later
                'DateAdded' => $dateAdded
            ]);

            // Add 1 to 5 random products for this sale
            $pickedProducts = $products->shuffle()->take(random_int(1, 5));
            $totalAmount = 0;

            foreach ($pickedProducts as $product) {
                // Ensure we don't sell more than we have in stock (since Quantity is UNSIGNED)
                if ($product->Quantity <= 0) continue;
                $qty = min($product->Quantity, random_int(1, 10));

                $price = (float) ($product->Price ?? 0);
                $subAmount = round($qty * $price, 2);
                $totalAmount += $subAmount;

                DB::table('sold_products')->insert([
                    'SalesID' => $saleId,
                    'ProductID' => $product->ID,
                    'PricePerUnit' => $price,
                    'Quantity' => $qty,
                    'SubAmount' => $subAmount
                ]);

                // Update the product's quantity locally so the next sale iteration has accurate numbers
                $product->Quantity -= $qty;
            }

            // Update total sale amount
            DB::table('sales')->where('ID', $saleId)->update(['TotalAmount' => $totalAmount]);

            // Add payment
            DB::table('payments')->insert([
                'SalesID' => $saleId,
                'PaymentMethod' => collect(['Cash', 'Gcash', 'Maya'])->random(),
                'PaidAmount' => $totalAmount,
                'TotalAmount' => $totalAmount,
                'Change' => 0,
                'PaymentStatus' => 'Paid',
                'ReceiptNumber' => 'RCPT-' . str_pad($saleId, 6, '0', STR_PAD_LEFT),
                'ReceiptIssuedAt' => $dateAdded,
                'DateAdded' => $dateAdded,
            ]);
        }
    }

    private function seedShrinkages(int $userId): void {
        $products = DB::table('products')->select('ID', 'Price', 'Quantity')->get();
        if ($products->isEmpty()) return;

        $shrinkageCount = random_int(10, 30);

        for ($i = 0; $i < $shrinkageCount; $i++) {
            $dateAdded = now()->subDays(random_int(0, 30))->setTime(random_int(8, 18), random_int(0, 59));
            $totalQuantity = 0;
            $totalAmount = 0;

            $shrinkageId = DB::table('shrinkages')->insertGetId([
                'UserID' => $userId,
                'Quantity' => 0,
                'TotalAmount' => 0,
                'Reason' => collect(['Spoiled', 'Theft', 'Lost'])->random(),
                'VerificationStatus' => 'Verified',
                'DateAdded' => $dateAdded
            ]);

            $pickedProducts = $products->shuffle()->take(random_int(1, 3));

            foreach ($pickedProducts as $product) {
                if ($product->Quantity <= 0) continue;
                $qty = min($product->Quantity, random_int(1, 5));
                
                $price = (float) ($product->Price ?? 0);
                $subAmount = round($qty * $price, 2);
                
                $totalQuantity += $qty;
                $totalAmount += $subAmount;

                DB::table('shrinked_products')->insert([
                    'ShrinkageID' => $shrinkageId,
                    'ProductID' => $product->ID,
                    'Quantity' => $qty,
                    'SubAmount' => $subAmount
                ]);

                $product->Quantity -= $qty;
            }

            DB::table('shrinkages')->where('ID', $shrinkageId)->update([
                'Quantity' => $totalQuantity,
                'TotalAmount' => $totalAmount
            ]);
        }
    }

    private function seedStockOuts(int $userId): void {
        $products = DB::table('products')->select('ID', 'Price', 'Quantity')->get();
        if ($products->isEmpty()) return;

        $stockOutCount = random_int(15, 40);

        for ($i = 0; $i < $stockOutCount; $i++) {
            $dateAdded = now()->subDays(random_int(0, 30))->setTime(random_int(8, 18), random_int(0, 59));
            $totalQuantity = 0;

            $stockOutDetailId = DB::table('stock_out_details')->insertGetId([
                'UserID' => $userId,
                'TotalQuantity' => 0,
                'Reason' => collect(['Internal Use', 'Donation', 'Disposal'])->random(),
                'DateAdded' => $dateAdded
            ]);

            $pickedProducts = $products->shuffle()->take(random_int(1, 4));

            foreach ($pickedProducts as $product) {
                if ($product->Quantity <= 0) continue;
                $qty = min($product->Quantity, random_int(5, 20));

                $price = (float) ($product->Price ?? 0);
                $subAmount = round($qty * $price, 2);
                $totalQuantity += $qty;

                DB::table('stock_outs')->insert([
                    'StockOutDetailsID' => $stockOutDetailId,
                    'InventoryID' => null,
                    'ProductID' => $product->ID,
                    'ItemType' => 'Product',
                    'QuantityRemoved' => $qty,
                    'SubAmount' => $subAmount,
                    'DateAdded' => $dateAdded
                ]);

                $product->Quantity -= $qty;
            }

            DB::table('stock_out_details')->where('ID', $stockOutDetailId)->update([
                'TotalQuantity' => $totalQuantity
            ]);
        }
    }
}
