# Why Solana is integral to Rewardy Pay

Rewardy Pay is not a conventional checkout with a blockchain badge. Solana is
the source of settlement truth used by the payment lifecycle.

## One transaction, one settlement result

The customer authorizes a transaction containing the merchant transfer and the
Rewardy fee transfer. Solana's transaction semantics make the instruction set
atomic: either the expected transfers execute together or the transaction fails.

## Independently verifiable payment state

Rewardy does not trust a client-side success screen. The verifier reads the
transaction from Solana and checks:

- expected cluster and finalized status;
- expected payer signature;
- approved mint;
- exact merchant and Rewardy fee recipients;
- exact token balance deltas; and
- Rewardy payment reference when present.

Only a valid proof can move a Rewardy payment session to `CONFIRMED` and make it
eligible for a receipt or reward.

## Why this matters for phone-based merchant acceptance

The merchant needs only a smartphone and a QR. The customer pays from a wallet,
and both parties can inspect the same public settlement proof without a
proprietary card terminal.

