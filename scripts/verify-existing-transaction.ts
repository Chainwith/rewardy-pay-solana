import { readFile } from 'node:fs/promises';
import { Connection } from '@solana/web3.js';
import {
  formatAtomic,
  verifyDevnetPayment,
  type PaymentProof,
} from '../src/payment-proof.ts';

const proof = JSON.parse(
  await readFile(
    new URL('../evidence/devnet-transaction.json', import.meta.url),
    'utf8',
  ),
) as PaymentProof;
const rpcUrl =
  process.env.SOLANA_DEVNET_RPC_URL ?? 'https://api.devnet.solana.com';
const connection = new Connection(rpcUrl, 'finalized');

try {
  const result = await verifyDevnetPayment(connection, proof);
  process.stdout.write('PASS Rewardy Pay Devnet proof verified\n');
  process.stdout.write(
    `merchant: +${formatAtomic(result.merchantDelta, proof.decimals)}\n`,
  );
  process.stdout.write(
    `rewardy fee: +${formatAtomic(result.feeDelta, proof.decimals)}\n`,
  );
  process.stdout.write(
    `payer: ${formatAtomic(result.payerDelta, proof.decimals)}\n`,
  );
  process.stdout.write(
    `explorer: https://explorer.solana.com/tx/${proof.signature}?cluster=devnet\n`,
  );
} catch (error: unknown) {
  process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
  process.exitCode = 1;
}
