import './dom-stub.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

/* renderExcursionChart() manipuluje reálny DOM strom (innerHTML, querySelector cez
   #excChart/#excOutliers) - test/dom-stub.mjs je zámerne len minimálna atrapa bez
   skutočného stromu, takže to tu netestujeme. To správanie (10 riadkov v zozname,
   klik na bod aj na riadok otvorí presne očakávaný trade, prázdny stav vyprázdni
   zoznam) je overené priamo v prehliadači na reálnych importovaných dátach. Tu sa
   testujú len čisté funkcie bez DOM. */
const { collectExcursions, topExcursionOutliers } = await import('../js/stats.js');
const { state } = await import('../js/state.js');

const T0 = 1_700_000_000;
const bar = (t, o, h, l, c) => ({ t, o, h, l, c });
const trade = (o) => Object.assign({
  symbol: 'MGC', account: 1, dir: 1, qty: 1, entry: 10, exit: 12,
  tEntry: T0, tExit: T0 + 60, fees: 0, pnlOverride: null,
}, o);

test.beforeEach(() => {
  state.ohlcSets = [];
  state.trades = [];
  state.excChartObj = null;
});

test('topExcursionOutliers: zoradí zostupne a orezáva na N', () => {
  const rows = [{ v: 5 }, { v: 40 }, { v: 1 }, { v: 20 }];
  const top = topExcursionOutliers(rows, r => r.v, 2);
  assert.deepEqual(top.map(r => r.v), [40, 20]);
});

test('topExcursionOutliers: nulové a záporné hodnoty vypadnú', () => {
  const rows = [{ v: 10 }, { v: 0 }, { v: -5 }];
  assert.deepEqual(topExcursionOutliers(rows, r => r.v).map(r => r.v), [10]);
});

test('topExcursionOutliers: predvolený limit je 5', () => {
  const rows = Array.from({ length: 8 }, (_, i) => ({ v: i + 1 }));
  assert.equal(topExcursionOutliers(rows, r => r.v).length, 5);
});

test('collectExcursions: vynechá obchody bez sviečkových dát, zvyšné majú referenciu na trade', () => {
  state.ohlcSets = [{ key: 'MGC|1m', symbol: 'MGC', tf: '1m', bars: [bar(T0, 10, 14, 9, 12)] }];
  const withData = trade({ id: 1 });
  const withoutData = trade({ id: 2, symbol: 'INY' });
  const rows = collectExcursions([withData, withoutData]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].trade.id, 1, 'referencia na trade musí prežiť do bodu grafu kvôli klik-na-detail');
});
