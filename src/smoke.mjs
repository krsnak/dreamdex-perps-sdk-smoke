import { SomniaMarkets, SOMNIA_HIDEKI_TESTNET_ADDRESSES } from '@somnia-chain/markets-sdk';
import { hidekiTestnet } from '@somnia-chain/markets-sdk/chains';

const markets = new SomniaMarkets({
  chain: hidekiTestnet,
  indexerUrl: 'https://hideki-dev.smk.somnia.host/v1/graphql',
  addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES,
  // Intentionally no private key: this is read-only.
});

try {
  const perps = await markets.client.listPerpMarkets();
  if (!Array.isArray(perps) || perps.length === 0) {
    throw new Error('No perp markets returned');
  }
  const sample = perps.find(m => m.baseSymbol === 'BTC') ?? perps[0];
  if (!sample.marginBank || !sample.poolAddress) {
    throw new Error('Market is missing marginBank or poolAddress');
  }
  const config = await markets.client.getPerpSystemConfig(sample.marginBank);
  if (!config || !config.collateral || !config.factory) {
    throw new Error('Incomplete perp system config');
  }
  console.log(JSON.stringify({
    status: 'ok',
    chain: 'Somnia Hideki testnet (dreamDEX Tokyo)',
    markets: perps.length,
    sample: sample.baseSymbol,
    poolAddress: sample.poolAddress,
    marginBank: sample.marginBank,
    collateral: config.collateral,
    factory: config.factory
  }, null, 2));
} catch (err) {
  console.error('dreamDEX read-only smoke failed:', err);
  process.exitCode = 1;
}
