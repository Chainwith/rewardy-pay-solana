# Implementation status

## Working code

| Capability | Status | Evidence |
| --- | --- | --- |
| Devnet SPL payment | Working | `npm run demo:devnet` |
| Merchant and Rewardy fee split | Working | One transaction; exact deltas verified |
| Existing transaction replay | Working | `npm run proof:verify` |
| Rewardy payment memo | Working in live demo | `rewardy-pay-demo:<reference>` |
| Direct SOL/SPL wallet payment | Integrated in Rewardy Wallet | Product repository tests |
| Payment reconciliation | Integrated in Rewardy backend | Product repository tests and Devnet evidence |
| Receipt, history and refund evidence | Integrated product flows | Product repository tests |

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
