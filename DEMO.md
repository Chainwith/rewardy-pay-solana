# Rewardy Pay demo guide

## 90-second product demo

1. A merchant enters a local-currency amount on a phone and creates a payment QR.
2. A customer scans the QR and opens the checkout in Rewardy Wallet.
3. Show the merchant, amount, settlement asset, Rewardy fee and network fee.
4. Approve and sign the payment.
5. Show the merchant screen changing to **Paid** after server reconciliation.
6. Open the receipt and its Solana Explorer transaction.
7. End on the reward status and merchant payment history.

## Evaluator verification

```bash
npm ci
npm test
npm run proof:verify
```

The proof verifier requires only network access to Solana Devnet. It does not
need a database, Rewardy account or private key.

## Live transaction fallback

Public Devnet faucets can be rate limited. If a new transaction cannot be funded
during the pitch, use the recorded proof and run `npm run proof:verify`. Do not
switch the demo to mainnet or expose a production key.

