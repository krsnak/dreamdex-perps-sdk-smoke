# dreamDEX Perps SDK smoke test

Minimal read-only integration prototype for the dreamDEX Perps Builder Bounty.

Uses `@somnia-chain/markets-sdk` on Somnia Hideki testnet (dreamDEX Tokyo). The script requests perpetual markets and checks the system configuration. **No wallet private key or funds required; it does not place orders.**

```bash
npm install
npm run smoke
```

GitHub Actions runs the smoke check on push. A repository or passing static checks alone is not proof of successful runtime integration: look at the Actions result. This is a preliminary SDK exercise, not a trading bot.

Reference: https://app.testnet.dreamdex.io/docs/developers/perps-testnet
