export const DEVNET_GENESIS =
  'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';

export function formatAtomic(value, decimals) {
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

export function ownerMintDelta(transaction, owner, mint) {
  const sum = balances =>
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

export function verifyParsedPayment(transaction, proof) {
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

  return { payerSigned, merchantDelta, feeDelta, payerDelta };
}

export async function verifyDevnetPayment(connection, proof) {
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
  return verifyParsedPayment(transaction, proof);
}

