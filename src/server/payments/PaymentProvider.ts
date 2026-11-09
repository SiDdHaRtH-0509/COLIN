/**
 * COLIN Payment Provider Abstraction
 * Defines the contract for payment gateways (Simulated, Razorpay, Cashfree, Stripe).
 */

export interface CreatePaymentOrderInput {
  bookingId: string;
  payerUserId: string;
  amount: number; // e.g. 150.00
  currency?: string;
  description?: string;
}

export interface PaymentOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  gateway: 'SIMULATED' | 'RAZORPAY' | 'CASHFREE' | 'STRIPE';
  status: 'INITIATED' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  isSimulated: boolean;
}

export interface VerifyPaymentInput {
  orderId: string;
  paymentId?: string;
  signature?: string;
  idempotencyKey: string;
  simulateFailure?: boolean;
}

export interface PaymentVerificationResult {
  success: boolean;
  paymentId: string;
  gatewayOrderId: string;
  amount: number;
  currency: string;
  status: 'SUCCESS' | 'FAILED';
  isSimulated: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface ProcessRefundInput {
  paymentId: string;
  amount: number;
  reason?: string;
  idempotencyKey: string;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  amountRefunded: number;
  status: 'SUCCESS' | 'FAILED';
  isSimulated: boolean;
  errorMessage?: string;
}

export interface PaymentProvider {
  name: string;
  createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<PaymentVerificationResult>;
  processRefund(input: ProcessRefundInput): Promise<RefundResult>;
}
