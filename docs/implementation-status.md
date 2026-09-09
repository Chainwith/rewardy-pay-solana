# Implementation status

## Working code

| Capability | Status | Evidence |
| --- | --- | --- |
| Devnet SPL payment | Working | `npm run demo:devnet` |
| Merchant and Rewardy fee split | Working | One transaction; exact deltas verified |
| Existing transaction replay | Working | `npm run proof:verify` |
| Rewardy payment memo | Working in live demo | `rewardy-pay-demo:<reference>` |
| Direct SOL/SPL wallet payment | Rewardy product surface | Product demo and pitch deck |
| Payment reconciliation | Rewardy product surface | Product demo and pitch deck |
| Receipt, history and refund evidence | Rewardy product surface | Product demo and pitch deck |

## Designed or roadmap

| Capability | Current boundary |
| --- | --- |
| Jupiter conversion | Not included in the working payment route |
| Mayan/Wormhole routing | Not included in the working payment route |
| Solana Pay protocol | Not claimed; current implementation uses web3.js/SPL Token directly |
| TMO Point and JPYSC conversion | Partnership/product concept, not production proof |
| Mainnet payment processing | Not claimed by this Devnet submission |

## Evaluation implementation

The executable proof, payment-plan validation and lifecycle controls in this
repository are written in TypeScript. `npm run typecheck` runs strict type
checking before the test suite.

The public evaluator repository is the source of truth for reproducible Solana
claims. Product-surface claims require the submitted Rewardy demo.
