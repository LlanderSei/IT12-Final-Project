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
      'PaymentMethod' => $this->paymentMethodValidationRule(),
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

      $paymentDetails = $this->normalizeSalePaymentInput([
        'paymentSelection' => 'pay_now',
        'paymentType' => $payload['paymentType'],
        'paymentMethod' => $payload['PaymentMethod'],
        'paidAmount' => $payload['PaidAmount'],
      ], $amountLeft);

      $paidAmount = $paymentDetails['appliedAmount'];

      $receiptNumber = $this->generateReceiptNumber();
      PartialPayment::create([
        'SalesID' => $sale->ID,
        'PaidAmount' => $paidAmount,
        'TenderedAmount' => $paymentDetails['tenderedAmount'],
        'Change' => $paymentDetails['change'],
        'ReceiptNumber' => $receiptNumber,
        'ReceiptIssuedAt' => now(),
        'PaymentMethod' => $paymentDetails['paymentMethod'],
        'AdditionalDetails' => $payload['AdditionalDetails'] ?? null,
        'DateAdded' => now(),
      ]);

      $latestTotalPaid = (float)PartialPayment::where('SalesID', $sale->ID)->sum('PaidAmount');
      $payment->update([
        'PaidAmount' => $latestTotalPaid,
        'Change' => $paymentDetails['change'],
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
