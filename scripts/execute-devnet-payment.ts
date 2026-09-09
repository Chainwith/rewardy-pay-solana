import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountInstruction,
  createMint,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';
import {
  DEVNET_GENESIS,
  formatAtomic,
  verifyParsedPayment,
  type ParsedPaymentTransaction,
} from '../src/payment-proof.ts';
import {
  calculatePaymentSplit,
  createPaymentReference,
} from '../src/payment-plan.ts';

const MEMO_PROGRAM_ID = new PublicKey(
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
);
const rpcUrl =
  process.env.SOLANA_DEVNET_RPC_URL ?? 'https://api.devnet.solana.com';
const payerFile = resolve('.local/devnet-payer.json');
const connection = new Connection(rpcUrl, 'finalized');

function loadPayer(): Keypair {
  const configured = process.env.SOLANA_DEVNET_PAYER_SECRET;
  if (configured) {
    const bytes = Uint8Array.from(JSON.parse(configured));
    if (bytes.length !== 64) {
      throw new Error('SOLANA_DEVNET_PAYER_SECRET must contain 64 bytes');
    }
    return Keypair.fromSecretKey(bytes);
  }

  if (existsSync(payerFile)) {
    return Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(readFileSync(payerFile, 'utf8'))),
    );
  }

  const payer = Keypair.generate();
  mkdirSync(dirname(payerFile), { recursive: true, mode: 0o700 });
  writeFileSync(payerFile, JSON.stringify([...payer.secretKey]), {
    flag: 'wx',
    mode: 0o600,
  });
  return payer;
}

async function ensureFunding(payer: Keypair): Promise<void> {
  const minimum = 20_000_000;
  if ((await connection.getBalance(payer.publicKey, 'finalized')) >= minimum) {
    return;
  }

  try {
    const signature = await connection.requestAirdrop(
      payer.publicKey,
      100_000_000,
    );
    await connection.confirmTransaction(signature, 'finalized');
  } catch (error: unknown) {
    throw new Error(
      `Devnet payer ${payer.publicKey.toBase58()} needs funding. Run npm run demo:address and fund that address before retrying. Faucet response: ${error instanceof Error ? error.message : error}`,
    );
  }
}

async function main(): Promise<void> {
  if ((await connection.getGenesisHash()) !== DEVNET_GENESIS) {
    throw new Error('The live payment script only runs on Solana Devnet');
  }

  const payer = loadPayer();
  if (process.argv.includes('--print-address')) {
    process.stdout.write(`${payer.publicKey.toBase58()}\n`);
    return;
  }

  await ensureFunding(payer);
  const merchant = Keypair.generate();
  const feeWallet = Keypair.generate();
  const mint = await createMint(connection, payer, payer.publicKey, null, 6);
  const payerToken = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey,
  );
  await mintTo(connection, payer, mint, payerToken.address, payer, 20_000_000n);

  const merchantToken = await getAssociatedTokenAddress(
    mint,
    merchant.publicKey,
  );
  const feeToken = await getAssociatedTokenAddress(mint, feeWallet.publicKey);
  const reference = createPaymentReference(`demo-${Date.now()}`);
  const split = calculatePaymentSplit(10_000_000n, 30);
  const transaction = new Transaction()
    .add(
      new TransactionInstruction({
        programId: MEMO_PROGRAM_ID,
        keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: false }],
        data: Buffer.from(reference, 'utf8'),
      }),
    )
    .add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        merchantToken,
        merchant.publicKey,
        mint,
      ),
    )
    .add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        feeToken,
        feeWallet.publicKey,
        mint,
      ),
    )
    .add(
      createTransferCheckedInstruction(
        payerToken.address,
        mint,
        merchantToken,
        payer.publicKey,
        split.merchantAmountAtomic,
        6,
      ),
    )
    .add(
      createTransferCheckedInstruction(
        payerToken.address,
        mint,
        feeToken,
        payer.publicKey,
        split.feeAmountAtomic,
        6,
      ),
    );

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer],
    { commitment: 'finalized' },
  );
  const parsed = await connection.getParsedTransaction(signature, {
    commitment: 'finalized',
    maxSupportedTransactionVersion: 0,
  });
  const proof = {
    payer: payer.publicKey.toBase58(),
    merchant: merchant.publicKey.toBase58(),
    feeWallet: feeWallet.publicKey.toBase58(),
    mint: mint.toBase58(),
    paymentAmountAtomic: split.paymentAmountAtomic.toString(),
    merchantAmountAtomic: split.merchantAmountAtomic.toString(),
    feeAmountAtomic: split.feeAmountAtomic.toString(),
  };
  const result = verifyParsedPayment(
    parsed as ParsedPaymentTransaction | null,
    proof,
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        cluster: 'devnet',
        signature,
        explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
        reference,
        mint: proof.mint,
        payer: proof.payer,
        merchant: proof.merchant,
        feeWallet: proof.feeWallet,
        merchantAmount: formatAtomic(result.merchantDelta, 6),
        rewardyFee: formatAtomic(result.feeDelta, 6),
        payerAmount: formatAtomic(result.payerDelta, 6),
        verified: true,
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
  process.exitCode = 1;
});
