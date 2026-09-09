import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatAtomic,
  ownerMintDelta,
  verifyParsedPayment,
} from '../src/payment-proof.mjs';
import {
  assertPaymentPlan,
  calculatePaymentSplit,
  createPaymentReference,
} from '../src/payment-plan.mjs';
import {
  canStartNewAttempt,
  PaymentState,
  transitionPayment,
} from '../src/payment-lifecycle.mjs';

const key = (address, signer = false) => ({
  pubkey: { toBase58: () => address },
  signer,
});

const balance = (owner, mint, amount) => ({
  owner,
  mint,
  uiTokenAmount: { amount: String(amount) },
});

const proof = {
  payer: 'payer',
  merchant: 'merchant',
  feeWallet: 'fee',
  mint: 'mint',
  paymentAmountAtomic: '10000000',
  merchantAmountAtomic: '9970000',
  feeAmountAtomic: '30000',
};

const transaction = {
  meta: {
    err: null,
    preTokenBalances: [balance('payer', 'mint', 20_000_000)],
    postTokenBalances: [
      balance('payer', 'mint', 10_000_000),
      balance('merchant', 'mint', 9_970_000),
      balance('fee', 'mint', 30_000),
    ],
  },
  transaction: {
    message: { accountKeys: [key('payer', true), key('merchant')] },
  },
};

test('formats atomic token amounts without floating-point arithmetic', () => {
  assert.equal(formatAtomic(9_970_000n, 6), '9.97');
  assert.equal(formatAtomic(-10_000_000n, 6), '-10');
});

test('calculates one owner and mint delta', () => {
  assert.equal(ownerMintDelta(transaction, 'merchant', 'mint'), 9_970_000n);
});

test('verifies the payer signature and exact payment split', () => {
  assert.deepEqual(verifyParsedPayment(transaction, proof), {
    payerSigned: true,
    merchantDelta: 9_970_000n,
    feeDelta: 30_000n,
    payerDelta: -10_000_000n,
  });
});

test('rejects a mismatched merchant amount', () => {
  const invalid = {
    ...transaction,
    meta: {
      ...transaction.meta,
      postTokenBalances: transaction.meta.postTokenBalances.map(item => ({
        ...item,
        uiTokenAmount: { ...item.uiTokenAmount },
      })),
    },
  };
  invalid.meta.postTokenBalances[1].uiTokenAmount.amount = '9960000';
  assert.throws(
    () => verifyParsedPayment(invalid, proof),
    /Merchant delta mismatch/,
  );
});

test('calculates a 30 bps fee with exact integer arithmetic', () => {
  assert.deepEqual(calculatePaymentSplit(10_000_000n, 30), {
    paymentAmountAtomic: 10_000_000n,
    merchantAmountAtomic: 9_970_000n,
    feeAmountAtomic: 30_000n,
  });
});

test('creates a bounded Rewardy payment reference', () => {
  assert.equal(createPaymentReference('order-1042'), 'rewardy-pay:order-1042');
  assert.throws(() => createPaymentReference('../secret'), /invalid/);
});

test('rejects self-payment and unbalanced plans', () => {
  assert.throws(
    () =>
      assertPaymentPlan({
        payer: 'same',
        merchant: 'same',
        feeWallet: 'fee',
        paymentAmountAtomic: '100',
        merchantAmountAtomic: '97',
        feeAmountAtomic: '3',
      }),
    /Payer cannot/,
  );
});

test('keeps an unknown confirmation recoverable without a second attempt', () => {
  assert.equal(
    transitionPayment(PaymentState.SUBMITTED, PaymentState.CONFIRMATION_UNKNOWN),
    PaymentState.CONFIRMATION_UNKNOWN,
  );
  assert.equal(canStartNewAttempt(PaymentState.CONFIRMATION_UNKNOWN), false);
  assert.equal(
    transitionPayment(PaymentState.CONFIRMATION_UNKNOWN, PaymentState.CONFIRMED),
    PaymentState.CONFIRMED,
  );
});

test('prevents a confirmed payment from transitioning again', () => {
  assert.throws(
    () => transitionPayment(PaymentState.CONFIRMED, PaymentState.WAITING),
    /not allowed/,
  );
});
