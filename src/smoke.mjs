import {
  SomniaMarkets,
  SOMNIA_HIDEKI_TESTNET_ADDRESSES,
} from '@somnia-chain/markets-sdk';
import { hidekiTestnet } from '@somnia-chain/markets-sdk/chains';

const indexerUrl = 'https://hideki-dev.smk.somnia.host/v1/graphql';
const markets = new SomniaMarkets({
  chain: hidekiTestnet,
  indexerUrl,
  addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES,
  // No privateKey: this smoke test performs read-only operations.
});

const isAddress = (value) => typeof value === 'string' && /^0x[a-f\d]{40}$/i.test(value);

async function main() {
  const perps = await markets.client.listPerpMarkets();
  if (!Array.isArray(perps) || perps.length === 0) {
    throw new Error('The indexer returned no perpetual markets');
  }

  const sample = perps.find((market) => market.baseSymbol === 'BTC') ?? perps[0];
  if (!isAddress(sample.marginBank) || !isAddress(sample.poolAddress)) {
    throw new Error('Perp market is missing a valid marginBank or poolAddress');
  }

  const config = await markets.client.getPerpSystemConfig(sample.marginBank);
  // PerpSystemConfig uses collateralToken / perpPoolFactory, NOT collateral / factory.
  const requiredAddresses = [
    'collateralToken',
    'perpPoolFactory',
    'liquidationEngine',
    'insuranceFund',
  ];
  for (const field of requiredAddresses) {
    if (!isAddress(config?.[field])) {
      throw new Error(`Invalid or missing system config address: ${field}`);
    }
  }
  if (config.fullyWired !== true) {
    throw new Error('MarginBank system config is not fully wired');
  }

  console.log(JSON.stringify({
    status: 'ok',
    network: 'Somnia Hideki testnet (dreamDEX Tokyo)',
    chainId: hidekiTestnet.id,
    markets: perps.length,
    sampleMarket: sample.baseSymbol,
    poolAddress: sample.poolAddress,
    marginBank: sample.marginBank,
    collateralToken: config.collateralToken,
    perpPoolFactory: config.perpPoolFactory,
    liquidationEngine: config.liquidationEngine,
    insuranceFund: config.insuranceFund,
    fullyWired: config.fullyWired,
  }, null, 2));
}

try {
  await main();
} catch (error) {
  console.error('dreamDEX read-only smoke failed:', error);
  process.exitCode = 1;
} finally {
  // getPerpSystemConfig opens the SDK's chain WebSocket. Close it on every path
  // or a CI job keeps running after printing the result / an error.
  markets.client.stopLive();
}
