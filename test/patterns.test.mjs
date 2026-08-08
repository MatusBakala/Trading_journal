import './dom-stub.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { barsForTrade } = await import('../js/patterns.js');
const { excursionFor, riskR } = await import('../js/strategy-notes.js');
const { state } = await import('../js/state.js');

/* Sviečky sú vždy uložené zoradené podľa času - barsForTrade sa na to spolieha
   pri binárnom vyhľadávaní hranice, takže testovacie dáta držíme rovnako. */
function seedBars(bars, { symbol = 'TESTSYM', tf = '1m' } = {}) {
  state.ohlcSets = [{ key: symbol + '|' + tf, symbol, tf, bars, updated: Date.now() }];
}
const bar = (t, o, h, l, c) => ({ t, o, h, l, c });
const T0 = 1_700_000_000; // celá minúta

test.beforeEach(() => { state.ohlcSets = []; });

test('barsForTrade: vráti sviečky prekrývajúce trvanie obchodu', () => {
  seedBars([bar(T0, 10, 11, 9, 10), bar(T0 + 60, 10, 12, 10, 11), bar(T0 + 120, 11, 13, 11, 12), bar(T0 + 180, 12, 14, 12, 13)]);
  const bars = barsForTrade({ symbol: 'TESTSYM', tEntry: T0 + 60, tExit: T0 + 120 });
  // sviečka T0 končí presne v okamihu vstupu a stále sa počíta (podmienka b.t+tf >= tEntry),
  // sviečka T0+180 začína až po výstupe a nepočíta sa
  assert.deepEqual(bars.map(b => b.t), [T0, T0 + 60, T0 + 120]);
});

test('barsForTrade: sviečka začínajúca po výstupe sa nezaráta', () => {
  seedBars([bar(T0, 10, 11, 9, 10), bar(T0 + 60, 10, 12, 10, 11), bar(T0 + 120, 11, 13, 11, 12)]);
  const bars = barsForTrade({ symbol: 'TESTSYM', tEntry: T0 + 30, tExit: T0 + 90 });
  assert.ok(!bars.some(b => b.t > T0 + 90));
});

test('barsForTrade: obchod kratší ako jedna sviečka nájde tú, ktorá ho pokrýva', () => {
  // scalp vnútri jednej minúty - nesmie vrátiť null
  seedBars([bar(T0, 10, 11, 9, 10), bar(T0 + 60, 10, 12, 10, 11)]);
  const bars = barsForTrade({ symbol: 'TESTSYM', tEntry: T0 + 20, tExit: T0 + 40 });
  assert.deepEqual(bars.map(b => b.t), [T0]);
});

test('barsForTrade: bez dát pre symbol vráti null', () => {
  seedBars([bar(T0, 10, 11, 9, 10)]);
  assert.equal(barsForTrade({ symbol: 'INY', tEntry: T0, tExit: T0 + 60 }), null);
});

test('barsForTrade: neúplný obchod vráti null', () => {
  seedBars([bar(T0, 10, 11, 9, 10)]);
  assert.equal(barsForTrade({ symbol: 'TESTSYM', tEntry: T0 }), null, 'chýba tExit');
  assert.equal(barsForTrade({ tEntry: T0, tExit: T0 + 60 }), null, 'chýba symbol');
});

test('barsForTrade: obchod mimo pokrytia vráti null', () => {
  seedBars([bar(T0, 10, 11, 9, 10), bar(T0 + 60, 10, 12, 10, 11)]);
  assert.equal(barsForTrade({ symbol: 'TESTSYM', tEntry: T0 + 100000, tExit: T0 + 100060 }), null);
});

test('riskR: pomer zisku k riziku podľa stopu', () => {
  // MNQ mult 2: risk = |100-95| * 1 * 2 = 10, zisk = 10 * 1 * 2 = 20 -> 2R
  const t = { symbol: 'MNQ', dir: 1, qty: 1, entry: 100, exit: 110, stop: 95 };
  assert.equal(riskR(t), 2);
});

test('riskR: bez stopu sa R nedá spočítať', () => {
  assert.equal(riskR({ symbol: 'MNQ', dir: 1, qty: 1, entry: 100, exit: 110, stop: null }), null);
});

test('riskR: stop na vstupnej cene nedelí nulou', () => {
  assert.equal(riskR({ symbol: 'MNQ', dir: 1, qty: 1, entry: 100, exit: 110, stop: 100 }), null);
});

/* Tieto tri testy overujú znamienka a leftOnTable, nie prácu s hranicami okna - preto
   tExit vždy zarovnávame na koniec sviečky, aby boli všetky sviečky celé vnútri okna.
   Pri výstupe uprostred sviečky by sa jej h/l (správne) neuplatnilo, lebo z OHLC sa nedá
   dokázať, či extrém nastal ešte za otvorenej pozície - to rieši excursion.test.mjs. */

test('excursionFor: MAE je záporné, MFE kladné', () => {
  // long za 10, cena klesla na 9 a vyliezla na 13, zavreté na 12
  seedBars([bar(T0, 10, 11, 9, 10), bar(T0 + 60, 10, 13, 10, 12)], { symbol: 'MNQ' });
  const x = excursionFor({ symbol: 'MNQ', dir: 1, qty: 1, entry: 10, exit: 12, tEntry: T0, tExit: T0 + 120 });
  assert.equal(x.maeMoney, (9 - 10) * 2, 'najhlbší pokles pod vstup');
  assert.equal(x.mfeMoney, (13 - 10) * 2, 'najvyšší bod nad vstupom');
});

test('excursionFor: short má MAE hore a MFE dole', () => {
  seedBars([bar(T0, 10, 12, 8, 9)], { symbol: 'MNQ' });
  const x = excursionFor({ symbol: 'MNQ', dir: -1, qty: 1, entry: 10, exit: 9, tEntry: T0, tExit: T0 + 60 });
  assert.equal(x.maeMoney, (12 - 10) * -1 * 2, 'rast ceny ide proti shortu');
  assert.equal(x.mfeMoney, (8 - 10) * -1 * 2, 'pokles je v prospech shortu');
});

test('excursionFor: "nechané na stole" je rozdiel MFE a realizovaného zisku', () => {
  seedBars([bar(T0, 10, 14, 10, 12)], { symbol: 'MNQ' });
  const t = { symbol: 'MNQ', dir: 1, qty: 1, entry: 10, exit: 12, tEntry: T0, tExit: T0 + 60 };
  // MFE = 4*2 = 8, reálny zisk = 2*2 = 4 -> na stole ostali 4
  assert.equal(excursionFor(t).leftOnTable, 4);
});

test('excursionFor: bez sviečok vráti null', () => {
  state.ohlcSets = [];
  assert.equal(excursionFor({ symbol: 'MNQ', dir: 1, qty: 1, entry: 10, exit: 12, tEntry: T0, tExit: T0 + 30 }), null);
});
