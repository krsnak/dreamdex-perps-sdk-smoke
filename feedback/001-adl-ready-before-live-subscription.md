# ADL queue subscription reports READY before its WebSocket watcher is confirmed

**Severity:** normal  
**Area:** SDK  
**Affected:** `@somnia-chain/markets-sdk@0.32.1`, `perpAdlQueue.subscribe` internal `AdlSession`  
**Network:** Somnia Tokyo / Hideki, chain ID 50383 (logic reproduced offline against published SDK).

## Summary
A successful ADL queue snapshot can be published as `status: "ready"` before the node acknowledges the event-log subscription. When initial watcher registration throws while reads remain usable, the SDK still publishes `ready` and never schedules a watcher retry. Consumers cannot distinguish a truly live risk view from a last-good snapshot lacking real-time coverage.

This is a **freshness/status reporting defect**, not a claim that ADL protocol accounting is wrong or funds were lost. The ADL client has a 30-second backstop poll. The defect affects whether a UI can trust the `ready` label and react promptly to changes.

## Steps to reproduce
Prerequisites: Node.js 20+, npm. No wallet, testnet funds, secrets, trading, or chain writes.

1. Clone `https://github.com/krsnak/dreamdex-perps-sdk-smoke`.
2. Run `npm install --ignore-scripts` (SDK pinned to 0.32.1).
3. Run `node --test repro/adl-ready.mjs`. The independent Node harness imports the **published package's dist implementation**, not a rewritten or patched session.
4. Observe `UNCONFIRMED_SUBSCRIPTION_STATUS ready` although `onOpen` was never delivered, and `FAILED_SUBSCRIPTION_STATUS ready` although `watch()` threw before registering a listener.
5. Run `EXPECT_ADL_FIX=1 node --test repro/adl-ready.mjs`. The two defect assertions **fail** against the released SDK; the two controls pass.

The tests control the asynchronous boundary: a read resolves before the subscription acknowledgement, or watcher registration fails independently while reads succeed. They do not simulate financial loss.

## Expected
- Before the watch's `onOpen` callback, the view must not claim confirmed-live `ready`; `loading` or `stale` is appropriate.
- If watcher registration fails but a read succeeds, the result remains degraded; retry recoverable watcher errors, or report a terminal unavailable transport.
- Once `onOpen` arrives and a fresh read succeeds, the view becomes `ready`.

## Actual
`src/perp/adlSession.ts` initializes `#watchDown = false`; `#accept` uses the flag to publish `ready`. It is only explicitly set to false by `onOpen`, but starts false **before** that confirmation. The `catch` in `#openWatch` only warns, leaving the flag false without a retry.

The published `dist/perp/adlSession.js` carries the same logic. Source comments recognize that when a watch is down the view should be marked stale; the initial lifecycle violates that status contract.

## Evidence
- `repro/adl-ready.mjs` (four deterministic cases, including two controls)
- Pinned package: `@somnia-chain/markets-sdk@0.32.1`
- Unmodified release: **4/4 reproduction/control tests pass**, logging two incorrect `ready` states.
- Expected contract mode: **2/4 pass, two assertions fail** on the unmodified release.
- Source: `src/perp/adlSession.ts` and distributed `dist/perp/adlSession.js`.
- No transaction hash is applicable: tested SDK connection lifecycle, offline without signed transactions.

## Suggested fix
Initialize `#watchDown` to `true`; change it to `false` only after a confirmed subscription (`onOpen` or a trustworthy subscribed signal). On synchronous watch registration failure, keep the view degraded, retry transient errors, and treat `NotConfiguredError` as terminal to avoid a loop. Add a regression test that withholds `onOpen` until after the initial successful read.

## Limitations and originality
No actual network outage, lost funds, unauthorized order or on-chain exploit is demonstrated. A public feedback index cross-check as of Oct 29 found no exact ADL-ready-before-ack report in accessible repository README indexes; private submissions and official acceptance are known only to the organizer.
