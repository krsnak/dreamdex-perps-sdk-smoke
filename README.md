# dreamDEX Perps Builder Bounty — SDK feedback and smoke test

Read-only SDK integration with `@somnia-chain/markets-sdk@0.32.1` on Somnia Tokyo / Hideki testnet (chain 50383).

## Feedback Track report

| ID | Severity | Area | Finding |
| --- | --- | --- | --- |
| [001](feedback/001-adl-ready-before-live-subscription.md) | normal | SDK | ADL queue says `ready` before live event subscription is confirmed or after watcher registration failed |

**Reproduction:** [`repro/adl-ready.mjs`](repro/adl-ready.mjs). Node.js 20+; no wallet or transactions.

```bash
npm install --ignore-scripts
node --test repro/adl-ready.mjs
EXPECT_ADL_FIX=1 node --test repro/adl-ready.mjs
```

The first run returns four passing checks, including two demonstrating incorrect `ready` state. The second run uses expected-correctness assertions: two failing cases on the released SDK, two healthy controls. This is an SDK freshness-status defect, **not** a demonstrated on-chain money loss or security exploit.

## Original SDK smoke integration

The smoke script queries perpetual markets and system configuration without a wallet, private key, or funds. It does **not** place trades.

```bash
npm install
npm run smoke
```

GitHub Actions runs the SDK smoke check on push. Check Actions results for the current code; a repository alone does not establish that the runtime integration succeeded.

Developer reference: https://app.testnet.dreamdex.io/docs/developers/perps-testnet
