<?php

namespace App\Http\Controllers\PointOfSale\SaleHistory;

use App\Http\Controllers\Controller;
use App\Http\Controllers\PointOfSale\Concerns\HandlesSaleHistory;
use App\Http\Controllers\PointOfSale\Concerns\PosHelpers;
use App\Models\PartialPayment;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PendingPaymentsController extends Controller {
  use HandlesSaleHistory;
  use PosHelpers;

  public function index(Request $request) {
    return $this->renderSaleHistory($request, 'Pending Payments');
  }

  public function recordSalePayment(Request $request) {
    $payload = $request->validate([
      'SalesID' => 'required|integer|exists:sales,ID',
      'paymentType' => 'required|in:partial,full',
      'PaidAmount' => 'required|numeric|min:0.01',
      'PaymentMethod' => 'required|string|max:255',
      'AdditionalDetails' => 'nullable|string|max:1000',
    ]);

    $receiptNumber = null;

    DB::transaction(function () use ($payload, &$receiptNumber) {
      $sale = Sale::with(['payment', 'partialPayments'])
        ->lockForUpdate()
        ->findOrFail($payload['SalesID']);

      $payment = $sale->payment;
      if (!$payment) {
        throw ValidationException::withMessages([
          'SalesID' => 'Selected sale has no payment record.',
        ]);
      }

      if ($payment->PaymentStatus === 'Paid') {
        throw ValidationException::withMessages([
          'SalesID' => 'Selected sale is already fully paid.',
        ]);
      }

      $currentPaid = (float)$sale->partialPayments->sum('PaidAmount');
      $totalAmount = (float)$payment->TotalAmount;
      $amountLeft = max(0, round($totalAmount - $currentPaid, 2));
      if ($amountLeft <= 0) {
        throw ValidationException::withMessages([
          'SalesID' => 'Selected sale has no remaining balance.',
        ]);
      }

      $requestedAmount = round((float)$payload['PaidAmount'], 2);
      $paidAmount = $payload['paymentType'] === 'full' ? $amountLeft : $requestedAmount;

      if ($payload['paymentType'] === 'partial' && $requestedAmount >= $amountLeft) {
        throw ValidationException::withMessages([
          'PaidAmount' => 'Partial payment must be less than the remaining balance.',
        ]);
      }

      $receiptNumber = $this->generateReceiptNumber();
      PartialPayment::create([
        'SalesID' => $sale->ID,
        'PaidAmount' => $paidAmount,
        'ReceiptNumber' => $receiptNumber,
        'ReceiptIssuedAt' => now(),
        'PaymentMethod' => $payload['PaymentMethod'],
        'AdditionalDetails' => $payload['AdditionalDetails'] ?? null,
        'DateAdded' => now(),
      ]);

      $latestTotalPaid = (float)PartialPayment::where('SalesID', $sale->ID)->sum('PaidAmount');
      $payment->update([
        'PaidAmount' => $latestTotalPaid,
        'Change' => max(0, round($latestTotalPaid - $totalAmount, 2)),
        'PaymentStatus' => $latestTotalPaid >= $totalAmount ? 'Paid' : 'Partially Paid',
        'PaymentDueDate' => $latestTotalPaid >= $totalAmount ? null : $payment->PaymentDueDate,
      ]);
    });

    $message = 'Payment recorded successfully.';
    if ($receiptNumber) {
      $message .= " Receipt #{$receiptNumber} issued.";
    }

    return redirect()->back()->with('success', $message);
  }
}
