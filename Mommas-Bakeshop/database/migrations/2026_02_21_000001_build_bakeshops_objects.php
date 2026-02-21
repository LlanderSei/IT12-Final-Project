<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void {
    Schema::create('Customers', function (Blueprint $table) {
      $table->id('ID');
      $table->text('CustomerName');
      $table->text('CustomerType');
      $table->text('ContactDetails');
      $table->text('Address');
      $table->timestamp('DateAdded');
      $table->timestamp('DateModified');
    });

    Schema::create('Permissions', function (Blueprint $table) {
      $table->id('ID');
      $table->string('PermissionName');
      $table->longText('PermissionDescription');
      $table->timestamp('DateAdded');
      $table->timestamp('DateModified');
    });

    Schema::create('PermissionsSet', function (Blueprint $table) {
      $table->id('ID');
      $table->foreignId('UserID')->references('ID')->on('Users')->onDelete('cascade');
      $table->foreignId('PermissionID')->references('ID')->on('Permissions')->onDelete('cascade');
      $table->boolean('Allowable')->default(0);
      $table->timestamp('DateAdded')->useCurrent();
      $table->timestamp('DateModified')->useCurrent();
    });

    Schema::create('Audits', function (Blueprint $table) {
      $table->id('ID');
      $table->foreignId('UserID')->references('ID')->on('Users')->onDelete('cascade');
      $table->text('TableEdited');
      $table->text('PreviousChanges')->nullable();
      $table->text('SavedChanges')->nullable();
      $table->text('Action');
      $table->timestamp('DateAdded')->useCurrent();
    });

    Schema::create('Categories', function (Blueprint $table) {
      $table->id('ID');
      $table->text('CategoryName');
      $table->text('CategoryDescription');
      $table->timestamp('DateAdded')->useCurrent();
      $table->timestamp('DateModified')->useCurrent();
    });

    Schema::create('Products', function (Blueprint $table) {
      $table->id('ID');
      $table->text('ProductName');
      $table->text('ProductDescription');
      $table->foreignId('CategoryID')->references('ID')->on('Categories')->onDelete('cascade');
      $table->text('ProductImage');
      $table->text('Price');
      $table->text('Quantity');
      $table->text('Status');
      $table->timestamp('DateAdded')->useCurrent();
      $table->timestamp('DateModified')->useCurrent();
    });

    Schema::create('ProductionBatches', function (Blueprint $table) {
      $table->id('ID');
      $table->foreignId('UserID')->references('ID')->on('Users')->onDelete('cascade');
      $table->foreignId('ProductID')->references('ID')->on('Products')->onDelete('cascade');
      $table->text('BatchDescription');
      $table->unsignedBigInteger('QuantityAdded');
      $table->timestamp('DateAdded')->useCurrent();
    });

    Schema::create('Sales', function (Blueprint $table) {
      $table->id('ID');
      $table->foreignId('UserID')->references('ID')->on('Users')->onDelete('cascade');
      $table->foreignId('CustomerID')->nullable()->references('ID')->on('Customers')->onDelete('cascade');
      $table->decimal('TotalAmount', 10, 2);
      $table->timestamp('DateAdded')->useCurrent();
    });

    Schema::create('Payments', function (Blueprint $table) {
      $table->id('ID');
      $table->foreignId('SalesID')->references('ID')->on('Sales')->onDelete('cascade');
      $table->decimal('PaidAmount', 10, 2);
      $table->decimal('TotalAmount', 10, 2);
      $table->decimal('Change', 10, 2);
      $table->text('PaymentMethod');
      $table->text('PaymentStatus');
      $table->timestamp('PaymentDueDate')->nullable();
      $table->timestamp('DateAdded')->useCurrent();
    });

    Schema::create('SoldProducts', function (Blueprint $table) {
      $table->id('ID');
      $table->foreignId('SalesID')->references('ID')->on('Sales')->onDelete('cascade');
      $table->foreignId('ProductID')->references('ID')->on('Products')->onDelete('cascade');
      $table->decimal('PricePerUnit', 10, 2);
      $table->unsignedBigInteger('Quantity');
      $table->decimal('SubAmount', 10, 2);
    });

    Schema::create('Spoilages', function (Blueprint $table) {
      $table->id('ID');
      $table->foreignId('UserID')->references('ID')->on('Users')->onDelete('cascade');
      $table->unsignedBigInteger('Quantity');
      $table->decimal('SubAmount', 10, 2);
      $table->timestamp('DateAdded')->useCurrent();
    });

    Schema::create('SpoiledProducts', function (Blueprint $table) {
      $table->id('ID');
      $table->foreignId('SpoilageID')->references('ID')->on('Spoilages')->onDelete('cascade');
      $table->foreignId('ProductID')->references('ID')->on('Products')->onDelete('cascade');
      $table->unsignedBigInteger('Quantity');
      $table->decimal('SubAmount', 10, 2);
    });

    Schema::create('Inventory', function (Blueprint $table) {
      $table->id('ID');
      $table->text('ItemName');
      $table->text('ItemDescription');
      $table->text('ItemType');
      $table->text('Measurement');
      $table->unsignedBigInteger('Quantity');
      $table->unsignedBigInteger('LowCountThreshold');
      $table->timestamp('DateAdded')->useCurrent();
      $table->timestamp('DateModified')->useCurrent();
    });

    Schema::create('StockIns', function (Blueprint $table) {
      $table->id('ID');
      $table->foreignId('UserID')->references('ID')->on('Users')->onDelete('cascade');
      $table->foreignId('InventoryID')->references('ID')->on('Inventory')->onDelete('cascade');
      $table->text('Supplier');
      $table->decimal('PricePerUnit', 10, 2);
      $table->unsignedBigInteger('QuantityAdded');
      $table->decimal('TotalAmount', 10, 2);
      $table->text('AdditionalDetails')->nullable();
      $table->timestamp('DateAdded')->useCurrent();
    });

    Schema::create('StockOuts', function (Blueprint $table) {
      $table->id('ID');
      $table->foreignId('UserID')->references('ID')->on('Users')->onDelete('cascade');
      $table->foreignId('InventoryID')->references('ID')->on('Inventory')->onDelete('cascade');
      $table->unsignedBigInteger('QuantityRemoved');
      $table->text('Reason');
      $table->timestamp('DateAdded')->useCurrent();
    });
  }

  public function down(): void {
    Schema::dropIfExists('Permissions');
    Schema::dropIfExists('PermissionsSet');
    Schema::dropIfExists('Audits');
    Schema::dropIfExists('Categories');
    Schema::dropIfExists('Products');
    Schema::dropIfExists('ProductionBatches');
    Schema::dropIfExists('Sales');
    Schema::dropIfExists('Payments');
    Schema::dropIfExists('SoldProducts');
    Schema::dropIfExists('Spoilages');
    Schema::dropIfExists('SpoiledProducts');
    Schema::dropIfExists('Inventory');
    Schema::dropIfExists('StockIns');
    Schema::dropIfExists('StockOuts');
  }
};
