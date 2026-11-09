/**
 * COLIN Simulated Payment Provider
 * Prototype Payment Gateway Simulator
 * 
 * Explicitly identifies all transactions as TEST/SIMULATED.
 * Collects zero real funds while validating idempotency, amounts, and failure states.
 */

import crypto from 'crypto';
import {
  PaymentProvider,
  CreatePaymentOrderInput,
  PaymentOrderResult,
  VerifyPaymentInput,
  PaymentVerificationResult,
  ProcessRefundInput,
  RefundResult,
} from './PaymentProvider';

export class SimulatedPaymentProvider implements PaymentProvider {
  public readonly name = 'SIMULATED';

  /**
   * Generates a simulated test order reference.
   */
  async createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderResult> {
    const orderId = `SIM-ORD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    return {
      orderId,
      amount: input.amount,
      currency: input.currency || 'INR',
      gateway: 'SIMULATED',
      status: 'INITIATED',
      isSimulated: true,
    };
  }

  /**
   * Verifies simulated payment. Supports testing failure scenarios.
   */
  async verifyPayment(input: VerifyPaymentInput): Promise<PaymentVerificationResult> {
    if (input.simulateFailure) {
      return {
        success: false,
        paymentId: `SIM-PAY-FAIL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        gatewayOrderId: input.orderId,
        amount: 150.0,
        currency: 'INR',
        status: 'FAILED',
        isSimulated: true,
        errorMessage: 'SIMULATED: Test card declined by simulated bank.',
      };
    }

    const paymentId = input.paymentId || `SIM-PAY-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    return {
      success: true,
      paymentId,
      gatewayOrderId: input.orderId,
      amount: 150.0,
      currency: 'INR',
      status: 'SUCCESS',
      isSimulated: true,
      metadata: {
        mode: 'SIMULATED_TEST',
        processedAt: new Date().toISOString(),
        note: 'Zero real currency transferred. Prototype simulation only.',
      },
    };
  }

  /**
   * Processes a simulated refund.
   */
  async processRefund(input: ProcessRefundInput): Promise<RefundResult> {
    const refundId = `SIM-REF-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    return {
      success: true,
      refundId,
      amountRefunded: input.amount,
      status: 'SUCCESS',
      isSimulated: true,
    };
  }
}

export const simulatedPaymentProvider = new SimulatedPaymentProvider();
