import './dom-stub.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { computeOhlcCoverage, daysToRanges } = await import('../js/ohlc-import.js');
const { state } = await import('../js/state.js');

test('daysToRanges: susedné dni zlúči, medzeru rozdelí', () => {
  assert.deepEqual(daysToRanges({}), []);
  assert.deepEqual(daysToRanges({ '2026-08-01': 1, '2026-08-02': 2 }),
    [{ from: '2026-08-01', to: '2026-08-02', count: 3 }]);
  assert.deepEqual(daysToRanges({ '2026-08-01': 1, '2026-08-05': 4 }),
    [{ from: '2026-08-01', to: '2026-08-01', count: 1 }, { from: '2026-08-05', to: '2026-08-05', count: 4 }]);
});

test('kontrola pokrytia vyčísli neistotu MAE/MFE a povie, čo dotiahnuť', () => {
  // krajné sviečky presahujú mimo obchodu -> dolná a horná hranica sa líšia
  state.ohlcSets = [{ key: 'MGC|5m', symbol: 'MGC', tf: '5m', bars: [
    { t: 900, o: 99, h: 105, l: 98, c: 100 },
    { t: 1200, o: 100, h: 103, l: 99, c: 102 },
  ] }];
  state.trades = [{ id: 1, symbol: 'MGC', dir: 1, qty: 1, entry: 100, exit: 102, tEntry: 1000, tExit: 1400, fees: 0 }];
  const q = computeOhlcCoverage().quality.find(x => x.symbol === 'MGC');
  assert.ok(q, 'chýba záznam kvality pre MGC');
  assert.equal(q.bounded, 1);
  // samotný počet nepovie, či ide o centy alebo desiatky dolárov - preto sa meria rozdiel
  assert.ok(q.gapMedian > 0, 'neistota sa nevyčíslila');
  assert.equal(q.gapWorst, q.gapMedian);
  assert.ok(q.coarseRanges.length > 0, 'chýba obdobie, ktoré treba dotiahnuť jemnejšie');
  state.ohlcSets = []; state.trades = [];
});

test('pri presnom výpočte sa neistota ani obdobia nehlásia', () => {
  state.ohlcSets = [{ key: 'MGC|5m', symbol: 'MGC', tf: '5m', bars: [
    { t: 900, o: 100, h: 105, l: 98, c: 102 },
  ] }];
  // obchod presne na hraniciach sviečky
  state.trades = [{ id: 2, symbol: 'MGC', dir: 1, qty: 1, entry: 100, exit: 102, tEntry: 900, tExit: 1200, fees: 0 }];
  const q = computeOhlcCoverage().quality.find(x => x.symbol === 'MGC');
  assert.equal(q.bounded, 0);
  assert.equal(q.gapMedian, 0);
  assert.deepEqual(q.coarseRanges, []);
  state.ohlcSets = []; state.trades = [];
});
