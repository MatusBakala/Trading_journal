import './dom-stub.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} !~ ${expected}`);

const { excursionFor, buildPositionSegments } = await import('../js/strategy-notes.js');
const { state } = await import('../js/state.js');

const bar = (t, h, l) => ({ t, o: h, h, l, c: h });

test.beforeEach(() => {
  state.ohlcSets = [];
});

test('buildPositionSegments: scale-in vytvorí segmenty s narastajúcim qty a priemernou cenou', () => {
  const entryLegs = [{ qty: 2, price: 100, t: 1000 }, { qty: 3, price: 102, t: 1010 }];
  const exitLegs = [{ qty: 5, price: 99, t: 1100 }];
  const segs = buildPositionSegments(entryLegs, exitLegs, 1000, 1100);
  assert.deepEqual(segs, [
    { tStart: 1000, tEnd: 1010, qty: 2, avgPrice: 100 },
    { tStart: 1010, tEnd: 1100, qty: 5, avgPrice: 101.2 },
  ]);
});

test('buildPositionSegments: bez fillov nevráti žiadny segment', () => {
  assert.deepEqual(buildPositionSegments([], [], 1000, 1100), []);
});

// Short obchod: 2@100 vstup, potom pridané 3@102 (spolu 5, priemer 101.2), výstup 5@99.
// V okne kým bolo držaných len 2 kontrakty vyletí cena na 110 (silne proti pozícii),
// neskôr keď je už 5 kontraktov, cena sa drží v užšom pásme. Naivný výpočet (plošné
// finálne qty=5 cez celé okno) by MAE nafúkol, akoby tých 5 kontraktov bolo vystavených
// aj špičke 110 - v realite tam boli len 2.
function scaledShortTrade(withLegs) {
  const t = {
    id: 1, symbol: 'MGC', account: 1, dir: -1, qty: 5, entry: 101.2, exit: 99,
    tEntry: 1000, tExit: 1100, fees: 0, pnlOverride: null, stop: null,
  };
  if (withLegs) {
    t.entryLegs = [{ qty: 2, price: 100, t: 1000 }, { qty: 3, price: 102, t: 1010 }];
    t.exitLegs = [{ qty: 5, price: 99, t: 1100 }];
  }
  return t;
}

test('excursionFor: leg-aware MAE váži cenovú špičku iba skutočne držaným množstvom', () => {
  state.ohlcSets = [{ key: 'MGC|1m', symbol: 'MGC', tf: '1m', bars: [
    bar(1005, 110, 99), // v tomto bare bolo držaných len 2 kontrakty
    bar(1015, 102, 100), // od tejto chvíle už 5 kontraktov
    bar(1050, 101, 98),
  ] }];
  const x = excursionFor(scaledShortTrade(true));
  assert.equal(x.approx, false);
  close(x.maeMoney, -200); // 2 kontrakty × (110-100) × mult 10, nie 5×
  close(x.mfeMoney, 160);
});

test('excursionFor: bez legov (manuálny/starý obchod) ostáva plošný výpočet cez celé qty - žiadna regresia', () => {
  state.ohlcSets = [{ key: 'MGC|1m', symbol: 'MGC', tf: '1m', bars: [
    bar(1005, 110, 99),
    bar(1015, 102, 100),
    bar(1050, 101, 98),
  ] }];
  const x = excursionFor(scaledShortTrade(false));
  assert.equal(x.approx, true);
  close(x.maeMoney, -440); // (110-101.2) × 5 × 10 - stará, nafúknutá hodnota
  close(x.mfeMoney, 160);
});

test('excursionFor: jeden entry leg zodpovedajúci t.qty/t.entry dá identický výsledok ako bez legov', () => {
  state.ohlcSets = [{ key: 'MGC|1m', symbol: 'MGC', tf: '1m', bars: [
    bar(1005, 110, 99),
    bar(1050, 101, 98),
  ] }];
  const noLegs = excursionFor(scaledShortTrade(false));
  const t = scaledShortTrade(false);
  t.entryLegs = [{ qty: 5, price: 101.2, t: 1000 }];
  t.exitLegs = [{ qty: 5, price: 99, t: 1100 }];
  const withLegs = excursionFor(t);
  close(withLegs.maeMoney, noLegs.maeMoney);
  close(withLegs.mfeMoney, noLegs.mfeMoney);
});
