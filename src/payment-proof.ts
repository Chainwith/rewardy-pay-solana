import type { Connection } from '@solana/web3.js';

export const DEVNET_GENESIS =
  'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';

export type PaymentProof = {
  signature: string;
  mint: string;
  decimals: number;
  payer: string;
  merchant: string;
  feeWallet: string;
  paymentAmountAtomic: string;
  merchantAmountAtomic: string;
  feeAmountAtomic: string;
  memo?: string | null;
};

type TokenBalance = {
  owner?: string;
  mint: string;
  uiTokenAmount?: { amount?: string };
};

type AccountKey = {
  pubkey: { toBase58(): string };
  signer: boolean;
};

export type ParsedPaymentTransaction = {
  meta: {
    err?: unknown;
    preTokenBalances?: readonly TokenBalance[] | null;
    postTokenBalances?: readonly TokenBalance[] | null;
  } | null;
  transaction: {
    message: { accountKeys: readonly AccountKey[] };
  };
};

export type VerifiedPayment = {
  payerSigned: true;
  merchantDelta: bigint;
  feeDelta: bigint;
  payerDelta: bigint;
};

export function formatAtomic(value: bigint, decimals: number): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const divisor = 10n ** BigInt(decimals);
  const whole = absolute / divisor;
  const fraction = (absolute % divisor)
    .toString()
    .padStart(decimals, '0')
    .replace(/0+$/, '');
  const rendered = fraction ? `${whole}.${fraction}` : `${whole}`;
  return `${negative ? '-' : ''}${rendered}`;
}

export function ownerMintDelta(
  transaction: ParsedPaymentTransaction,
  owner: string,
  mint: string,
): bigint {
  const sum = (balances: readonly TokenBalance[] | null | undefined): bigint =>
    (balances ?? [])
      .filter(balance => balance.owner === owner && balance.mint === mint)
      .reduce(
        (total, balance) =>
          total + BigInt(balance.uiTokenAmount?.amount ?? '0'),
        0n,
      );

  return (
    sum(transaction.meta?.postTokenBalances) -
    sum(transaction.meta?.preTokenBalances)
  );
}

export function verifyParsedPayment(
  transaction: ParsedPaymentTransaction | null,
  proof: Omit<PaymentProof, 'signature' | 'decimals'>,
): VerifiedPayment {
  if (!transaction || transaction.meta?.err) {
    throw new Error('The transaction is missing or failed');
  }

  const payerSigned = transaction.transaction.message.accountKeys.some(
    account =>
      account.pubkey.toBase58() === proof.payer && account.signer === true,
  );
  if (!payerSigned) {
    throw new Error('Expected payer signature was not found');
  }

  const merchantDelta = ownerMintDelta(
    transaction,
    proof.merchant,
    proof.mint,
  );
  const feeDelta = ownerMintDelta(
    transaction,
    proof.feeWallet,
    proof.mint,
  );
  const payerDelta = ownerMintDelta(transaction, proof.payer, proof.mint);

  const expectedMerchant = BigInt(proof.merchantAmountAtomic);
  const expectedFee = BigInt(proof.feeAmountAtomic);
  const expectedPayment = BigInt(proof.paymentAmountAtomic);

  if (expectedMerchant + expectedFee !== expectedPayment) {
    throw new Error('Proof amounts do not balance');
  }
  if (merchantDelta !== expectedMerchant) {
    throw new Error(
      `Merchant delta mismatch: expected ${expectedMerchant}, got ${merchantDelta}`,
    );
  }
  if (feeDelta !== expectedFee) {
    throw new Error(
      `Fee delta mismatch: expected ${expectedFee}, got ${feeDelta}`,
    );
  }
  if (payerDelta !== -expectedPayment) {
    throw new Error(
      `Payer delta mismatch: expected ${-expectedPayment}, got ${payerDelta}`,
    );
  }

  return { payerSigned: true, merchantDelta, feeDelta, payerDelta };
}

export async function verifyDevnetPayment(
  connection: Connection,
  proof: PaymentProof,
): Promise<VerifiedPayment> {
  const genesis = await connection.getGenesisHash();
  if (genesis !== DEVNET_GENESIS) {
    throw new Error('Verification requires Solana Devnet');
  }

  const status = await connection.getSignatureStatus(proof.signature, {
    searchTransactionHistory: true,
  });
  if (status.value?.err || status.value?.confirmationStatus !== 'finalized') {
    throw new Error('The recorded transaction is not finalized');
  }

  const transaction = await connection.getParsedTransaction(proof.signature, {
    commitment: 'finalized',
    maxSupportedTransactionVersion: 0,
  });
  return verifyParsedPayment(transaction as ParsedPaymentTransaction | null, proof);
}
