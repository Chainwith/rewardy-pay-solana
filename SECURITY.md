# Security notes

- The scripts in this repository are for Solana Devnet only.
- Never use a mainnet secret key or a wallet containing assets.
- `.local/` and `.env` are excluded from git.
- The verification command is read-only and needs no secret.
- The live demo creates throwaway merchant and fee addresses for each run.
- Report accidental credential exposure privately to the Rewardy team; do not
  open an issue containing the credential.

## Dependency boundary

The evaluator scripts intentionally use the same Solana Web3.js 1.x and SPL
Token family as the current product implementation. Their dependency tree has
published transitive `bigint-buffer`, `stream-json` and `uuid` advisories for
which npm currently offers only breaking or regressive forced resolutions. This
repository is therefore a local, short-lived Devnet evaluator tool: it must not
be exposed as a network service or used with untrusted JSON input. Migration to
the current Solana client stack should be completed before a production release.
