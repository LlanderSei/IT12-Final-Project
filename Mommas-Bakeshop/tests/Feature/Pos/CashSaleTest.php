<?php

use App\Models\Audit;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SoldProduct;
use App\Models\Shrinkage;
use App\Models\ShrinkedProduct;
use App\Models\User;

function createPosProduct(int $quantity = 20, float $price = 100): Product {
  $category = Category::create([
    'CategoryName' => 'Breads',
    'CategoryDescription' => 'Daily products',
    'DateAdded' => now(),
    'DateModified' => now(),
  ]);

  return Product::create([
    'ProductName' => 'Pan de Sal',
    'ProductDescription' => 'Fresh bread',
    'CategoryID' => $category->ID,
    'ProductImage' => 'default.png',
    'Price' => $price,
    'Quantity' => $quantity,
    'Status' => 'On Stock',
    'LowStockThreshold' => 5,
    'DateAdded' => now(),
    'DateModified' => now(),
  ]);
}

test('cash sale page loads for authenticated user', function () {
  $user = User::factory()->create();

  $this->actingAs($user)
    ->get(route('pos.cash-sale'))
    ->assertOk();
});

test('checkout walk-in creates sales payment sold-products and decrements stock', function () {
  $user = User::factory()->create();
  $this->actingAs($user);
  $product = createPosProduct(20, 100);

  $this->post(route('pos.checkout.walk-in'), [
    'items' => [
      ['ProductID' => $product->ID, 'Quantity' => 2],
    ],
    'paidAmount' => 300,
  ])->assertSessionHasNoErrors();

  expect(Sale::count())->toBe(1);
  expect(SoldProduct::count())->toBe(1);
  expect(Payment::count())->toBe(1);

  $product->refresh();
  expect((int)$product->Quantity)->toBe(18);
});

test('walk-in empty paidAmount defaults to exact total', function () {
  $user = User::factory()->create();
  $this->actingAs($user);
  $product = createPosProduct(10, 75);

  $this->post(route('pos.checkout.walk-in'), [
    'items' => [
      ['ProductID' => $product->ID, 'Quantity' => 2],
    ],
    'paidAmount' => '',
  ])->assertSessionHasNoErrors();

  $payment = Payment::first();
  expect((float)$payment->PaidAmount)->toBe(150.0);
  expect((float)$payment->Change)->toBe(0.0);
});

test('walk-in paidAmount less than total is rejected', function () {
  $user = User::factory()->create();
  $this->actingAs($user);
  $product = createPosProduct(10, 80);

  $this->from(route('pos.cash-sale'))
    ->post(route('pos.checkout.walk-in'), [
      'items' => [
        ['ProductID' => $product->ID, 'Quantity' => 2],
      ],
      'paidAmount' => 100,
    ])
    ->assertSessionHasErrors('paidAmount');

  expect(Sale::count())->toBe(0);
});

test('consignment existing customer creates unpaid payment with due date', function () {
  $user = User::factory()->create();
  $this->actingAs($user);
  $product = createPosProduct(10, 100);
  $customer = Customer::create([
    'CustomerName' => 'Store A',
    'CustomerType' => 'Business',
    'ContactDetails' => '09123456789',
    'Address' => 'Sample Address',
    'DateAdded' => now(),
    'DateModified' => now(),
  ]);

  $dueDate = now()->addDays(30)->format('Y-m-d');

  $this->post(route('pos.checkout.consignment'), [
    'items' => [
      ['ProductID' => $product->ID, 'Quantity' => 3],
    ],
    'customerMode' => 'existing',
    'CustomerID' => $customer->ID,
    'dueDate' => $dueDate,
  ])->assertSessionHasNoErrors();

  $payment = Payment::first();
  expect($payment->PaymentStatus)->toBe('Unpaid');
  expect((float)$payment->PaidAmount)->toBe(0.0);
  expect($payment->PaymentDueDate->format('Y-m-d'))->toBe($dueDate);
});

test('consignment new customer creates customer and sale', function () {
  $user = User::factory()->create();
  $this->actingAs($user);
  $product = createPosProduct(10, 90);

  $this->post(route('pos.checkout.consignment'), [
    'items' => [
      ['ProductID' => $product->ID, 'Quantity' => 1],
    ],
    'customerMode' => 'new',
    'newCustomer' => [
      'CustomerName' => 'Retail Buyer',
      'CustomerType' => 'Retail',
      'ContactDetails' => '09123456789',
      'Address' => 'Sample',
    ],
    'dueDate' => now()->addDays(30)->format('Y-m-d'),
  ])->assertSessionHasNoErrors();

  expect(Customer::where('CustomerName', 'Retail Buyer')->exists())->toBeTrue();
  expect(Sale::count())->toBe(1);
});

test('consignment due date today is rejected', function () {
  $user = User::factory()->create();
  $this->actingAs($user);
  $product = createPosProduct(10, 100);
  $customer = Customer::create([
    'CustomerName' => 'Store B',
    'CustomerType' => 'Business',
    'ContactDetails' => '09123456789',
    'Address' => 'Address',
    'DateAdded' => now(),
    'DateModified' => now(),
  ]);

  $this->from(route('pos.cash-sale'))
    ->post(route('pos.checkout.consignment'), [
      'items' => [
        ['ProductID' => $product->ID, 'Quantity' => 2],
      ],
      'customerMode' => 'existing',
      'CustomerID' => $customer->ID,
      'dueDate' => now()->format('Y-m-d'),
    ])
    ->assertSessionHasErrors('dueDate');
});

test('shrinkage creates shrinkage shrinked-products and decrements stock', function () {
  $user = User::factory()->create();
  $this->actingAs($user);
  $product = createPosProduct(10, 60);

  $this->post(route('pos.checkout.shrinkage'), [
    'items' => [
      ['ProductID' => $product->ID, 'Quantity' => 4],
    ],
  ])->assertSessionHasNoErrors();

  expect(Shrinkage::count())->toBe(1);
  expect(ShrinkedProduct::count())->toBe(1);
  expect((int)$product->fresh()->Quantity)->toBe(6);
});

test('checkout fails when requested quantity exceeds stock', function () {
  $user = User::factory()->create();
  $this->actingAs($user);
  $product = createPosProduct(2, 110);

  $this->from(route('pos.cash-sale'))
    ->post(route('pos.checkout.walk-in'), [
      'items' => [
        ['ProductID' => $product->ID, 'Quantity' => 3],
      ],
      'paidAmount' => 400,
    ])
    ->assertSessionHasErrors('items');

  expect(Sale::count())->toBe(0);
});

test('audits are written for checkout related records and product update', function () {
  $user = User::factory()->create();
  $this->actingAs($user);
  $product = createPosProduct(10, 100);

  $this->post(route('pos.checkout.walk-in'), [
    'items' => [
      ['ProductID' => $product->ID, 'Quantity' => 2],
    ],
    'paidAmount' => 200,
  ])->assertSessionHasNoErrors();

  expect(Audit::where('TableEdited', 'Sales')->exists())->toBeTrue();
  expect(Audit::where('TableEdited', 'Payments')->exists())->toBeTrue();
  expect(Audit::where('TableEdited', 'SoldProducts')->exists())->toBeTrue();
  expect(Audit::where('TableEdited', 'Products')->exists())->toBeTrue();
});

