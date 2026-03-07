<?php

namespace App\Models\Concerns;

trait BuildsReadableAuditChanges {
  protected function buildReadableChanges(array $data): ?string {
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
            $this->stringifyAuditValue($newValue)
          );
        }
        continue;
      }

      if ($event === 'deleted') {
        if ($hasOld) {
          $changes[] = sprintf(
            '%s was %s',
            $this->auditFieldLabel($key, $config['labels']),
            $this->stringifyAuditValue($oldValue)
          );
        }
        continue;
      }

      $changes[] = sprintf(
        '%s changed from %s to %s',
        $this->auditFieldLabel($key, $config['labels']),
        $this->stringifyAuditValue($oldValue),
        $this->stringifyAuditValue($newValue)
      );
    }

    $entity = $config['entity'];
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
      return 'null';
    }

    if (is_bool($value)) {
      return $value ? 'true' : 'false';
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
      'created' => 'Created',
      'updated' => 'Updated',
      'deleted' => 'Deleted',
      default => ucfirst($event),
    };
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
