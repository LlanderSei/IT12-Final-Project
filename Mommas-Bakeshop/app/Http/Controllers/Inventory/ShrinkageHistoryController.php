<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Controllers\PointOfSale\Concerns\HandlesShrinkage;
use App\Http\Controllers\PointOfSale\Concerns\PosHelpers;
use App\Models\Product;
use App\Models\Shrinkage;
use App\Models\ShrinkedProduct;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class ShrinkageHistoryController extends Controller {
  use PosHelpers;
  use HandlesShrinkage;

  public function shrinkageHistory(Request $request) {
    return $this->renderShrinkageTabs($request, 'Pending');
  }

  public function shrinkagePending(Request $request) {
    return $this->renderShrinkageTabs($request, 'Pending');
  }

  public function shrinkageHistoryTab(Request $request) {
    return $this->renderShrinkageTabs($request, 'History');
  }

  protected function renderShrinkageTabs(Request $request, ?string $forcedTab = null) {
    $requestedTab = $forcedTab ?? $request->route('tab');
    $initialTab = in_array($requestedTab, ['Pending', 'History'], true)
      ? $requestedTab
      : 'Pending';

    $shrinkages = Shrinkage::with([
      'user:id,FullName',
      'shrinkedProducts.product:ID,ProductName,Price,Quantity',
    ])
      ->orderByDesc('DateAdded')
      ->get()
      ->map(fn ($shrinkage) => $this->transformShrinkageForView($shrinkage))
      ->values();

    $products = Product::query()
      ->notArchived()
      ->orderBy('ProductName')
      ->get(['ID', 'ProductName', 'Price', 'Quantity'])
      ->map(fn ($product) => [
        'ID' => $product->ID,
        'ProductName' => $product->ProductName,
        'Price' => (float) $product->Price,
        'Quantity' => (int) $product->Quantity,
      ])
      ->values();

    return Inertia::render('Inventory/ShrinkageTabs', [
      'shrinkages' => $shrinkages,
      'products' => $products,
      'allowedReasons' => $this->allowedShrinkageReasons($request->user()),
      'initialTab' => $initialTab,
    ]);
  }

  public function storeShrinkageHistory(Request $request) {
    try {
      $bypassVerification = $request->boolean('bypassVerification');
      $canBypass = ($request->user()?->hasPermission('CanVerifyShrinkageRecord') ?? false);
      if ($bypassVerification && !$canBypass) {
        throw ValidationException::withMessages([
          'bypassVerification' => 'You do not have permission to bypass shrinkage confirmation.',
        ]);
      }

      $payload = $this->validateShrinkagePayload(
        $request,
        $this->allowedShrinkageReasons($request->user())
      );

      $this->persistShrinkageRecord(
        $payload,
        (int) $request->user()->id,
        $bypassVerification ? 'Verified' : 'Pending',
        $bypassVerification
      );

      $message = $bypassVerification
        ? 'Shrinkage recorded and verified successfully.'
        : 'Shrinkage recorded successfully.';

      return redirect()->route('inventory.shrinkage-history.pending')->with('success', $message);
    } catch (ValidationException $e) {
      throw $e;
    } catch (\Throwable $e) {
      report($e);
      return redirect()->route('inventory.shrinkage-history.pending')->with('error', 'Failed to record shrinkage.');
    }
  }

  public function updateShrinkageHistory(Request $request, int $id) {
    $shrinkage = Shrinkage::with(['shrinkedProducts'])->findOrFail($id);

    try {
      if (($shrinkage->VerificationStatus ?? 'Pending') !== 'Pending') {
        throw ValidationException::withMessages([
          'status' => 'Only pending shrinkage records can be updated.',
        ]);
      }
      $payload = $this->validateShrinkagePayload(
        $request,
        $this->allowedShrinkageReasons($request->user(), $shrinkage->Reason)
      );

      DB::transaction(function () use ($payload, $shrinkage) {
        $shrinkage->load('shrinkedProducts');
        [$lines, $totalQuantity, $totalAmount] = $this->calculateCartTotals($payload['items']);

        foreach ($shrinkage->shrinkedProducts as $line) {
          $line->delete();
        }

        $shrinkage->update([
          'Quantity' => $totalQuantity,
          'TotalAmount' => $totalAmount,
          'Reason' => $payload['reason'],
        ]);

        foreach ($lines as $line) {
          ShrinkedProduct::create([
            'ShrinkageID' => $shrinkage->ID,
            'ProductID' => $line['product']->ID,
            'Quantity' => $line['quantity'],
            'SubAmount' => $line['subAmount'],
          ]);

          $line['product']->update([
            'DateModified' => now(),
          ]);
        }
      });

      return redirect()->route('inventory.shrinkage-history.pending')->with('success', 'Shrinkage record updated successfully.');
    } catch (ValidationException $e) {
      throw $e;
    } catch (\Throwable $e) {
      report($e);
      return redirect()->route('inventory.shrinkage-history.pending')->with('error', 'Failed to update shrinkage record.');
    }
  }

  public function destroyShrinkageHistory(int $id) {
    try {
      DB::transaction(function () use ($id) {
        $shrinkage = Shrinkage::with('shrinkedProducts')->lockForUpdate()->findOrFail($id);
        if (($shrinkage->VerificationStatus ?? 'Pending') !== 'Pending') {
          throw ValidationException::withMessages([
            'status' => 'Only pending shrinkage records can be deleted.',
          ]);
        }

        foreach ($shrinkage->shrinkedProducts as $line) {
          $line->delete();
        }

        $shrinkage->delete();
      });

      return redirect()->route('inventory.shrinkage-history.pending')->with('success', 'Shrinkage record deleted successfully.');
    } catch (\Throwable $e) {
      report($e);
      return redirect()->route('inventory.shrinkage-history.pending')->with('error', 'Failed to delete shrinkage record.');
    }
  }

  public function verifyShrinkage(Request $request, int $id) {
    $payload = $request->validate([
      'status' => ['required', Rule::in(['Verified', 'Rejected'])],
    ]);

    try {
      DB::transaction(function () use ($payload, $id) {
        $shrinkage = Shrinkage::with('shrinkedProducts')->lockForUpdate()->findOrFail($id);
        if (($shrinkage->VerificationStatus ?? 'Pending') !== 'Pending') {
          throw ValidationException::withMessages([
            'status' => 'Only pending shrinkage records can be verified.',
          ]);
        }

        if ($payload['status'] === 'Verified') {
          $grouped = $shrinkage->shrinkedProducts
            ->groupBy('ProductID')
            ->map(fn ($rows) => (int) $rows->sum('Quantity'))
            ->all();

          if (!empty($grouped)) {
            $productIDs = array_map('intval', array_keys($grouped));
            $products = Product::whereIn('ID', $productIDs)->lockForUpdate()->get()->keyBy('ID');
            if ($products->count() !== count($productIDs)) {
              throw ValidationException::withMessages([
                'items' => 'One or more shrinkage products no longer exist.',
              ]);
            }

            foreach ($grouped as $productID => $quantity) {
              $product = $products[(int) $productID];
              if ((int) $product->Quantity < (int) $quantity) {
                throw ValidationException::withMessages([
                  'items' => "Insufficient stock for {$product->ProductName}.",
                ]);
              }
            }

            foreach ($grouped as $productID => $quantity) {
              $product = $products[(int) $productID];
              $product->update([
                'Quantity' => (int) $product->Quantity - (int) $quantity,
                'DateModified' => now(),
              ]);
            }
          }
        }

        $shrinkage->update([
          'VerificationStatus' => $payload['status'],
        ]);
      });

      $message = $payload['status'] === 'Verified'
        ? 'Shrinkage record verified successfully.'
        : 'Shrinkage record rejected.';
      $routeName = $payload['status'] === 'Verified'
        ? 'inventory.shrinkage-history.history'
        : 'inventory.shrinkage-history.pending';
      return redirect()->route($routeName)->with('success', $message);
    } catch (ValidationException $e) {
      throw $e;
    } catch (\Throwable $e) {
      report($e);
      return redirect()->route('inventory.shrinkage-history.pending')->with('error', 'Failed to verify shrinkage record.');
    }
  }
}
