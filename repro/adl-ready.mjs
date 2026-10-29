import test from 'node:test';
import assert from 'node:assert/strict';
// Intentionally import the released implementation from npm's dist, not a local patch.
import { AdlSession } from '../node_modules/@somnia-chain/markets-sdk/dist/perp/adlSession.js';

const wait = () => new Promise(resolve => setImmediate(resolve));

function sessionHarness({ watchThrows = false } = {}) {
  const views = [];
  const watches = [];
  let rev = 0;
  const session = new AdlSession({
    chainId: 50383,
    marginBank: '0x' + '11'.repeat(20),
    pool: '0x' + '22'.repeat(20),
    isLong: true,
    read: async () => ({
      blockNumber: 123456n,
      queue: { regime: 'rankerUnset', scanCap: 0n, holderCount: 0n },
    }),
    watch: (onLog, onError, onOpen) => {
      if (watchThrows) throw Error('socket refused subscription');
      watches.push({ onLog, onError, onOpen });
      return () => {};
    },
    publish: view => views.push(view),
    nextRevision: () => ++rev,
    nowMs: () => 0,
    backoffMs: () => 1000,
    warn: () => {},
  });
  return { session, views, watches };
}

test('control: confirmed subscription and fresh read become READY', async () => {
  const x = sessionHarness();
  try {
    x.session.start();
    assert.equal(x.watches.length, 1);
    x.watches[0].onOpen();
    await wait();
    assert.equal(x.views.at(-1)?.status, 'ready');
  } finally {
    x.session.close(false);
  }
});

test('defect: successful read is READY before subscription confirmation', async () => {
  const x = sessionHarness();
  try {
    x.session.start();
    await wait(); // Read completed while onOpen intentionally withheld.
    assert.equal(x.watches.length, 1);
    const status = x.views.at(-1)?.status;
    if (process.env.EXPECT_ADL_FIX === '1') assert.notEqual(status, 'ready');
    else assert.equal(status, 'ready');
    console.log('UNCONFIRMED_SUBSCRIPTION_STATUS', status);
  } finally {
    x.session.close(false);
  }
});

test('defect: failed watch registration returns READY after successful read', async () => {
  const x = sessionHarness({ watchThrows: true });
  try {
    x.session.start();
    await wait();
    const status = x.views.at(-1)?.status;
    if (process.env.EXPECT_ADL_FIX === '1') assert.notEqual(status, 'ready');
    else assert.equal(status, 'ready');
    assert.equal(x.watches.length, 0);
    console.log('FAILED_SUBSCRIPTION_STATUS', status);
  } finally {
    x.session.close(false);
  }
});

test('control: watch failure after confirmed subscription marks STALE', async () => {
  const x = sessionHarness();
  try {
    x.session.start();
    x.watches[0].onOpen();
    await wait();
    assert.equal(x.views.at(-1)?.status, 'ready');
    x.watches[0].onError();
    assert.equal(x.views.at(-1)?.status, 'stale');
  } finally {
    x.session.close(false);
  }
});
