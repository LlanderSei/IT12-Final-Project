<?php

namespace App\Models\Concerns;

use App\Models\Category;
use App\Models\Customer;
use App\Models\Inventory;
use App\Models\JobOrder;
use App\Models\Permission;
use App\Models\PermissionGroup;
use App\Models\Product;
use App\Models\ProductionBatchDetail;
use App\Models\Role;
use App\Models\Sale;
use App\Models\StockInDetail;
use App\Models\StockOutDetail;
use App\Models\User;

trait BuildsReadableAuditChanges {
  protected function buildReadableChanges(array $data): ?string {
    if (method_exists($this, 'auditReadableSummary')) {
      $summary = $this->auditReadableSummary($data);
      if (is_string($summary) && trim($summary) !== '') {
        return $summary;
      }
    }

    $event = strtolower((string) ($data['event'] ?? 'updated'));
    $oldValues = is_array($data['old_values'] ?? null) ? $data['old_values'] : [];
    $newValues = is_array($data['new_values'] ?? null) ? $data['new_values'] : [];
    $config = $this->auditReadableConfig();

    $ignoredKeys = [
      'password',
      'remember_token',
      'created_at',
      'updated_at',
      'DateAdded',
      'DateModified',
    ];

    $keys = array_values(array_unique(array_merge(array_keys($oldValues), array_keys($newValues))));
    $keys = $this->orderAuditKeys($keys, $config['priority_keys']);
    $changes = [];

    foreach ($keys as $key) {
      if (in_array($key, $ignoredKeys, true)) {
        continue;
      }

      $hasOld = array_key_exists($key, $oldValues);
      $hasNew = array_key_exists($key, $newValues);
      $oldValue = $hasOld ? $oldValues[$key] : null;
      $newValue = $hasNew ? $newValues[$key] : null;

      if ($hasOld && $hasNew && $oldValue === $newValue) {
        continue;
      }

      if ($event === 'created') {
        if ($hasNew) {
          $changes[] = sprintf(
            '%s set to %s',
            $this->auditFieldLabel($key, $config['labels']),
            $this->resolveAuditDisplayValue($key, $newValue, $data)
          );
        }
        continue;
      }

      if ($event === 'deleted') {
        if ($hasOld) {
          $changes[] = sprintf(
            '%s was %s',
            $this->auditFieldLabel($key, $config['labels']),
            $this->resolveAuditDisplayValue($key, $oldValue, $data)
          );
        }
        continue;
      }

      $changes[] = sprintf(
        '%s changed from %s to %s',
        $this->auditFieldLabel($key, $config['labels']),
        $this->resolveAuditDisplayValue($key, $oldValue, $data),
        $this->resolveAuditDisplayValue($key, $newValue, $data)
      );
    }

    $entity = strtolower($config['entity']);
    $action = $this->auditActionVerb($event);

    if (count($changes) === 0) {
      return sprintf('%s %s.', $action, $entity);
    }

    $excerpt = array_slice($changes, 0, 8);
    $suffix = count($changes) > 8 ? '; ...' : '';

    return sprintf('%s %s: %s%s', $action, $entity, implode('; ', $excerpt), $suffix);
  }

  protected function stringifyAuditValue($value): string {
    if ($value === null) {
      return 'none';
    }

    if (is_bool($value)) {
      return $value ? 'yes' : 'no';
    }

    if (is_scalar($value)) {
      $text = trim((string) $value);
      return $text === '' ? '""' : $text;
    }

    $encoded = json_encode($value);
    return $encoded === false ? '[unserializable]' : $encoded;
  }

  protected function auditActionVerb(string $event): string {
    return match ($event) {
      'created' => 'Recorded',
      'updated' => 'Updated',
      'deleted' => 'Removed',
      default => ucfirst($event),
    };
  }

  protected function resolveAuditDisplayValue(string $key, $value, array $data = []): string {
    $resolved = $this->auditResolvedValue($key, $value, $data);
    return $this->stringifyAuditValue($resolved);
  }

  protected function auditResolvedValue(string $key, $value, array $data = []) {
    if ($value === null || $value === '') {
      return match ($key) {
        'CustomerID' => 'Walk-in customer',
        'UserID' => 'Unknown staff',
        default => null,
      };
    }

    return match ($key) {
      'UserID' => $this->auditUserName($value),
      'CustomerID' => $this->auditCustomerName($value),
      'ProductID' => $this->auditProductName($value),
      'CategoryID' => $this->auditLookupName(Category::class, $value, 'CategoryName', "Category #{$value}"),
      'InventoryID' => $this->auditInventoryName($value),
      'SalesID' => $this->auditSaleLabel($value),
      'JobOrderID' => $this->auditJobOrderLabel($value),
      'BatchDetailsID' => $this->auditLookupName(ProductionBatchDetail::class, $value, 'BatchDescription', "Production Batch #{$value}"),
      'StockInDetailsID' => $this->auditLookupName(StockInDetail::class, $value, 'ID', "Stock-In #{$value}", fn ($detail) => "Stock-In #{$detail->ID}"),
      'StockOutDetailsID' => $this->auditLookupName(StockOutDetail::class, $value, 'ID', "Stock-Out #{$value}", fn ($detail) => "Stock-Out #{$detail->ID}"),
      'RoleID' => $this->auditLookupName(Role::class, $value, 'RoleName', "Role #{$value}"),
      'PermissionID' => $this->auditLookupName(Permission::class, $value, 'PermissionName', "Permission #{$value}"),
      'PermissionGroupID' => $this->auditLookupName(PermissionGroup::class, $value, 'GroupName', "Permission Group #{$value}"),
      default => $value,
    };
  }

  protected function auditCurrentValues(array $data): array {
    $oldValues = is_array($data['old_values'] ?? null) ? $data['old_values'] : [];
    $newValues = is_array($data['new_values'] ?? null) ? $data['new_values'] : [];

    return array_merge($oldValues, $newValues);
  }

  protected function auditUserName($userId): string {
    return $this->auditLookupName(User::class, $userId, 'FullName', 'Unknown staff');
  }

  protected function auditCustomerName($customerId): string {
    if ($customerId === null || $customerId === '') {
      return 'Walk-in customer';
    }

    return $this->auditLookupName(Customer::class, $customerId, 'CustomerName', "Customer #{$customerId}");
  }

  protected function auditProductName($productId): string {
    return $this->auditLookupName(Product::class, $productId, 'ProductName', "Product #{$productId}");
  }

  protected function auditInventoryName($inventoryId): string {
    return $this->auditLookupName(Inventory::class, $inventoryId, 'ItemName', "Inventory Item #{$inventoryId}");
  }

  protected function auditSaleLabel($saleId): string {
    if ($saleId === null || $saleId === '') {
      return 'sale';
    }

    return $this->auditLookupName(Sale::class, $saleId, 'ID', "Sale #{$saleId}", fn ($sale) => "Sale #{$sale->ID}");
  }

  protected function auditJobOrderLabel($jobOrderId): string {
    if ($jobOrderId === null || $jobOrderId === '') {
      return 'job order';
    }

    return $this->auditLookupName(JobOrder::class, $jobOrderId, 'ID', "Job Order #{$jobOrderId}", fn ($jobOrder) => "Job Order #{$jobOrder->ID}");
  }

  protected function auditLookupName(string $modelClass, $id, string $column, string $fallback, ?callable $formatter = null): string {
    if ($id === null || $id === '') {
      return $fallback;
    }

    $record = $modelClass::query()->find($id);
    if (!$record) {
      return $fallback;
    }

    if ($formatter) {
      return (string) $formatter($record);
    }

    $value = $record->{$column} ?? null;
    return is_string($value) && trim($value) !== '' ? trim($value) : $fallback;
  }

  protected function auditChangedKeys(array $data): array {
    $oldValues = is_array($data['old_values'] ?? null) ? $data['old_values'] : [];
    $newValues = is_array($data['new_values'] ?? null) ? $data['new_values'] : [];
    $keys = array_values(array_unique(array_merge(array_keys($oldValues), array_keys($newValues))));

    return array_values(array_filter($keys, function ($key) use ($oldValues, $newValues) {
      $hasOld = array_key_exists($key, $oldValues);
      $hasNew = array_key_exists($key, $newValues);

      if ($hasOld && $hasNew) {
        return $oldValues[$key] !== $newValues[$key];
      }

      return $hasOld || $hasNew;
    }));
  }

  protected function auditFormatQuantity($value): string {
    if ($value === null || $value === '') {
      return '0';
    }

    return is_numeric($value) ? number_format((float) $value, 0, '.', '') : (string) $value;
  }

  protected function auditFormatMoney($value): string {
    if (!is_numeric($value)) {
      return 'P0.00';
    }

    return 'P' . number_format((float) $value, 2);
  }

  protected function auditFieldLabel(string $key, array $labels): string {
    return $labels[$key] ?? $key;
  }

  protected function orderAuditKeys(array $keys, array $priority): array {
    if (count($priority) === 0) {
      return $keys;
    }

    usort($keys, function ($a, $b) use ($priority) {
      $aIndex = array_search($a, $priority, true);
      $bIndex = array_search($b, $priority, true);
      $aRank = $aIndex === false ? PHP_INT_MAX : $aIndex;
      $bRank = $bIndex === false ? PHP_INT_MAX : $bIndex;

      if ($aRank === $bRank) {
        return strcmp((string) $a, (string) $b);
      }

      return $aRank <=> $bRank;
    });

    return $keys;
  }

  protected function auditReadableConfig(): array {
    $class = class_basename($this);

    $commonLabels = [
      'UserID' => 'User',
      'CustomerID' => 'Customer',
      'ProductID' => 'Product',
      'CategoryID' => 'Category',
      'InventoryID' => 'Inventory Item',
      'SalesID' => 'Sale',
      'BatchDetailsID' => 'Batch Details',
      'StockInDetailsID' => 'Stock-In Details',
      'StockOutDetailsID' => 'Stock-Out Details',
      'ShrinkageID' => 'Shrinkage',
      'Quantity' => 'Quantity',
      'DateAdded' => 'Date Added',
      'DateModified' => 'Date Modified',
    ];

    $configByModel = [
      'Product' => [
        'entity' => 'Product',
        'priority_keys' => ['ProductName', 'Price', 'Quantity', 'LowStockThreshold', 'CategoryID', 'ProductFrom'],
        'labels' => [
          'ProductName' => 'Product Name',
          'ProductDescription' => 'Description',
          'ProductFrom' => 'Source',
          'Price' => 'Price',
          'Quantity' => 'Stock Quantity',
          'LowStockThreshold' => 'Low Stock Threshold',
        ],
      ],
      'Category' => [
        'entity' => 'Category',
        'priority_keys' => ['CategoryName', 'CategoryDescription'],
        'labels' => [
          'CategoryName' => 'Category Name',
          'CategoryDescription' => 'Description',
        ],
      ],
      'Customer' => [
        'entity' => 'Customer',
        'priority_keys' => ['CustomerName', 'CustomerType', 'ContactDetails', 'Address'],
        'labels' => [
          'CustomerName' => 'Customer Name',
          'CustomerType' => 'Customer Type',
          'ContactDetails' => 'Contact Details',
          'Address' => 'Address',
        ],
      ],
      'Role' => [
        'entity' => 'Role',
        'priority_keys' => ['RoleName', 'RoleDescription', 'RoleRank'],
        'labels' => [
          'RoleName' => 'Role Name',
          'RoleDescription' => 'Role Description',
          'RoleRank' => 'Role Rank',
        ],
      ],
      'Permission' => [
        'entity' => 'Permission',
        'priority_keys' => ['PermissionName', 'PermissionDescription', 'PermissionGroupID'],
        'labels' => [
          'PermissionName' => 'Permission Name',
          'PermissionDescription' => 'Permission Description',
          'PermissionGroupID' => 'Permission Group',
        ],
      ],
      'PermissionGroup' => [
        'entity' => 'Permission Group',
        'priority_keys' => ['GroupName', 'GroupDescription', 'DisplayOrder'],
        'labels' => [
          'GroupName' => 'Group Name',
          'GroupDescription' => 'Group Description',
          'DisplayOrder' => 'Display Order',
        ],
      ],
      'DatabaseBackup' => [
        'entity' => 'Database Backup',
        'priority_keys' => ['BackupType', 'BackupStatus', 'FileName', 'BaseBackupID', 'FromChangeLogID', 'ToChangeLogID'],
        'labels' => [
          'BackupType' => 'Backup Type',
          'BackupStatus' => 'Backup Status',
          'FileName' => 'File Name',
          'FilePath' => 'File Path',
          'FileSizeBytes' => 'File Size',
          'ChecksumSha256' => 'Checksum',
          'BaseBackupID' => 'Base Backup',
          'FromChangeLogID' => 'From Change Log ID',
          'ToChangeLogID' => 'To Change Log ID',
          'FailureMessage' => 'Failure Message',
          'Notes' => 'Notes',
          'StartedAt' => 'Started At',
          'CompletedAt' => 'Completed At',
        ],
      ],
      'DatabaseBackupSetting' => [
        'entity' => 'Database Backup Setting',
        'priority_keys' => ['SnapshotRetentionCount', 'IncrementalRetentionCount', 'DeleteFailedBackups'],
        'labels' => [
          'SnapshotRetentionCount' => 'Snapshot Retention Count',
          'IncrementalRetentionCount' => 'Incremental Retention Count',
          'DeleteFailedBackups' => 'Delete Failed Backups',
        ],
      ],
      'SystemOperation' => [
        'entity' => 'System Operation',
        'priority_keys' => ['Scope', 'OperationType', 'Title', 'Status', 'LockWrites', 'StartedAt', 'CompletedAt'],
        'labels' => [
          'Scope' => 'Scope',
          'OperationType' => 'Operation Type',
          'Title' => 'Title',
          'Status' => 'Status',
          'LockWrites' => 'Lock Writes',
          'Payload' => 'Payload',
          'Result' => 'Result',
          'Notes' => 'Notes',
          'FailureMessage' => 'Failure Message',
          'StartedAt' => 'Started At',
          'CompletedAt' => 'Completed At',
        ],
      ],
      'RolePresetPermission' => [
        'entity' => 'Role Preset Permission',
        'priority_keys' => ['RoleID', 'PermissionID', 'Allowable'],
        'labels' => [
          'RoleID' => 'Role',
          'PermissionID' => 'Permission',
          'Allowable' => 'Allowable',
        ],
      ],
      'Inventory' => [
        'entity' => 'Inventory Item',
        'priority_keys' => ['ItemName', 'Quantity', 'Measurement', 'LowCountThreshold', 'ItemType'],
        'labels' => [
          'ItemName' => 'Item Name',
          'ItemDescription' => 'Description',
          'ItemType' => 'Item Type',
          'Measurement' => 'Measurement',
          'LowCountThreshold' => 'Low Count Threshold',
        ],
      ],
      'Sale' => [
        'entity' => 'Sale',
        'priority_keys' => ['UserID', 'CustomerID', 'SaleType', 'TotalAmount'],
        'labels' => [
          'UserID' => 'Staff',
          'SaleType' => 'Sale Type',
          'TotalAmount' => 'Total Amount',
        ],
      ],
      'Payment' => [
        'entity' => 'Payment',
        'priority_keys' => ['SalesID', 'TotalAmount', 'PaidAmount', 'Change', 'PaymentStatus', 'InvoiceNumber', 'ReceiptNumber', 'PaymentDueDate'],
        'labels' => [
          'TotalAmount' => 'Total Amount',
          'PaidAmount' => 'Paid Amount',
          'Change' => 'Change',
          'PaymentStatus' => 'Payment Status',
          'InvoiceNumber' => 'Invoice Number',
          'InvoiceIssuedAt' => 'Invoice Issued At',
          'ReceiptNumber' => 'Receipt Number',
          'ReceiptIssuedAt' => 'Receipt Issued At',
          'PaymentDueDate' => 'Due Date',
        ],
      ],
      'ProductionBatchDetail' => [
        'entity' => 'Production Batch Detail',
        'priority_keys' => ['UserID', 'BatchDescription', 'TotalProductsProduced'],
        'labels' => [
          'BatchDescription' => 'Batch Description',
          'TotalProductsProduced' => 'Total Products Produced',
        ],
      ],
      'ProductionBatch' => [
        'entity' => 'Production Batch',
        'priority_keys' => ['BatchDetailsID', 'ProductID', 'QuantityProduced'],
        'labels' => [
          'QuantityProduced' => 'Quantity Produced',
        ],
      ],
      'StockInDetail' => [
        'entity' => 'Stock-In Detail',
        'priority_keys' => ['UserID', 'Supplier', 'PurchaseDate', 'TotalQuantity', 'TotalAmount', 'Source'],
        'labels' => [
          'UserID' => 'Staff',
          'Supplier' => 'Supplier',
          'PurchaseDate' => 'Purchase Date',
          'TotalQuantity' => 'Total Quantity',
          'TotalAmount' => 'Total Amount',
          'Source' => 'Stock Source',
          'ReceiptNumber' => 'Receipt Number',
          'InvoiceNumber' => 'Invoice Number',
          'AdditionalDetails' => 'Additional Details',
        ],
      ],
      'StockIn' => [
        'entity' => 'Stock-In Line',
        'priority_keys' => ['StockInDetailsID', 'ItemType', 'InventoryID', 'ProductID', 'QuantityAdded', 'SubAmount'],
        'labels' => [
          'ItemType' => 'Item Type',
          'QuantityAdded' => 'Quantity Added',
          'SubAmount' => 'Subtotal',
        ],
      ],
      'StockOutDetail' => [
        'entity' => 'Stock-Out Detail',
        'priority_keys' => ['UserID', 'TotalQuantity', 'Reason'],
        'labels' => [
          'UserID' => 'Staff',
          'TotalQuantity' => 'Total Quantity',
          'Reason' => 'Reason',
        ],
      ],
      'StockOut' => [
        'entity' => 'Stock-Out Line',
        'priority_keys' => ['StockOutDetailsID', 'ItemType', 'InventoryID', 'ProductID', 'QuantityRemoved', 'SubAmount'],
        'labels' => [
          'ItemType' => 'Item Type',
          'QuantityRemoved' => 'Quantity Removed',
          'SubAmount' => 'Subtotal',
        ],
      ],
      'Shrinkage' => [
        'entity' => 'Shrinkage Record',
        'priority_keys' => ['UserID', 'Reason', 'Quantity', 'TotalAmount'],
        'labels' => [
          'UserID' => 'Staff',
          'Reason' => 'Reason',
          'TotalAmount' => 'Total Amount',
        ],
      ],
      'ShrinkedProduct' => [
        'entity' => 'Shrinked Product Line',
        'priority_keys' => ['ShrinkageID', 'ProductID', 'Quantity', 'SubAmount'],
        'labels' => [
          'SubAmount' => 'Subtotal',
        ],
      ],
      'SoldProduct' => [
        'entity' => 'Sold Product Line',
        'priority_keys' => ['SalesID', 'ProductID', 'Quantity', 'PricePerUnit', 'SubAmount'],
        'labels' => [
          'PricePerUnit' => 'Price Per Unit',
          'SubAmount' => 'Subtotal',
        ],
      ],
      'JobOrder' => [
        'entity' => 'Job Order',
        'priority_keys' => ['UserID', 'CustomerID', 'SalesID', 'Status', 'DeliveryAt', 'TotalAmount'],
        'labels' => [
          'UserID' => 'Staff',
          'Status' => 'Status',
          'DeliveryAt' => 'Delivery Time',
          'Notes' => 'Notes',
          'TotalAmount' => 'Total Amount',
        ],
      ],
      'JobOrderItem' => [
        'entity' => 'Job Order Item',
        'priority_keys' => ['JobOrderID', 'ProductID', 'Quantity', 'PricePerUnit', 'SubAmount'],
        'labels' => [
          'PricePerUnit' => 'Price Per Unit',
          'SubAmount' => 'Subtotal',
        ],
      ],
      'JobOrderCustomItem' => [
        'entity' => 'Job Order Custom Item',
        'priority_keys' => ['JobOrderID', 'CustomOrderDescription', 'Quantity', 'PricePerUnit'],
        'labels' => [
          'CustomOrderDescription' => 'Custom Item',
          'PricePerUnit' => 'Price Per Unit',
        ],
      ],
      'ProductLeftover' => [
        'entity' => 'Product Leftover',
        'priority_keys' => ['ProductLeftoverID', 'ProductID', 'LeftoverQuantity', 'PerUnitAmount'],
        'labels' => [
          'ProductLeftoverID' => 'Snapshot',
          'LeftoverQuantity' => 'Leftover Quantity',
          'PerUnitAmount' => 'Unit Amount',
        ],
      ],
      'ProductLeftoverSnapshot' => [
        'entity' => 'Product Snapshot',
        'priority_keys' => ['UserID', 'TotalProducts', 'TotalLeftovers', 'TotalAmount', 'SnapshotTime'],
        'labels' => [
          'UserID' => 'Staff',
          'TotalProducts' => 'Total Products',
          'TotalLeftovers' => 'Total Leftovers',
          'TotalAmount' => 'Total Amount',
          'SnapshotTime' => 'Snapshot Time',
        ],
      ],
      'InventoryLeftoverSnapshot' => [
        'entity' => 'Inventory Snapshot',
        'priority_keys' => ['UserID', 'TotalItems', 'TotalLeftovers', 'SnapshotTime'],
        'labels' => [
          'UserID' => 'Staff',
          'TotalItems' => 'Total Items',
          'TotalLeftovers' => 'Total Leftovers',
          'SnapshotTime' => 'Snapshot Time',
        ],
      ],
    ];

    $modelConfig = $configByModel[$class] ?? [
      'entity' => $class,
      'priority_keys' => [],
      'labels' => [],
    ];

    return [
      'entity' => $modelConfig['entity'],
      'priority_keys' => $modelConfig['priority_keys'],
      'labels' => array_merge($commonLabels, $modelConfig['labels']),
    ];
  }
}
