const ATTEMPT_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,80}$/;

export function createPaymentReference(attemptId) {
  if (!ATTEMPT_ID.test(attemptId)) {
    throw new Error('Payment attempt id is invalid');
  }
  return `rewardy-pay:${attemptId}`;
}

export function calculatePaymentSplit(paymentAmountAtomic, feeBps) {
  const payment = BigInt(paymentAmountAtomic);
  if (payment <= 0n) {
    throw new Error('Payment amount must be positive');
  }
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 10_000) {
    throw new Error('Fee basis points are invalid');
  }

  const fee = (payment * BigInt(feeBps)) / 10_000n;
  return {
    paymentAmountAtomic: payment,
    merchantAmountAtomic: payment - fee,
    feeAmountAtomic: fee,
  };
}

export function assertPaymentPlan(plan) {
  const payment = BigInt(plan.paymentAmountAtomic);
  const merchant = BigInt(plan.merchantAmountAtomic);
  const fee = BigInt(plan.feeAmountAtomic);
  if (merchant <= 0n || fee < 0n || merchant + fee !== payment) {
    throw new Error('Payment plan amounts do not balance');
  }
  if (plan.payer === plan.merchant || plan.payer === plan.feeWallet) {
    throw new Error('Payer cannot be a payment destination');
  }
  if (plan.merchant === plan.feeWallet) {
    throw new Error('Merchant and fee destinations must differ');
  }
  return true;
}

